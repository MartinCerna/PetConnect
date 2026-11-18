#include <stdio.h>
#include <stdint.h>
#include <stdbool.h>
#include <string.h>
#include <stdlib.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/event_groups.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "esp_err.h"
#include "esp_mac.h"
#include "driver/gpio.h"
#include "esp_adc/adc_oneshot.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"
#include "esp_wifi.h"
#include "esp_event.h"
#include "esp_netif.h"
#include "esp_http_client.h"
#include "esp_crt_bundle.h"
#include "esp_pm.h"
#include "esp_bt.h"

#define TAG "ESP_FMDN"

#if defined(CONFIG_IDF_TARGET_ESP32C3)
#include "esp_nimble_hci.h"
#include "nimble/nimble_port.h"
#include "nimble/nimble_port_freertos.h"
#include "host/ble_hs.h"
#include "host/util/util.h"
#include "services/gap/ble_svc_gap.h"

#elif defined(CONFIG_IDF_TARGET_ESP32)
#include "esp_bt_main.h"
#include "esp_gap_ble_api.h"

#else
#error "Unsupported target"
#endif

// ============================================================================
// CONFIGURACIÓN DE HARDWARE (BATERÍA LITIO 3.7V + MÓDULO TP4056 + ESP32-C3)
// ============================================================================
// Divisor resistivo 1:2 (R1 = 100 kOhm entre BAT+ y GPIO4, R2 = 100 kOhm entre GPIO4 y GND).
// Se usa GPIO4 (ADC1_CH4) en ESP32-C3 para evitar pines strapping (GPIO2/GPIO8/GPIO9).
#define BATTERY_ADC_UNIT            ADC_UNIT_1
#define BATTERY_ADC_CHANNEL         ADC_CHANNEL_4       // GPIO4 en ESP32-C3
#define BATTERY_CHRG_GPIO           GPIO_NUM_3          // Opcional: pin CHRG del TP4056 (via diodo, activo en LOW)
#define BATTERY_DIVIDER_RATIO       2.0f                // (R1 + R2) / R2 = (100k + 100k) / 100k = 2.0
#define BATTERY_CALIBRATION_FACTOR  1.00f               // Ajustar si tu multimetro difiere ligeramente (ej. 1.02f)
#define BATTERY_SAMPLE_COUNT        8
#define BATTERY_READ_INTERVAL_SEC   30                  // Lectura ADC cada 30 segundos

// ============================================================================
// OPTIMIZACIÓN ENERGÉTICA BLE (INTERVALOS ADAPTATIVOS Y POTENCIA TX)
// ============================================================================
// Unidades BLE = ms / 0.625 (0x0640 = 1000 ms, 0x0C80 = 2000 ms, 0x12C0 = 3000 ms)
#define BLE_ITVL_NORMAL             0x0640              // >30% bateria: 1000 ms, 0 dBm
#define BLE_ITVL_SAVING             0x0C80              // 16-30% bateria: 2000 ms, -3 dBm
#define BLE_ITVL_CRITICAL           0x12C0              // <=15% bateria: 3000 ms, -6 dBm

// ============================================================================
// CONFIGURACIÓN DE TELEMETRÍA WI-FI HACIA PETCONNECT WEB / APP
// ============================================================================
// Completa WIFI_SSID y WIFI_PASS (red 2.4 GHz) para que el ESP32-C3 envie su
// porcentaje de bateria y voltaje en modo rafaga ("Burst Mode") sin mantener
// el radio Wi-Fi encendido todo el tiempo.
// Si dejas WIFI_SSID vacio (""), seguira funcionando por BLE y mostrando la
// bateria por consola serial USB.
#define WIFI_SSID                   ""
#define WIFI_PASS                   ""
#define PETCONNECT_BATTERY_URL      "https://petconnect-2bh3.onrender.com/api/v1/devices/battery"
#define PETCONNECT_INGEST_API_KEY   "439c026bfaed8175"
// Opcional: si en PetConnect registraste otra MAC (ej. "10:00:3B:AE:EC:A0"), escribela aqui.
// Si se deja vacio "", usa automaticamente la MAC BLE del ESP32-C3.
#define DEVICE_MAC_OVERRIDE         ""
#define BATTERY_REPORT_INTERVAL_SEC 300                 // Envio HTTP cada 5 min (o al cambiar >=3%)

