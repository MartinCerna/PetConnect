#
#  GoogleFindMyTools - A set of tools to interact with the Google Find My API
#  Copyright © 2024 Leon Böttger. All rights reserved.
#

import datetime
import hashlib
########

import os
import requests
from dotenv import load_dotenv

load_dotenv()

MCU_BATTERY_SLOTS = {
    0: {"battery_level": 95, "battery_voltage": 4.12, "is_charging": False, "label": "Optima (80-100%)"},
    1: {"battery_level": 70, "battery_voltage": 3.92, "is_charging": False, "label": "Buena (60-79%)"},
    2: {"battery_level": 45, "battery_voltage": 3.80, "is_charging": False, "label": "Media (30-59%)"},
    3: {"battery_level": 22, "battery_voltage": 3.68, "is_charging": False, "label": "Baja (16-29%)"},
    4: {"battery_level": 10, "battery_voltage": 3.52, "is_charging": False, "label": "Critica (<=15%)"},
    5: {"battery_level": 85, "battery_voltage": 4.18, "is_charging": True, "label": "Cargando"},
}


def decrypt_mcu_location_with_battery(
    identity_key: bytes,
    encrypted_location: bytes,
    public_key_random: bytes,
    fallback_offset: int,
):
    """
    Intenta desencriptar un reporte FMDN probando los 6 slots EID de batería (offset = slot * 1024).
    AES-EAX-256 valida el tag criptográfico de 16 bytes, identificando sin ambigüedad qué EID emitió el tag.
    """
    for slot, info in MCU_BATTERY_SLOTS.items():
        try:
            decrypted = decrypt(identity_key, encrypted_location, public_key_random, slot * 1024)
            return decrypted, {"slot": slot, **info}
        except Exception:
            continue

    decrypted = decrypt(identity_key, encrypted_location, public_key_random, fallback_offset)
    return decrypted, None


