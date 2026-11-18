from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.db.models import User, Device, Pet, LocationLog
from app.schemas.device import (
    DeviceCreate,
    DeviceResponse,
    DeviceBatteryTelemetry,
    DeviceBatteryManualUpdate,
)
from app.api.deps import get_current_user, verify_ingest_key
from app.core.notifications import notify_low_battery

router = APIRouter()


def _apply_battery_update(
    db: Session,
    device: Device,
    battery_level: int,
    battery_voltage: Optional[float] = None,
    is_charging: Optional[bool] = False,
) -> Device:
    """Actualiza estado de batería en Device, último LocationLog y alerta si cruza <= 15%."""
    prev_level = device.battery_level
    was_low = prev_level is not None and prev_level <= 15

    device.battery_level = battery_level
    if battery_voltage is not None:
        device.battery_voltage = round(float(battery_voltage), 2)
    device.is_charging = bool(is_charging)
    device.battery_updated_at = datetime.now(timezone.utc)

    latest_log = (
        db.query(LocationLog)
        .filter(LocationLog.device_id == device.id)
        .order_by(LocationLog.recorded_at.desc())
        .first()
    )
    if latest_log:
        latest_log.battery_level = battery_level

    db.commit()
    db.refresh(device)

    if battery_level <= 15 and not device.is_charging and not was_low:
        try:
            pet = db.query(Pet).filter(Pet.device_id == device.id).first()
            notify_low_battery(
                db=db,
                user_id=device.user_id,
                pet_id=pet.id if pet else None,
                pet_name=pet.name if pet else f"Tag {device.device_mac}",
                device_mac=device.device_mac,
                battery_level=battery_level,
                battery_voltage=device.battery_voltage,
            )
        except Exception as exc:
            print(f"[Battery] Error enviando alerta de batería baja: {exc}", flush=True)

    return device

@router.post("/", response_model=DeviceResponse, status_code=status.HTTP_201_CREATED)
def register_device(
    device_in: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Registra un nuevo tag ESP32-C3 asociado a la cuenta del usuario autenticado.
    """
    # Verificar si el dispositivo ya está registrado en el sistema
    device_exists = db.query(Device).filter(Device.device_mac == device_in.device_mac).first()
    if device_exists:
        raise HTTPException(
            status_code=400,
            detail="La dirección MAC ingresada ya se encuentra registrada en el sistema."
        )

    new_device = Device(
        user_id=current_user.id,
        device_mac=device_in.device_mac.upper(),
        eid_key=device_in.eid_key,
        tracker_index=device_in.tracker_index,
        status="ACTIVE"
    )
    db.add(new_device)
    db.commit()
    db.refresh(new_device)
    return new_device

@router.get("/", response_model=List[DeviceResponse])
def list_my_devices(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lista todos los dispositivos ESP32 registrados por el usuario.
    """
    return db.query(Device).filter(Device.user_id == current_user.id).all()

@router.put("/{device_id}/link/{pet_id}", status_code=status.HTTP_200_OK)
def link_device_to_pet(
    device_id: UUID,
    pet_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Asocia un dispositivo ESP32 registrado a una mascota específica.
    """
    device = db.query(Device).filter(Device.id == device_id, Device.user_id == current_user.id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado o no autorizado.")

    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada o no autorizada.")

    pet.device_id = device.id
    db.commit()
    return {"status": "success", "message": f"Dispositivo {device.device_mac} vinculado exitosamente a {pet.name}."}

@router.put("/{device_id}/unlink", status_code=status.HTTP_200_OK)
def unlink_device(
    device_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Desvincula un dispositivo ESP32 de cualquier mascota a la que esté asociado.
    """
    device = db.query(Device).filter(Device.id == device_id, Device.user_id == current_user.id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado o no autorizado.")

    pets = db.query(Pet).filter(Pet.device_id == device.id, Pet.user_id == current_user.id).all()
    for p in pets:
        p.device_id = None
    db.commit()
    return {"status": "success", "message": f"Dispositivo {device.device_mac} desvinculado exitosamente."}

@router.post("/battery", response_model=DeviceResponse, status_code=status.HTTP_200_OK)
def ingest_device_battery(
    telemetry: DeviceBatteryTelemetry,
    _: None = Depends(verify_ingest_key),
    db: Session = Depends(get_db),
):
    """
    Recibe telemetría directa de batería enviada por el ESP32-C3 vía HTTP + X-API-Key.
    """
    device = None
    if telemetry.device_id:
        device = db.query(Device).filter(Device.id == telemetry.device_id).first()
    if not device and telemetry.device_mac:
        mac_clean = telemetry.device_mac.strip().upper()
        device = (
            db.query(Device)
            .filter(func.upper(Device.device_mac) == mac_clean)
            .first()
        )
    if not device:
        raise HTTPException(
            status_code=404,
            detail="Dispositivo ESP32 no encontrado para actualizar batería.",
        )

    return _apply_battery_update(
        db=db,
        device=device,
        battery_level=telemetry.battery_level,
        battery_voltage=telemetry.battery_voltage,
        is_charging=telemetry.is_charging,
    )


@router.put("/{device_id}/battery", response_model=DeviceResponse, status_code=status.HTTP_200_OK)
def update_device_battery_manual(
    device_id: UUID,
    payload: DeviceBatteryManualUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Permite al dueño actualizar o probar el estado de batería de su dispositivo desde la web/app.
    """
    device = (
        db.query(Device)
        .filter(Device.id == device_id, Device.user_id == current_user.id)
        .first()
    )
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado o no autorizado.")

    return _apply_battery_update(
        db=db,
        device=device,
        battery_level=payload.battery_level,
        battery_voltage=payload.battery_voltage,
        is_charging=payload.is_charging,
    )


@router.delete("/{device_id}", status_code=status.HTTP_200_OK)
def delete_device(
    device_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Elimina un dispositivo ESP32 registrado.
    """
    device = db.query(Device).filter(Device.id == device_id, Device.user_id == current_user.id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Dispositivo no encontrado o no autorizado.")

    pets = db.query(Pet).filter(Pet.device_id == device.id, Pet.user_id == current_user.id).all()
    for p in pets:
        p.device_id = None

    db.delete(device)
    db.commit()
    return {"status": "success", "message": f"Dispositivo {device.device_mac} eliminado exitosamente."}