// ============================================================================
// CLAVES MULTI-EID DE GOOGLE FIND MY DEVICE NETWORK (FMDN) POR NIVEL DE BATERÍA
// ============================================================================
// Cada slot corresponde a un EID valido derivado de la misma identity_key del
// dispositivo para transmitir el nivel de bateria 100% por BLE sin Wi-Fi:
//   Slot 0: 80-100% (Optima / base) | Slot 1: 60-79% (Buena) | Slot 2: 30-59% (Media)
//   Slot 3: 16-29%  (Baja)          | Slot 4: <=15%  (Critica)| Slot 5: Cargando
static const char *BATTERY_EIDS[6] = {
    "1e01e0b2417c236b49a9cd2826d0b0abd74b8304",
    "017e922cd20d0a3a942445cfe83c6386a46f3d02",
    "3c1ad33b1fffbd8f1f63d4d41ef6b475ab5f8e30",
    "329758c365c21d873e150ef27d73f178ca4502b2",
    "4e6a83265a79404f60723c8614fea6f06bc41baf",
    "36ecb2effe665da724297d1c71ed9e8b083c22f9",
};
static uint8_t s_battery_eid_bytes[6][20];
static int s_active_eid_slot = 0;

// Find My Device Network (FMDN) advertisement
// Octet    Value           Description
// 0        0x02            Length
// 1        0x01            Flags data type value
// 2        0x06            Flags data
// 3        0x18 or 0x19    Length
// 4        0x16            Service data data type value
// 5        0xAA            16-bit service UUID
// 6        0xFE            16-bit service UUID
// 7        0x40 or 0x41    FMDN frame type with unwanted tracking protection mode indication
// 8..27    Random          20-byte ephemeral identifier
// 28       Hashed flags    Bits 6..5 = nivel de bateria (01 normal, 10 baja, 11 critica)
uint8_t adv_raw_data[31] = {
    0x02,   // Length
    0x01,   // Flags data type value
    0x06,   // Flags data
    0x19,   // Length
    0x16,   // Service data data type value
    0xAA,   // 16-bit service UUID
    0xFE,   // 16-bit service UUID
    0x41,   // FMDN frame type with unwanted tracking protection mode indication
            // 20-byte ephemeral identifier (inserted below)
            // Hashed flags (byte 28 actualizado segun bateria)
};

// ============================================================================
// ESTADO INTERNO DE BATERÍA, ADC, BLE Y WI-FI
// ============================================================================
static adc_oneshot_unit_handle_t s_adc_handle = NULL;
static adc_cali_handle_t s_adc_cali_handle = NULL;
static bool s_adc_cali_enabled = false;
static bool s_ble_synced = false;

typedef enum {
    BLE_POWER_NORMAL = 0,
    BLE_POWER_SAVING = 1,
    BLE_POWER_CRITICAL = 2,
} ble_power_profile_t;

static ble_power_profile_t s_ble_power_profile = BLE_POWER_NORMAL;

static EventGroupHandle_t s_wifi_event_group = NULL;
#define WIFI_CONNECTED_BIT BIT0
static bool s_wifi_enabled = false;
static volatile bool s_wifi_burst_active = false;
static int s_wifi_retry_num = 0;

static char s_device_mac_str[18] = "00:00:00:00:00:00";

typedef struct {
    float volts;
    int pct;
} lipo_curve_point_t;

// Curva realista de descarga de bateria LiPo / Li-Ion 1S (3.20V = 0% a 4.20V = 100%)
static const lipo_curve_point_t LIPO_CURVE[] = {
    {4.20f, 100},
    {4.10f, 90},
    {3.98f, 78},
    {3.88f, 62},
    {3.80f, 45},
    {3.72f, 28},
    {3.64f, 15},
    {3.50f, 6},
    {3.20f, 0},
};

void hex_string_to_bytes(const char *hex, uint8_t *bytes, size_t len) {
    for (size_t i = 0; i < len; i++) {
        sscanf(hex + 2 * i, "%2hhx", &bytes[i]);
    }
}