def enviar_a_petconnect(
    latitude,
    longitude,
    altitude,
    timestamp_str,
    battery_level=None,
    battery_voltage=None,
    is_charging=None,
    update_device_battery=True,
):
    # 1. Intento directo en la base de datos de Supabase
    try:
        import sys
        sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../")))
        from app.db.session import SessionLocal
        from app.db.models import Device, LocationLog, Pet

        db = SessionLocal()
        device = db.query(Device).filter(Device.device_mac == "10:00:3B:AE:EC:A0").first()
        if not device:
            device = db.query(Device).filter(Device.status == "ACTIVE").order_by(Device.created_at.desc()).first()

        if device:
            dev_id = device.id
            dev_mac = device.device_mac
            try:
                dt = datetime.datetime.fromisoformat(timestamp_str)
            except Exception:
                dt = datetime.datetime.utcnow()

            existing = (
                db.query(LocationLog)
                .filter(LocationLog.device_id == dev_id, LocationLog.recorded_at == dt)
                .first()
            )
            if existing:
                db.close()
                print(f" => Coordenada ya registrada en BD para {dev_mac} ({dt}).")
                return

            prev_latest = (
                db.query(LocationLog)
                .filter(LocationLog.device_id == dev_id)
                .order_by(LocationLog.recorded_at.desc())
                .first()
            )

            eff_battery = (
                battery_level
                if battery_level is not None
                else (device.battery_level if getattr(device, "battery_level", None) is not None else 100)
            )

            log = LocationLog(
                device_id=dev_id,
                latitude=float(latitude),
                longitude=float(longitude),
                altitude=float(altitude) if altitude else 0.0,
                battery_level=eff_battery,
                recorded_at=dt,
            )
            db.add(log)

            if battery_level is not None and update_device_battery:
                prev_level = device.battery_level
                was_low = prev_level is not None and prev_level <= 15
                device.battery_level = int(battery_level)
                if battery_voltage is not None:
                    device.battery_voltage = round(float(battery_voltage), 2)
                if is_charging is not None:
                    device.is_charging = bool(is_charging)
                device.battery_updated_at = datetime.datetime.now(datetime.timezone.utc)

                if int(battery_level) <= 15 and not device.is_charging and not was_low:
                    try:
                        from app.core.notifications import notify_low_battery
                        pet_linked = db.query(Pet).filter(Pet.device_id == dev_id).first()
                        notify_low_battery(
                            db=db,
                            user_id=device.user_id,
                            pet_id=pet_linked.id if pet_linked else None,
                            pet_name=pet_linked.name if pet_linked else f"Tag {dev_mac}",
                            device_mac=dev_mac,
                            battery_level=int(battery_level),
                            battery_voltage=device.battery_voltage,
                        )
                    except Exception as batt_err:
                        print(f" => Advertencia enviando alerta de batería baja: {batt_err}")

            db.commit()

            try:
                from app.core.geofence import evaluate_pet_geofence
                is_newest = True
                if prev_latest and prev_latest.recorded_at:
                    dt_cmp = dt if dt.tzinfo else dt.replace(tzinfo=prev_latest.recorded_at.tzinfo)
                    is_newest = dt_cmp >= prev_latest.recorded_at
                if is_newest:
                    evaluate_pet_geofence(
                        db=db,
                        device_id=dev_id,
                        latitude=float(latitude),
                        longitude=float(longitude),
                        recorded_at=dt,
                    )
            except Exception as geo_err:
                print(f" => Advertencia evaluando Zona Segura: {geo_err}")

            db.close()
            print(f" => Coordenada y batería ({eff_battery}%) guardadas en BD Supabase para {dev_mac} ({dev_id}).")
            return
    except Exception as e:
        print(f" => Inserción directa en BD omitida: {e}")

    # 2. Respaldo vía HTTP API (Render o local)
    api_base = os.getenv("PETCONNECT_API_URL", "https://petconnect-2bh3.onrender.com").rstrip("/")
    url = f"{api_base}/api/v1/locations/"
    payload = {
        "device_id": os.getenv("SYNC_DEVICE_ID", "9d2f57d4-e6f0-41ab-b914-c6f7504ab796"),
        "device_mac": "10:00:3B:AE:EC:A0",
        "latitude": float(latitude),
        "longitude": float(longitude),
        "altitude": float(altitude) if altitude else 0.0,
        "recorded_at": timestamp_str,
    }
    if battery_level is not None and update_device_battery:
        payload["battery_level"] = int(battery_level)
        if battery_voltage is not None:
            payload["battery_voltage"] = round(float(battery_voltage), 2)
        if is_charging is not None:
            payload["is_charging"] = bool(is_charging)
    try:
        headers = {"X-API-Key": os.getenv("INGEST_API_KEY", "439c026bfaed8175")}
        response = requests.post(url, json=payload, headers=headers, timeout=10)
        if response.status_code == 201:
            print(" => Coordenada sincronizada con PetConnect.")
        else:
            print(f" => Error del servidor: {response.status_code}")
    except Exception as e:
        print(f" => Error enviando a PetConnect: {e}")

##########
from FMDNCrypto.foreign_tracker_cryptor import decrypt
from KeyBackup.cloud_key_decryptor import decrypt_eik, decrypt_aes_gcm
from NovaApi.ExecuteAction.LocateTracker.decrypted_location import WrappedLocation
from ProtoDecoders import DeviceUpdate_pb2
from ProtoDecoders import Common_pb2
from ProtoDecoders.DeviceUpdate_pb2 import DeviceRegistration
from ProtoDecoders.decoder import parse_device_update_protobuf
from SpotApi.CreateBleDevice.config import mcu_fast_pair_model_id
from SpotApi.CreateBleDevice.util import flip_bits
from SpotApi.GetEidInfoForE2eeDevices.get_eid_info_request import get_eid_info
from SpotApi.GetEidInfoForE2eeDevices.get_owner_key import get_owner_key


