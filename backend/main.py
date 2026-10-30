import asyncio
import os
import sys
from contextlib import asynccontextmanager

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db, engine
from app.db.models import Order, ContactMessage, Reminder
from app.api.v1.endpoints import auth, pets, devices, locations, orders, contact, reminders

# La sincronización con Google Find My es opcional: ENABLE_GOOGLE_SYNC=false la desactiva
ENABLE_GOOGLE_SYNC = os.getenv("ENABLE_GOOGLE_SYNC", "false").lower() == "true"


async def tarea_sincronizacion_continua(intervalo_segundos: int = 180):
    """Bucle que solicita ubicaciones a Google cada 3 minutos en segundo plano."""
    from google_location import ejecutar_sincronizacion_google

    await asyncio.sleep(5)  # Espera a que la API inicie completamente
    while True:
        try:
            print("\n[Auto-Sync] Consultando nuevas ubicaciones a Google Find My...")
            await asyncio.to_thread(ejecutar_sincronizacion_google)
        except Exception as e:
            print(f"[Auto-Sync] Error: {e}")
        await asyncio.sleep(intervalo_segundos)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Crea tablas nuevas y asegura columnas si no existen en la base de datos
    try:
        Order.__table__.create(bind=engine, checkfirst=True)
        ContactMessage.__table__.create(bind=engine, checkfirst=True)
        Reminder.__table__.create(bind=engine, checkfirst=True)
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS address VARCHAR(255);"))
            conn.commit()
    except Exception as e:
        print(f"[DB] No se pudieron verificar tablas o columnas: {e}")

    task = None
    if ENABLE_GOOGLE_SYNC:
        task = asyncio.create_task(tarea_sincronizacion_continua(intervalo_segundos=180))
    yield
    if task:
        task.cancel()


app = FastAPI(
    title="PetConnect API Core",
    description="API RESTful empresarial para la gestión, geolocalización y salud de mascotas",
    version="1.0.0",
    lifespan=lifespan,
)

# Configuración de CORS permitiendo dominios locales y producción (Vercel)
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://pet-connect-flame.vercel.app",
]

# Si se define FRONTEND_URL adicional en variables de entorno, la agrega
extra_frontend = os.getenv("FRONTEND_URL")
if extra_frontend:
    ALLOWED_ORIGINS.append(extra_frontend.rstrip("/"))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Permite preview deployments de Vercel
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers de la API v1
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(pets.router, prefix="/api/v1/pets", tags=["Mascotas"])
app.include_router(devices.router, prefix="/api/v1/devices", tags=["Dispositivos ESP32"])
app.include_router(locations.router, prefix="/api/v1/locations", tags=["Ubicaciones y Geolocalización"])
app.include_router(orders.router, prefix="/api/v1/orders", tags=["Pedidos"])
app.include_router(contact.router, prefix="/api/v1/contact", tags=["Contacto"])
app.include_router(reminders.router, prefix="/api/v1/reminders", tags=["Recordatorios"])


@app.get("/api/v1/health", tags=["Infraestructura"])
def health_check(db: Session = Depends(get_db)):
    try:
        result = db.execute(text("SELECT 1")).fetchone()
        if result:
            return {
                "status": "online",
                "database": "connected",
                "provider": "Supabase PostgreSQL"
            }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error de conexión con la base de datos: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
