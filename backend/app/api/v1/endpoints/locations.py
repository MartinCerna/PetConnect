import os
import secrets
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.db.models import User, Device, Pet, LocationLog
from app.schemas.location import LocationCreate, LocationResponse
from app.api.deps import get_current_user

router = APIRouter()


def verify_ingest_key(x_api_key: str = Header(default="", alias="X-API-Key")) -> None:
    """Solo el worker de sincronización (o un dispositivo autorizado) puede escribir ubicaciones."""
    expected = os.getenv("INGEST_API_KEY")
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="INGEST_API_KEY no está configurada en el servidor.",
        )
    if not secrets.compare_digest(x_api_key, expected):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key inválida.",
        )


def _maybe_trigger_google_sync(background_tasks: BackgroundTasks) -> None:
    """Dispara una sincronización en segundo plano si ENABLE_GOOGLE_SYNC está activo y pasó >120s."""
    if os.getenv("ENABLE_GOOGLE_SYNC", "false").lower() != "true":
        return
    try:
        from google_location import get_sync_status, ejecutar_sincronizacion_google
        st = get_sync_status()
        if st.get("is_running"):
            return
        last_attempt = st.get("last_attempt_at")
        if last_attempt:
            elapsed = (datetime.now(timezone.utc) - datetime.fromisoformat(last_attempt)).total_seconds()
            if elapsed < 120:
                return
        background_tasks.add_task(ejecutar_sincronizacion_google)
    except Exception as e:
        print(f"[Auto-Sync] No se pudo verificar estado de sincronización: {e}", flush=True)


@router.get("/sync-status")
def sync_status(_: None = Depends(verify_ingest_key)):
    """Consulta el estado del sincronizador de Google Find My en el servidor."""
    from google_location import get_sync_status
    return {
        "enable_google_sync": os.getenv("ENABLE_GOOGLE_SYNC", "false").lower() == "true",
        "has_findmy_secrets": bool(os.getenv("GOOGLE_FINDMY_SECRETS")),
        **get_sync_status(),
    }


@router.post("/sync-now")
def sync_now(_: None = Depends(verify_ingest_key)):
    """Ejecuta de forma síncrona la consulta y renovación de llaves en Google Find My."""
    from google_location import ejecutar_sincronizacion_google, get_sync_status
    ok = ejecutar_sincronizacion_google()
    return {"ok": ok, **get_sync_status()}


@router.post("/", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
def record_location(
    location_in: LocationCreate,
    _: None = Depends(verify_ingest_key),
    db: Session = Depends(get_db)
):
    """
    Registra una nueva coordenada geográfica recibida para un dispositivo ESP32-C3.
    """
    device = None
    if location_in.device_id:
        device = db.query(Device).filter(Device.id == location_in.device_id).first()
    if not device and location_in.device_mac:
        mac_clean = location_in.device_mac.strip().upper()
        device = db.query(Device).filter(Device.device_mac == mac_clean).first()
    if not device:
        device = db.query(Device).filter(Device.device_mac == "10:00:3B:AE:EC:A0").first()
    if not device:
        raise HTTPException(
            status_code=404,
            detail="Dispositivo no encontrado en el sistema."
        )

    recorded_dt = location_in.recorded_at or datetime.utcnow()
    existing = (
        db.query(LocationLog)
        .filter(LocationLog.device_id == device.id, LocationLog.recorded_at == recorded_dt)
        .first()
    )
    if existing:
        return existing

    new_location = LocationLog(
        device_id=device.id,
        latitude=location_in.latitude,
        longitude=location_in.longitude,
        altitude=location_in.altitude or 0.0,
        battery_level=location_in.battery_level,
        recorded_at=recorded_dt
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    return new_location


@router.get("/pet/{pet_id}/latest", response_model=Optional[LocationResponse])
def get_latest_pet_location(
    pet_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene la última ubicación conocida registrada para una mascota.
    """
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada o no autorizada.")

    if not pet.device_id:
        return None

    _maybe_trigger_google_sync(background_tasks)

    latest_location = (
        db.query(LocationLog)
        .filter(LocationLog.device_id == pet.device_id)
        .order_by(LocationLog.recorded_at.desc())
        .first()
    )

    if not latest_location:
        return None

    return latest_location


@router.get("/pet/{pet_id}/history", response_model=List[LocationResponse])
def get_pet_location_history(
    pet_id: UUID,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene el historial reciente de puntos de ubicación de una mascota.
    """
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada o no autorizada.")

    if not pet.device_id:
        return None

    return (
        db.query(LocationLog)
        .filter(LocationLog.device_id == pet.device_id)
        .order_by(LocationLog.recorded_at.desc())
        .limit(limit)
        .all()
    )
