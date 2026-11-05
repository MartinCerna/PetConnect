#
#  GoogleFindMyTools - A set of tools to interact with the Google Find My API
#  Copyright © 2024 Leon Böttger. All rights reserved.
#

# google_location.py
from NovaApi.ExecuteAction.LocateTracker.location_request import get_location_data_for_device
from NovaApi.ListDevices.nbe_list_devices import request_device_list
from ProtoDecoders.decoder import parse_device_list_protobuf
from SpotApi.UploadPrecomputedPublicKeyIds.upload_precomputed_public_key_ids import refresh_custom_trackers

CANONIC_ID = "6ac70286-0000-2f43-acb3-34391607e873"
DEVICE_NAME = "GoogleFindMyTools µC"

def ejecutar_sincronizacion_google():
    """
    1. Renueva las llaves precomputadas (EIDs) en los servidores de Google para el día actual.
    2. Consulta y desencripta las ubicaciones reportadas por la red de Google hacia PetConnect.
    """
    try:
        # Asegura que Google tenga vigentes las llaves del tag para la fecha de hoy
        try:
            result_hex = request_device_list()
            device_list = parse_device_list_protobuf(result_hex)
            refresh_custom_trackers(device_list)
        except Exception as err:
            print(f"[Worker] Nota al verificar vigencia de llaves en Google: {err}", flush=True)

        # Solicita y descifra la ubicación reportada
        get_location_data_for_device(CANONIC_ID, DEVICE_NAME)
    except Exception as e:
        print(f"[Worker] Error al obtener ubicación de Google: {e}", flush=True)

if __name__ == '__main__':
    ejecutar_sincronizacion_google()
