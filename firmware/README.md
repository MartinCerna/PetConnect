# Find My Device ESP32 Firmware

This code enables you to use an ESP32-device as a custom Google Find My Device tracker. Note that the firmware is very experimental. 

The firmware works differently to regular Find My Device trackers. It is made to be as simple as possible. It has no Fast Pair support, MAC rotation, advertisement rotation, etc.

Currently known working devices include the ESP32 (Dev Module V1), the ESP32-CAM, and ESP32-C3. If you use a different board and it works/doesn't work, feel free to message me, I'll update this README then. 


## How to use

- Run the Python Script [`main.py`](../main.py) in the parent folder. Follow the instructions of the [README of the parent folder](../README.md).
- When the device list is displayed, press 'r' to register a new ESP32/Zephyr device in your account. Copy the displayed advertisement key.
- Install Visual Studio Code [here](https://code.visualstudio.com/download)
- Go to Visual Studio Code Extensions, search, install and open 'ESP-IDF' by Espressif
- Open the folder containing this README file in Visual Studio Code
- Navigate to the folder main, select the file [`main.c`](main/main.c)
- Edit Line 15, and insert the advertisement key retrieved from the Python Script
- Connect your ESP32 to your system with USB
- On the bottom left of Visual Studio Code, click the 'plug' icon and select your ESP32, it should be named '/dev/tty.usbserial-0001' or similar
- Click the 'Fire' icon to build and flash the firmware
- If asked, use UART as flash method
- After flashing, the ESP32 will restart and start advertising as the Find My Device tracker previously registered


## Conexión de Batería LiPo 3.7V + Módulo de Carga (TP4056) al ESP32-C3

> **Importante:** Nunca conectes el polo positivo de la batería (`4.2 V` cargada) directamente a un pin GPIO del ESP32-C3 (el chip trabaja a `3.3 V` y su ADC1 calibrado mide hasta `~2.5 V`). Usa un **divisor de voltaje 1:2**.

### 1. Materiales adicionales
- 1 × Batería LiPo / Li-Ion 3.7 V (1S, rango `3.20 V – 4.20 V`)
- 1 × Módulo de carga **TP4056** (preferiblemente con protección `DW01A`, salidas `B+/B-` y `OUT+/OUT-`)
- 2 × Resistencias iguales de **100 kΩ** (1/4 W, idealmente 1%) — consumo mínimo (`~21 µA`)
- 1 × Capacitor cerámico de **100 nF** (`0.1 µF`) *(opcional recomendado para filtrar ruido del ADC)*
- 1 × Diodo **1N4148** o Schottky **BAT54** *(solo si deseas detectar estado "Cargando" en `GPIO3`)*

### 2. Esquema de conexiones

1. **Batería al módulo de carga TP4056:**
   - `LiPo (+)` ──▶ `B+` del TP4056
   - `LiPo (-)` ──▶ `B-` del TP4056

2. **Alimentación del ESP32-C3 desde el TP4056:**
   - Si tu placa ESP32-C3 tiene pin `5V` / `VIN` (regulador AMS1117 o LDO 3.3V integrado): `OUT+` del TP4056 ──▶ pin **`5V` / `VIN`** del ESP32-C3 (o un regulador LDO de baja caída HT7333 / MCP1700-3302E hacia `3.3V`).
   - `OUT-` del TP4056 ──▶ **`GND`** del ESP32-C3 *(tierra común obligatoria)*.
   - ⚠️ **No conectes `4.2 V` directo al pin `3V3` del ESP32-C3.**

3. **Divisor de voltaje para medir porcentaje de batería (`GPIO4` / `ADC1_CH4`):**
   ```text
   BAT+ (B+ / OUT+ del TP4056)
     │
    [R1 = 100 kΩ]
     │
     ├──────────────┬────▶ GPIO4 (ADC1_CH4 del ESP32-C3)
     │              │
    [R2 = 100 kΩ]  [C1 = 100 nF] (opcional)
     │              │
   GND ─────────────┴────▶ GND del ESP32-C3
   ```
   - Se utiliza **`GPIO4` (`ADC1_CH4`)** porque es un canal seguro de ADC1 en ESP32-C3 y evita el pin strapping `GPIO2`.
   - Con `R1 = 100 kΩ` y `R2 = 100 kΩ`, a `4.20 V` el pin `GPIO4` recibe `2.10 V` (seguro y dentro del rango calibrado de `ADC_ATTEN_DB_12`).

4. **Detección opcional de estado "Cargando" (`GPIO3`):**
   - Conecta el cátodo (`raya`) del diodo `1N4148` al **pin 7 (`CHRG`) del chip TP4056** (o unión del LED rojo de carga que va a GND cuando carga) y el ánodo del diodo a **`GPIO3`** del ESP32-C3.
   - El firmware activa resistencia pull-up interna en `GPIO3`, y el diodo bloquea cualquier retorno de `5 V` cuando el cargador no está cargando.

### 3. Configuración en [`main.c`](main/main.c)
Antes de compilar y flashear, edita estas constantes al inicio de [`main/main.c`](main/main.c):
- `WIFI_SSID` y `WIFI_PASS`: red Wi-Fi (2.4 GHz) para que el dispositivo envíe porcentaje, voltaje y estado de carga a `POST /api/v1/devices/battery`.
- `PETCONNECT_BATTERY_URL`: URL de tu API (`https://petconnect-2bh3.onrender.com/api/v1/devices/battery` o tu backend local).
- `PETCONNECT_INGEST_API_KEY`: debe coincidir con `INGEST_API_KEY` de tu backend.
- `DEVICE_MAC_OVERRIDE`: opcional si en PetConnect registraste otra dirección MAC distinta a la MAC BLE del chip.
- `BATTERY_CALIBRATION_FACTOR`: si comparas el voltaje del monitor serial con un multímetro, puedes ajustar este factor (por ejemplo `1.02f`) para compensar la tolerancia de las resistencias.

### 4. Optimizaciones de Consumo Energético incluidas
- **Anuncio BLE adaptativo + control de potencia TX**:
  - Batería `> 30%`: intervalo `1000 ms`, potencia `0 dBm`
  - Batería `16% – 30%`: intervalo `2000 ms`, potencia `-3 dBm`
  - Batería `<= 15%`: intervalo `3000 ms`, potencia `-6 dBm`
- **Wi-Fi en modo ráfaga ("Burst Mode")**: el radio Wi-Fi permanece apagado (`0 mA`) la mayor parte del tiempo; solo se enciende brevemente al arrancar, cada 5 minutos (`BATTERY_REPORT_INTERVAL_SEC = 300`) o cuando la batería cambia `>= 3%` / cambia el estado de carga, y vuelve a apagarse inmediatamente después del `POST`.
- **Escalado Dinámico de Frecuencia (DFS)**: CPU configurada con rango `10 MHz – 80 MHz` (`CONFIG_PM_ENABLE=y`, `CONFIG_ESP_DEFAULT_CPU_FREQ_MHZ=80`) con `light_sleep_enable = false` para mantener estable el puerto USB Serial/JTAG.
- **Muestreo ADC `oneshot` eficiente**: 8 lecturas rápidas cada 30 segundos.

### 5. Cómo compilar y flashear desde VS Code
1. Abre **solo la carpeta `firmware/`** en VS Code (`File` → `Open Folder...` → `PetConnect/firmware`).
2. Verifica que la extensión **ESP-IDF** (Espressif) cargue la configuración (`C:\esp\v6.1\esp-idf`).
3. Conecta tu ESP32-C3 por USB-C. En la barra inferior izquierda de VS Code:
   - Haz clic en el **ícono de enchufe** (*Select Port to Use*) y selecciona el puerto `COM` correspondiente (por ejemplo `COM10` o `USB JTAG/serial debug unit`).
   - Verifica que el target sea **`esp32c3`** (*Set Espressif Device Target*).
4. Haz clic en el **ícono de llama 🔥 (*Build, Flash and Start a Monitor on Your Device*)**, o ejecuta por separado:
   - **Build** (ícono de llave inglesa 🔧)
   - **Flash** (ícono de rayo ⚡) con método **UART**
   - **Monitor** (ícono de pantalla 🖥️) para ver voltaje, porcentaje, color y MAC en tiempo real.

> **Nota si el ESP32-C3 no entra en modo descarga:** mantén presionado el botón **`BOOT`** (GPIO9), presiona y suelta **`RST`** (EN), y luego suelta **`BOOT`** antes de presionar Flash ⚡.

## Known Issues

- You need to run [`main.py`](../main.py) every 4 days to keep receiving location reports from the server. This is because the advertisements have to be "announced" to Google. 
- Might not work with 'fresh' Google accounts: "Your encryption data is locked on your device" is shown if you have never paired a Find My Device tracker with an Android device. Solution: See [README of the parent folder](../README.md).
- You cannot view locations for the ESP32 in the Google Find My Device app. You will need to use the Python script to do so.
- No privacy features such as rotating MAC addresses are implemented
- The firmware was built to receive as many network reports as possible. Therefore, it might consume more power than necessary. To fix this, you can tweak the parameters (TX Power and advertising interval) in [`main.c`](main/main.c)
