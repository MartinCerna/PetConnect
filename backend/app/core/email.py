import os
import smtplib
import requests
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "PetConnect")

RESEND_API_KEY = os.getenv("RESEND_API_KEY", "")
BREVO_API_KEY = os.getenv("BREVO_API_KEY", "")

CATEGORY_NAMES = {
    "medicamento": "💊 Medicamento",
    "vacuna_desparasitacion": "💉 Vacuna / Desparasitación",
    "bano_paseo": "🛁 Baño y Paseo",
    "tips": "💡 Consejos de Bienestar",
}


def _send_email_message(recipient_email: str, subject: str, text_content: str, html_content: str) -> bool:
    """
    Despacha correos mediante:
    1. Resend HTTP API (Puerto 443 HTTPS - Garantizado en Render)
    2. Brevo HTTP API (Puerto 443 HTTPS - Garantizado en Render)
    3. SMTP directo (Puerto 587 o 465)
    """
    resend_key = os.getenv("RESEND_API_KEY", RESEND_API_KEY).strip()
    brevo_key = os.getenv("BREVO_API_KEY", BREVO_API_KEY).strip()

    # 1. Envío vía Resend HTTP API (HTTPS 443)
    if resend_key:
        try:
            sender = os.getenv("EMAILS_FROM", f"{SMTP_FROM_NAME} <onboarding@resend.dev>")
            res = requests.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {resend_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "from": sender,
                    "to": [recipient_email],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content,
                },
                timeout=8,
            )
            if res.status_code in [200, 201]:
                print(f"[Email Resend] ✅ Correo entregado exitosamente a {recipient_email}: '{subject}'.", flush=True)
                return True
            else:
                print(f"[Email Resend] ⚠️ Error ({res.status_code}): {res.text}", flush=True)
        except Exception as e:
            print(f"[Email Resend] ⚠️ Excepción enviando vía Resend: {e}", flush=True)

    # 2. Envío vía Brevo HTTP API (HTTPS 443)
    if brevo_key:
        try:
            sender_email = os.getenv("SMTP_USER", "petconnect969@gmail.com").strip()
            res = requests.post(
                "https://api.brevo.com/v3/smtp/email",
                headers={
                    "api-key": brevo_key,
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                },
                json={
                    "sender": {"name": SMTP_FROM_NAME, "email": sender_email},
                    "to": [{"email": recipient_email}],
                    "subject": subject,
                    "htmlContent": html_content,
                    "textContent": text_content,
                },
                timeout=8,
            )
            if res.status_code in [200, 201]:
                print(f"[Email Brevo] ✅ Correo entregado exitosamente a {recipient_email}: '{subject}'.", flush=True)
                return True
            else:
                print(f"[Email Brevo] ⚠️ Error ({res.status_code}): {res.text}", flush=True)
        except Exception as e:
            print(f"[Email Brevo] ⚠️ Excepción enviando vía Brevo: {e}", flush=True)

    # 3. Envío vía SMTP tradicional
    smtp_user = os.getenv("SMTP_USER", SMTP_USER).strip()
    smtp_pass = os.getenv("SMTP_PASSWORD", SMTP_PASSWORD).strip().replace(" ", "")
    smtp_host = os.getenv("SMTP_HOST", SMTP_HOST).strip()
    smtp_port = int(os.getenv("SMTP_PORT", str(SMTP_PORT)))

    if not smtp_user or not smtp_pass:
        print(f"[Email Simulado] No se configuró credencial de correo (SMTP o RESEND_API_KEY/BREVO_API_KEY). "
              f"Para: {recipient_email} | Asunto: '{subject}' registrado en logs.", flush=True)
        return True

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SMTP_FROM_NAME} <{smtp_user}>"
        msg["To"] = recipient_email

        msg.attach(MIMEText(text_content, "plain", "utf-8"))
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        if smtp_port == 465:
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=6) as server:
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [recipient_email], msg.as_string())
        else:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=6) as server:
                server.starttls()
                server.login(smtp_user, smtp_pass)
                server.sendmail(smtp_user, [recipient_email], msg.as_string())

        print(f"[Email SMTP] ✅ Correo enviado exitosamente a {recipient_email}: '{subject}'.", flush=True)
        return True
    except TimeoutError:
        print(f"[Email SMTP] ⚠️ Tiempo de espera agotado al conectar a {smtp_host}:{smtp_port}. "
              f"Nota: Render bloquea los puertos SMTP salientes (25, 465, 587). "
              f"Se recomienda configurar RESEND_API_KEY o BREVO_API_KEY para despachar vía HTTPS puerto 443.", flush=True)
        return False
    except Exception as e:
        print(f"[Email SMTP] ⚠️ Error enviando correo a {recipient_email}: {e}", flush=True)
        return False


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
    """Notificación enviada inmediatamente al configurar o crear un recordatorio."""
    if not recipient_email:
        return False

    category_label = CATEGORY_NAMES.get(category.lower(), f"📋 {category.capitalize()}")
    frequency_text = frequency if frequency else "Puntual / Según horario"
    schedule_text = time_schedule if time_schedule else "Pendiente de definir"
    notes_text = notes if notes else "Sin instrucciones adicionales"
    greeting_name = owner_name.strip() if owner_name and owner_name.strip() else "Amigo de PetConnect"

    subject = f"🐾 Recordatorio Programado para {pet_name}: {title}"

    text_content = f"""Hola {greeting_name},

Has programado un nuevo recordatorio en PetConnect para {pet_name}:

• Actividad: {title}
• Categoría: {category_label}
• Horario programado: {schedule_text}
• Frecuencia: {frequency_text}
• Notas/Dosis: {notes_text}

Gestiona tus recordatorios en:
https://pet-connect-flame.vercel.app/dashboard/recordatorios

Atentamente,
PetConnect 🐾
"""

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f8; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 18px rgba(0,0,0,0.06); border: 1px solid #e5e7eb;">
          <tr>
            <td style="background: linear-gradient(135deg, #e11d48 0%, #db2777 50%, #f43f5e 100%); padding: 32px 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 800;">🐾 PetConnect</h1>
              <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Confirmación de Recordatorio Configurado</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 30px 24px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 17px; color: #111827;">
                ¡Hola, <strong style="color: #e11d48;">{greeting_name}</strong>! 👋
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #4b5563; line-height: 1.5;">
                Has programado con éxito un recordatorio para tu mascota <strong>{pet_name}</strong>. Recibirás un aviso en este correo en el horario programado.
              </p>
              <table role="presentation" width="100%" style="background-color: #fdf2f4; border: 1px solid #fbcfe8; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
                <tr><td style="padding: 5px 0; font-size: 14px; color: #6b7280; width: 35%;"><strong>Actividad:</strong></td><td style="padding: 5px 0; font-size: 15px; color: #111827; font-weight: 700;">{title}</td></tr>
                <tr><td style="padding: 5px 0; font-size: 14px; color: #6b7280;"><strong>Categoría:</strong></td><td style="padding: 5px 0; font-size: 14px; color: #db2777; font-weight: 600;">{category_label}</td></tr>
                <tr><td style="padding: 5px 0; font-size: 14px; color: #6b7280;"><strong>Mascota:</strong></td><td style="padding: 5px 0; font-size: 14px; color: #111827;">{pet_name}</td></tr>
                <tr><td style="padding: 5px 0; font-size: 14px; color: #6b7280;"><strong>Horario:</strong></td><td style="padding: 5px 0; font-size: 14px; color: #111827; font-weight: 600;">{schedule_text}</td></tr>
                <tr><td style="padding: 5px 0; font-size: 14px; color: #6b7280;"><strong>Frecuencia:</strong></td><td style="padding: 5px 0; font-size: 14px; color: #111827;">{frequency_text}</td></tr>
                <tr><td style="padding: 5px 0; font-size: 14px; color: #6b7280; vertical-align: top;"><strong>Indicaciones:</strong></td><td style="padding: 5px 0; font-size: 14px; color: #374151;">{notes_text}</td></tr>
              </table>
              <div style="text-align: center; margin: 26px 0 10px 0;">
                <a href="https://pet-connect-flame.vercel.app/dashboard/recordatorios" target="_blank" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 13px 28px; border-radius: 12px;">
                  Ver Recordatorios en PetConnect →
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 18px 30px; text-align: center; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">PetConnect © 2026. Enviado a {recipient_email}.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return _send_email_message(recipient_email, subject, text_content, html_content)


