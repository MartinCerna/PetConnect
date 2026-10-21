from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import date, datetime


class PetBase(BaseModel):
    name: str
    species: str
    breed: Optional[str] = None
    photo_url: Optional[str] = None


# Esquema para la petición de CREACIÓN (Recibe 'age' del frontend)
class PetCreate(PetBase):
    age: Optional[int] = None


# Esquema de RESPUESTA (Calcula 'age' a partir de 'birth_date')
class PetResponse(PetBase):
    id: UUID
    user_id: UUID
    device_id: Optional[UUID] = None
    birth_date: Optional[date] = None
    created_at: datetime

    # Campo computado que se genera solo al enviar la respuesta
    @property
    def age(self) -> Optional[int]:
        if self.birth_date is None:
            return None
        today = date.today()
        # Calcula la edad exacta restando años y ajustando si aún no ha sido su cumpleaños este año
        return (
            today.year
            - self.birth_date.year
            - ((today.month, today.day) < (self.birth_date.month, self.birth_date.day))
        )

    class Config:
        from_attributes = True
