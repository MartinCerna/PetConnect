# backend/worker_sync.py
import os
import sys
import time

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
if CURRENT_DIR not in sys.path:
    sys.path.insert(0, CURRENT_DIR)

from dotenv import load_dotenv
load_dotenv(os.path.join(CURRENT_DIR, ".env"))

from google_location import ejecutar_sincronizacion_google

INTERVAL_SECONDS = int(os.getenv("SYNC_INTERVAL_SECONDS", "180"))

def main():
    print(f"[SyncDaemon] Iniciado. Consultando Google Find My cada {INTERVAL_SECONDS} segundos...")
    while True:
        try:
            current_time = time.strftime('%H:%M:%S')
            print(f"\n[SyncDaemon {current_time}] Solicitando ubicaciones a Google Find My...")
            ejecutar_sincronizacion_google()
        except Exception as e:
            print(f"[SyncDaemon] Error en ciclo: {e}")
        time.sleep(INTERVAL_SECONDS)

if __name__ == '__main__':
    main()

