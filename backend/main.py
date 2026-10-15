import os
import sys

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.db.session import get_db
from app.api.v1.endpoints import auth, pets, devices, locations

app = FastAPI(
    title="PetConnect API Core",
    description="API RESTful empresarial para la gestión, geolocalización y salud de mascotas",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registrar routers de la API v1
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Autenticación"])
app.include_router(pets.router, prefix="/api/v1/pets", tags=["Mascotas"])
app.include_router(devices.router, prefix="/api/v1/devices", tags=["Dispositivos ESP32"])
app.include_router(locations.router, prefix="/api/v1/locations", tags=["Ubicaciones y Geolocalización"])

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