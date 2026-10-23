import os
import secrets
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, Header, HTTPException, status
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

@router.post("/", response_model=LocationResponse, status_code=status.HTTP_201_CREATED)
def record_location(
    location_in: LocationCreate,
    _: None = Depends(verify_ingest_key),
    db: Session = Depends(get_db)
):
    """
    Registra una nueva coordenada geográfica recibida para un dispositivo ESP32-C3.
    """
    device = db.query(Device).filter(Device.id == location_in.device_id).first()
    if not device:
        raise HTTPException(
            status_code=404,
            detail="Dispositivo no encontrado en el sistema."
        )

    new_location = LocationLog(
        device_id=location_in.device_id,
        latitude=location_in.latitude,
        longitude=location_in.longitude,
        altitude=location_in.altitude or 0.0,
        battery_level=location_in.battery_level,
        recorded_at=location_in.recorded_at or datetime.utcnow()
    )
    db.add(new_location)
    db.commit()
    db.refresh(new_location)
    return new_location

@router.get("/pet/{pet_id}/latest", response_model=LocationResponse)
def get_latest_pet_location(
    pet_id: UUID,
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
        raise HTTPException(status_code=400, detail="La mascota no tiene un dispositivo ESP32 vinculado.")

    latest_location = (
        db.query(LocationLog)
        .filter(LocationLog.device_id == pet.device_id)
        .order_by(LocationLog.recorded_at.desc())
        .first()
    )

    if not latest_location:
        raise HTTPException(status_code=404, detail="No se han registrado ubicaciones para esta mascota.")

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
        raise HTTPException(status_code=400, detail="La mascota no tiene un dispositivo ESP32 vinculado.")

    return (
        db.query(LocationLog)
        .filter(LocationLog.device_id == pet.device_id)
        .order_by(LocationLog.recorded_at.desc())
        .limit(limit)
        .all()
    )