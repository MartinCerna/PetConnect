import uuid
from datetime import datetime
from sqlalchemy import (
    Column,
    String,
    Text,
    Boolean,
    DateTime,
    Date,
    ForeignKey,
    Integer,
    BigInteger,
    Float,
    Numeric,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from app.db.session import Base


# 1. Modelo de Usuario
class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(150), nullable=False)
    phone = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relaciones
    pets = relationship("Pet", back_populates="owner", cascade="all, delete-orphan")
    devices = relationship(
        "Device", back_populates="owner", cascade="all, delete-orphan"
    )


# 2. Modelo de Dispositivo ESP32
class Device(Base):
    __tablename__ = "devices"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    device_mac = Column(String(17), unique=True, nullable=False)
    eid_key = Column(String(64), nullable=False)
    tracker_index = Column(Integer, default=1)
    status = Column(String(20), default="ACTIVE")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    owner = relationship("User", back_populates="devices")
    pet = relationship("Pet", back_populates="device", uselist=False)
    location_logs = relationship(
        "LocationLog", back_populates="device", cascade="all, delete-orphan"
    )


# 3. Modelo de Mascota
class Pet(Base):
    __tablename__ = "pets"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    device_id = Column(UUID(as_uuid=True), ForeignKey("devices.id"), nullable=True)

    name = Column(String, nullable=False)
    species = Column(String, nullable=False)
    breed = Column(String, nullable=True)
    # ¡La línea "age = Column(...)" DEBE ESTAR BORRADA AQUÍ!
    birth_date = Column(Date, nullable=True)
    photo_url = Column(String, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relaciones
    owner = relationship("User", back_populates="pets")
    device = relationship("Device", back_populates="pet")
    vaccines = relationship(
        "Vaccine", back_populates="pet", cascade="all, delete-orphan"
    )
    medical_records = relationship(
        "MedicalRecord", back_populates="pet", cascade="all, delete-orphan"
    )


# 4. Modelo de Logs de Ubicación
class LocationLog(Base):
    __tablename__ = "location_logs"

    id = Column(BigInteger, primary_key=True, autoincrement=True)
    device_id = Column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False
    )
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    altitude = Column(Float, default=0.0)
    battery_level = Column(Integer, nullable=True)
    recorded_at = Column(
        DateTime(timezone=True), nullable=False, default=datetime.utcnow
    )
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Atributo de relación requerido para sincronizar con la clase Device
    device = relationship("Device", back_populates="location_logs")


# 5. Modelo de Vacunas
class Vaccine(Base):
    __tablename__ = "vaccines"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pet_id = Column(
        UUID(as_uuid=True), ForeignKey("pets.id", ondelete="CASCADE"), nullable=False
    )
    vaccine_name = Column(String(150), nullable=False)
    applied_date = Column(Date, nullable=False)
    next_due_date = Column(Date, nullable=False)
    notified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    pet = relationship("Pet", back_populates="vaccines")


# 6. Modelo de Historial Médico
class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    pet_id = Column(
        UUID(as_uuid=True), ForeignKey("pets.id", ondelete="CASCADE"), nullable=False
    )
    title = Column(String(200), nullable=False)
    veterinarian = Column(String(150))
    diagnosis = Column(Text)
    treatment = Column(Text)
    record_date = Column(Date, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    pet = relationship("Pet", back_populates="medical_records")