static void resolve_device_mac(void) {
    uint8_t ble_mac[6] = {0};
    uint8_t sta_mac[6] = {0};
    esp_read_mac(ble_mac, ESP_MAC_BT);
    esp_read_mac(sta_mac, ESP_MAC_WIFI_STA);

    ESP_LOGI(TAG, "MAC BLE del ESP32-C3 : %02X:%02X:%02X:%02X:%02X:%02X",
             ble_mac[0], ble_mac[1], ble_mac[2], ble_mac[3], ble_mac[4], ble_mac[5]);
    ESP_LOGI(TAG, "MAC Wi-Fi del ESP32-C3: %02X:%02X:%02X:%02X:%02X:%02X",
             sta_mac[0], sta_mac[1], sta_mac[2], sta_mac[3], sta_mac[4], sta_mac[5]);

    if (strlen(DEVICE_MAC_OVERRIDE) >= 11) {
        snprintf(s_device_mac_str, sizeof(s_device_mac_str), "%s", DEVICE_MAC_OVERRIDE);
        for (size_t i = 0; s_device_mac_str[i]; i++) {
            if (s_device_mac_str[i] >= 'a' && s_device_mac_str[i] <= 'f') {
                s_device_mac_str[i] -= 32;
            }
        }
    } else {
        snprintf(s_device_mac_str, sizeof(s_device_mac_str),
                 "%02X:%02X:%02X:%02X:%02X:%02X",
                 ble_mac[0], ble_mac[1], ble_mac[2], ble_mac[3], ble_mac[4], ble_mac[5]);
    }
    ESP_LOGI(TAG, "MAC usada para telemetria PetConnect: %s", s_device_mac_str);
}

static void battery_adc_init(void) {
    // Configurar GPIO3 (opcional) para detectar estado de carga del TP4056 (activo en LOW)
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << BATTERY_CHRG_GPIO),
        .mode = GPIO_MODE_INPUT,
        .pull_up_en = GPIO_PULLUP_ENABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&io_conf);

    // Inicializar unidad ADC1 en modo oneshot
    adc_oneshot_unit_init_cfg_t init_config = {
        .unit_id = BATTERY_ADC_UNIT,
    };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&init_config, &s_adc_handle));

    adc_oneshot_chan_cfg_t chan_config = {
        .bitwidth = ADC_BITWIDTH_DEFAULT,
        .atten = ADC_ATTEN_DB_12,
    };
    ESP_ERROR_CHECK(adc_oneshot_config_channel(s_adc_handle, BATTERY_ADC_CHANNEL, &chan_config));

    // Intentar habilitar calibracion de fabrica (eFuse)
#if ADC_CALI_SCHEME_CURVE_FITTING_SUPPORTED
    adc_cali_curve_fitting_config_t cali_config = {
        .unit_id = BATTERY_ADC_UNIT,
        .chan = BATTERY_ADC_CHANNEL,
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    if (adc_cali_create_scheme_curve_fitting(&cali_config, &s_adc_cali_handle) == ESP_OK) {
        s_adc_cali_enabled = true;
        ESP_LOGI(TAG, "Calibracion ADC (Curve Fitting) habilitada.");
    }
#elif ADC_CALI_SCHEME_LINE_FITTING_SUPPORTED
    adc_cali_line_fitting_config_t cali_config = {
        .unit_id = BATTERY_ADC_UNIT,
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };
    if (adc_cali_create_scheme_line_fitting(&cali_config, &s_adc_cali_handle) == ESP_OK) {
        s_adc_cali_enabled = true;
        ESP_LOGI(TAG, "Calibracion ADC (Line Fitting) habilitada.");
    }
#endif

    if (!s_adc_cali_enabled) {
        ESP_LOGW(TAG, "Sin calibracion eFuse; usando conversion aproximada de ADC.");
    }
}

