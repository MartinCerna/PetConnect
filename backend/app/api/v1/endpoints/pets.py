import uuid
from typing import List, Optional
from datetime import date  # <-- Nuevo import necesario para el cálculo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User, Pet, Device, LocationLog
from app.schemas.pet import PetCreate, PetResponse, PetSafeZoneUpdate
from app.api.deps import get_current_user
from app.core.geofence import calculate_distance_meters

router = APIRouter()


@router.post("/", response_model=PetResponse, status_code=status.HTTP_201_CREATED)
def create_pet(
    pet_in: PetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Registra una nueva mascota vinculada al usuario autenticado.
    """
    device_id = None
    if getattr(pet_in, "device_mac", None):
        device = (
            db.query(Device)
            .filter(
                Device.device_mac == pet_in.device_mac,
                Device.user_id == current_user.id,
            )
            .first()
        )
        if not device:
            raise HTTPException(
                status_code=404,
                detail="El dispositivo ESP32 especificado no existe o no está vinculado a tu cuenta.",
            )
        device_id = device.id

    # 1. Determinamos la fecha de nacimiento real o calculada
    final_birth_date = getattr(pet_in, 'birth_date', None)
    if getattr(pet_in, "age", None) is not None:
        current_year = date.today().year
        # Si envían "6", se resta al año actual y se fija al 1 de enero
        final_birth_date = date(current_year - pet_in.age, 1, 1)

    # 2. Guardamos en base de datos usando la fecha procesada
    new_pet = Pet(
        user_id=current_user.id,
        device_id=device_id,
        name=pet_in.name,
        species=pet_in.species,
        breed=pet_in.breed,
        birth_date=final_birth_date,  # <-- Insertamos el cálculo automático
        photo_url=pet_in.photo_url,
    )

    db.add(new_pet)
    db.commit()
    db.refresh(new_pet)
    return new_pet


@router.get("/", response_model=List[PetResponse])
def list_my_pets(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Lista las mascotas registradas por el usuario actualmente autenticado.
    """
    return db.query(Pet).filter(Pet.user_id == current_user.id).all()


@router.put("/{pet_id}/safe-zone", response_model=PetResponse)
def update_pet_safe_zone(
    pet_id: uuid.UUID,
    zone_in: PetSafeZoneUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Configura la ubicación "Casa" y el radio seguro (en metros) para la mascota.
    """
    pet = db.query(Pet).filter(Pet.id == pet_id, Pet.user_id == current_user.id).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada o no autorizada.")

    if zone_in.home_latitude is not None:
        pet.home_latitude = zone_in.home_latitude
    if zone_in.home_longitude is not None:
        pet.home_longitude = zone_in.home_longitude
    if zone_in.safe_radius_meters is not None:
        pet.safe_radius_meters = zone_in.safe_radius_meters

    if zone_in.safe_zone_enabled and (pet.home_latitude is None or pet.home_longitude is None):
        raise HTTPException(
            status_code=400,
            detail="Debes seleccionar una ubicación para Casa antes de activar la Zona Segura.",
        )

    pet.safe_zone_enabled = zone_in.safe_zone_enabled

    # Recalcula si la última coordenada conocida ya está fuera del rango configurado
    if pet.safe_zone_enabled and pet.device_id and pet.home_latitude is not None and pet.home_longitude is not None:
        latest = (
            db.query(LocationLog)
            .filter(LocationLog.device_id == pet.device_id)
            .order_by(LocationLog.recorded_at.desc())
            .first()
        )
        if latest:
            dist = calculate_distance_meters(
                pet.home_latitude, pet.home_longitude, latest.latitude, latest.longitude
            )
            pet.is_outside_safe_zone = dist > (pet.safe_radius_meters or 150)
        else:
            pet.is_outside_safe_zone = False
    else:
        pet.is_outside_safe_zone = False

    db.commit()
    db.refresh(pet)
    return pet


@router.get("/{pet_id}/contact")
def get_pet_contact_info(pet_id: str, db: Session = Depends(get_db)):
    """
    Endpoint público accesible al escanear la placa/collar de la mascota.
    Retorna los datos de contacto del dueño (nombre, celular, dirección)
    para que quien encuentre a la mascota pueda comunicarse de inmediato.
    """
    try:
        pid = uuid.UUID(pet_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Identificador de mascota inválido.")

    pet = db.query(Pet).filter(Pet.id == pid).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Mascota no encontrada.")

    owner = pet.owner
    return {
        "pet_id": str(pet.id),
        "name": pet.name,
        "species": pet.species,
        "breed": pet.breed,
        "birth_date": pet.birth_date.isoformat() if pet.birth_date else None,
        "photo_url": pet.photo_url,
        "owner_name": owner.full_name if owner else "Dueño de PetConnect",
        "owner_phone": getattr(owner, "phone", None) if owner else None,
        "owner_address": getattr(owner, "address", None) if owner else None,
    }
