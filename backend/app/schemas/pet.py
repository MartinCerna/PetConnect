from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, datetime

class PetBase(BaseModel):
    name: str
    species: str
    breed: Optional[str] = None
    birth_date: Optional[date] = None
    photo_url: Optional[str] = None

class PetCreate(PetBase):
    device_mac: Optional[str] = None  # Dirección MAC del ESP32 si se vincula al crear

class PetResponse(PetBase):
    id: UUID
    user_id: UUID
    device_id: Optional[UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True