static float read_battery_voltage_v(void) {
    if (!s_adc_handle) {
        return 0.0f;
    }

    int32_t mv_sum = 0;
    int valid_samples = 0;

    for (int i = 0; i < BATTERY_SAMPLE_COUNT; i++) {
        int raw = 0;
        if (adc_oneshot_read(s_adc_handle, BATTERY_ADC_CHANNEL, &raw) == ESP_OK) {
            int mv = 0;
            if (s_adc_cali_enabled && adc_cali_raw_to_voltage(s_adc_cali_handle, raw, &mv) == ESP_OK) {
                mv_sum += mv;
            } else {
                mv_sum += (raw * 2500) / 4095;
            }
            valid_samples++;
        }
        vTaskDelay(pdMS_TO_TICKS(2));
    }

    if (valid_samples == 0) {
        return 0.0f;
    }

    float pin_mv = (float)mv_sum / (float)valid_samples;
    float battery_v = (pin_mv / 1000.0f) * BATTERY_DIVIDER_RATIO * BATTERY_CALIBRATION_FACTOR;
    return battery_v;
}

static int lipo_voltage_to_percentage(float voltage_v) {
    const size_t n = sizeof(LIPO_CURVE) / sizeof(LIPO_CURVE[0]);
    if (voltage_v >= LIPO_CURVE[0].volts) {
        return LIPO_CURVE[0].pct;
    }
    if (voltage_v <= LIPO_CURVE[n - 1].volts) {
        return LIPO_CURVE[n - 1].pct;
    }

    for (size_t i = 0; i < n - 1; i++) {
        float v_high = LIPO_CURVE[i].volts;
        float v_low = LIPO_CURVE[i + 1].volts;
        if (voltage_v <= v_high && voltage_v >= v_low) {
            float ratio = (voltage_v - v_low) / (v_high - v_low);
            int pct = LIPO_CURVE[i + 1].pct + (int)(ratio * (float)(LIPO_CURVE[i].pct - LIPO_CURVE[i + 1].pct) + 0.5f);
            if (pct < 0) pct = 0;
            if (pct > 100) pct = 100;
            return pct;
        }
    }
    return 0;
}

static const char *battery_color_label(int pct, bool is_charging) {
    if (is_charging) {
        return "AZUL/CIAN (Cargando)";
    }
    if (pct >= 60) {
        return "VERDE (Optima)";
    }
    if (pct >= 30) {
        return "AMARILLO (Media)";
    }
    if (pct >= 16) {
        return "NARANJA (Baja)";
    }
    return "ROJO (Critica)";
}

static ble_power_profile_t get_ble_profile_for_pct(
    int pct, uint16_t *out_itvl, esp_power_level_t *out_pwr, const char **out_label
) {
    if (pct <= 15) {
        *out_itvl = BLE_ITVL_CRITICAL;
        *out_pwr = ESP_PWR_LVL_N6;
        *out_label = "ULTRA-AHORRO (3000 ms, -6 dBm)";
        return BLE_POWER_CRITICAL;
    }
    if (pct <= 30) {
        *out_itvl = BLE_ITVL_SAVING;
        *out_pwr = ESP_PWR_LVL_N3;
        *out_label = "AHORRO (2000 ms, -3 dBm)";
        return BLE_POWER_SAVING;
    }
    *out_itvl = BLE_ITVL_NORMAL;
    *out_pwr = ESP_PWR_LVL_N0;
    *out_label = "NORMAL EFICIENTE (1000 ms, 0 dBm)";
    return BLE_POWER_NORMAL;
}

#if defined(CONFIG_IDF_TARGET_ESP32C3)
static int ble_advertise_cb(struct ble_gap_event *event, void *arg) {
    switch (event->type) {
        case BLE_GAP_EVENT_ADV_COMPLETE:
            ESP_LOGI(TAG, "Advertising completed");
            break;
        default:
            break;
    }
    return 0;
}

