from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class LocationCreate(BaseModel):
    device_id: UUID = Field(..., description="ID (UUID) del dispositivo ESP32")
    latitude: float = Field(..., example=-12.046374, description="Latitud GPS")
    longitude: float = Field(..., example=-77.042793, description="Longitud GPS")
    altitude: Optional[float] = Field(default=0.0, example=10.5, description="Altitud en metros")
    battery_level: Optional[int] = Field(default=100, example=95, description="Porcentaje de batería (0-100%)")
    recorded_at: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Fecha/hora de la captura")

class LocationResponse(BaseModel):
    id: int
    device_id: UUID
    latitude: float
    longitude: float
    altitude: Optional[float]
    battery_level: Optional[int]
    recorded_at: datetime
    created_at: Optional[datetime]

    class Config:
        from_attributes = True