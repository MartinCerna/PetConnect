from datetime import datetime
import re
from typing import Optional

WEEKDAY_TOKENS = {
    "lun": 0,
    "lunes": 0,
    "mar": 1,
    "martes": 1,
    "mie": 2,
    "mié": 2,
    "miercoles": 2,
    "miércoles": 2,
    "jue": 3,
    "jueves": 3,
    "vie": 4,
    "viernes": 4,
    "sab": 5,
    "sáb": 5,
    "sabado": 5,
    "sábado": 5,
    "dom": 6,
    "domingo": 6,
}


def extract_times(time_schedule: Optional[str]) -> list[str]:
    """Extrae todas las horas en formato HH:MM desde un horario simple o múltiple."""
    if not time_schedule:
        return []
    return re.findall(r"\b(\d{2}:\d{2})\b", time_schedule.strip())


def should_trigger_reminder(
    frequency: Optional[str],
    time_schedule: Optional[str],
    now_local: datetime,
    created_at: Optional[datetime] = None,
) -> bool:
    """
    Evalúa si un recordatorio debe dispararse en el minuto local actual.
    Soporta múltiples horas al día (ej. '08:00, 16:00, 00:00'), días específicos
    (ej. 'Días: Lun, Mié, Vie'), fechas únicas y recurrencias estándar.
    """
    hora_actual = now_local.strftime("%H:%M")
    times = extract_times(time_schedule)
    if hora_actual not in times:
        return False

    freq_raw = (frequency or "").strip()
    freq_lower = freq_raw.lower()
    combined = f"{time_schedule or ''} {freq_raw}"
    date_match = re.search(r"\b(\d{4}-\d{2}-\d{2})\b", combined)
    ref_date = None
    if date_match:
        try:
            ref_date = datetime.strptime(date_match.group(1), "%Y-%m-%d").date()
        except ValueError:
            ref_date = None

    today = now_local.date()

    # Fecha única / específica
    if (
        "una sola vez" in freq_lower
        or "una vez" in freq_lower
        or "única vez" in freq_lower
        or "unica vez" in freq_lower
        or "fecha específica" in freq_lower
        or "fecha especifica" in freq_lower
    ):
        return ref_date == today if ref_date else False

    # Días concretos de la semana (ej. "Días: Lun, Mié, Vie")
    words = re.findall(r"[a-záéíóúñ]+", freq_lower)
    matched_weekdays = {WEEKDAY_TOKENS[w] for w in words if w in WEEKDAY_TOKENS}
    if matched_weekdays:
        return now_local.weekday() in matched_weekdays

    if "semanal" in freq_lower:
        if ref_date:
            return ref_date.weekday() == now_local.weekday()
        if created_at:
            return created_at.weekday() == now_local.weekday()
        return True

    if "mensual" in freq_lower:
        if ref_date:
            return ref_date.day == now_local.day
        if created_at:
            return created_at.day == now_local.day
        return True

    if "anual" in freq_lower:
        if ref_date:
            return (ref_date.month, ref_date.day) == (now_local.month, now_local.day)
        if created_at:
            return (created_at.month, created_at.day) == (now_local.month, now_local.day)
        return True

    # Diariamente, Cada X horas, X veces al día u horas específicas diarias
    return True
