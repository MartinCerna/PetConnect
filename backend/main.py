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
            print("\n[Auto-Sync] Consultando nuevas ubicaciones a Google Find My...", flush=True)
            await asyncio.wait_for(asyncio.to_thread(ejecutar_sincronizacion_google), timeout=60)
            print("[Auto-Sync] Ciclo de consulta completado.", flush=True)
        except asyncio.TimeoutError:
            print("[Auto-Sync] Advertencia: Tiempo de espera agotado (60s). Se reintentará en el próximo ciclo.", flush=True)
        except Exception as e:
            print(f"[Auto-Sync] Error en ciclo: {e}", flush=True)
        await asyncio.sleep(intervalo_segundos)


HISTORIAL_ALERTAS_DISPARADAS = set()


async def tarea_verificacion_alertas_recordatorios(intervalo_segundos: int = 60):
    """
    Verifica cada 60 segundos si algún recordatorio activo coincide con la hora actual
    para despachar la alerta por correo electrónico al dueño de la mascota en tiempo real.
    """
    from datetime import datetime, timezone, timedelta
    from app.db.session import SessionLocal
    from app.db.models import Reminder
    from app.core.email import send_reminder_due_alert_email

    await asyncio.sleep(10)
    print("[Alertas-Recordatorios] Tarea en segundo plano iniciada (monitoreo cada 60s).", flush=True)

    while True:
        try:
            # Hora actual en Perú (UTC-5)
            now_local = datetime.now(timezone.utc) - timedelta(hours=5)
            hora_actual = now_local.strftime("%H:%M")
            fecha_hoy = now_local.strftime("%Y-%m-%d")

            db = SessionLocal()
            recordatorios_activos = (
                db.query(Reminder)
                .filter(Reminder.is_active == True, Reminder.is_completed == False)
                .all()
            )

            for r in recordatorios_activos:
                if not r.time_schedule or not r.user or not r.user.email:
                    continue

                horario = r.time_schedule.strip()
                if horario == hora_actual or horario.startswith(hora_actual):
                    clave_alerta = (str(r.id), fecha_hoy, hora_actual)
                    if clave_alerta not in HISTORIAL_ALERTAS_DISPARADAS:
                        HISTORIAL_ALERTAS_DISPARADAS.add(clave_alerta)
                        pet_name = r.pet.name if r.pet else "Tu mascota"
                        owner_name = r.user.full_name or "Dueño"
                        print(
                            f"[Alertas-Recordatorios] ¡Enviando alerta en tiempo real a {r.user.email} "
                            f"para '{r.title}' ({pet_name}) a las {hora_actual}!",
                            flush=True,
                        )
                        await asyncio.to_thread(
                            send_reminder_due_alert_email,
                            recipient_email=r.user.email,
                            owner_name=owner_name,
                            pet_name=pet_name,
                            title=r.title,
                            category=r.category,
                            time_schedule=r.time_schedule,
                            notes=r.notes,
                        )

            db.close()
        except Exception as e:
            print(f"[Alertas-Recordatorios] Error: {e}", flush=True)

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
        intervalo = int(os.getenv("SYNC_INTERVAL_SECONDS", "180"))
        task = asyncio.create_task(tarea_sincronizacion_continua(intervalo_segundos=intervalo))
        print(f"[Auto-Sync] Tarea de sincronización continua iniciada cada {intervalo} segundos.", flush=True)

    # Inicia tarea de verificación de alertas de recordatorios en tiempo real
    task_reminders = asyncio.create_task(tarea_verificacion_alertas_recordatorios(intervalo_segundos=60))

    yield

    if task:
        task.cancel()
    if task_reminders:
        task_reminders.cancel()


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
