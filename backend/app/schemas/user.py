from pydantic import BaseModel, EmailStr
from typing import Optional
from uuid import UUID
from datetime import datetime

# Esquema base con atributos comunes
class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    phone: Optional[str] = None

# Datos requeridos para el registro de usuario
class UserCreate(UserBase):
    password: str

# Respuesta pública del perfil de usuario
class UserResponse(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Estructura del Token JWT
class Token(BaseModel):
    access_token: str
    token_type: str

# Payload extraído del Token
class TokenData(BaseModel):
    user_id: Optional[str] = None