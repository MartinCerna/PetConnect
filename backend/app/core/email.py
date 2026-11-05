import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "PetConnect Notificaciones")

CATEGORY_NAMES = {
    "medicamento": "💊 Medicamento",
    "vacuna_desparasitacion": "💉 Vacuna / Desparasitación",
    "bano_paseo": "🛁 Baño y Paseo",
    "tips": "💡 Consejos de Bienestar",
}


def send_reminder_email(
    recipient_email: str,
    owner_name: str,
    pet_name: str,
    title: str,
    category: str,
    frequency: Optional[str] = None,
    time_schedule: Optional[str] = None,
    notes: Optional[str] = None,
) -> bool:
    """
    Envía una notificación por correo electrónico vía SMTP (Gmail u otro)
    cuando se crea o programa un recordatorio de mascota.
    """
    if not recipient_email:
        print("[Email] Error: No se proporcionó correo de destinatario.")
        return False

    smtp_user = os.getenv("SMTP_USER", SMTP_USER)
    smtp_pass = os.getenv("SMTP_PASSWORD", SMTP_PASSWORD)
    smtp_host = os.getenv("SMTP_HOST", SMTP_HOST)
    smtp_port = int(os.getenv("SMTP_PORT", str(SMTP_PORT)))

    category_label = CATEGORY_NAMES.get(category.lower(), f"📋 {category.capitalize()}")
    frequency_text = frequency if frequency else "Puntual / Según horario"
    schedule_text = time_schedule if time_schedule else "Pendiente de definir"
    notes_text = notes if notes else "Sin instrucciones adicionales"
    greeting_name = owner_name.strip() if owner_name and owner_name.strip() else "Amigo de PetConnect"

    subject = f"🐾 Nuevo Recordatorio para {pet_name}: {title}"

    # Versión en texto plano
    text_content = f"""Hola {greeting_name},

Has programado un nuevo recordatorio en PetConnect para tu mascota {pet_name}:

• Título: {title}
• Categoría: {category_label}
• Horario: {schedule_text}
• Frecuencia: {frequency_text}
• Notas/Dosis: {notes_text}

Puedes revisar y gestionar tus recordatorios en:
https://pet-connect-flame.vercel.app/dashboard/recordatorios

Atentamente,
El equipo de PetConnect 🐾
"""

    # Versión HTML moderna y estilizada
    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f4f6f8; padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;" cellspacing="0" cellpadding="0">
          
          <!-- Encabezado con degradado y marca -->
          <tr>
            <td style="background: linear-gradient(135deg, #e11d48 0%, #db2777 50%, #f43f5e 100%); padding: 32px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">🐾 PetConnect</h1>
              <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px; font-weight: 500;">Cuidando la salud y el bienestar de tu mascota</p>
            </td>
          </tr>

          <!-- Cuerpo del correo -->
          <tr>
            <td style="padding: 32px 30px 24px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 17px; line-height: 1.5; color: #111827;">
                ¡Hola, <strong style="color: #e11d48;">{greeting_name}</strong>! 👋
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.5; color: #4b5563;">
                Se ha registrado y programado un nuevo recordatorio para tu mascota <strong>{pet_name}</strong>. Aquí tienes el resumen de la actividad:
              </p>

              <!-- Tarjeta de Detalles -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fdf2f4; border: 1px solid #fbcfe8; border-radius: 14px; padding: 20px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #6b7280; width: 35%;"><strong>Actividad:</strong></td>
                  <td style="padding: 6px 0; font-size: 15px; color: #111827; font-weight: 700;">{title}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #6b7280;"><strong>Categoría:</strong></td>
                  <td style="padding: 6px 0; font-size: 14px; color: #db2777; font-weight: 600;">{category_label}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #6b7280;"><strong>Mascota:</strong></td>
                  <td style="padding: 6px 0; font-size: 14px; color: #111827;">{pet_name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #6b7280;"><strong>Horario / Fecha:</strong></td>
                  <td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 600;">{schedule_text}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #6b7280;"><strong>Frecuencia:</strong></td>
                  <td style="padding: 6px 0; font-size: 14px; color: #111827;">{frequency_text}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; font-size: 14px; color: #6b7280; vertical-align: top;"><strong>Indicaciones:</strong></td>
                  <td style="padding: 6px 0; font-size: 14px; color: #374151; font-style: italic;">{notes_text}</td>
                </tr>
              </table>

              <!-- Botón de Acción -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 28px 0 16px 0;">
                <tr>
                  <td align="center">
                    <a href="https://pet-connect-flame.vercel.app/dashboard/recordatorios" target="_blank" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(225, 29, 72, 0.35);">
                      Ver mis Recordatorios en PetConnect →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 20px 0 0 0; font-size: 12px; color: #9ca3af; text-align: center; line-height: 1.4;">
                💡 <em>Tip PetConnect: Mantener al día sus vacunas y medicamentos prolonga la calidad de vida de tu mascota.</em>
              </p>
            </td>
          </tr>

          <!-- Pie de página -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 30px; text-align: center; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                Notificación automática enviada a <strong>{recipient_email}</strong>.<br>
                PetConnect © 2026. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""

    if not smtp_user or not smtp_pass:
        print(f"[Email Simulado] No se configuró SMTP_USER/SMTP_PASSWORD. "
              f"Notificación para {recipient_email}: '{title}' para {pet_name} registrada en logs.")
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{smtp_user}>"
        msg["To"] = recipient_email

        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=12) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [recipient_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=12) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [recipient_email], msg.as_string())

        print(f"[Email] ✅ Notificación enviada exitosamente a {recipient_email} para recordatorio '{title}'.")
        return True
    except Exception as e:
        print(f"[Email] ⚠️ No se pudo enviar el correo a {recipient_email}: {e}")
        return False
