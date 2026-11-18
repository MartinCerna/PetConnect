import json
import os
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.db.models import AppNotification, PushSubscription

CATEGORY_NAMES = {
    "medicamento": "💊 Medicamento",
    "vacuna_desparasitacion": "💉 Vacuna / Desparasitación",
    "bano_paseo": "🛁 Baño y Paseo",
    "tips": "💡 Consejos de Bienestar",
}


def _send_web_push_to_user(
    db: Session,
    user_id,
    title: str,
    body: str,
    notif_type: str,
    data: Optional[Dict[str, Any]] = None,
) -> int:
    """
    Envía notificación Web Push a las suscripciones Android registradas del usuario
    cuando `pywebpush` y las claves VAPID están configuradas en el servidor.
    """
    vapid_private = os.getenv("VAPID_PRIVATE_KEY", "").strip()
    if not vapid_private:
        return 0

    try:
        from pywebpush import webpush, WebPushException
    except ImportError:
        return 0

    subscriptions = (
        db.query(PushSubscription)
        .filter(PushSubscription.user_id == user_id)
        .all()
    )
    if not subscriptions:
        return 0

    vapid_claims_sub = os.getenv("VAPID_CLAIMS_EMAIL", "mailto:soporte@petconnect.app").strip()
    payload = json.dumps(
        {
            "title": title,
            "body": body,
            "type": notif_type,
            "data": data or {},
        },
        ensure_ascii=False,
    )

    sent_count = 0
    for sub in subscriptions:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth,
                    },
                },
                data=payload,
                vapid_private_key=vapid_private,
                vapid_claims={"sub": vapid_claims_sub},
                timeout=6,
            )
            sent_count += 1
        except WebPushException as exc:
            status_code = getattr(getattr(exc, "response", None), "status_code", None)
            if status_code in (404, 410):
                db.delete(sub)
                db.commit()
            print(f"[WebPush] Error enviando push a suscripción {sub.id}: {exc}", flush=True)
        except Exception as exc:
            print(f"[WebPush] Excepción enviando push: {exc}", flush=True)

    return sent_count


def create_and_push_notification(
    db: Session,
    user_id,
    title: str,
    body: str,
    notif_type: str,
    pet_id=None,
    data: Optional[Dict[str, Any]] = None,
) -> AppNotification:
    """
    Registra una notificación persistente para el usuario (Centro de Notificaciones +
    cola móvil para el teléfono Android) y la despacha vía Web Push si aplica.
    """
    serialized_data = json.dumps(data, ensure_ascii=False) if data else None
    notif = AppNotification(
        user_id=user_id,
        pet_id=pet_id,
        type=notif_type,
        title=title,
        body=body,
        data_json=serialized_data,
        is_read=False,
        delivered_mobile=False,
    )
    db.add(notif)
    db.commit()
    db.refresh(notif)

    try:
        push_payload_data = dict(data or {})
        push_payload_data["notification_id"] = str(notif.id)
        _send_web_push_to_user(
            db=db,
            user_id=user_id,
            title=title,
            body=body,
            notif_type=notif_type,
            data=push_payload_data,
        )
    except Exception as exc:
        print(f"[Notifications] Advertencia despachando Web Push: {exc}", flush=True)

    print(f"[Notifications] 📱 Alerta móvil '{notif_type}' creada para usuario {user_id}: {title}", flush=True)
    return notif


def notify_reminder_created(
    db: Session,
    user_id,
    pet_id,
    pet_name: str,
    title: str,
    category: str,
    frequency: Optional[str] = None,
    time_schedule: Optional[str] = None,
    notes: Optional[str] = None,
) -> AppNotification:
    """Notificación en el teléfono al programar o crear un recordatorio."""
    category_label = CATEGORY_NAMES.get((category or "").lower(), f"📋 {category.capitalize()}")
    schedule_text = time_schedule or "Horario por confirmar"
    frequency_text = frequency or "Programado"

    notif_title = f"🐾 Recordatorio guardado para {pet_name}"
    notif_body = f"{title} ({category_label}) · {frequency_text} · {schedule_text}"
    if notes:
        notif_body += f" · Nota: {notes}"

    return create_and_push_notification(
        db=db,
        user_id=user_id,
        pet_id=pet_id,
        notif_type="reminder_created",
        title=notif_title,
        body=notif_body,
        data={
            "pet_name": pet_name,
            "category": category,
            "frequency": frequency_text,
            "time_schedule": schedule_text,
            "notes": notes,
            "target_url": "/dashboard/recordatorios",
        },
    )


