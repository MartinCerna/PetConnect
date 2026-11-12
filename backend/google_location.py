#
#  GoogleFindMyTools - A set of tools to interact with the Google Find My API
#  Copyright © 2024 Leon Böttger. All rights reserved.
#

# google_location.py
from datetime import datetime, timezone
import threading

from NovaApi.ExecuteAction.LocateTracker.location_request import get_location_data_for_device
from NovaApi.ListDevices.nbe_list_devices import request_device_list
from ProtoDecoders.decoder import parse_device_list_protobuf
from SpotApi.UploadPrecomputedPublicKeyIds.upload_precomputed_public_key_ids import refresh_custom_trackers

CANONIC_ID = "6ac70286-0000-2f43-acb3-34391607e873"
DEVICE_NAME = "GoogleFindMyTools µC"

_sync_lock = threading.Lock()
SYNC_STATE = {
    "is_running": False,
    "last_attempt_at": None,
    "last_success_at": None,
    "last_error": None,
}


def get_sync_status() -> dict:
    return dict(SYNC_STATE)


def ejecutar_sincronizacion_google():
    """
    1. Renueva las llaves precomputadas (EIDs) en los servidores de Google para el día actual.
    2. Consulta y desencripta las ubicaciones reportadas por la red de Google hacia PetConnect.
    """
    if not _sync_lock.acquire(blocking=False):
        print("[Worker] Sincronización ya en curso; omitiendo ejecución simultánea.", flush=True)
        return False

    SYNC_STATE["is_running"] = True
    SYNC_STATE["last_attempt_at"] = datetime.now(timezone.utc).isoformat()
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
        SYNC_STATE["last_success_at"] = datetime.now(timezone.utc).isoformat()
        SYNC_STATE["last_error"] = None
        return True
    except Exception as e:
        SYNC_STATE["last_error"] = str(e)
        print(f"[Worker] Error al obtener ubicación de Google: {e}", flush=True)
        return False
    finally:
        SYNC_STATE["is_running"] = False
        _sync_lock.release()


if __name__ == '__main__':
    ejecutar_sincronizacion_google()
