from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.db.models import ContactMessage
from app.db.session import get_db

router = APIRouter()


class ContactCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    message: str = Field(..., min_length=5, max_length=2000)


@router.post("/", status_code=status.HTTP_201_CREATED)
def send_contact_message(data: ContactCreate, db: Session = Depends(get_db)):
    """Guarda un mensaje del formulario de contacto de la web (público)."""
    db.add(ContactMessage(name=data.name.strip(), email=data.email, message=data.message.strip()))
    db.commit()
    return {"status": "received"}

