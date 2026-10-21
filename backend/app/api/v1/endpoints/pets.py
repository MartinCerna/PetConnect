from typing import List
from datetime import date  # <-- Nuevo import necesario para el cálculo

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User, Pet, Device
from app.schemas.pet import PetCreate, PetResponse
from app.api.deps import get_current_user

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
    final_birth_date = pet_in.birth_date
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