static void ble_start_advertising(uint8_t *data, size_t data_len, uint16_t itvl_units) {
    struct ble_gap_adv_params adv_params = {
        .conn_mode = BLE_GAP_CONN_MODE_NON,
        .disc_mode = BLE_GAP_DISC_MODE_GEN,
        .itvl_min = itvl_units,
        .itvl_max = itvl_units,
    };

    int rc = ble_gap_adv_set_data(data, data_len);
    if (rc != 0) {
        ESP_LOGE(TAG, "Error configurando payload FMDN BLE (rc=%d)", rc);
    }
    rc = ble_gap_adv_start(BLE_OWN_ADDR_PUBLIC, NULL, BLE_HS_FOREVER, &adv_params, ble_advertise_cb, NULL);
    if (rc != 0) {
        ESP_LOGE(TAG, "Error iniciando advertising FMDN BLE (rc=%d)", rc);
    } else {
        ESP_LOGI(TAG, "BLE FMDN advertising activo (Slot EID #%d | intervalo: %u ms)",
                 s_active_eid_slot, (unsigned int)((itvl_units * 625U) / 1000U));
    }
}

static void ble_host_task(void *param) {
    ESP_LOGI(TAG, "BLE Host Task Started");
    nimble_port_run();
    nimble_port_freertos_deinit();
}

static void on_sync(void) {
    ble_svc_gap_device_name_set("ESP32-C3-BLE");
    esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_DEFAULT, ESP_PWR_LVL_N0);
    esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_ADV, ESP_PWR_LVL_N0);
    ble_start_advertising(adv_raw_data, sizeof(adv_raw_data), BLE_ITVL_NORMAL);
    s_ble_synced = true;
}
#endif

static int select_battery_eid_slot(int pct, bool is_charging, bool divider_connected) {
    if (!divider_connected) {
        return 0;
    }
    if (is_charging) {
        return 5;
    }
    if (pct >= 80) {
        return 0;
    }
    if (pct >= 60) {
        return 1;
    }
    if (pct >= 30) {
        return 2;
    }
    if (pct >= 16) {
        return 3;
    }
    return 4;
}

static void update_fmdn_battery_state(int pct, int tx_slot) {
    if (tx_slot < 0 || tx_slot >= 6) {
        tx_slot = 0;
    }

    // Byte 28 (hashed_flags) bits 6..5 segun especificacion Google FMDN:
    // 0b01 (0x20) = Normal, 0b10 (0x40) = Baja, 0b11 (0x60) = Critica
    uint8_t batt_bits = 0x20;
    if (pct <= 15) {
        batt_bits = 0x60;
    } else if (pct < 30) {
        batt_bits = 0x40;
    }

    uint16_t next_itvl = BLE_ITVL_NORMAL;
    esp_power_level_t next_pwr = ESP_PWR_LVL_N0;
    const char *profile_label = "";
    ble_power_profile_t next_profile = get_ble_profile_for_pct(pct, &next_itvl, &next_pwr, &profile_label);

    uint8_t updated_byte = (adv_raw_data[28] & (uint8_t)~0x60) | batt_bits;
    bool flags_changed = (updated_byte != adv_raw_data[28]);
    bool slot_changed = (tx_slot != s_active_eid_slot);
    bool profile_changed = (next_profile != s_ble_power_profile);

    if (!flags_changed && !slot_changed && !profile_changed) {
        return;
    }

    adv_raw_data[28] = updated_byte;
    if (slot_changed) {
        memcpy(&adv_raw_data[8], s_battery_eid_bytes[tx_slot], 20);
        s_active_eid_slot = tx_slot;
        ESP_LOGI(TAG, "[FMDN-BLE] Cambiando anuncio EID a Slot #%d", tx_slot);
    }

    if (profile_changed) {
        s_ble_power_profile = next_profile;
        esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_DEFAULT, next_pwr);
        esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_ADV, next_pwr);
        ESP_LOGI(TAG, "[ENERGIA] Perfil BLE actualizado -> %s", profile_label);
    }

#if defined(CONFIG_IDF_TARGET_ESP32C3)
    if (s_ble_synced) {
        if (profile_changed) {
            ble_gap_adv_stop();
            ble_start_advertising(adv_raw_data, sizeof(adv_raw_data), next_itvl);
        } else {
            int rc = ble_gap_adv_set_data(adv_raw_data, sizeof(adv_raw_data));
            if (rc == BLE_HS_EBUSY) {
                ble_gap_adv_stop();
                ble_start_advertising(adv_raw_data, sizeof(adv_raw_data), next_itvl);
            }
        }
    }
