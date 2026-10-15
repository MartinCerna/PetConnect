from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID

from app.db.session import get_db
from app.db.models import User, Device, Pet
from app.schemas.device import DeviceCreate, DeviceResponse
from app.api.deps import get_current_user

router = APIRouter()

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