def create_google_maps_link(latitude, longitude):
    try:  
        latitude = float(latitude)
        longitude = float(longitude)
        if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
            raise ValueError("Invalid latitude or longitude values.")
    except ValueError as e:
        return f"Error: {e}" #more descriptive error message for the user
    base_url = "https://www.google.com/maps/search/?api=1"
    query_params = f"query={latitude},{longitude}"  

    return f"{base_url}&{query_params}"

# Indicates if the device is a custom microcontroller
def is_mcu_tracker(device_registration: DeviceRegistration) -> bool:
    return device_registration.fastPairModelId == mcu_fast_pair_model_id


def retrieve_identity_key(device_registration: DeviceRegistration) -> bytes:
    is_mcu = is_mcu_tracker(device_registration)
    encrypted_user_secrets = device_registration.encryptedUserSecrets

    encrypted_identity_key = flip_bits(
        encrypted_user_secrets.encryptedIdentityKey,
        is_mcu)
    owner_key = get_owner_key()

    try:
        identity_key = decrypt_eik(owner_key, encrypted_identity_key)
        return identity_key
    except Exception as e:

        e2eeData = get_eid_info()
        current_owner_key_version = e2eeData.encryptedOwnerKeyAndMetadata.ownerKeyVersion

        print("")
        print("-" * 40)
        print("Attention:")
        print("-" * 40)

        if encrypted_user_secrets.ownerKeyVersion < current_owner_key_version:
            print(f"Failed to decrypt E2EE data. This tracker was encrypted with owner key version {encrypted_user_secrets.ownerKeyVersion}, but the current owner key version is {current_owner_key_version}.\nThis happens if you reset your end-to-end-encrypted data in the past.\nThe tracker cannot be decrypted anymore, and it is recommended to remove it in the Find My Device app.")
            exit(1)
        else:
            print(f"Failed to decrypt identity key encrypted with owner key version {encrypted_user_secrets.ownerKeyVersion}, current owner key version is {current_owner_key_version}.\nThis may happen if you reset your end-to-end-encrypted data. To resolve this issue, open the folder 'Auth' and delete the file 'secrets.json'.")
            exit(1)


