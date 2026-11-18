# Guía de Aplicación Android de PetConnect

PetConnect ahora funciona como una **aplicación móvil para Android** enfocada en los dueños que adquieren el collar inteligente, enviando todas las alertas **directamente al teléfono** (sin depender del correo electrónico ni de pestañas abiertas en el navegador).

---

## 1. Dos formas de instalar la app en Android

### Opción A: Instalar el archivo APK nativo (Generado en GitHub Actions)
1. Sube tus cambios a GitHub (rama `main` o `master`) o ejecuta el workflow manualmente desde la pestaña **Actions** → **Compilar APK Android de PetConnect** → **Run workflow**.
2. Al finalizar la ejecución (toma ~3 minutos), descarga el artefacto **`PetConnect-Android-APK`**.
3. Descomprime el archivo y envía **`PetConnect-Android.apk`** a tu teléfono Android (por WhatsApp, Drive o cable USB).
4. Ábrelo en tu teléfono y acepta **"Instalar aplicaciones desconocidas"** cuando Android lo solicite.
5. Al iniciar la app por primera vez:
   - Se abrirá directamente en tu **Panel / Mapa en vivo** (o en el inicio de sesión si aún no ingresaste).
   - Acepta el permiso de **Notificaciones** para recibir alertas de Zona Segura y recordatorios en tu barra de estado.

### Opción B: Instalar directamente desde Google Chrome en Android (PWA)
1. Ingresa desde **Google Chrome** en tu teléfono Android a `https://pet-connect-flame.vercel.app`.
2. Toca el botón **"App Android"** en la barra superior o abre el menú **⋮** de Chrome y toca **"Instalar aplicación"** / **"Añadir a pantalla de inicio"**.
3. Se creará el ícono de **PetConnect** en tu teléfono y abrirá a pantalla completa igual que una app nativa.

---

## 2. Cómo funcionan las notificaciones en el teléfono

PetConnect reemplaza los correos electrónicos de alertas por notificaciones móviles nativas y en tiempo real:

- **Alertas de Zona Segura ("Casa")**: Cuando el collar reporta una ubicación fuera del radio permitido configurado alrededor de Casa, el backend registra la alerta en `/api/v1/notifications` y el teléfono la muestra con sonido de alerta, vibración y acceso directo a **Google Maps / Waze** para ir hacia tu mascota.
- **Recordatorios de Medicamentos, Vacunas y Paseos**:
  - En el **APK nativo de Android**, además de las alertas en tiempo real del servidor, la app programa **alarmas locales recurrentes** en el sistema Android (`@capacitor/local-notifications`), por lo que sonarán puntualmente aunque el teléfono pierda conexión temporalmente.
- **Centro de Notificaciones**: Toca el ícono de **campana** (arriba a la derecha o en la barra inferior **"Alertas"**) para revisar el historial completo, probar el sonido/vibración en tu teléfono con el botón **"Probar en Teléfono"** o abrir la ruta GPS hacia una alerta pasada.

### Notificaciones Push en segundo plano cuando la app está cerrada (Opcional para PWA)
El APK nativo ya incluye alarmas locales de recordatorios sin necesidad de servidor push adicional. Si deseas que la versión web instalable (PWA) reciba alertas push incluso con el navegador cerrado, configura en tu backend (Render) las siguientes variables de entorno opcionales e instala `pywebpush`:
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_CLAIMS_EMAIL` (por ejemplo: `mailto:soporte@petconnect.app`)

---

## 3. Mejoras prácticas para uso móvil en el collar
- **Barra de navegación inferior estilo app Android**: Acceso con un solo toque a **Mapa**, **Cuidados**, **Alertas**, **Placa QR** y **Collar**.
- **Inicio directo al Panel**: Al abrir la app en Android te lleva directo a tu mascota en lugar de la página promocional (puedes seguir viendo la tienda con el botón *Comprar Tag* o `?tienda=1`).
- **Botón "Cómo llegar" / "Ruta GPS"**: Abre al instante la ruta caminando en **Google Maps** o navegación en **Waze** hacia la última coordenada del collar.
