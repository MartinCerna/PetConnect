#
#  GoogleFindMyTools - A set of tools to interact with the Google Find My API
#  Copyright © 2024 Leon Böttger. All rights reserved.
#

# google_location.py
from NovaApi.ExecuteAction.LocateTracker.location_request import get_location_data_for_device

CANONIC_ID = "6ac70286-0000-2f43-acb3-34391607e873"
DEVICE_NAME = "GoogleFindMyTools µC"

def ejecutar_sincronizacion_google():
    """Ejecuta la consulta y desencriptado de Google hacia PetConnect sin pedir input."""
    try:
        get_location_data_for_device(CANONIC_ID, DEVICE_NAME)
    except Exception as e:
        print(f"[Worker] Error al obtener ubicación de Google: {e}")

if __name__ == '__main__':
    ejecutar_sincronizacion_google()