#elif defined(CONFIG_IDF_TARGET_ESP32)
    if (profile_changed) {
        esp_ble_gap_stop_advertising();
    }
    esp_ble_gap_config_adv_data_raw(adv_raw_data, sizeof(adv_raw_data));
    if (profile_changed) {
        esp_ble_adv_params_t adv_params = {
            .adv_int_min = next_itvl,
            .adv_int_max = next_itvl,
            .adv_type = ADV_TYPE_NONCONN_IND,
            .own_addr_type = BLE_ADDR_TYPE_PUBLIC,
            .channel_map = ADV_CHNL_ALL,
            .adv_filter_policy = ADV_FILTER_ALLOW_SCAN_ANY_CON_ANY,
        };
        esp_ble_gap_start_advertising(&adv_params);
    }
#endif
}

static void wifi_event_handler(void *arg, esp_event_base_t event_base, int32_t event_id, void *event_data) {
    if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_START) {
        if (s_wifi_burst_active) {
            esp_wifi_connect();
        }
    } else if (event_base == WIFI_EVENT && event_id == WIFI_EVENT_STA_DISCONNECTED) {
        xEventGroupClearBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
        if (s_wifi_burst_active && s_wifi_retry_num < 4) {
            s_wifi_retry_num++;
            ESP_LOGW(TAG, "Wi-Fi desconectado en rafaga, reintentando (%d/4)...", s_wifi_retry_num);
            esp_wifi_connect();
        }
    } else if (event_base == IP_EVENT && event_id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t *event = (ip_event_got_ip_t *)event_data;
        ESP_LOGI(TAG, "Wi-Fi conectado! IP: " IPSTR, IP2STR(&event->ip_info.ip));
        s_wifi_retry_num = 0;
        xEventGroupSetBits(s_wifi_event_group, WIFI_CONNECTED_BIT);
    }
}

static void wifi_init_sta_if_configured(void) {
    const char *ssid = WIFI_SSID;
    if (strlen(ssid) == 0) {
        ESP_LOGW(TAG, "WIFI_SSID vacio: la bateria se mostrara por Serial y BLE, sin envio HTTP.");
        return;
    }

    s_wifi_enabled = true;
    s_wifi_event_group = xEventGroupCreate();

    ESP_ERROR_CHECK(esp_netif_init());
    ESP_ERROR_CHECK(esp_event_loop_create_default());
    esp_netif_create_default_wifi_sta();

    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    ESP_ERROR_CHECK(esp_wifi_init(&cfg));

    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL, NULL));
    ESP_ERROR_CHECK(esp_event_handler_instance_register(
        IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL, NULL));

    wifi_config_t wifi_config = {0};
    snprintf((char *)wifi_config.sta.ssid, sizeof(wifi_config.sta.ssid), "%s", WIFI_SSID);
    snprintf((char *)wifi_config.sta.password, sizeof(wifi_config.sta.password), "%s", WIFI_PASS);
    wifi_config.sta.threshold.authmode = strlen(WIFI_PASS) > 0 ? WIFI_AUTH_WPA2_PSK : WIFI_AUTH_OPEN;

    ESP_ERROR_CHECK(esp_wifi_set_mode(WIFI_MODE_STA));
    ESP_ERROR_CHECK(esp_wifi_set_config(WIFI_IF_STA, &wifi_config));
    // Modo rafaga ("Burst Mode"): el radio Wi-Fi permanece apagado hasta que toque enviar telemetria.
    ESP_LOGI(TAG, "Wi-Fi configurado en modo rafaga (radio apagado en reposo).");
}