def notify_reminder_due(
    db: Session,
    user_id,
    pet_id,
    pet_name: str,
    reminder_id,
    title: str,
    category: str,
    frequency: Optional[str] = None,
    time_schedule: Optional[str] = None,
    notes: Optional[str] = None,
) -> AppNotification:
    """Alerta en tiempo real enviada al teléfono cuando llega la hora de un recordatorio."""
    category_label = CATEGORY_NAMES.get((category or "").lower(), f"📋 {category.capitalize()}")
    schedule_text = time_schedule or "Ahora"
    frequency_text = frequency or "Programado"

    notif_title = f"🔔 ¡Es hora de {title} para {pet_name}!"
    notif_body = f"{category_label} · Horario: {schedule_text}"
    if notes:
        notif_body += f" · Dosis/Nota: {notes}"

    return create_and_push_notification(
        db=db,
        user_id=user_id,
        pet_id=pet_id,
        notif_type="reminder_due",
        title=notif_title,
        body=notif_body,
        data={
            "pet_name": pet_name,
            "reminder_id": str(reminder_id),
            "category": category,
            "frequency": frequency_text,
            "time_schedule": schedule_text,
            "notes": notes,
            "target_url": "/dashboard/recordatorios",
        },
    )


def notify_geofence_exit(
    db: Session,
    user_id,
    pet_id,
    pet_name: str,
    distance_meters: float,
    safe_radius_meters: int,
    latitude: float,
    longitude: float,
    detected_at_text: Optional[str] = None,
) -> AppNotification:
    """Alerta inmediata en el teléfono cuando la mascota sale de la Zona Segura."""
    dist_int = int(round(distance_meters))
    time_label = detected_at_text or "Hace un momento"

    notif_title = f"🚨 {pet_name} salió de su Zona Segura"
    notif_body = (
        f"Detectado a {dist_int} m de Casa (límite permitido: {safe_radius_meters} m) "
        f"· {time_label}. Toca para ver en el mapa."
    )

    return create_and_push_notification(
        db=db,
        user_id=user_id,
        pet_id=pet_id,
        notif_type="geofence_exit",
        title=notif_title,
        body=notif_body,
        data={
            "pet_name": pet_name,
            "distance_meters": dist_int,
            "safe_radius_meters": safe_radius_meters,
            "latitude": latitude,
            "longitude": longitude,
            "detected_at": time_label,
            "target_url": "/dashboard",
        },
    )


def notify_low_battery(
    db: Session,
    user_id,
    pet_id,
    pet_name: str,
    device_mac: str,
    battery_level: int,
    battery_voltage: Optional[float] = None,
) -> AppNotification:
    """Alerta al dueño cuando la batería del collar ESP32-C3 baja al umbral crítico (<= 15%)."""
    voltage_text = f" ({battery_voltage:.2f} V)" if battery_voltage is not None else ""
    notif_title = f"🪫 Batería baja en el collar de {pet_name} ({battery_level}%)"
    notif_body = (
        f"El tag {device_mac} está al {battery_level}%{voltage_text}. "
        "Conéctalo al cargador para no perder el rastreo."
    )

    return create_and_push_notification(
        db=db,
        user_id=user_id,
        pet_id=pet_id,
        notif_type="battery_low",
        title=notif_title,
        body=notif_body,
        data={
            "pet_name": pet_name,
            "device_mac": device_mac,
            "battery_level": battery_level,
            "battery_voltage": battery_voltage,
            "target_url": "/dashboard/dispositivos",
        },
    )
