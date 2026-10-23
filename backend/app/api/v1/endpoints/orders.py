import json
import re
import uuid
from decimal import Decimal
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.models import Order, User
from app.db.session import get_db

router = APIRouter()

# Catálogo del servidor: el precio NUNCA se toma del navegador
CATALOG = {
    "tag-bone-01": {"name": "PetConnect Bone Tag", "price": Decimal("29.99")},
}

UPLOAD_DIR = Path(__file__).resolve().parents[4] / "uploads" / "payments"
MAX_PROOF_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


class OrderResponse(BaseModel):
    id: uuid.UUID
    total: Decimal
    status: str

    class Config:
        from_attributes = True


@router.post("/", response_model=OrderResponse, status_code=status.HTTP_201_CREATED)
async def create_order(
    items: str = Form(..., description='JSON: [{"id": "tag-bone-01", "quantity": 1}]'),
    shipping_name: str = Form(..., min_length=2, max_length=150),
    shipping_phone: str = Form(..., min_length=6, max_length=30),
    shipping_address: str = Form(..., min_length=5, max_length=300),
    payment_proof: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Crea un pedido pendiente de validación con la captura del pago por Yape."""
    try:
        raw_items: List[dict] = json.loads(items)
        assert isinstance(raw_items, list) and raw_items
    except (ValueError, AssertionError):
        raise HTTPException(status_code=422, detail="El carrito es inválido o está vacío.")

    total = Decimal("0")
    clean_items = []
    for it in raw_items:
        product = CATALOG.get(str(it.get("id")))
        try:
            qty = int(it.get("quantity", 0))
        except (TypeError, ValueError):
            qty = 0
        if not product or not 1 <= qty <= 20:
            raise HTTPException(status_code=422, detail="Producto o cantidad inválida.")
        total += product["price"] * qty
        clean_items.append({"id": it["id"], "name": product["name"], "quantity": qty,
                            "price": str(product["price"])})

    if payment_proof.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=422, detail="La captura debe ser JPG, PNG o WEBP.")
    content = await payment_proof.read(MAX_PROOF_BYTES + 1)
    if len(content) > MAX_PROOF_BYTES:
        raise HTTPException(status_code=413, detail="La captura supera los 5 MB.")
    if not content:
        raise HTTPException(status_code=422, detail="La captura está vacía.")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}{ALLOWED_TYPES[payment_proof.content_type]}"
    (UPLOAD_DIR / filename).write_bytes(content)

    order = Order(
        user_id=current_user.id,
        items_json=json.dumps(clean_items),
        total=total,
        shipping_name=re.sub(r"\s+", " ", shipping_name).strip(),
        shipping_phone=shipping_phone.strip(),
        shipping_address=shipping_address.strip(),
        payment_proof_path=filename,
        status="PENDING",
    )
    db.add(order)
    db.commit()
    db.refresh(order)
    return order

