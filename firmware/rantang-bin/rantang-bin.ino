/*
  RANTANG — firmware wadah pintar (ESP32)
  ---------------------------------------
  Satu perangkat per wadah: RTG-01-L (pangan layak) dan RTG-01-S (sisa piring).

  Perangkat keras
    - ESP32 DevKit V1
    - Sel beban (load cell) 50 kg + modul HX711   DT -> GPIO 16, SCK -> GPIO 4
    - Sensor suhu tahan air DS18B20 (probe di dalam wadah)  DATA -> GPIO 17 (pull-up 4,7 kΩ)
    - Saklar buluh (reed switch) tutup wadah     -> GPIO 27 (INPUT_PULLUP)
    - LED status RGB / LED tunggal                -> GPIO 2
    - Baterai 18650 + pembagi tegangan            -> GPIO 34 (ADC)

  Pustaka (Library Manager): HX711 (bogde), OneWire, DallasTemperature, ArduinoJson 7

  Perilaku
    - Membaca berat 10x lalu dirata-rata; kirim bila berubah > 100 g dan stabil 3 detik,
      atau tiap 10 detik sebagai detak (heartbeat).
    - Kirim via HTTPS ke API RANTANG (POST /api/iot/telemetry, header X-Device-Key).
      Alternatif: MQTT topik rantang/<site>/bin/<device_id>/telemetry (aktifkan USE_MQTT).
    - Antre di RAM bila Wi-Fi putus (maks 30 pesan), dikirim ulang saat tersambung.
*/

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <HX711.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ArduinoJson.h>
#include <time.h>

// ====== konfigurasi per perangkat ======
const char* WIFI_SSID   = "SPPG-Sukamaju";
const char* WIFI_PASS   = "ganti-sandi-wifi";
const char* API_URL     = "https://api.rantang.example/api/iot/telemetry";
const char* DEVICE_ID   = "RTG-01-L";      // RTG-01-S untuk wadah sisa piring
const char* DEVICE_KEY  = "ganti-kunci-layak";
const char* STREAM      = "layak";         // "sisa"
const char* SITE        = "sppg-01";
const char* FW_VERSION  = "0.3.1";
float CALIBRATION       = -21.73f;         // hasil kalibrasi dengan beban 1 kg

// ====== pin ======
const int PIN_HX_DT = 16, PIN_HX_SCK = 4, PIN_TEMP = 17, PIN_LID = 27, PIN_LED = 2, PIN_BATT = 34;

HX711 scale;
OneWire oneWire(PIN_TEMP);
DallasTemperature temp(&oneWire);

const uint32_t HEARTBEAT_MS = 10000;
const float    DELTA_G      = 100.0;
const uint32_t STABLE_MS    = 3000;

float lastSentG = -99999;
uint32_t lastSentAt = 0, changeSince = 0;
float candidateG = 0;

String queue[30];
int qHead = 0, qLen = 0;

void enqueue(const String& s) {
  int idx = (qHead + qLen) % 30;
  if (qLen == 30) qHead = (qHead + 1) % 30; else qLen++;
  queue[idx] = s;
}

int batteryPct() {
  float v = analogRead(PIN_BATT) / 4095.0 * 3.3 * 2.0;   // pembagi 1:1
  int pct = (int)((v - 3.3) / (4.2 - 3.3) * 100);
  return constrain(pct, 0, 100);
}

String isoNow() {
  time_t now; time(&now);
  struct tm t; gmtime_r(&now, &t);
  char buf[25]; strftime(buf, sizeof buf, "%Y-%m-%dT%H:%M:%SZ", &t);
  return String(buf);
}

String buildPayload(float grams, float c) {
  JsonDocument doc;
  doc["device_id"]   = DEVICE_ID;
  doc["site"]        = SITE;
  doc["stream"]      = STREAM;
  doc["weight_g"]    = (int)round(grams);
  doc["temp_c"]      = round(c * 10) / 10.0;
  doc["battery_pct"] = batteryPct();
  doc["rssi"]        = WiFi.RSSI();
  doc["lid_open"]    = digitalRead(PIN_LID) == HIGH;
  doc["fw"]          = FW_VERSION;
  doc["ts"]          = isoNow();
  String out; serializeJson(doc, out);
  return out;
}

bool post(const String& body) {
  if (WiFi.status() != WL_CONNECTED) return false;
  WiFiClientSecure client;
  client.setInsecure();               // percontohan; produksi: setCACert(root_ca)
  HTTPClient http;
  http.begin(client, API_URL);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("X-Device-Key", DEVICE_KEY);
  int code = http.POST(body);
  http.end();
  return code == 202 || code == 200;
}

void flushQueue() {
  while (qLen > 0 && post(queue[qHead])) { qHead = (qHead + 1) % 30; qLen--; }
}

void blink(int n) { for (int i = 0; i < n; i++) { digitalWrite(PIN_LED, HIGH); delay(60); digitalWrite(PIN_LED, LOW); delay(60); } }

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LID, INPUT_PULLUP);
  pinMode(PIN_LED, OUTPUT);
  scale.begin(PIN_HX_DT, PIN_HX_SCK);
  scale.set_scale(CALIBRATION);
  scale.tare();                       // wadah kosong saat dinyalakan
  temp.begin();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  configTime(7 * 3600, 0, "pool.ntp.org", "time.google.com");   // WIB
  Serial.printf("RANTANG %s siap\n", DEVICE_ID);
}

void loop() {
  float grams = scale.get_units(10);
  temp.requestTemperatures();
  float c = temp.getTempCByIndex(0);
  uint32_t now = millis();

  // deteksi perubahan berat yang stabil
  if (fabs(grams - candidateG) > DELTA_G / 2) { candidateG = grams; changeSince = now; }
  bool stableChange = fabs(candidateG - lastSentG) > DELTA_G && now - changeSince > STABLE_MS;
  bool heartbeat = now - lastSentAt > HEARTBEAT_MS;

  if (stableChange || heartbeat) {
    String body = buildPayload(grams, c);
    if (post(body)) { blink(1); flushQueue(); }
    else { enqueue(body); blink(3); }
    lastSentG = grams;
    lastSentAt = now;
    Serial.println(body);
  }
  delay(500);
}
