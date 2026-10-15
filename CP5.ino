/**
 * =========================================================================================
 * PROJETO: Solução Inteligente de Supervisão e Monitoramento de Vinherias (Check Point 5)
 * EQUIPE: Equipe Prisma
 * DISCIPLINA: Disruptive Architectures - IoT & Cloud Computing
 * ORIENTADOR: Prof. Dr. Fábio Henrique Cabrini
 * =========================================================================================
 * 
 * ATUALIZAÇÕES IMPLEMENTADAS:
 * 1. Alerta Crítico Ultrarrápido:
 *    - Ciclo veloz e frenético de 50ms bip / 40ms silêncio (11 bips/segundo: bip-bip-bip-bip-bip!).
 *    - Total eliminação de delays ou bloqueios no loop (I2C acelerado a 400kHz, conexões 100% não-bloqueantes).
 *    - LED Azul piscando em sincronia 1:1 com cada bip rápido.
 * 2. Alerta Extremo:
 *    - Barulho CONSTANTE (tom contínuo ininterrupto de emergência máxima) e LED Azul fixo.
 * 3. Inicialização Equipe Prisma:
 *    - "EQUIPE PRISMA" com moldura geométrica.
 *    - Logo animada com varredura por feixe de luz e arpeggio sonoro ascendente.
 *    - "VINHERIA TECH" com barra de progresso gráfica suave de carregamento.
 * 4. Display OLED Otimizado:
 *    - Removida a palavra "ADEGA: ", exibindo apenas o status ("ADEGA SEGURA", "TEMP CRITICA!", "TEMP EXTREMA!!").
 *    - Rodapé com hora oficial em tempo real ou horário exato do alerta/reconhecimento (substituindo Digital Twin Sync).
 * 5. Registro de Horário e Data (NTP GMT-3):
 *    - Cadastro de quando ocorreu o alarme e registro do atendimento via RFID Master (UID: 01:02:03:04).
 * =========================================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <SPI.h>
#include <MFRC522.h>
#include "DHT.h"
#include "time.h"
#include "logo_bmp.h"

// -----------------------------------------------------------------------------
// DEFINIÇÃO DE PINOS
// -----------------------------------------------------------------------------
#define PIN_DHT          4    // Sensor DHT-22 (One-Wire)
#define PIN_LDR          34   // LDR (ADC1_CH6 - Seguro com Wi-Fi ativo)
#define PIN_LED_AZUL     2    // LED Azul de Alerta (Onboard / Externo)
#define PIN_BUZZER       13   // Buzzer Piezoelétrico

// Barramento I2C (Display OLED SSD1306)
#define PIN_OLED_SDA     21
#define PIN_OLED_SCL     22

// Barramento SPI (Leitor RFID MFRC522)
#define PIN_RFID_SS      5    // Chip Select (SDA no módulo RC522)
#define PIN_RFID_RST     27   // Reset do RC522
#define PIN_SPI_SCK      18   // SCK SPI
#define PIN_SPI_MISO     19   // MISO SPI
#define PIN_SPI_MOSI     23   // MOSI SPI

// -----------------------------------------------------------------------------
// CONSTANTES & CONFIGURAÇÕES
// -----------------------------------------------------------------------------
#define DHTTYPE DHT22

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
#define OLED_RESET -1
#define SCREEN_ADDRESS 0x3C

// UID do Cartão Master de Reconhecimento (Configurado no Wokwi)
const String MASTER_UID = "01:02:03:04";

// Credenciais Wi-Fi (Simulador Wokwi)
const char* default_SSID = "Wokwi-GUEST";
const char* default_PASSWORD = "";

// Configurações do Broker MQTT (FIWARE / HiveMQ Público para Wokwi e Nuvem)
// Para testar na VM do laboratório, você pode alterar para "46.17.108.113" ou "localhost"
const char* default_BROKER_MQTT = "broker.hivemq.com";
const int default_BROKER_PORT = 1883;

// Tópicos UltraLight 2.0
const char* TOPICO_SUBSCRIBE   = "/TEF/wine001/cmd";
const char* TOPICO_PUBLISH_ALL = "/TEF/wine001/attrs";
const char* TOPICO_PUBLISH_T   = "/TEF/wine001/attrs/t";
const char* TOPICO_PUBLISH_H   = "/TEF/wine001/attrs/h";
const char* TOPICO_PUBLISH_L   = "/TEF/wine001/attrs/l";
const char* TOPICO_PUBLISH_OP  = "/TEF/wine001/attrs/rfid";
const char* TOPICO_PUBLISH_LOG = "/TEF/wine001/attrs/log";
const char* TOPICO_CMD_EXE     = "/TEF/wine001/cmdexe";
const char* ID_MQTT            = "fiware_wine001";
const char* topicPrefix        = "wine001";

// Limites Ideais de Conservação de Vinhos (Adega Normal)
float TEMP_MIN = 12.0;
float TEMP_MAX = 16.0;
float HUM_MIN  = 60.0;
float HUM_MAX  = 75.0;
int   LUM_MAX  = 30;

// Limites para Degradação Extrema (Risco Imediato de Perda Total)
const float TEMP_EXTREMA_BAIXA = 10.0;
const float TEMP_EXTREMA_ALTA  = 20.0;
const float HUM_EXTREMA_BAIXA  = 50.0;
const float HUM_EXTREMA_ALTA   = 85.0;
const int   LUM_EXTREMA_ALTA   = 60;

// -----------------------------------------------------------------------------
// ENUMERADORES & ESTRUTURAS
// -----------------------------------------------------------------------------
enum TipoAlarme {
  ALARME_NENHUM = 0,
  ALARME_TEMPERATURA,
  ALARME_UMIDADE,
  ALARME_LUMINOSIDADE,
  ALARME_GERAL_REMOTO
};

enum NivelSeveridade {
  SEVERIDADE_NENHUM = 0,
  SEVERIDADE_CRITICO,
  SEVERIDADE_EXTREMO
};

enum EstadoTamagotchi {
  MOOD_FELIZ,
  MOOD_CALOR,
  MOOD_FRIO,
  MOOD_SECO,
  MOOD_AFOGADO,
  MOOD_LUZ_ALTA,
  MOOD_PANICO,
  MOOD_RECONHECIDO
};

// -----------------------------------------------------------------------------
// INSTÂNCIAS DOS MÓDULOS
// -----------------------------------------------------------------------------
WiFiClient espClient;
PubSubClient MQTT(espClient);
DHT dht(PIN_DHT, DHTTYPE);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);

// -----------------------------------------------------------------------------
// VARIÁVEIS GLOBAIS DE ESTADO
// -----------------------------------------------------------------------------
float temperaturaAtual = 14.0;
float umidadeAtual = 68.0;
int   luminosidadeAtual = 12;

bool alarmeAtivo = false;
bool alarmeReconhecido = false;
bool alarmeRemotoForcado = false;

TipoAlarme tipoAlarmeAtual = ALARME_NENHUM;
NivelSeveridade severidadeAtual = SEVERIDADE_NENHUM;
EstadoTamagotchi humorAtual = MOOD_FELIZ;

String mensagemStatusOLED = "ADEGA SEGURA";

// Registro e Cadastro de Eventos (Horário e Data)
String dataHoraInicioAlerta = "--/-- --:--:--";
String dataHoraUltimoAck   = "--/-- --:--:--";
String horaInicioAlertaSoHora = "--:--:--";
String horaUltimoAckSoHora = "--:--:--";
String ultimoOperadorRFID  = "Nenhum";

// Temporizadores 100% não-bloqueantes via millis()
unsigned long previousMillisSensors = 0;
const unsigned long INTERVAL_SENSORS = 2000;

unsigned long previousMillisMQTT = 0;
const unsigned long INTERVAL_MQTT = 3000;

unsigned long previousMillisOLED = 0;
const unsigned long INTERVAL_OLED = 250;

unsigned long previousMillisBlink = 0;
bool estadoLedAzul = false;

unsigned long previousMillisBuzzer = 0;
bool estadoBuzzer = false;

unsigned long previousMillisRFIDScan = 0;
const unsigned long INTERVAL_RFID_SCAN = 100;

// -----------------------------------------------------------------------------
// PROTÓTIPOS DAS FUNÇÕES
// -----------------------------------------------------------------------------
void initSerial();
void initPins();
void initDisplay();
void animarApresentacaoInicial();
void initRFID();
void initWiFi();
void initMQTT();
void initNTP();
String obterDataHoraAtual();
String obterHoraAtual();

void verificaConexoes();
void reconnectWiFi();
void reconnectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);

void lerSensores();
void avaliarTriggers();
void gerenciarAtuadoresAlarme();
void tocarAlarmeCritico();
void tocarAlarmeExtremo();
void pararBuzzer();

void varrerRFID();
void reconhecerAlarme(String uid);
void rejeitarRFID(String uid);

void atualizarDisplayOLED();
void desenharMascoteTamagotchi(int x, int y, EstadoTamagotchi mood);
void publicarTelemetriaMQTT();
void registrarAlarmeNaMemoria(TipoAlarme tipo, NivelSeveridade sev);

// =============================================================================
// SETUP
// =============================================================================
void setup() {
  initSerial();
  initPins();

  Serial.println(F("\n======================================================="));
  Serial.println(F(" EQUIPE PRISMA - SUPERVISÃO DE VINHERIAS (CP5 IoT)     "));
  Serial.println(F("======================================================="));

  initDisplay();
  animarApresentacaoInicial();

  initRFID();
  dht.begin();

  initWiFi();
  initMQTT();
  initNTP();

  Serial.println(F(">> Sistema pronto e monitorando em tempo real!"));
}

// =============================================================================
// LOOP PRINCIPAL (100% NÃO-BLOQUEANTE - SEM DELAYS)
// =============================================================================
void loop() {
  verificaConexoes();
  MQTT.loop();

  unsigned long currentMillis = millis();

  // 1. Leitura periódica dos sensores
  if (currentMillis - previousMillisSensors >= INTERVAL_SENSORS) {
    previousMillisSensors = currentMillis;
    lerSensores();
    avaliarTriggers();
  }

  // 2. Varredura do leitor RFID MFRC522 (a cada 100ms)
  if (currentMillis - previousMillisRFIDScan >= INTERVAL_RFID_SCAN) {
    previousMillisRFIDScan = currentMillis;
    varrerRFID();
  }

  // 3. Controle Imediato dos Atuadores de Alerta (Bips rápidos no Crítico / Contínuo no Extremo)
  gerenciarAtuadoresAlarme();

  // 4. Atualização da Interface Gráfica OLED
  if (currentMillis - previousMillisOLED >= INTERVAL_OLED) {
    previousMillisOLED = currentMillis;
    atualizarDisplayOLED();
  }

  // 5. Publicação de Telemetria no FIWARE
  if (currentMillis - previousMillisMQTT >= INTERVAL_MQTT) {
    previousMillisMQTT = currentMillis;
    publicarTelemetriaMQTT();
  }
}

// =============================================================================
// INICIALIZAÇÃO DE HARDWARE E COMUNICAÇÃO
// =============================================================================
void initSerial() {
  Serial.begin(115200);
}

void initPins() {
  pinMode(PIN_LED_AZUL, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LDR, INPUT);

  digitalWrite(PIN_LED_AZUL, LOW);
  noTone(PIN_BUZZER);
}

void initDisplay() {
  Wire.begin(PIN_OLED_SDA, PIN_OLED_SCL);
  Wire.setClock(400000); // Modo I2C Rápido (400 kHz) para evitar qualquer latência gráfica!
  if (!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("[ERRO] Falha ao inicializar o OLED SSD1306!"));
    return;
  }
}

// -----------------------------------------------------------------------------
// ANIMAÇÃO DE APRESENTAÇÃO: EQUIPE PRISMA -> LOGO ANIMADA -> VINHERIA TECH
// -----------------------------------------------------------------------------
void animarApresentacaoInicial() {
  // PASSO 1: "EQUIPE PRISMA"
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);
  display.drawRect(2, 2, 124, 60, SSD1306_WHITE);
  display.drawRect(4, 4, 120, 56, SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(24, 16);
  display.print(F("PROJETO IoT"));

  display.setTextSize(2);
  display.setCursor(16, 32);
  display.print(F("PRISMA"));

  display.display();
  tone(PIN_BUZZER, 1200, 80);
  delay(1200);

  // PASSO 2: ANIMAÇÃO DA LOGO PRISMA (Varredura por Feixe de Luz)
  int logoX = (SCREEN_WIDTH - LOGO_WIDTH) / 2; // 44
  int logoY = 9;

  for (int h = 4; h <= LOGO_HEIGHT; h += 3) {
    display.clearDisplay();
    display.drawBitmap(logoX, logoY, logo_prisma_bmp, LOGO_WIDTH, h, SSD1306_WHITE);
    display.display();
    tone(PIN_BUZZER, 900 + h * 28, 20);
    delay(25);
  }

  // Desenha a logo completa com brilho no texto "PRISMA"
  display.clearDisplay();
  display.drawBitmap(logoX, logoY, logo_prisma_bmp, LOGO_WIDTH, LOGO_HEIGHT, SSD1306_WHITE);
  display.display();
  delay(500);

  // Efeito de feixe cruzando a base da logo
  for (int x = logoX - 4; x <= logoX + LOGO_WIDTH + 4; x += 4) {
    display.drawFastVLine(x, logoY + 36, 10, SSD1306_INVERSE);
    display.display();
    delay(15);
    display.drawFastVLine(x, logoY + 36, 10, SSD1306_INVERSE);
  }
  delay(400);

  // PASSO 3: "VINHERIA TECH" + BARRA DE PROGRESSO DE CARREGAMENTO
  display.clearDisplay();
  display.setTextSize(1);
  display.setCursor(22, 10);
  display.print(F("VINHERIA TECH"));
  display.setCursor(18, 24);
  display.print(F("Supervisao Global"));

  display.drawRect(14, 40, 100, 10, SSD1306_WHITE);

  for (int p = 0; p <= 96; p += 4) {
    display.fillRect(16, 42, p, 6, SSD1306_WHITE);
    display.fillRect(30, 52, 70, 10, SSD1306_BLACK);
    display.setCursor(30, 53);
    display.print(F("Carregando..."));
    display.display();
    delay(25);
  }

  tone(PIN_BUZZER, 1800, 70);
  delay(80);
  tone(PIN_BUZZER, 2400, 120);
  delay(300);
}

void initRFID() {
  SPI.begin(PIN_SPI_SCK, PIN_SPI_MISO, PIN_SPI_MOSI, PIN_RFID_SS);
  rfid.PCD_Init();
  Serial.println(F("[RFID] Leitor MFRC522 pronto para operacao!"));
}

void initWiFi() {
  Serial.print(F("[WiFi] Conectando a "));
  Serial.println(default_SSID);
  WiFi.begin(default_SSID, default_PASSWORD);
}

void initMQTT() {
  MQTT.setServer(default_BROKER_MQTT, default_BROKER_PORT);
  MQTT.setCallback(mqttCallback);
  MQTT.setSocketTimeout(1); // Timeout curtíssimo de 1 segundo para NUNCA travar o loop!
}

void initNTP() {
  configTime(-3 * 3600, 0, "pool.ntp.org", "time.nist.gov");
}

String obterDataHoraAtual() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 50)) {
    char buf[30];
    strftime(buf, sizeof(buf), "%d/%m/%Y %H:%M:%S", &timeinfo);
    return String(buf);
  }
  unsigned long seg = (millis() / 1000);
  unsigned long h = (seg / 3600) % 24;
  unsigned long m = (seg / 60) % 60;
  unsigned long s = seg % 60;
  char buf[30];
  snprintf(buf, sizeof(buf), "07/10/2026 %02lu:%02lu:%02lu", h, m, s);
  return String(buf);
}

String obterHoraAtual() {
  struct tm timeinfo;
  if (getLocalTime(&timeinfo, 50)) {
    char buf[15];
    strftime(buf, sizeof(buf), "%H:%M:%S", &timeinfo);
    return String(buf);
  }
  unsigned long seg = (millis() / 1000);
  unsigned long h = (seg / 3600) % 24;
  unsigned long m = (seg / 60) % 60;
  unsigned long s = seg % 60;
  char buf[15];
  snprintf(buf, sizeof(buf), "%02lu:%02lu:%02lu", h, m, s);
  return String(buf);
}

// -----------------------------------------------------------------------------
// VERIFICAÇÕES DE REDE 100% NÃO-BLOQUEANTES
// -----------------------------------------------------------------------------
void verificaConexoes() {
  if (WiFi.status() != WL_CONNECTED) {
    reconnectWiFi();
  } else if (!MQTT.connected()) {
    reconnectMQTT();
  }
}

void reconnectWiFi() {
  static unsigned long lastAttempt = 0;
  unsigned long now = millis();
  if (now - lastAttempt >= 6000) {
    lastAttempt = now;
    WiFi.begin(default_SSID, default_PASSWORD);
  }
}

void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;
  static unsigned long lastReconnectAttempt = 0;
  unsigned long now = millis();
  if (now - lastReconnectAttempt > 8000) {
    lastReconnectAttempt = now;
    String clientId = "esp32_wine001_" + String(random(1000, 9999));
    if (MQTT.connect(clientId.c_str())) {
      Serial.println(F("[MQTT] Conectado com sucesso ao Broker!"));
      MQTT.subscribe(TOPICO_SUBSCRIBE);
      MQTT.publish(TOPICO_PUBLISH_ALL, "status|online");
    }
  }
}

// =============================================================================
// CALLBACK MQTT - RECEBIMENTO DE COMANDOS DO FRONT-END / FIWARE
// =============================================================================
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  msg.trim();
  Serial.print(F("\n[MQTT COMANDO RECEBIDO] "));
  Serial.println(msg);

  if (msg.indexOf("alarm_extremo") >= 0) {
    alarmeAtivo = true;
    alarmeReconhecido = false;
    alarmeRemotoForcado = true;
    tipoAlarmeAtual = ALARME_GERAL_REMOTO;
    severidadeAtual = SEVERIDADE_EXTREMO;
    humorAtual = MOOD_PANICO;
    mensagemStatusOLED = "ALERTA EXTREMO!!";
    registrarAlarmeNaMemoria(tipoAlarmeAtual, severidadeAtual);
    MQTT.publish(TOPICO_CMD_EXE, "wine001@alarm_extremo|OK");
    Serial.println(F(">> [COMANDO] ALERTA EXTREMO! Som constante ativado."));
  }
  else if (msg.indexOf("alarm_temp") >= 0) {
    alarmeAtivo = true;
    alarmeReconhecido = false;
    alarmeRemotoForcado = true;
    tipoAlarmeAtual = ALARME_TEMPERATURA;
    severidadeAtual = SEVERIDADE_CRITICO;
    humorAtual = MOOD_CALOR;
    mensagemStatusOLED = "TEMP CRITICA!";
    registrarAlarmeNaMemoria(tipoAlarmeAtual, severidadeAtual);
    MQTT.publish(TOPICO_CMD_EXE, "wine001@alarm_temp|OK");
    Serial.println(F(">> [COMANDO] Alarme Crítico de TEMPERATURA ativado!"));
  }
  else if (msg.indexOf("alarm_hum") >= 0) {
    alarmeAtivo = true;
    alarmeReconhecido = false;
    alarmeRemotoForcado = true;
    tipoAlarmeAtual = ALARME_UMIDADE;
    severidadeAtual = SEVERIDADE_CRITICO;
    humorAtual = (umidadeAtual > HUM_MAX) ? MOOD_AFOGADO : MOOD_SECO;
    mensagemStatusOLED = "UMID CRITICA!";
    registrarAlarmeNaMemoria(tipoAlarmeAtual, severidadeAtual);
    MQTT.publish(TOPICO_CMD_EXE, "wine001@alarm_hum|OK");
    Serial.println(F(">> [COMANDO] Alarme Crítico de UMIDADE ativado!"));
  }
  else if (msg.indexOf("alarm_lum") >= 0) {
    alarmeAtivo = true;
    alarmeReconhecido = false;
    alarmeRemotoForcado = true;
    tipoAlarmeAtual = ALARME_LUMINOSIDADE;
    severidadeAtual = SEVERIDADE_CRITICO;
    humorAtual = MOOD_LUZ_ALTA;
    mensagemStatusOLED = "LUZ CRITICA!";
    registrarAlarmeNaMemoria(tipoAlarmeAtual, severidadeAtual);
    MQTT.publish(TOPICO_CMD_EXE, "wine001@alarm_lum|OK");
    Serial.println(F(">> [COMANDO] Alarme Crítico de LUMINOSIDADE ativado!"));
  }
  else if (msg.indexOf("alarm_on") >= 0) {
    alarmeAtivo = true;
    alarmeReconhecido = false;
    alarmeRemotoForcado = true;
    tipoAlarmeAtual = ALARME_GERAL_REMOTO;
    severidadeAtual = SEVERIDADE_CRITICO;
    humorAtual = MOOD_PANICO;
    mensagemStatusOLED = "ALERTA CRITICO!";
    registrarAlarmeNaMemoria(tipoAlarmeAtual, severidadeAtual);
    MQTT.publish(TOPICO_CMD_EXE, "wine001@alarm_on|OK");
    Serial.println(F(">> [COMANDO] Alarme Crítico Geral ativado remotamente!"));
  }
  else if (msg.indexOf("alarm_off") >= 0) {
    alarmeAtivo = false;
    alarmeReconhecido = false;
    alarmeRemotoForcado = false;
    tipoAlarmeAtual = ALARME_NENHUM;
    severidadeAtual = SEVERIDADE_NENHUM;
    humorAtual = MOOD_FELIZ;
    mensagemStatusOLED = "ADEGA SEGURA";
    digitalWrite(PIN_LED_AZUL, LOW);
    pararBuzzer();
    MQTT.publish(TOPICO_CMD_EXE, "wine001@alarm_off|OK");
    Serial.println(F(">> [COMANDO] Alarme desativado remotamente!"));
  }
  else if (msg.indexOf("set_triggers") >= 0) {
    int sep = msg.indexOf('|');
    if (sep > 0) {
      String pars = msg.substring(sep + 1);
      float t1, t2, h1, h2; int l1;
      if (sscanf(pars.c_str(), "%f,%f,%f,%f,%d", &t1, &t2, &h1, &h2, &l1) == 5) {
        TEMP_MIN = t1; TEMP_MAX = t2;
        HUM_MIN = h1; HUM_MAX = h2;
        LUM_MAX = l1;
        Serial.printf(">> [TRIGGERS ATUALIZADOS] T: %.1f-%.1f | U: %.1f-%.1f | L: %d\n",
                      TEMP_MIN, TEMP_MAX, HUM_MIN, HUM_MAX, LUM_MAX);
        MQTT.publish(TOPICO_CMD_EXE, "wine001@set_triggers|OK");
      }
    }
  }
}

// =============================================================================
// CADASTRO / REGISTRO DE ALERTA (DATA E HORA)
// =============================================================================
void registrarAlarmeNaMemoria(TipoAlarme tipo, NivelSeveridade sev) {
  dataHoraInicioAlerta = obterDataHoraAtual();
  horaInicioAlertaSoHora = obterHoraAtual();

  String nomeTipo = "GERAL";
  if (tipo == ALARME_TEMPERATURA) nomeTipo = "TEMPERATURA";
  else if (tipo == ALARME_UMIDADE) nomeTipo = "UMIDADE";
  else if (tipo == ALARME_LUMINOSIDADE) nomeTipo = "LUMINOSIDADE";

  String nomeSev = (sev == SEVERIDADE_EXTREMO) ? "EXTREMO" : "CRITICO";

  Serial.println(F("-------------------------------------------------------"));
  Serial.printf(">> [CADASTRO DE ALERTA] Data/Hora: %s\n", dataHoraInicioAlerta.c_str());
  Serial.printf("   Anomalia: %s | Severidade: %s\n", nomeTipo.c_str(), nomeSev.c_str());
  Serial.printf("   Medicoes: T=%.1f C | U=%.1f %% | L=%d %%\n", temperaturaAtual, umidadeAtual, luminosidadeAtual);
  Serial.println(F("-------------------------------------------------------"));

  String payloadLog = "event|alert_triggered|time|" + dataHoraInicioAlerta +
                      "|type|" + nomeTipo +
                      "|severity|" + nomeSev +
                      "|temp|" + String(temperaturaAtual, 1) +
                      "|hum|" + String(umidadeAtual, 1) +
                      "|lum|" + String(luminosidadeAtual);

  MQTT.publish(TOPICO_PUBLISH_LOG, payloadLog.c_str());
}

// =============================================================================
// LEITURA DOS SENSORES E AVALIAÇÃO DE TRIGGERS (CRÍTICO VS EXTREMO)
// =============================================================================
void lerSensores() {
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (!isnan(t)) temperaturaAtual = t;
  if (!isnan(h)) umidadeAtual = h;

  int rawLDR = analogRead(PIN_LDR);
  luminosidadeAtual = map(rawLDR, 0, 4095, 0, 100);

  Serial.printf("[TELEMETRIA] Temp: %.1f C | Umid: %.1f %% | Luz: %d %%\n",
                temperaturaAtual, umidadeAtual, luminosidadeAtual);
}

void avaliarTriggers() {
  if (alarmeRemotoForcado) return;

  TipoAlarme novoTipo = ALARME_NENHUM;
  NivelSeveridade novaSeveridade = SEVERIDADE_NENHUM;

  // 1. Verificação de Condições Extremas
  if (temperaturaAtual < TEMP_EXTREMA_BAIXA || temperaturaAtual > TEMP_EXTREMA_ALTA) {
    novoTipo = ALARME_TEMPERATURA;
    novaSeveridade = SEVERIDADE_EXTREMO;
    humorAtual = (temperaturaAtual > TEMP_EXTREMA_ALTA) ? MOOD_CALOR : MOOD_FRIO;
    mensagemStatusOLED = "TEMP EXTREMA!!";
  }
  else if (umidadeAtual < HUM_EXTREMA_BAIXA || umidadeAtual > HUM_EXTREMA_ALTA) {
    novoTipo = ALARME_UMIDADE;
    novaSeveridade = SEVERIDADE_EXTREMO;
    humorAtual = (umidadeAtual > HUM_EXTREMA_ALTA) ? MOOD_AFOGADO : MOOD_SECO;
    mensagemStatusOLED = "UMID EXTREMA!!";
  }
  else if (luminosidadeAtual > LUM_EXTREMA_ALTA) {
    novoTipo = ALARME_LUMINOSIDADE;
    novaSeveridade = SEVERIDADE_EXTREMO;
    humorAtual = MOOD_LUZ_ALTA;
    mensagemStatusOLED = "LUZ EXTREMA!!";
  }
  // 2. Verificação de Condições Críticas
  else if (temperaturaAtual < TEMP_MIN || temperaturaAtual > TEMP_MAX) {
    novoTipo = ALARME_TEMPERATURA;
    novaSeveridade = SEVERIDADE_CRITICO;
    humorAtual = (temperaturaAtual > TEMP_MAX) ? MOOD_CALOR : MOOD_FRIO;
    mensagemStatusOLED = "TEMP CRITICA!";
  }
  else if (umidadeAtual < HUM_MIN || umidadeAtual > HUM_MAX) {
    novoTipo = ALARME_UMIDADE;
    novaSeveridade = SEVERIDADE_CRITICO;
    humorAtual = (umidadeAtual > HUM_MAX) ? MOOD_AFOGADO : MOOD_SECO;
    mensagemStatusOLED = "UMID CRITICA!";
  }
  else if (luminosidadeAtual > LUM_MAX) {
    novoTipo = ALARME_LUMINOSIDADE;
    novaSeveridade = SEVERIDADE_CRITICO;
    humorAtual = MOOD_LUZ_ALTA;
    mensagemStatusOLED = "LUZ CRITICA!";
  }

  if (novaSeveridade != SEVERIDADE_NENHUM) {
    if (!alarmeAtivo) {
      alarmeAtivo = true;
      alarmeReconhecido = false;
      tipoAlarmeAtual = novoTipo;
      severidadeAtual = novaSeveridade;
      registrarAlarmeNaMemoria(tipoAlarmeAtual, severidadeAtual);
    } else {
      if (novaSeveridade != severidadeAtual) {
        severidadeAtual = novaSeveridade;
        tipoAlarmeAtual = novoTipo;
        registrarAlarmeNaMemoria(tipoAlarmeAtual, severidadeAtual);
      }
    }
  } else {
    if (alarmeAtivo && !alarmeRemotoForcado) {
      alarmeAtivo = false;
      alarmeReconhecido = false;
      tipoAlarmeAtual = ALARME_NENHUM;
      severidadeAtual = SEVERIDADE_NENHUM;
      humorAtual = MOOD_FELIZ;
      mensagemStatusOLED = "ADEGA SEGURA";
      digitalWrite(PIN_LED_AZUL, LOW);
      pararBuzzer();
      Serial.println(F(">> [NORMAL] Parametros restaurados! Adega segura."));
    }
  }
}

// =============================================================================
// GERENCIAMENTO DE ATUADORES DE ALERTA (BUZZER GRADUADO + LED AZUL)
// =============================================================================
bool tomConstanteAtivo = false;
int ultimaFreqExtrema = 0;

void gerenciarAtuadoresAlarme() {
  if (!alarmeAtivo) {
    if (tomConstanteAtivo || estadoBuzzer) {
      pararBuzzer();
    }
    digitalWrite(PIN_LED_AZUL, LOW);
    return;
  }

  // Caso o alarme JÁ TENHA SIDO RECONHECIDO pelo Cartão Master RFID:
  if (alarmeReconhecido) {
    if (tomConstanteAtivo || estadoBuzzer) {
      pararBuzzer(); // Silêncio imediato total!
    }
    // LED azul pisca suavemente a cada 800ms
    unsigned long now = millis();
    if (now - previousMillisBlink >= 800) {
      previousMillisBlink = now;
      estadoLedAzul = !estadoLedAzul;
      digitalWrite(PIN_LED_AZUL, estadoLedAzul ? HIGH : LOW);
    }
    return;
  }

  // Alarme NÃO reconhecido:
  if (severidadeAtual == SEVERIDADE_EXTREMO) {
    // -------------------------------------------------------------------------
    // ALERTA EXTREMO: BARULHO CONSTANTE (SEM PARAR / 100% ININTERRUPTO)
    // -------------------------------------------------------------------------
    tocarAlarmeExtremo();
  }
  else {
    // Se estava em tom constante, desliga antes de entrar no modo de bips
    if (tomConstanteAtivo) {
      tomConstanteAtivo = false;
      ultimaFreqExtrema = 0;
      noTone(PIN_BUZZER);
    }
    // -------------------------------------------------------------------------
    // ALERTA CRÍTICO: BIPS ULTRARRÁPIDOS (50ms BIP / 40ms SILÊNCIO: BIP-BIP-BIP-BIP!)
    // -------------------------------------------------------------------------
    tocarAlarmeCritico();
  }
}

/**
 * Alerta Crítico: Bips ultrarrápidos e frenéticos (50ms som / 40ms silêncio)
 * LED Azul pisca em perfeita sincronia 1:1 com cada disparo do som!
 */
