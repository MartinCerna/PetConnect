from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime


class ReminderBase(BaseModel):
    category: str = Field(..., description="Categoría: 'medicamento', 'vacuna_desparasitacion', 'bano_paseo'")
    title: str = Field(..., min_length=1, max_length=200, description="Nombre de la medicina, vacuna o actividad")
    frequency: Optional[str] = Field(None, max_length=100, description="Frecuencia (ej: Cada 8 horas, Diario)")
    time_schedule: Optional[str] = Field(None, max_length=100, description="Horario o fecha programada")
    notes: Optional[str] = Field(None, description="Instrucciones adicionales o dosis")
    is_active: bool = True


class ReminderCreate(ReminderBase):
    pet_id: Optional[UUID] = None


class ReminderUpdate(BaseModel):
    category: Optional[str] = None
    title: Optional[str] = None
    frequency: Optional[str] = None
    time_schedule: Optional[str] = None
    notes: Optional[str] = None
    is_completed: Optional[bool] = None
    is_active: Optional[bool] = None
    pet_id: Optional[UUID] = None


class ReminderResponse(ReminderBase):
    id: UUID
    user_id: UUID
    pet_id: Optional[UUID] = None
    is_completed: bool = False
    created_at: datetime
    pet_name: Optional[str] = None

    class Config:
        from_attributes = True

