import math
from datetime import datetime, timezone, timedelta
from typing import Optional
from sqlalchemy.orm import Session

from app.db.models import Pet
from app.core.email import send_geofence_exit_alert_email


def calculate_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calcula la distancia geodésica en metros entre dos coordenadas mediante la fórmula de Haversine."""
    earth_radius_m = 6371000.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return earth_radius_m * c


def evaluate_pet_geofence(
    db: Session,
    device_id,
    latitude: float,
    longitude: float,
    recorded_at: Optional[datetime] = None,
    send_email_on_exit: bool = True,
) -> dict:
    """
    Evalúa si una nueva coordenada del dispositivo cae fuera de la Zona Segura ("Casa")
    configurada para la mascota asociada. Dispara correo electrónico solo en la transición
    de dentro -> fuera para evitar notificaciones duplicadas.
    """
    pet = db.query(Pet).filter(Pet.device_id == device_id).first()
    if not pet:
        return {"evaluated": False, "reason": "no_pet"}

    if not pet.safe_zone_enabled or pet.home_latitude is None or pet.home_longitude is None:
        return {"evaluated": False, "reason": "safe_zone_disabled"}

    radius_m = int(pet.safe_radius_meters or 150)
    dist_m = calculate_distance_meters(pet.home_latitude, pet.home_longitude, latitude, longitude)
    outside = dist_m > radius_m
    was_outside = bool(pet.is_outside_safe_zone)

    alert_sent = False
    if outside and not was_outside:
        pet.is_outside_safe_zone = True
        pet.last_geofence_alert_at = datetime.now(timezone.utc)
        db.commit()

        if send_email_on_exit and pet.owner and pet.owner.email:
            try:
                peru_tz = timezone(timedelta(hours=-5))
                ref_dt = recorded_at or datetime.now(timezone.utc)
                if ref_dt.tzinfo is None:
                    ref_dt = ref_dt.replace(tzinfo=timezone.utc)
                time_text = ref_dt.astimezone(peru_tz).strftime("%d/%m/%Y %H:%M:%S")
                alert_sent = send_geofence_exit_alert_email(
                    recipient_email=pet.owner.email,
                    owner_name=pet.owner.full_name or "Dueño",
                    pet_name=pet.name,
                    distance_meters=dist_m,
                    safe_radius_meters=radius_m,
                    latitude=latitude,
                    longitude=longitude,
                    detected_at_text=time_text,
                )
            except Exception as exc:
                print(f"[Geofence] Advertencia enviando correo de alerta: {exc}", flush=True)
    elif not outside and was_outside:
        pet.is_outside_safe_zone = False
        db.commit()

    return {
        "evaluated": True,
        "pet_id": str(pet.id),
        "distance_meters": round(dist_m, 1),
        "safe_radius_meters": radius_m,
        "is_outside": outside,
        "alert_sent": alert_sent,
    }