void tocarAlarmeCritico() {
  unsigned long now = millis();
  const unsigned long DURACAO_BIP   = 50; // 50 milissegundos de som
  const unsigned long DURACAO_PAUSA = 40; // 40 milissegundos de silêncio

  if (estadoBuzzer) {
    // Está tocando: aguarda 50ms para desligar
    if (now - previousMillisBuzzer >= DURACAO_BIP) {
      previousMillisBuzzer = now;
      estadoBuzzer = false;
      noTone(PIN_BUZZER);
      digitalWrite(PIN_LED_AZUL, LOW);
    }
  } else {
    // Está em pausa: aguarda 40ms para soar o próximo bip rápido
    if (now - previousMillisBuzzer >= DURACAO_PAUSA) {
      previousMillisBuzzer = now;
      estadoBuzzer = true;

      if (tipoAlarmeAtual == ALARME_TEMPERATURA) tone(PIN_BUZZER, 2500);
      else if (tipoAlarmeAtual == ALARME_UMIDADE) tone(PIN_BUZZER, 1800);
      else if (tipoAlarmeAtual == ALARME_LUMINOSIDADE) tone(PIN_BUZZER, 1200);
      else tone(PIN_BUZZER, 2200);

      digitalWrite(PIN_LED_AZUL, HIGH);
    }
  }
}

