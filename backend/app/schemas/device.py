from pydantic import BaseModel, Field
from typing import Optional
from uuid import UUID
from datetime import datetime

class DeviceBase(BaseModel):
    device_mac: str = Field(..., example="AA:BB:CC:DD:EE:FF", description="Dirección MAC física del ESP32-C3")
    eid_key: str = Field(..., example="e1f2a3b4c5d6...", description="Clave de anuncio EID generada")
    tracker_index: Optional[int] = Field(default=1, description="Índice del rastreador asignado")

class DeviceCreate(DeviceBase):
    pass

class DeviceResponse(DeviceBase):
    id: UUID
    user_id: UUID
    status: str
    created_at: datetime

    class Config:
        from_attributes = True