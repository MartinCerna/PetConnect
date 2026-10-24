# Guía de Despliegue Gratuito de PetConnect en la Nube

Esta guía te permite tener **PetConnect en línea y accesible públicamente sin costo alguno**, utilizando los mejores servicios gratuitos de la industria.

---

### Arquitectura de Despliegue Gratuito
- **Base de Datos:** Ya conectada a **Supabase (PostgreSQL)** (Plan Free).
- **Backend (API REST FastAPI):** **Render.com** (Plan Free Web Service).
- **Frontend (Next.js):** **Vercel** (Plan Hobby Free, creado por los mismos autores de Next.js).

---

## 🚀 PASO 1: Desplegar el Backend en Render.com (Gratis)

1. Ingresa a [https://render.com](https://render.com) e inicia sesión con tu cuenta de **GitHub**.
2. Haz clic en **New +** y selecciona **Web Service**.
3. Selecciona tu repositorio: `MartinCerna/PetConnect`.
4. Configura los siguientes campos:
   - **Name:** `petconnect-api`
   - **Region:** Selecciona la más cercana (ej. *Oregon* o *Ohio*).
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type:** `Free`
5. En la sección **Environment Variables** (Variables de Entorno), agrega:
   - `DATABASE_URL`: *(Tu cadena de conexión a Supabase)*
   - `SECRET_KEY`: *(Tu clave secreta JWT)*
   - `ALGORITHM`: `HS256`
   - `ACCESS_TOKEN_EXPIRE_MINUTES`: `10080`
   - `INGEST_API_KEY`: *(Tu clave para ingesta)*
   - `ENABLE_GOOGLE_SYNC`: `false` *(Recomendado en el tier gratis para evitar uso excesivo de memoria)*
6. Haz clic en **Create Web Service**.
7. En unos 2 minutos, Render te dará una URL pública HTTPS, por ejemplo:
   `https://petconnect-api.onrender.com`

---

## ⚡ PASO 2: Desplegar el Frontend en Vercel (Gratis)

El frontend ya fue configurado para compilarse **comprimido (Gzip/Brotli) y sin emitir Source Maps** para proteger el código fuente y maximizar la velocidad.

1. Ingresa a [https://vercel.com](https://vercel.com) e inicia sesión con tu cuenta de **GitHub**.
2. Haz clic en **Add New...** $\rightarrow$ **Project**.
3. Importa el repositorio: `MartinCerna/PetConnect`.
4. En la configuración del proyecto:
   - **Framework Preset:** `Next.js`
   - **Root Directory:** Haz clic en *Edit* y selecciona la carpeta `frontend`.
5. En la sección **Environment Variables**, añade:
   - **Key:** `NEXT_PUBLIC_API_URL`
   - **Value:** `https://petconnect-api.onrender.com/api/v1` *(La URL que obtuviste de Render en el Paso 1)*
6. Haz clic en **Deploy**.
7. En menos de 1 minuto tendrás tu dominio público oficial, por ejemplo:
   `https://petconnect.vercel.app`

---

## 🔒 PASO 3: Permitir CORS en el Backend

Una vez que tengas la URL de Vercel (ej: `https://petconnect.vercel.app`), en `backend/main.py` o en el dashboard de Render se asegura que los orígenes permitidos incluyan tu dominio de Vercel.

