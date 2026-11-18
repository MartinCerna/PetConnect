import json
import os
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.core.notifications import create_and_push_notification
from app.db.models import AppNotification, PushSubscription, User
from app.db.session import get_db
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    PushSubscriptionCreate,
)

router = APIRouter()


def _serialize_notification(item: AppNotification) -> NotificationResponse:
    parsed_data = None
    if item.data_json:
        try:
            parsed_data = json.loads(item.data_json)
        except Exception:
            parsed_data = None

    return NotificationResponse(
        id=item.id,
        user_id=item.user_id,
        pet_id=item.pet_id,
        type=item.type,
        title=item.title,
        body=item.body,
        data=parsed_data,
        is_read=bool(item.is_read),
        delivered_mobile=bool(item.delivered_mobile),
        created_at=item.created_at,
    )


@router.get("/", response_model=NotificationListResponse)
def list_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Lista las últimas 50 notificaciones del usuario y el conteo de no leídas."""
    items = (
        db.query(AppNotification)
        .filter(AppNotification.user_id == current_user.id)
        .order_by(AppNotification.created_at.desc())
        .limit(50)
        .all()
    )
    unread_count = (
        db.query(AppNotification)
        .filter(
            AppNotification.user_id == current_user.id,
            AppNotification.is_read == False,
        )
        .count()
    )
    return NotificationListResponse(
        notifications=[_serialize_notification(n) for n in items],
        unread_count=unread_count,
    )


@router.get("/pending-mobile", response_model=List[NotificationResponse])
def pull_pending_mobile_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Entrega las notificaciones nuevas aún no mostradas en el teléfono Android y las
    marca como entregadas para evitar duplicados en el dispositivo.
    """
    pending = (
        db.query(AppNotification)
        .filter(
            AppNotification.user_id == current_user.id,
            AppNotification.delivered_mobile == False,
        )
        .order_by(AppNotification.created_at.asc())
        .all()
    )

    if not pending:
        return []

    serialized = [_serialize_notification(n) for n in pending]
    for item in pending:
        item.delivered_mobile = True
    db.commit()

    return serialized


@router.put("/read-all")
def mark_all_notifications_read(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca todas las notificaciones del usuario como leídas."""
    db.query(AppNotification).filter(
        AppNotification.user_id == current_user.id,
        AppNotification.is_read == False,
    ).update({"is_read": True}, synchronize_session=False)
    db.commit()
    return {"status": "ok"}


@router.put("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_read(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Marca una notificación específica como leída."""
    notif = (
        db.query(AppNotification)
        .filter(
            AppNotification.id == notification_id,
            AppNotification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada.")

    notif.is_read = True
    notif.delivered_mobile = True
    db.commit()
    db.refresh(notif)
    return _serialize_notification(notif)


@router.delete("/clear-all", status_code=status.HTTP_204_NO_CONTENT)
def clear_all_notifications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina todo el historial de notificaciones del usuario."""
    db.query(AppNotification).filter(
        AppNotification.user_id == current_user.id
    ).delete(synchronize_session=False)
    db.commit()
    return None


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Elimina una notificación específica del historial."""
    notif = (
        db.query(AppNotification)
        .filter(
            AppNotification.id == notification_id,
            AppNotification.user_id == current_user.id,
        )
        .first()
    )
    if not notif:
        raise HTTPException(status_code=404, detail="Notificación no encontrada.")

    db.delete(notif)
    db.commit()
    return None


@router.get("/vapid-public-key")
def get_vapid_public_key():
    """Devuelve la clave pública VAPID si Web Push está habilitado en el servidor."""
    return {"public_key": os.getenv("VAPID_PUBLIC_KEY", "").strip()}


@router.post("/push-subscribe")
def register_push_subscription(
    sub_in: PushSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Registra o actualiza una suscripción Web Push del dispositivo Android."""
    existing = (
        db.query(PushSubscription)
        .filter(PushSubscription.endpoint == sub_in.endpoint)
        .first()
    )
    if existing:
        existing.user_id = current_user.id
        existing.p256dh = sub_in.keys.p256dh
        existing.auth = sub_in.keys.auth
        existing.user_agent = sub_in.user_agent
    else:
        sub = PushSubscription(
            user_id=current_user.id,
            endpoint=sub_in.endpoint,
            p256dh=sub_in.keys.p256dh,
            auth=sub_in.keys.auth,
            user_agent=sub_in.user_agent,
        )
        db.add(sub)
    db.commit()
    return {"status": "subscribed"}


@router.post("/test", response_model=NotificationResponse)
def send_test_mobile_notification(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Genera una notificación de prueba inmediata hacia el teléfono del usuario."""
    notif = create_and_push_notification(
        db=db,
        user_id=current_user.id,
        notif_type="test",
        title="🔔 Notificación de prueba PetConnect",
        body="¡Perfecto! Tus alertas de Zona Segura y Recordatorios llegarán directo a tu teléfono.",
        data={"target_url": "/dashboard"},
    )
    return _serialize_notification(notif)