static bool send_battery_to_petconnect(int pct, float voltage_v, bool is_charging) {
    if (!s_wifi_enabled || !s_wifi_event_group) {
        return false;
    }

    s_wifi_retry_num = 0;
    s_wifi_burst_active = true;
    xEventGroupClearBits(s_wifi_event_group, WIFI_CONNECTED_BIT);

    if (esp_wifi_start() != ESP_OK) {
        s_wifi_burst_active = false;
        return false;
    }
    esp_wifi_set_ps(WIFI_PS_MIN_MODEM);

    EventBits_t bits = xEventGroupWaitBits(
        s_wifi_event_group,
        WIFI_CONNECTED_BIT,
        pdFALSE,
        pdTRUE,
        pdMS_TO_TICKS(12000)
    );

    bool ok = false;
    if ((bits & WIFI_CONNECTED_BIT) != 0) {
        char payload[192];
        snprintf(payload, sizeof(payload),
                 "{\"device_mac\":\"%s\",\"battery_level\":%d,\"battery_voltage\":%.2f,\"is_charging\":%s}",
                 s_device_mac_str, pct, voltage_v, is_charging ? "true" : "false");

        esp_http_client_config_t config = {
            .url = PETCONNECT_BATTERY_URL,
            .method = HTTP_METHOD_POST,
            .timeout_ms = 10000,
            .crt_bundle_attach = esp_crt_bundle_attach,
        };

        esp_http_client_handle_t client = esp_http_client_init(&config);
        if (client) {
            esp_http_client_set_header(client, "Content-Type", "application/json");
            esp_http_client_set_header(client, "X-API-Key", PETCONNECT_INGEST_API_KEY);
            esp_http_client_set_post_field(client, payload, strlen(payload));

            esp_err_t err = esp_http_client_perform(client);
            if (err == ESP_OK) {
                int status_code = esp_http_client_get_status_code(client);
                ESP_LOGI(TAG, "Telemetria enviada a PetConnect -> HTTP %d (%s)", status_code, payload);
                ok = (status_code >= 200 && status_code < 300);
            } else {
                ESP_LOGE(TAG, "Error enviando telemetria a PetConnect: %s", esp_err_to_name(err));
            }
            esp_http_client_cleanup(client);
        } else {
            ESP_LOGE(TAG, "No se pudo inicializar el cliente HTTP.");
        }
    } else {
        ESP_LOGW(TAG, "Timeout conectando Wi-Fi (12 s); apagando radio para ahorrar bateria.");
    }

    s_wifi_burst_active = false;
    esp_wifi_disconnect();
    esp_wifi_stop();
    return ok;
}

static void battery_monitor_task(void *param) {
    vTaskDelay(pdMS_TO_TICKS(3000));

    int last_sent_pct = -1;
    bool last_sent_charging = false;
    TickType_t last_attempt_tick = 0;
    uint32_t cycle_count = 0;

    while (1) {
        float voltage_v = read_battery_voltage_v();
        bool divider_connected = (voltage_v >= 1.00f);
        int effective_pct = divider_connected ? lipo_voltage_to_percentage(voltage_v) : 100;
        bool is_charging = divider_connected && (gpio_get_level(BATTERY_CHRG_GPIO) == 0);

        int target_slot = select_battery_eid_slot(effective_pct, is_charging, divider_connected);
        // Multiplexacion segura: 2 ciclos con el EID del nivel de bateria + 1 ciclo con el EID base Slot 0
        int tx_slot = target_slot;
        if (target_slot != 0 && (cycle_count % 3U) == 2U) {
            tx_slot = 0;
        }

        update_fmdn_battery_state(effective_pct, tx_slot);

        if (!divider_connected) {
            ESP_LOGW(TAG, "[BATERIA] Divisor ADC no detectado en GPIO4 (%.2f V) -> Usando Slot 0 (100%% nominal)",
                     voltage_v);
        }
        ESP_LOGI(TAG, "[FMDN-BLE] Anuncio Google Find My activo | Slot EID #%d | Voltaje: %.2f V | Nivel: %d%% | Color: %s | Cargando: %s",
                 tx_slot, voltage_v, effective_pct,
                 battery_color_label(effective_pct, is_charging),
                 is_charging ? "SI" : "NO");

        TickType_t now = xTaskGetTickCount();
        bool interval_elapsed = (last_attempt_tick == 0) ||
            ((now - last_attempt_tick) >= pdMS_TO_TICKS((uint32_t)BATTERY_REPORT_INTERVAL_SEC * 1000U));
        bool significant_change = (last_sent_pct < 0) ||
            (abs(effective_pct - last_sent_pct) >= 3) ||
            (is_charging != last_sent_charging);

        if (s_wifi_enabled && divider_connected && (interval_elapsed || significant_change)) {
            last_attempt_tick = now;
            if (send_battery_to_petconnect(effective_pct, voltage_v, is_charging)) {
                last_sent_pct = effective_pct;
                last_sent_charging = is_charging;
            }
        }

        cycle_count++;
        vTaskDelay(pdMS_TO_TICKS((uint32_t)BATTERY_READ_INTERVAL_SEC * 1000U));
    }
}

