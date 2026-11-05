#
#  GoogleFindMyTools - A set of tools to interact with the Google Find My API
#  Copyright © 2024 Leon Böttger. All rights reserved.
#

import json
import os

SECRETS_FILE = 'secrets.json'

def get_cached_value_or_set(name: str, generator: callable):
    existing_value = get_cached_value(name)
    if existing_value is not None:
        return existing_value

    value = generator()
    set_cached_value(name, value)
    return value


def _get_secrets_file():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    return os.path.join(script_dir, SECRETS_FILE)


def _ensure_secrets_file():
    secrets_file = _get_secrets_file()
    if not os.path.exists(secrets_file):
        env_secrets = os.getenv("GOOGLE_FINDMY_SECRETS")
        if env_secrets:
            try:
                data = json.loads(env_secrets)
                with open(secrets_file, 'w', encoding='utf-8') as file:
                    json.dump(data, file)
                print("[TokenCache] Archivo secrets.json generado exitosamente desde variable de entorno.")
            except Exception as e:
                print(f"[TokenCache] Error al parsear GOOGLE_FINDMY_SECRETS: {e}")
    return secrets_file


def get_cached_value(name: str):
    secrets_file = _ensure_secrets_file()

    if os.path.exists(secrets_file):
        with open(secrets_file, 'r', encoding='utf-8') as file:
            try:
                data = json.load(file)
                value = data.get(name)
                if value:
                    return value
            except json.JSONDecodeError:
                pass

    # Fallback directo a variable de entorno si el archivo no existe o no se pudo leer
    env_secrets = os.getenv("GOOGLE_FINDMY_SECRETS")
    if env_secrets:
        try:
            data = json.loads(env_secrets)
            return data.get(name)
        except Exception:
            return None

    return None


def set_cached_value(name: str, value: str):
    secrets_file = _ensure_secrets_file()

    data = {}
    if os.path.exists(secrets_file):
        with open(secrets_file, 'r', encoding='utf-8') as file:
            try:
                data = json.load(file)
            except json.JSONDecodeError:
                data = {}
    elif os.getenv("GOOGLE_FINDMY_SECRETS"):
        try:
            data = json.loads(os.getenv("GOOGLE_FINDMY_SECRETS"))
        except Exception:
            data = {}

    data[name] = value
    try:
        with open(secrets_file, 'w', encoding='utf-8') as file:
            json.dump(data, file)
    except Exception as e:
        print(f"[TokenCache] Advertencia: No se pudo escribir en secrets.json ({e}).")
