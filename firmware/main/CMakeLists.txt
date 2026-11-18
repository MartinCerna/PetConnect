idf_component_register(SRCS "main.c"
                    INCLUDE_DIRS "."
                    REQUIRES nvs_flash bt esp_adc driver esp_wifi esp_http_client esp_netif esp_event mbedtls esp_pm)