static void configure_power_management(void) {
#if CONFIG_PM_ENABLE
    esp_pm_config_t pm_config = {
        .max_freq_mhz = 80,
        .min_freq_mhz = 10,
        .light_sleep_enable = false,
    };
    esp_err_t pm_err = esp_pm_configure(&pm_config);
    if (pm_err == ESP_OK) {
        ESP_LOGI(TAG, "DFS Power Management activo (10-80 MHz, light_sleep=false para USB estable).");
    } else {
        ESP_LOGW(TAG, "No se pudo configurar esp_pm: %s", esp_err_to_name(pm_err));
    }
#endif
}

void app_main(void) {
    // Initialize NVS (required for BLE and Wi-Fi initialization)
    esp_err_t ret = nvs_flash_init();
    if (ret == ESP_ERR_NVS_NO_FREE_PAGES || ret == ESP_ERR_NVS_NEW_VERSION_FOUND) {
        ESP_ERROR_CHECK(nvs_flash_erase());
        ret = nvs_flash_init();
    }
    ESP_ERROR_CHECK(ret);

    configure_power_management();
    resolve_device_mac();
    battery_adc_init();

    // Decodificar los 6 EIDs de bateria (Slots 0..5) y arrancar con Slot 0
    for (int s = 0; s < 6; s++) {
        hex_string_to_bytes(BATTERY_EIDS[s], s_battery_eid_bytes[s], 20);
    }
    memcpy(&adv_raw_data[8], s_battery_eid_bytes[0], 20);

    #if defined(CONFIG_IDF_TARGET_ESP32C3)
        ESP_LOGI(TAG, "Initializing BLE (ESP32-C3 NimBLE)");
        ESP_ERROR_CHECK(nimble_port_init());
        ble_hs_cfg.sync_cb = on_sync;
        ble_svc_gap_init();
        nimble_port_freertos_init(ble_host_task);

    #elif defined(CONFIG_IDF_TARGET_ESP32)
        esp_bt_controller_config_t bt_cfg = BT_CONTROLLER_INIT_CONFIG_DEFAULT();
        ESP_ERROR_CHECK(esp_bt_controller_init(&bt_cfg));
        ESP_ERROR_CHECK(esp_bt_controller_enable(ESP_BT_MODE_BLE));
        ESP_ERROR_CHECK(esp_bluedroid_init());
        ESP_ERROR_CHECK(esp_bluedroid_enable());
        ESP_ERROR_CHECK(esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_DEFAULT, ESP_PWR_LVL_N0));
        ESP_ERROR_CHECK(esp_ble_tx_power_set(ESP_BLE_PWR_TYPE_ADV, ESP_PWR_LVL_N0));
        ESP_ERROR_CHECK(esp_ble_gap_config_adv_data_raw(adv_raw_data, sizeof(adv_raw_data)));

        esp_ble_adv_params_t adv_params = {
            .adv_int_min = BLE_ITVL_NORMAL,
            .adv_int_max = BLE_ITVL_NORMAL,
            .adv_type = ADV_TYPE_NONCONN_IND,
            .own_addr_type = BLE_ADDR_TYPE_PUBLIC,
            .channel_map = ADV_CHNL_ALL,
            .adv_filter_policy = ADV_FILTER_ALLOW_SCAN_ANY_CON_ANY,
        };
        ESP_ERROR_CHECK(esp_ble_gap_start_advertising(&adv_params));
        ESP_LOGI(TAG, "BLE advertising started.");
    #endif

    // Inicializar Wi-Fi (modo rafaga si WIFI_SSID esta configurado) y tarea de bateria
    wifi_init_sta_if_configured();
    xTaskCreate(battery_monitor_task, "battery_monitor_task", 6144, NULL, 5, NULL);
}