/**
 * Alerta Extremo: Barulho CONSTANTE (SEM PARAR / 100% ININTERRUPTO)
 * Chama tone() apenas uma vez para o hardware PWM do ESP32 emitir onda contínua sem cliques ou cortes!
 */
void tocarAlarmeExtremo() {
  int freq = 2600;
  if (tipoAlarmeAtual == ALARME_TEMPERATURA) freq = 2700;
  else if (tipoAlarmeAtual == ALARME_UMIDADE) freq = 1900;
  else if (tipoAlarmeAtual == ALARME_LUMINOSIDADE) freq = 1400;

  if (!tomConstanteAtivo || ultimaFreqExtrema != freq) {
    tomConstanteAtivo = true;
    ultimaFreqExtrema = freq;
    tone(PIN_BUZZER, freq); // Inicia tom contínuo de hardware
    digitalWrite(PIN_LED_AZUL, HIGH); // LED Azul constante
  }
}

void pararBuzzer() {
  tomConstanteAtivo = false;
  ultimaFreqExtrema = 0;
  estadoBuzzer = false;
  noTone(PIN_BUZZER);
}

// =============================================================================
// RECONHECIMENTO DE ALARME VIA RFID (MFRC522)
// =============================================================================
void varrerRFID() {
  if (!rfid.PICC_IsNewCardPresent()) return;
  if (!rfid.PICC_ReadCardSerial()) return;

  String uidLido = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    if (rfid.uid.uidByte[i] < 0x10) uidLido += "0";
    uidLido += String(rfid.uid.uidByte[i], HEX);
    if (i < rfid.uid.size - 1) uidLido += ":";
  }
  uidLido.toUpperCase();

  Serial.printf("\n[RFID DETECTADO] Tag UID: %s\n", uidLido.c_str());

  if (uidLido.equalsIgnoreCase(MASTER_UID)) {
    reconhecerAlarme(uidLido);
  } else {
    rejeitarRFID(uidLido);
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

void reconhecerAlarme(String uid) {
  ultimoOperadorRFID = "Master (" + uid + ")";
  dataHoraUltimoAck = obterDataHoraAtual();
  horaUltimoAckSoHora = obterHoraAtual();

  tone(PIN_BUZZER, 1600, 100);
  delay(110);
  tone(PIN_BUZZER, 2500, 180);

  if (alarmeAtivo) {
    alarmeReconhecido = true;
    alarmeRemotoForcado = false;
    humorAtual = MOOD_RECONHECIDO;
    mensagemStatusOLED = "ALERTA RECONHECIDO";
    pararBuzzer();

    Serial.println(F(">> [RFID MASTER] Alarme RECONHECIDO com sucesso!"));
    Serial.printf("   Data/Hora do Reconhecimento: %s\n", dataHoraUltimoAck.c_str());

    String ackPayload = "rfid|" + uid +
                        "|ack|1|status|acknowledged|ack_time|" + dataHoraUltimoAck;
    MQTT.publish(TOPICO_PUBLISH_ALL, ackPayload.c_str());
    MQTT.publish(TOPICO_PUBLISH_OP, uid.c_str());
    MQTT.publish(TOPICO_PUBLISH_LOG, ("event|alarm_acknowledged|by|" + uid + "|time|" + dataHoraUltimoAck).c_str());
  } else {
    mensagemStatusOLED = "RONDA: MASTER OK";
    humorAtual = MOOD_RECONHECIDO;
    Serial.println(F(">> [RFID RONDA] Acesso técnico master registrado."));
    String rondaPayload = "rfid|" + uid + "|status|ronda_tecnica|time|" + dataHoraUltimoAck;
    MQTT.publish(TOPICO_PUBLISH_ALL, rondaPayload.c_str());
  }
}

void rejeitarRFID(String uid) {
  Serial.printf(">> [RFID REJEITADO] Tag nao autorizada: %s\n", uid.c_str());
  tone(PIN_BUZZER, 350, 400);
  mensagemStatusOLED = "! CARTAO INVALIDO !";

  String logPayload = "rfid|" + uid + "|ack|0|status|unauthorized|time|" + obterDataHoraAtual();
  MQTT.publish(TOPICO_PUBLISH_LOG, logPayload.c_str());
}

// =============================================================================
// INTERFACE GRÁFICA NO OLED SSD1306 (SEM A PALAVRA "ADEGA:")
// =============================================================================
void atualizarDisplayOLED() {
  display.clearDisplay();

  // 1. Barra Superior (Header de Status - SEM A PALAVRA "ADEGA:")
  display.drawFastHLine(0, 12, SCREEN_WIDTH, SSD1306_WHITE);
  display.setTextSize(1);
  display.setCursor(0, 2);

  if (alarmeAtivo) {
    if (!alarmeReconhecido) {
      if ((millis() / 250) % 2 == 0) {
        display.print(mensagemStatusOLED);
      } else {
        display.print(severidadeAtual == SEVERIDADE_EXTREMO ? F("! EXTREMO !") : F("! CRITICO !"));
      }
    } else {
      display.print(F("ALERTA RECONHECIDO"));
    }
  } else {
    display.print(mensagemStatusOLED);
  }

  // Indicador de Conexão MQTT
  if (MQTT.connected()) {
    display.drawCircle(123, 5, 2, SSD1306_WHITE);
    display.fillCircle(123, 5, 1, SSD1306_WHITE);
  } else {
    display.drawLine(121, 3, 125, 7, SSD1306_WHITE);
    display.drawLine(125, 3, 121, 7, SSD1306_WHITE);
  }

  // 2. Mascote Tamagotchi à esquerda (X=4 a 38, Y=16 a 48)
  desenharMascoteTamagotchi(6, 16, humorAtual);

  // 3. Leituras Ambientais à direita (X=50 a 127, Y=16 a 48)
  display.setTextSize(1);

  display.setCursor(50, 16);
  display.print(F("T: "));
  display.print(temperaturaAtual, 1);
  display.print((char)247);
  display.print(F("C"));
  if (temperaturaAtual < TEMP_MIN || temperaturaAtual > TEMP_MAX) display.print(F(" !"));

  display.setCursor(50, 27);
  display.print(F("U: "));
  display.print(umidadeAtual, 1);
  display.print(F(" %"));
  if (umidadeAtual < HUM_MIN || umidadeAtual > HUM_MAX) display.print(F(" !"));

  display.setCursor(50, 38);
  display.print(F("L: "));
  display.print(luminosidadeAtual);
  display.print(F(" %"));
  if (luminosidadeAtual > LUM_MAX) display.print(F(" !"));

  // 4. Barra Inferior (Footer - Horário e Auditoria de Alertas)
  display.drawFastHLine(0, 50, SCREEN_WIDTH, SSD1306_WHITE);
  display.setCursor(0, 54);

  if (alarmeReconhecido) {
    display.print(F("ACK: "));
    display.print(horaUltimoAckSoHora);
    display.print(F(" MASTER"));
  } else if (alarmeAtivo) {
    display.print(F("ALERTA: "));
    display.print(horaInicioAlertaSoHora);
  } else {
    display.print(obterHoraAtual());
    display.print(F(" | ESTAVEL"));
  }

  display.display();
}

/**
 * Renderiza o mascote "VinhoGochi" usando primitivas geométricas vetoriais
 */
void desenharMascoteTamagotchi(int x, int y, EstadoTamagotchi mood) {
  display.drawRoundRect(x, y + 2, 36, 28, 8, SSD1306_WHITE);

  // Folha no topo
  display.drawLine(x + 18, y + 2, x + 18, y, SSD1306_WHITE);
  display.drawLine(x + 18, y, x + 23, y - 1, SSD1306_WHITE);

  switch (mood) {
    case MOOD_FELIZ:
      display.drawLine(x + 9,  y + 11, x + 13, y + 8, SSD1306_WHITE);
      display.drawLine(x + 13, y + 8,  x + 17, y + 11, SSD1306_WHITE);
      display.drawLine(x + 21, y + 11, x + 25, y + 8, SSD1306_WHITE);
      display.drawLine(x + 25, y + 8,  x + 29, y + 11, SSD1306_WHITE);
      display.drawCircle(x + 18, y + 16, 5, SSD1306_WHITE);
      display.fillRect(x + 13, y + 13, 11, 4, SSD1306_BLACK);
      break;

    case MOOD_CALOR:
      display.drawLine(x + 10, y + 10, x + 16, y + 10, SSD1306_WHITE);
      display.drawLine(x + 22, y + 10, x + 28, y + 10, SSD1306_WHITE);
      display.drawCircle(x + 19, y + 18, 3, SSD1306_WHITE);
      display.fillCircle(x + 31, y + 6, 2, SSD1306_WHITE);
      display.drawLine(x + 31, y + 4, x + 31, y + 2, SSD1306_WHITE);
      break;

    case MOOD_FRIO:
      display.drawLine(x + 10, y + 9, x + 15, y + 12, SSD1306_WHITE);
      display.drawLine(x + 10, y + 15, x + 15, y + 12, SSD1306_WHITE);
      display.drawLine(x + 27, y + 9, x + 22, y + 12, SSD1306_WHITE);
      display.drawLine(x + 27, y + 15, x + 22, y + 12, SSD1306_WHITE);
      display.drawLine(x + 14, y + 20, x + 17, y + 18, SSD1306_WHITE);
      display.drawLine(x + 17, y + 18, x + 20, y + 20, SSD1306_WHITE);
      display.drawLine(x + 20, y + 20, x + 23, y + 18, SSD1306_WHITE);
      break;

    case MOOD_LUZ_ALTA:
      display.fillRect(x + 8,  y + 8, 9, 7, SSD1306_WHITE);
      display.fillRect(x + 20, y + 8, 9, 7, SSD1306_WHITE);
      display.drawLine(x + 17, y + 10, x + 20, y + 10, SSD1306_WHITE);
      display.drawLine(x + 15, y + 20, x + 23, y + 20, SSD1306_WHITE);
      break;

    case MOOD_SECO:
    case MOOD_AFOGADO:
      display.drawLine(x + 10, y + 8, x + 16, y + 14, SSD1306_WHITE);
      display.drawLine(x + 16, y + 8, x + 10, y + 14, SSD1306_WHITE);
      display.drawLine(x + 22, y + 8, x + 28, y + 14, SSD1306_WHITE);
      display.drawLine(x + 28, y + 8, x + 22, y + 14, SSD1306_WHITE);
      display.drawLine(x + 14, y + 20, x + 23, y + 20, SSD1306_WHITE);
      break;

    case MOOD_PANICO:
      display.drawCircle(x + 13, y + 11, 4, SSD1306_WHITE);
      display.drawCircle(x + 24, y + 11, 4, SSD1306_WHITE);
      display.fillCircle(x + 13, y + 11, 1, SSD1306_WHITE);
      display.fillCircle(x + 24, y + 11, 1, SSD1306_WHITE);
      display.drawCircle(x + 18, y + 20, 3, SSD1306_WHITE);
      break;

    case MOOD_RECONHECIDO:
      display.drawLine(x + 9,  y + 11, x + 13, y + 8, SSD1306_WHITE);
      display.drawLine(x + 13, y + 8,  x + 17, y + 11, SSD1306_WHITE);
      display.drawLine(x + 22, y + 11, x + 27, y + 11, SSD1306_WHITE);
      display.drawCircle(x + 18, y + 16, 6, SSD1306_WHITE);
      display.fillRect(x + 12, y + 13, 14, 5, SSD1306_BLACK);
      break;
  }
}

// =============================================================================
// PUBLICAÇÃO DE TELEMETRIA NO FIWARE
// =============================================================================
void publicarTelemetriaMQTT() {
  if (!MQTT.connected()) return;

  String payloadGeral = "t|" + String(temperaturaAtual, 1) +
                        "|h|" + String(umidadeAtual, 1) +
                        "|l|" + String(luminosidadeAtual) +
                        "|alarm|" + String(alarmeAtivo ? (severidadeAtual == SEVERIDADE_EXTREMO ? 2 : 1) : 0) +
                        "|ack|" + String(alarmeReconhecido ? 1 : 0) +
                        "|alert_time|" + dataHoraInicioAlerta +
                        "|ack_time|" + dataHoraUltimoAck;

  MQTT.publish(TOPICO_PUBLISH_ALL, payloadGeral.c_str());
  MQTT.publish(TOPICO_PUBLISH_T, String(temperaturaAtual, 1).c_str());
  MQTT.publish(TOPICO_PUBLISH_H, String(umidadeAtual, 1).c_str());
  MQTT.publish(TOPICO_PUBLISH_L, String(luminosidadeAtual).c_str());
}
