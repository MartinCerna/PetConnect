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
    battery_level: Optional[int] = 100
    battery_voltage: Optional[float] = None
    is_charging: Optional[bool] = False
    battery_updated_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DeviceBatteryTelemetry(BaseModel):
    device_id: Optional[UUID] = Field(default=None, description="UUID del dispositivo ESP32")
    device_mac: Optional[str] = Field(default=None, description="Dirección MAC del dispositivo ESP32")
    battery_level: int = Field(..., ge=0, le=100, description="Nivel de batería en porcentaje (0-100)")
    battery_voltage: Optional[float] = Field(default=None, ge=0.0, le=6.0, description="Voltaje medido de la batería LiPo")
    is_charging: Optional[bool] = Field(default=False, description="Indica si la batería está cargando")


class DeviceBatteryManualUpdate(BaseModel):
    battery_level: int = Field(..., ge=0, le=100, description="Nivel de batería en porcentaje (0-100)")
    battery_voltage: Optional[float] = Field(default=None, ge=0.0, le=6.0, description="Voltaje de la batería LiPo")
    is_charging: Optional[bool] = Field(default=False, description="Indica si la batería está cargando")