def send_reminder_due_alert_email(
    recipient_email: str,
    owner_name: str,
    pet_name: str,
    title: str,
    category: str,
    time_schedule: Optional[str] = None,
    notes: Optional[str] = None,
) -> bool:
    """Alerta enviada en tiempo real en el momento exacto programado para el recordatorio."""
    if not recipient_email:
        return False

    category_label = CATEGORY_NAMES.get(category.lower(), f"📋 {category.capitalize()}")
    schedule_text = time_schedule if time_schedule else "Ahora"
    notes_text = notes if notes else "Sin instrucciones adicionales"
    greeting_name = owner_name.strip() if owner_name and owner_name.strip() else "Amigo de PetConnect"

    subject = f"🔔 ¡Es hora de: {title} para {pet_name}!"

    text_content = f"""¡Hola {greeting_name}!

Es hora de la actividad programada para {pet_name}:

• Actividad: {title}
• Categoría: {category_label}
• Horario: {schedule_text}
• Instrucciones/Dosis: {notes_text}

Entra a PetConnect para registrar el cumplimiento de esta actividad:
https://pet-connect-flame.vercel.app/dashboard/recordatorios

PetConnect 🐾
"""

    html_content = f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>{subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #fef2f2; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1f2937;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding: 30px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 6px 22px rgba(225,29,72,0.12); border: 2px solid #fecdd3;">
          <tr>
            <td style="background: linear-gradient(135deg, #e11d48 0%, #be123c 100%); padding: 32px 30px; text-align: center;">
              <span style="font-size: 38px;">🔔</span>
              <h1 style="margin: 8px 0 0 0; color: #ffffff; font-size: 24px; font-weight: 800;">¡Es hora de la actividad de {pet_name}!</h1>
              <p style="margin: 6px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Alerta programada a las {schedule_text}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 30px 24px 30px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; color: #111827;">
                Hola <strong>{greeting_name}</strong>, te recordamos que tienes una actividad pendiente para <strong style="color: #e11d48;">{pet_name}</strong>:
              </p>
              <table role="presentation" width="100%" style="background-color: #fff1f2; border: 1.5px solid #fda4af; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
                <tr><td style="padding: 6px 0; font-size: 14px; color: #6b7280; width: 35%;"><strong>Actividad:</strong></td><td style="padding: 6px 0; font-size: 16px; color: #9f1239; font-weight: 800;">{title}</td></tr>
                <tr><td style="padding: 6px 0; font-size: 14px; color: #6b7280;"><strong>Categoría:</strong></td><td style="padding: 6px 0; font-size: 14px; color: #be123c; font-weight: 600;">{category_label}</td></tr>
                <tr><td style="padding: 6px 0; font-size: 14px; color: #6b7280;"><strong>Mascota:</strong></td><td style="padding: 6px 0; font-size: 14px; color: #111827; font-weight: 700;">{pet_name}</td></tr>
                <tr><td style="padding: 6px 0; font-size: 14px; color: #6b7280;"><strong>Horario:</strong></td><td style="padding: 6px 0; font-size: 14px; color: #111827;">{schedule_text}</td></tr>
                <tr><td style="padding: 6px 0; font-size: 14px; color: #6b7280; vertical-align: top;"><strong>Dosis / Notas:</strong></td><td style="padding: 6px 0; font-size: 14px; color: #374151;">{notes_text}</td></tr>
              </table>
              <div style="text-align: center; margin: 26px 0 10px 0;">
                <a href="https://pet-connect-flame.vercel.app/dashboard/recordatorios" target="_blank" style="display: inline-block; background-color: #e11d48; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 30px; border-radius: 12px; box-shadow: 0 4px 14px rgba(225,29,72,0.35);">
                  Abrir PetConnect y Completar ✓
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="background-color: #f9fafb; padding: 18px 30px; text-align: center; border-top: 1px solid #f3f4f6;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">PetConnect © 2026 · Notificación automática programada</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return _send_email_message(recipient_email, subject, text_content, html_content)
