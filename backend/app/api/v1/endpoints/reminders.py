import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models import User, Pet, Reminder
from app.schemas.reminder import ReminderCreate, ReminderUpdate, ReminderResponse
from app.api.deps import get_current_user

router = APIRouter()


@router.get("/", response_model=List[ReminderResponse])
def list_reminders(
    category: Optional[str] = Query(None, description="Filtrar por categoría"),
    pet_id: Optional[str] = Query(None, description="Filtrar por mascota"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lista todos los recordatorios creados por el usuario autenticado.
    Permite filtrar por categoría (medicamento, vacuna_desparasitacion, bano_paseo) o mascota.
    """
    query = db.query(Reminder).filter(Reminder.user_id == current_user.id)
    if category:
        query = query.filter(Reminder.category == category)
    if pet_id:
        try:
            pid = uuid.UUID(pet_id)
            query = query.filter(Reminder.pet_id == pid)
        except ValueError:
            pass

    reminders = query.order_by(Reminder.created_at.desc()).all()
    # Mapea pet_name si la mascota está asociada
    result = []
    for r in reminders:
        resp = ReminderResponse.from_orm(r)
        if r.pet:
            resp.pet_name = r.pet.name
        result.append(resp)
    return result


@router.post("/", response_model=ReminderResponse, status_code=status.HTTP_201_CREATED)
def create_reminder(
    reminder_in: ReminderCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Crea un nuevo recordatorio configurable (Medicamento, Vacunas/Desparasitaciones, Baños y Paseos).
    """
    # Si se asocia a una mascota, verificar que pertenezca al usuario
    if reminder_in.pet_id:
        pet = db.query(Pet).filter(Pet.id == reminder_in.pet_id, Pet.user_id == current_user.id).first()
        if not pet:
            raise HTTPException(status_code=404, detail="La mascota especificada no pertenece a tu cuenta.")

    reminder = Reminder(
        user_id=current_user.id,
        pet_id=reminder_in.pet_id,
        category=reminder_in.category,
        title=reminder_in.title.strip(),
        frequency=reminder_in.frequency.strip() if reminder_in.frequency else None,
        time_schedule=reminder_in.time_schedule.strip() if reminder_in.time_schedule else None,
        notes=reminder_in.notes.strip() if reminder_in.notes else None,
        is_active=reminder_in.is_active,
        is_completed=False,
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    resp = ReminderResponse.from_orm(reminder)
    if reminder.pet:
        resp.pet_name = reminder.pet.name
    return resp


@router.put("/{reminder_id}", response_model=ReminderResponse)
def update_reminder(
    reminder_id: uuid.UUID,
    reminder_in: ReminderUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Actualiza el estado, horario, frecuencia o completitud de un recordatorio.
    """
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado.")

    if reminder_in.category is not None:
        reminder.category = reminder_in.category
    if reminder_in.title is not None and reminder_in.title.strip():
        reminder.title = reminder_in.title.strip()
    if reminder_in.frequency is not None:
        reminder.frequency = reminder_in.frequency.strip() if reminder_in.frequency else None
    if reminder_in.time_schedule is not None:
        reminder.time_schedule = reminder_in.time_schedule.strip() if reminder_in.time_schedule else None
    if reminder_in.notes is not None:
        reminder.notes = reminder_in.notes.strip() if reminder_in.notes else None
    if reminder_in.is_completed is not None:
        reminder.is_completed = reminder_in.is_completed
    if reminder_in.is_active is not None:
        reminder.is_active = reminder_in.is_active
    if reminder_in.pet_id is not None:
        reminder.pet_id = reminder_in.pet_id

    db.commit()
    db.refresh(reminder)

    resp = ReminderResponse.from_orm(reminder)
    if reminder.pet:
        resp.pet_name = reminder.pet.name
    return resp


@router.delete("/{reminder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_reminder(
    reminder_id: uuid.UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Elimina un recordatorio existente.
    """
    reminder = db.query(Reminder).filter(Reminder.id == reminder_id, Reminder.user_id == current_user.id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Recordatorio no encontrado.")

    db.delete(reminder)
    db.commit()
    return None