def decrypt_location_response_locations(device_update_protobuf):

    device_registration = device_update_protobuf.deviceMetadata.information.deviceRegistration

    identity_key = retrieve_identity_key(device_registration)
    locations_proto = device_update_protobuf.deviceMetadata.information.locationInformation.reports.recentLocationAndNetworkLocations
    is_mcu = is_mcu_tracker(device_registration)

    # At All Areas Reports or Own Reports
    recent_location = locations_proto.recentLocation
    recent_location_time = locations_proto.recentLocationTimestamp

    # High Traffic Reports
    network_locations = list(locations_proto.networkLocations)
    network_locations_time = list(locations_proto.networkLocationTimestamps)

    if locations_proto.HasField("recentLocation"):
        network_locations.append(recent_location)
        network_locations_time.append(recent_location_time)

    location_time_array = []
    for loc, time in zip(network_locations, network_locations_time):

        if loc.status == Common_pb2.Status.SEMANTIC:
            print("Semantic Location Report")

            wrapped_location = WrappedLocation(
                decrypted_location=b'',
                time=int(time.seconds),
                accuracy=0,
                status=loc.status,
                is_own_report=True,
                name=loc.semanticLocation.locationName
            )
            location_time_array.append(wrapped_location)
        else:

            encrypted_location = loc.geoLocation.encryptedReport.encryptedLocation
            public_key_random = loc.geoLocation.encryptedReport.publicKeyRandom

            batt_info = None
            if public_key_random == b"":  # Own Report
                identity_key_hash = hashlib.sha256(identity_key).digest()
                decrypted_location = decrypt_aes_gcm(identity_key_hash, encrypted_location)
            elif is_mcu:
                decrypted_location, batt_info = decrypt_mcu_location_with_battery(
                    identity_key,
                    encrypted_location,
                    public_key_random,
                    loc.geoLocation.deviceTimeOffset,
                )
            else:
                decrypted_location = decrypt(
                    identity_key, encrypted_location, public_key_random, loc.geoLocation.deviceTimeOffset
                )

            wrapped_location = WrappedLocation(
                decrypted_location=decrypted_location,
                time=int(time.seconds),
                accuracy=loc.geoLocation.accuracy,
                status=loc.status,
                is_own_report=loc.geoLocation.encryptedReport.isOwnReport,
                name="",
                battery_level=batt_info["battery_level"] if batt_info else None,
                battery_voltage=batt_info["battery_voltage"] if batt_info else None,
                is_charging=batt_info["is_charging"] if batt_info else None,
                battery_slot=batt_info["slot"] if batt_info else None,
            )
            location_time_array.append(wrapped_location)

    print("-" * 40)
    print("[DecryptLocations] Decrypted Locations:")

    if not location_time_array:
        print("No locations found.")
        return

    # Procesar cronológicamente de más antigua a más reciente
    location_time_array.sort(key=lambda item: item.time)

    # Si el collar multiplexa Slots 1..5 junto con Slot 0 en la misma ventana (< 10 min),
    # damos prioridad al Slot 1..5 más reciente para no sobreescribir el nivel real con 95%.
    latest_non_zero_slot_time = max(
        (item.time for item in location_time_array if item.battery_slot is not None and item.battery_slot != 0),
        default=None,
    )
    latest_geo_time = max(
        (item.time for item in location_time_array if item.status != Common_pb2.Status.SEMANTIC),
        default=None,
    )

    for loc in location_time_array:

        if loc.status == Common_pb2.Status.SEMANTIC:
            print(f"Semantic Location: {loc.name}")
            print(f"Time: {datetime.datetime.fromtimestamp(loc.time).strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"Status: {loc.status}")
            print(f"Is Own Report: {loc.is_own_report}")
            print("-" * 40)
            continue

        proto_loc = DeviceUpdate_pb2.Location()
        proto_loc.ParseFromString(loc.decrypted_location)

        latitude = proto_loc.latitude / 1e7
        longitude = proto_loc.longitude / 1e7
        altitude = proto_loc.altitude

        print(f"Latitude: {latitude}")
        print(f"Longitude: {longitude}")
        print(f"Altitude: {altitude}")
        print(f"Google Maps Link: {create_google_maps_link(latitude, longitude)}")
        if loc.battery_slot is not None:
            print(
                f"Battery (BLE Slot {loc.battery_slot}): {loc.battery_level}% "
                f"({loc.battery_voltage:.2f} V, charging={loc.is_charging})"
            )
        print(f"Time: {datetime.datetime.fromtimestamp(loc.time).strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Status: {loc.status}")
        print(f"Is Own Report: {loc.is_own_report}")
        print("-" * 40)

        is_latest_geo = (latest_geo_time is None) or (loc.time >= latest_geo_time)
        suppressed_by_multiplex = (
            loc.battery_slot == 0
            and latest_non_zero_slot_time is not None
            and abs(loc.time - latest_non_zero_slot_time) <= 600
        )
        should_update_device_battery = is_latest_geo and not suppressed_by_multiplex

        dt_utc = datetime.datetime.fromtimestamp(loc.time, tz=datetime.timezone.utc)
        enviar_a_petconnect(
            latitude=latitude,
            longitude=longitude,
            altitude=altitude,
            timestamp_str=dt_utc.isoformat(),
            battery_level=loc.battery_level if not suppressed_by_multiplex else None,
            battery_voltage=loc.battery_voltage if not suppressed_by_multiplex else None,
            is_charging=loc.is_charging if not suppressed_by_multiplex else None,
            update_device_battery=should_update_device_battery,
        )


if __name__ == '__main__':
    res = parse_device_update_protobuf("")
    decrypt_location_response_locations(res)