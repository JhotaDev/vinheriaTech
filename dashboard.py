"""
========================================================================================
SISTEMA DE SUPERVISÃO E GÊMEO DIGITAL DE VINHERIAS - CHECK POINT 5 (IoT & FIWARE)
AUTORES: Equipe Prisma
DISCIPLINA: Edge Computing e Computer Systems
ORIENTADOR: Prof. Dr. Fábio Henrique Cabrini
========================================================================================

FUNCIONALIDADES DO DASHBOARD:
1. Gerenciamento e Cadastro de IoT Devices via IoT Agent MQTT (Porta 4041) e Orion (Porta 1026).
2. Gráficos Dinâmicos com Séries Temporais consumidas da API do STH-Comet (Porta 8666) e
   sincronizadas em tempo real via streaming MQTT direto do Wokwi / ESP32.
3. Ajuste Dinâmico de Triggers (Temperatura, Umidade e Luminosidade) com envio remoto para o ESP32.
4. Motor de Disparo de Alertas Remotos: envia comandos via MQTT para acionar o LED Azul e o Buzzer no ESP32.
5. Gêmeo Digital (Digital Twin): espelhamento em tempo real do estado físico do hardware, do LED,
   do Buzzer e do Mascote Tamagotchi (VinhoGochi).
6. Log de Auditoria e Reconhecimento com RFID MFRC522 (registro de quem atendeu e silenciou o alerta).
7. Tabela de Ocorrências de Alerta com registro oficial de data e horário.
========================================================================================
"""

import json
import os
import random
import threading
import time
from datetime import datetime, timezone

import dash
import dash_bootstrap_components as dbc
import paho.mqtt.client as mqtt
import plotly.graph_objs as go
import requests
from dash import Input, Output, State, dcc, html, no_update

# -----------------------------------------------------------------------------
# CONFIGURAÇÕES DO AMBIENTE FIWARE E BROKER MQTT
# -----------------------------------------------------------------------------
# Por padrão, utiliza o broker público HiveMQ para que a simulação no Wokwi e o
# Dashboard se comuniquem imediatamente através da internet sem necessidade de Docker local.
# Para utilizar a VM do laboratório, defina a variável de ambiente ou altere aqui para "46.17.108.113".
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
PORT_MQTT = int(os.getenv("PORT_MQTT", 1883))

FIWARE_HOST = os.getenv("FIWARE_HOST", "localhost")
PORT_ORION = 1026   # Orion Context Broker
PORT_STH = 8666     # STH-Comet (Séries Temporais Históricas)
PORT_IOTA = 4041    # IoT Agent MQTT

FIWARE_SERVICE = "smart"
FIWARE_SERVICEPATH = "/"

ENTITY_ID = "urn:ngsi-ld:WineCellar:001"
ENTITY_TYPE = "WineCellar"
DEVICE_ID = "wine001"

REFRESH_INTERVAL_MS = 1500  # Atualização da interface a cada 1.5 segundo

# Limites Iniciais Padrão para Conservação de Vinhos Nobres
DEFAULT_TRIGGERS = {
    "temp_min": 12.0,
    "temp_max": 16.0,
    "hum_min": 60.0,
    "hum_max": 75.0,
    "lum_max": 30.0,
}

# -----------------------------------------------------------------------------
# ESTADO COMPARTILHADO EM MEMÓRIA (THREAD-SAFE)
# -----------------------------------------------------------------------------
state_lock = threading.Lock()

LATEST_TELEMETRY = {
    "temp": 14.0,
    "hum": 68.0,
    "lum": 15,
    "alarm": 0,          # 0: normal, 1: crítico, 2: extremo
    "ack": 0,            # 0: não reconhecido, 1: reconhecido por RFID
    "rfid": "Nenhum",
    "alert_time": "--/-- --:--:--",
    "ack_time": "--/-- --:--:--",
    "last_seen_mqtt": None,
    "mqtt_connected": False,
}

ALERT_RECORDS = [
    {
        "data_hora": datetime.now().strftime("%d/%m/%Y %H:%M:%S"),
        "tipo": "TEMPERATURA",
        "severidade": "EXTREMO (Constante)",
        "valor": "24.5 °C",
        "atendimento": "Reconhecido por Master (01:02:03:04)"
    }
]

AUDIT_RECORDS = [
    {
        "horario": datetime.now().strftime("%H:%M:%S"),
        "uid": "01:02:03:04",
        "operador": "Enólogo Chefe (Master)",
        "status": "Alerta Silenciado [OK]"
    }
]

REGISTERED_DEVICES = [
    {
        "device_id": "wine001",
        "entity_name": "urn:ngsi-ld:WineCellar:001",
        "entity_type": "WineCellar",
        "transport": "MQTT / UltraLight 2.0",
        "location": "Adega Principal - Cave 1",
        "status": "ONLINE"
    }
]

# -----------------------------------------------------------------------------
# CLIENTE MQTT BIDIRECIONAL (RECEBIMENTO E ENVIO)
# -----------------------------------------------------------------------------
def on_mqtt_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f">> [MQTT] Conectado com sucesso ao broker {MQTT_BROKER}:{PORT_MQTT}!")
        with state_lock:
            LATEST_TELEMETRY["mqtt_connected"] = True
        # Inscreve-se nos tópicos publicados pelo ESP32 (Wokwi)
        client.subscribe("/TEF/wine001/attrs")
        client.subscribe("/TEF/wine001/attrs/#")
        client.subscribe("/TEF/wine001/cmdexe")
    else:
        print(f">> [MQTT ERRO] Falha na conexão com broker, código de retorno: {rc}")
        with state_lock:
            LATEST_TELEMETRY["mqtt_connected"] = False


def on_mqtt_disconnect(client, userdata, rc, properties=None):
    print(f">> [MQTT] Desconectado do broker (código {rc})")
    with state_lock:
        LATEST_TELEMETRY["mqtt_connected"] = False


def on_mqtt_message(client, userdata, msg):
    """
    Processa telemetria, logs de alerta e eventos RFID recebidos do ESP32.
    """
    try:
        topic = msg.topic
        payload = msg.payload.decode("utf-8", errors="ignore").strip()
        now_dt_str = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
        now_time_str = datetime.now().strftime("%H:%M:%S")

        with state_lock:
            LATEST_TELEMETRY["last_seen_mqtt"] = time.time()
            LATEST_TELEMETRY["mqtt_connected"] = True

            # 1. Tópico geral com todos os atributos: t|14.2|h|68.0|l|15|alarm|0|ack|0
            if topic == "/TEF/wine001/attrs":
                parts = payload.split("|")
                i = 0
                while i < len(parts) - 1:
                    key = parts[i]
                    val = parts[i + 1]
                    if key == "t":
                        try: LATEST_TELEMETRY["temp"] = float(val)
                        except ValueError: pass
                    elif key == "h":
                        try: LATEST_TELEMETRY["hum"] = float(val)
                        except ValueError: pass
                    elif key == "l":
                        try: LATEST_TELEMETRY["lum"] = int(float(val))
                        except ValueError: pass
                    elif key == "alarm":
                        try: LATEST_TELEMETRY["alarm"] = int(val)
                        except ValueError: pass
                    elif key == "ack":
                        try: LATEST_TELEMETRY["ack"] = int(val)
                        except ValueError: pass
                    elif key == "alert_time" and val != "--/-- --:--:--":
                        LATEST_TELEMETRY["alert_time"] = val
                    elif key == "ack_time" and val != "--/-- --:--:--":
                        LATEST_TELEMETRY["ack_time"] = val
                    i += 2

            # 2. Tópicos individuais
            elif topic == "/TEF/wine001/attrs/t":
                try: LATEST_TELEMETRY["temp"] = float(payload)
                except ValueError: pass

            elif topic == "/TEF/wine001/attrs/h":
                try: LATEST_TELEMETRY["hum"] = float(payload)
                except ValueError: pass

            elif topic == "/TEF/wine001/attrs/l":
                try: LATEST_TELEMETRY["lum"] = int(float(payload))
                except ValueError: pass

            elif topic == "/TEF/wine001/attrs/rfid":
                LATEST_TELEMETRY["rfid"] = payload
                AUDIT_RECORDS.insert(0, {
                    "horario": now_time_str,
                    "uid": payload,
                    "operador": "Master (Enólogo)" if "01:02:03:04" in payload else "Tag RFID",
                    "status": "Acesso Registrado"
                })
                if len(AUDIT_RECORDS) > 20: AUDIT_RECORDS.pop()

            # 3. Tópico de Logs e Auditoria
            elif topic == "/TEF/wine001/attrs/log":
                if "alert_triggered" in payload:
                    # Formato: event|alert_triggered|time|...|type|...|severity|...|temp|...|hum|...|lum|...
                    tipo_alerta = "GERAL"
                    sev_alerta = "CRITICO"
                    val_medido = f"{LATEST_TELEMETRY['temp']:.1f} °C"
                    hora_log = now_dt_str

                    p_items = payload.split("|")
                    for idx, item in enumerate(p_items):
                        if item == "time" and idx + 1 < len(p_items): hora_log = p_items[idx + 1]
                        elif item == "type" and idx + 1 < len(p_items): tipo_alerta = p_items[idx + 1]
                        elif item == "severity" and idx + 1 < len(p_items): sev_alerta = p_items[idx + 1]
                        elif item == "temp" and idx + 1 < len(p_items): val_medido = f"{p_items[idx + 1]} °C"

                    sev_fmt = "EXTREMO (Constante)" if "EXTREMO" in sev_alerta else "CRITICO (Bip Rápido)"
                    ALERT_RECORDS.insert(0, {
                        "data_hora": hora_log,
                        "tipo": tipo_alerta,
                        "severidade": sev_fmt,
                        "valor": val_medido,
                        "atendimento": "Pendente de Reconhecimento"
                    })
                    if len(ALERT_RECORDS) > 20: ALERT_RECORDS.pop()

                elif "alarm_acknowledged" in payload or "rfid|" in payload:
                    operador = "Enólogo Chefe (01:02:03:04)"
                    AUDIT_RECORDS.insert(0, {
                        "horario": now_time_str,
                        "uid": "01:02:03:04",
                        "operador": operador,
                        "status": "Alarme Reconhecido e Silenciado [OK]"
                    })
                    if len(AUDIT_RECORDS) > 20: AUDIT_RECORDS.pop()
                    if ALERT_RECORDS:
                        ALERT_RECORDS[0]["atendimento"] = "Reconhecido por Master (01:02:03:04)"
                    LATEST_TELEMETRY["ack"] = 1

    except Exception as e:
        print(f">> [ERRO PROCESSAMENTO MQTT] {e}")


# Inicialização do Cliente MQTT com suporte à API v2 do Paho
try:
    mqtt_client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"supervisor_cp5_{random.randint(100, 999)}")
except Exception:
    mqtt_client = mqtt.Client(client_id=f"supervisor_cp5_{random.randint(100, 999)}")

mqtt_client.on_connect = on_mqtt_connect
mqtt_client.on_disconnect = on_mqtt_disconnect
mqtt_client.on_message = on_mqtt_message

try:
    mqtt_client.connect(MQTT_BROKER, PORT_MQTT, keepalive=60)
    mqtt_client.loop_start()
except Exception as err:
    print(f">> [AVISO] Conexão MQTT falhou inicialmente: {err}. Tentará novamente em segundo plano.")


def enviar_comando_esp32(comando: str):
    """
    Envia comandos remotos para o ESP32 via MQTT UltraLight 2.0.
    Exemplos: 'alarm_on', 'alarm_off', 'alarm_temp', 'alarm_extremo', 'set_triggers|...'
    """
    topico = f"/TEF/{DEVICE_ID}/cmd"
    payload = f"{DEVICE_ID}@{comando}|"

    try:
        mqtt_client.publish(topico, payload)
        print(f">> [COMANDO MQTT ENVIADO] {topico} -> {payload}")
        return True
    except Exception as err:
        print(f">> [ERRO MQTT COMANDO] {err}")

    # Fallback Orion Context Broker REST
    try:
        url_orion = f"http://{FIWARE_HOST}:{PORT_ORION}/v2/entities/{ENTITY_ID}/attrs"
        headers = {
            "Content-Type": "application/json",
            "fiware-service": FIWARE_SERVICE,
            "fiware-servicepath": FIWARE_SERVICEPATH,
        }
        body = {comando: {"type": "command", "value": ""}}
        r = requests.patch(url_orion, headers=headers, json=body, timeout=1.5)
        return r.status_code in [200, 204]
    except Exception:
        pass

    return False


# -----------------------------------------------------------------------------
# FUNÇÕES DE CONSUMO DA API DO STH-COMET (PORTA 8666)
# -----------------------------------------------------------------------------
def buscar_historico_sth(atributo: str, last_n: int = 30):
    url = (f"http://{FIWARE_HOST}:{PORT_STH}/STH/v1/contextEntities/type/{ENTITY_TYPE}/"
           f"id/{ENTITY_ID}/attributes/{atributo}?lastN={last_n}")
    headers = {
        "fiware-service": FIWARE_SERVICE,
        "fiware-servicepath": FIWARE_SERVICEPATH,
    }
    try:
        resp = requests.get(url, headers=headers, timeout=1.5)
        if resp.status_code == 200:
            data = resp.json()
            return data["contextResponses"][0]["contextElement"]["attributes"][0]["values"]
    except Exception:
        pass
    return []


def provisionar_dispositivo_fiware(dev_id: str, ent_id: str, ent_type: str, loc: str):
    url_iota = f"http://{FIWARE_HOST}:{PORT_IOTA}/iot/devices"
    headers = {
        "Content-Type": "application/json",
        "fiware-service": FIWARE_SERVICE,
        "fiware-servicepath": FIWARE_SERVICEPATH,
    }
    payload = {
        "devices": [
            {
                "device_id": dev_id,
                "entity_name": ent_id,
                "entity_type": ent_type,
                "protocol": "PDI-IoTA-UltraLight",
                "transport": "MQTT",
                "commands": [
                    {"name": "alarm_on", "type": "command"},
                    {"name": "alarm_off", "type": "command"},
                    {"name": "alarm_temp", "type": "command"},
                    {"name": "alarm_extremo", "type": "command"}
                ],
                "attributes": [
                    {"object_id": "t", "name": "temperature", "type": "Float"},
                    {"object_id": "h", "name": "humidity", "type": "Float"},
                    {"object_id": "l", "name": "luminosity", "type": "Integer"}
                ]
            }
        ]
    }
    sucesso = False
    try:
        r = requests.post(url_iota, headers=headers, json=payload, timeout=2)
        sucesso = (r.status_code in [200, 201])
    except Exception:
        pass

    # Registra na lista local para exibição imediata
    with state_lock:
        REGISTERED_DEVICES.append({
            "device_id": dev_id,
            "entity_name": ent_id,
            "entity_type": ent_type,
            "transport": "MQTT / UltraLight 2.0",
            "location": loc or "Adega Principal",
            "status": "PROVISIONADO" if sucesso else "LOCAL / SIMULADO"
        })
    return True


# -----------------------------------------------------------------------------
# APLICAÇÃO DASH (DASHBOARD WEB)
# -----------------------------------------------------------------------------
app = dash.Dash(
    __name__,
    external_stylesheets=[dbc.themes.DARKLY, dbc.icons.BOOTSTRAP],
    title="VinheriaTech — Supervisão & Gêmeo Digital (Equipe Prisma)",
    update_title=None
)
server = app.server

app.layout = dbc.Container([
    # Stores de persistência e intervalo de atualização
    dcc.Store(id="store-telemetria", data=LATEST_TELEMETRY),
    dcc.Store(id="store-historico", data={"timestamps": [], "temp": [], "hum": [], "lum": []}),
    dcc.Store(id="store-triggers", data=DEFAULT_TRIGGERS),
    dcc.Interval(id="interval-update", interval=REFRESH_INTERVAL_MS, n_intervals=0),

    # Navbar Superior
    dbc.Navbar(
        dbc.Container([
            html.A(
                dbc.Row([
                    dbc.Col(html.I(className="bi bi-droplet-half fs-2 text-danger me-2")),
                    dbc.Col([
                        html.H3("VINHERIATECH — SUPERVISÃO GLOBAL", className="mb-0 text-white fw-bold"),
                        html.Small("Check Point 5: Solução IoT Integrada ao Wokwi, FIWARE & STH-Comet | Equipe Prisma", className="text-secondary")
                    ]),
                ], align="center", className="g-0"),
                href="#",
                style={"textDecoration": "none"},
            ),
            html.Div([
                dbc.Badge(f"MQTT: {MQTT_BROKER}:{PORT_MQTT}", color="primary", className="p-2 fs-6 fw-bold me-2", id="badge-mqtt-host"),
                dbc.Badge("DIGITAL TWIN CONECTADO", color="success", className="p-2 fs-6 fw-bold", id="badge-twin-status")
            ], className="d-flex align-items-center")
        ], fluid=True),
        color="#1a0b12",
        dark=True,
        className="mb-4 rounded shadow border border-danger border-opacity-25"
    ),

    # Banner de Emergência e Alertas
    html.Div(id="alert-banner-container", className="mb-3"),

    # SEÇÃO 1: CARDS DE SENSORES & GÊMEO DIGITAL (ESP32 MIRROR)
    dbc.Row([
        # Cards dos Sensores
        dbc.Col([
            dbc.Row([
                # Card de Temperatura
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.Div([
                                html.I(className="bi bi-thermometer-half fs-1 text-danger"),
                                html.Span("TEMPERATURA", className="fw-bold text-secondary ms-2")
                            ], className="d-flex align-items-center mb-2"),
                            html.H2(id="val-temp", className="fw-bold text-white mb-1", children="14.0 °C"),
                            html.Small(id="badge-temp-status", className="badge bg-success", children="Faixa Ideal (12°C - 16°C)")
                        ])
                    ], className="shadow border-0 bg-dark mb-3")
                ], md=4),

                # Card de Umidade
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.Div([
                                html.I(className="bi bi-moisture fs-1 text-info"),
                                html.Span("UMIDADE RELATIVA", className="fw-bold text-secondary ms-2")
                            ], className="d-flex align-items-center mb-2"),
                            html.H2(id="val-hum", className="fw-bold text-white mb-1", children="68.0 %"),
                            html.Small(id="badge-hum-status", className="badge bg-success", children="Faixa Ideal (60% - 75%)")
                        ])
                    ], className="shadow border-0 bg-dark mb-3")
                ], md=4),

                # Card de Luminosidade
                dbc.Col([
                    dbc.Card([
                        dbc.CardBody([
                            html.Div([
                                html.I(className="bi bi-brightness-high fs-1 text-warning"),
                                html.Span("LUMINOSIDADE", className="fw-bold text-secondary ms-2")
                            ], className="d-flex align-items-center mb-2"),
                            html.H2(id="val-lum", className="fw-bold text-white mb-1", children="15 %"),
                            html.Small(id="badge-lum-status", className="badge bg-success", children="Adega Protegida (< 30%)")
                        ])
                    ], className="shadow border-0 bg-dark mb-3")
                ], md=4),
            ]),
        ], md=8),

        # Card do Gêmeo Digital do Hardware (Digital Twin Mirror)
        dbc.Col([
            dbc.Card([
                dbc.CardHeader(html.H5("GÊMEO DIGITAL (ESP32 MIRROR)", className="mb-0 text-white fw-bold")),
                dbc.CardBody([
                    dbc.Row([
                        # Mascote Tamagotchi Virtual (VinhoGochi)
                        dbc.Col([
                            html.Div(id="tamagotchi-avatar", className="text-center p-2 rounded bg-black border border-secondary mb-2", children=[
                                html.H1("( ^ _ ^ )", className="text-success mb-1 fw-bold"),
                                html.Small("VinhoGochi: Feliz & Estável", className="text-white fw-bold d-block")
                            ]),
                        ], xs=6),
                        # Status dos Atuadores Físicos
                        dbc.Col([
                            html.Div([
                                html.Span("LED Azul: ", className="text-secondary fw-bold small"),
                                html.Span(id="twin-led-status", children="DESLIGADO", className="badge bg-secondary ms-1")
                            ], className="mb-2"),
                            html.Div([
                                html.Span("Buzzer: ", className="text-secondary fw-bold small"),
                                html.Span(id="twin-buzzer-status", children="SILENCIOSO", className="badge bg-secondary ms-1")
                            ], className="mb-2"),
                            html.Div([
                                html.Span("Último RFID: ", className="text-secondary fw-bold small"),
                                html.Small(id="twin-rfid-status", children="01:02:03:04 (Master)", className="text-info d-block fw-bold")
                            ])
                        ], xs=6),
                    ]),
                    # Botões de Ação Imediata
                    dbc.ButtonGroup([
                        dbc.Button("Alerta Crítico", id="btn-force-crit", color="warning", size="sm", className="fw-bold"),
                        dbc.Button("Alerta Extremo", id="btn-force-ext", color="danger", size="sm", className="fw-bold ms-1"),
                        dbc.Button("Resetar", id="btn-clear-alarm", color="outline-light", size="sm", className="fw-bold ms-1"),
                    ], className="w-100 mt-2")
                ])
            ], className="shadow border-0 bg-dark mb-3")
        ], md=4),
    ]),

    # SEÇÃO 2: GRÁFICOS DINÂMICOS (SÉRIES TEMPORAIS)
    dbc.Row([
        dbc.Col([
            dbc.Card([
                dbc.CardHeader(
                    dbc.Row([
                        dbc.Col(html.H5("HISTÓRICO TEMPORAL DE TEMPERATURA", className="mb-0 text-white fw-bold")),
                        dbc.Col(html.Small("Sincronizado via MQTT / STH-Comet (API 8666)", className="text-secondary text-end")),
                    ])
                ),
                dbc.CardBody(dcc.Graph(id="graph-temp", config={"displayModeBar": False}))
            ], className="shadow border-0 bg-dark mb-4")
        ], md=6),

        dbc.Col([
            dbc.Card([
                dbc.CardHeader(
                    dbc.Row([
                        dbc.Col(html.H5("HISTÓRICO DE UMIDADE & LUMINOSIDADE", className="mb-0 text-white fw-bold")),
                        dbc.Col(html.Small("Séries Temporais com Faixas de Tolerância", className="text-secondary text-end")),
                    ])
                ),
                dbc.CardBody(dcc.Graph(id="graph-hum-lum", config={"displayModeBar": False}))
            ], className="shadow border-0 bg-dark mb-4")
        ], md=6),
    ]),

    # SEÇÃO 3: CALIBRAÇÃO DE TRIGGERS & GERENCIAMENTO DE IOT DEVICES
    dbc.Row([
        # Calibração dos Triggers
        dbc.Col([
            dbc.Card([
                dbc.CardHeader(html.H5("CALIBRAÇÃO DINÂMICA DE TRIGGERS", className="mb-0 text-white fw-bold")),
                dbc.CardBody([
                    html.P("Ajuste os parâmetros de conservação. Ao violados, o Front-end acionará o alarme no ESP32.", className="text-secondary small"),

                    html.Label("Temperatura Ideal (°C) [Mín - Máx]:", className="fw-bold text-white small"),
                    dcc.RangeSlider(id="slider-temp", min=5, max=30, step=0.5, value=[12.0, 16.0],
                                    marks={5: "5°C", 12: "12°C", 16: "16°C", 20: "20°C", 30: "30°C"},
                                    tooltip={"placement": "bottom", "always_visible": True}),

                    html.Label("Umidade Relativa Ideal (%) [Mín - Máx]:", className="fw-bold text-white small mt-3"),
                    dcc.RangeSlider(id="slider-hum", min=30, max=95, step=1, value=[60, 75],
                                    marks={30: "30%", 60: "60%", 75: "75%", 90: "90%"},
                                    tooltip={"placement": "bottom", "always_visible": True}),

                    html.Label("Luminosidade Máxima Aceitável (%):", className="fw-bold text-white small mt-3"),
                    dcc.Slider(id="slider-lum", min=5, max=80, step=5, value=30,
                               marks={10: "10%", 30: "30%", 50: "50%", 80: "80%"},
                               tooltip={"placement": "bottom", "always_visible": True}),

                    dbc.Button("Salvar & Sincronizar Triggers com Hardware", id="btn-save-triggers", color="primary", className="w-100 mt-4 fw-bold")
                ])
            ], className="shadow border-0 bg-dark mb-4")
        ], md=6),

        # Cadastro e Gestão de Dispositivos IoT
        dbc.Col([
            dbc.Card([
                dbc.CardHeader(
                    dbc.Row([
                        dbc.Col(html.H5("DISPOSITIVOS IOT (IOT AGENT MQTT)", className="mb-0 text-white fw-bold")),
                        dbc.Col(
                            dbc.Button("+ Novo Dispositivo", id="btn-open-modal-dev", size="sm", color="success", className="float-end fw-bold"),
                            width="auto"
                        )
                    ], align="center")
                ),
                dbc.CardBody([
                    html.P("Dispositivos provisionados na arquitetura FIWARE / Wokwi:", className="text-secondary small"),
                    html.Div(id="table-devices-container"),

                    html.Hr(className="border-secondary"),
                    html.H6("HISTÓRICO DE OCORRÊNCIAS DE ALERTA (DATA & HORÁRIO)", className="text-white fw-bold mt-3"),
                    html.Div(id="table-alerts-container"),

                    html.Hr(className="border-secondary"),
                    html.H6("AUDITORIA DE RECONHECIMENTO RFID (MFRC522)", className="text-white fw-bold mt-3"),
                    html.Div(id="table-audit-container")
                ])
            ], className="shadow border-0 bg-dark mb-4")
        ], md=6),
    ]),

    # Modal para Cadastro de Novo Dispositivo IoT
    dbc.Modal([
        dbc.ModalHeader(dbc.ModalTitle("Cadastrar Novo Dispositivo no IoT Agent")),
        dbc.ModalBody([
            dbc.Label("Device ID:"),
            dbc.Input(id="modal-dev-id", placeholder="Ex: wine002", value="wine002", className="mb-2"),
            dbc.Label("Nome da Entidade:"),
            dbc.Input(id="modal-ent-id", placeholder="Ex: urn:ngsi-ld:WineCellar:002", value="urn:ngsi-ld:WineCellar:002", className="mb-2"),
            dbc.Label("Tipo da Entidade:"),
            dbc.Input(id="modal-ent-type", placeholder="Ex: WineCellar", value="WineCellar", className="mb-2"),
            dbc.Label("Localização / Setor da Vinheria:"),
            dbc.Input(id="modal-dev-loc", placeholder="Ex: Cave Subterrânea 2", value="Cave Subterrânea 2", className="mb-2"),
        ]),
        dbc.ModalFooter([
            dbc.Button("Cancelar", id="modal-btn-cancel", color="secondary"),
            dbc.Button("Provisionar no FIWARE", id="modal-btn-save", color="success", className="fw-bold"),
        ])
    ], id="modal-device", is_open=False),

], fluid=True, className="p-3 bg-black")


# -----------------------------------------------------------------------------
# CALLBACKS DO DASHBOARD
# -----------------------------------------------------------------------------

# Modal de Cadastro de Dispositivos
@app.callback(
    Output("modal-device", "is_open"),
    [Input("btn-open-modal-dev", "n_clicks"), Input("modal-btn-cancel", "n_clicks"), Input("modal-btn-save", "n_clicks")],
    [State("modal-device", "is_open"), State("modal-dev-id", "value"), State("modal-ent-id", "value"),
     State("modal-ent-type", "value"), State("modal-dev-loc", "value")]
)
def toggle_modal_device(n_open, n_cancel, n_save, is_open, dev_id, ent_id, ent_type, dev_loc):
    ctx = dash.callback_context
    if not ctx.triggered:
        return is_open
    btn = ctx.triggered[0]["prop_id"].split(".")[0]
    if btn == "btn-open-modal-dev":
        return True
    elif btn == "modal-btn-save":
        if dev_id and ent_id and ent_type:
            provisionar_dispositivo_fiware(dev_id, ent_id, ent_type, dev_loc)
        return False
    elif btn == "modal-btn-cancel":
        return False
    return is_open


# Atualização e Sincronização dos Triggers com o ESP32
@app.callback(
    Output("store-triggers", "data"),
    Input("btn-save-triggers", "n_clicks"),
    [State("slider-temp", "value"), State("slider-hum", "value"), State("slider-lum", "value"), State("store-triggers", "data")]
)
def update_triggers(n_clicks, t_range, h_range, l_max, current_triggers):
    if n_clicks:
        current_triggers = {
            "temp_min": float(t_range[0]),
            "temp_max": float(t_range[1]),
            "hum_min": float(h_range[0]),
            "hum_max": float(h_range[1]),
            "lum_max": float(l_max),
        }
        # Envia comando de sincronização de triggers para o ESP32 via MQTT
        payload_cmd = f"set_triggers|{current_triggers['temp_min']},{current_triggers['temp_max']},{current_triggers['hum_min']},{current_triggers['hum_max']},{int(current_triggers['lum_max'])}"
        enviar_comando_esp32(payload_cmd)
    return current_triggers


# Botões de Alarme Manual do Gêmeo Digital
@app.callback(
    Output("btn-force-crit", "disabled"),
    [Input("btn-force-crit", "n_clicks"), Input("btn-force-ext", "n_clicks"), Input("btn-clear-alarm", "n_clicks")]
)
def handle_manual_alarm(n_crit, n_ext, n_clear):
    ctx = dash.callback_context
    if not ctx.triggered:
        return False
    btn = ctx.triggered[0]["prop_id"].split(".")[0]
    if btn == "btn-force-crit":
        enviar_comando_esp32("alarm_on")
    elif btn == "btn-force-ext":
        enviar_comando_esp32("alarm_extremo")
    elif btn == "btn-clear-alarm":
        enviar_comando_esp32("alarm_off")
    return False


# Loop Principal: Atualiza Sensores, Gêmeo Digital, Gráficos e Tabelas
@app.callback(
    [
        Output("store-telemetria", "data"),
        Output("store-historico", "data"),
        Output("val-temp", "children"),
        Output("val-hum", "children"),
        Output("val-lum", "children"),
        Output("badge-temp-status", "children"),
        Output("badge-temp-status", "className"),
        Output("badge-hum-status", "children"),
        Output("badge-hum-status", "className"),
        Output("badge-lum-status", "children"),
        Output("badge-lum-status", "className"),
        Output("twin-led-status", "children"),
        Output("twin-led-status", "className"),
        Output("twin-buzzer-status", "children"),
        Output("twin-buzzer-status", "className"),
        Output("twin-rfid-status", "children"),
        Output("tamagotchi-avatar", "children"),
        Output("alert-banner-container", "children"),
        Output("badge-twin-status", "children"),
        Output("badge-twin-status", "color"),
        Output("graph-temp", "figure"),
        Output("graph-hum-lum", "figure"),
        Output("table-devices-container", "children"),
        Output("table-alerts-container", "children"),
        Output("table-audit-container", "children"),
    ],
    Input("interval-update", "n_intervals"),
    [State("store-telemetria", "data"), State("store-historico", "data"), State("store-triggers", "data")]
)
def update_dashboard(n_intervals, telem, hist, triggers):
    now_time_str = datetime.now().strftime("%H:%M:%S")

    # Copia o estado mais recente recebido via MQTT
    with state_lock:
        telem["temp"] = LATEST_TELEMETRY["temp"]
        telem["hum"] = LATEST_TELEMETRY["hum"]
        telem["lum"] = LATEST_TELEMETRY["lum"]
        telem["alarm"] = LATEST_TELEMETRY["alarm"]
        telem["ack"] = LATEST_TELEMETRY["ack"]
        telem["rfid"] = LATEST_TELEMETRY["rfid"]
        telem["alert_time"] = LATEST_TELEMETRY["alert_time"]
        telem["ack_time"] = LATEST_TELEMETRY["ack_time"]
        last_seen = LATEST_TELEMETRY["last_seen_mqtt"]
        mqtt_conn = LATEST_TELEMETRY["mqtt_connected"]

        alerts_list = list(ALERT_RECORDS)
        audit_list = list(AUDIT_RECORDS)
        devices_list = list(REGISTERED_DEVICES)

    # Verifica se há dados recentes do Wokwi (nos últimos 6 segundos)
    wokwi_ativo = (last_seen is not None) and (time.time() - last_seen < 6.0)

    # Se não houver dados do MQTT, tenta o STH-Comet
    if not wokwi_ativo:
        sth_t = buscar_historico_sth("temperature", last_n=5)
        if sth_t and len(sth_t) > 0:
            telem["temp"] = float(sth_t[-1]["attrValue"])

    # Atualiza série temporal local dos gráficos
    hist["timestamps"].append(now_time_str)
    hist["temp"].append(telem["temp"])
    hist["hum"].append(telem["hum"])
    hist["lum"].append(telem["lum"])
    if len(hist["timestamps"]) > 35:
        hist["timestamps"].pop(0)
        hist["temp"].pop(0)
        hist["hum"].pop(0)
        hist["lum"].pop(0)

    # 1. Avaliação dos Triggers e Severidades
    t_val = telem["temp"]
    h_val = telem["hum"]
    l_val = telem["lum"]

    # Condição Extrema
    temp_extrema = (t_val < 10.0 or t_val > 20.0)
    hum_extrema = (h_val < 50.0 or h_val > 85.0)
    lum_extrema = (l_val > 60)
    alerta_extremo = temp_extrema or hum_extrema or lum_extrema

    # Condição Crítica
    temp_critica = (t_val < triggers["temp_min"] or t_val > triggers["temp_max"])
    hum_critica = (h_val < triggers["hum_min"] or h_val > triggers["hum_max"])
    lum_critica = (l_val > triggers["lum_max"])
    alerta_critico = (temp_critica or hum_critica or lum_critica) and not alerta_extremo

    tem_alerta = (alerta_extremo or alerta_critico or telem["alarm"] > 0)
    reconhecido = (telem["ack"] == 1)

    # Badges dos Sensores
    badge_t_txt = "Faixa Ideal (12°C - 16°C)" if not temp_critica and not temp_extrema else ("TEMPERATURA EXTREMA!" if temp_extrema else "Temperatura Crítica!")
    badge_t_cls = "badge bg-success" if not temp_critica and not temp_extrema else ("badge bg-danger fw-bold" if temp_extrema else "badge bg-warning text-dark fw-bold")

    badge_h_txt = "Faixa Ideal (60% - 75%)" if not hum_critica and not hum_extrema else ("UMIDADE EXTREMA!" if hum_extrema else "Umidade Crítica!")
    badge_h_cls = "badge bg-success" if not hum_critica and not hum_extrema else ("badge bg-danger fw-bold" if hum_extrema else "badge bg-warning text-dark fw-bold")

    badge_l_txt = "Adega Protegida (< 30%)" if not lum_critica and not lum_extrema else ("LUZ EXTREMA NOCIVA!" if lum_extrema else "Luminosidade Crítica!")
    badge_l_cls = "badge bg-success" if not lum_critica and not lum_extrema else ("badge bg-danger fw-bold" if lum_extrema else "badge bg-warning text-dark fw-bold")

    # 2. Gêmeo Digital (LED Azul, Buzzer, Mascote VinhoGochi)
    if tem_alerta and not reconhecido:
        if alerta_extremo or telem["alarm"] == 2:
            led_txt = "ACESO CONTÍNUO (EXTREMO)"
            led_cls = "badge bg-danger fw-bold"
            bz_txt = "SOM CONSTANTE (SEM PARAR)"
            bz_cls = "badge bg-danger fw-bold"
            avatar_txt = "( ! _ ! )"
            avatar_sub = "VinhoGochi: PÂNICO TOTAL! RISCO IMEDIATO!"
            avatar_cls = "text-danger mb-1 fw-bold"
            banner_tipo = "ALERTA EXTREMO — SOM CONSTANTE ATIVO"
            banner_color = "danger"
        else:
            led_txt = "PISCANDO RÁPIDO (1:1)"
            led_cls = "badge bg-warning text-dark fw-bold"
            bz_txt = "BIPS ULTRARRÁPIDOS (50ms/40ms)"
            bz_cls = "badge bg-warning text-dark fw-bold"
            avatar_txt = "( > _ < )"
            avatar_sub = "VinhoGochi: Agoniado com a oscilação!"
            avatar_cls = "text-warning mb-1 fw-bold"
            banner_tipo = "ALERTA CRÍTICO — BIPS ULTRARRÁPIDOS"
            banner_color = "warning"

        banner = dbc.Alert([
            html.I(className="bi bi-exclamation-triangle-fill fs-3 me-2"),
            html.Div([
                html.Strong(f"{banner_tipo}! "),
                html.Span(f"Início do evento: {telem['alert_time']}. Passe o cartão Master RFID (01:02:03:04) no leitor para silenciar.")
            ])
        ], color=banner_color, className="d-flex align-items-center shadow")

    elif tem_alerta and reconhecido:
        led_txt = "RONDA SUAVE (PISCA 800ms)"
        led_cls = "badge bg-info text-dark fw-bold"
        bz_txt = "SILENCIADO POR MASTER [OK]"
        bz_cls = "badge bg-success fw-bold"
        avatar_txt = "( ^ _ ~ )"
        avatar_sub = "VinhoGochi: Aliviado! Operador Atendendo."
        avatar_cls = "text-info mb-1 fw-bold"
        banner = dbc.Alert([
            html.I(className="bi bi-shield-check fs-3 me-2 text-success"),
            html.Div([
                html.Strong("ALERTA RECONHECIDO POR CARTÃO MASTER RFID! "),
                html.Span(f"Atendimento registrado em: {telem['ack_time']}. O buzzer foi silenciado e a manutenção está em andamento.")
            ])
        ], color="success", className="d-flex align-items-center shadow")

    else:
        led_txt = "DESLIGADO (NORMAL)"
        led_cls = "badge bg-success"
        bz_txt = "SILENCIOSO"
        bz_cls = "badge bg-success"
        avatar_txt = "( ^ _ ^ )"
        avatar_sub = "VinhoGochi: Feliz & Adega Segura"
        avatar_cls = "text-success mb-1 fw-bold"
        banner = html.Div()

    tamagotchi_ui = [
        html.H1(avatar_txt, className=avatar_cls),
        html.Small(avatar_sub, className="text-white fw-bold d-block")
    ]

    twin_badge_txt = "WOKWI / ESP32 SINCRONIZADO" if wokwi_ativo else ("MQTT AGUARDANDO DISPOSITIVO" if mqtt_conn else "MQTT OFFLINE")
    twin_badge_col = "success" if wokwi_ativo else ("primary" if mqtt_conn else "secondary")

    # 3. Gráfico de Temperatura (Plotly)
    fig_temp = go.Figure()
    fig_temp.add_trace(go.Scatter(
        x=hist["timestamps"], y=hist["temp"],
        mode="lines+markers", name="Temperatura (°C)",
        line=dict(color="#ff4d4d", width=3),
        marker=dict(size=6)
    ))
    fig_temp.add_hline(y=triggers["temp_max"], line_dash="dash", line_color="orange", annotation_text=f"Máx ({triggers['temp_max']}°C)")
    fig_temp.add_hline(y=triggers["temp_min"], line_dash="dash", line_color="cyan", annotation_text=f"Mín ({triggers['temp_min']}°C)")
    fig_temp.update_layout(
        template="plotly_dark",
        margin=dict(l=30, r=30, t=30, b=30),
        yaxis=dict(title="Graus Celsius (°C)", range=[max(0, min(hist["temp"] + [triggers["temp_min"]]) - 2), max(hist["temp"] + [triggers["temp_max"]]) + 2]),
        xaxis=dict(title="Tempo"),
        uirevision="keep"
    )

    # 4. Gráfico de Umidade e Luz (Plotly)
    fig_hum_lum = go.Figure()
    fig_hum_lum.add_trace(go.Scatter(
        x=hist["timestamps"], y=hist["hum"],
        mode="lines+markers", name="Umidade (%)",
        line=dict(color="#33ccff", width=3)
    ))
    fig_hum_lum.add_trace(go.Scatter(
        x=hist["timestamps"], y=hist["lum"],
        mode="lines+markers", name="Luminosidade (%)",
        line=dict(color="#ffcc00", width=2, dash="dot")
    ))
    fig_hum_lum.add_hline(y=triggers["hum_max"], line_dash="dash", line_color="#33ccff", annotation_text=f"Umid Máx ({triggers['hum_max']}%)")
    fig_hum_lum.add_hline(y=triggers["hum_min"], line_dash="dash", line_color="#33ccff", annotation_text=f"Umid Mín ({triggers['hum_min']}%)")
    fig_hum_lum.add_hline(y=triggers["lum_max"], line_dash="dash", line_color="#ffcc00", annotation_text=f"Luz Máx ({triggers['lum_max']}%)")
    fig_hum_lum.update_layout(
        template="plotly_dark",
        margin=dict(l=30, r=30, t=30, b=30),
        yaxis=dict(title="Porcentagem (%)", range=[0, 105]),
        xaxis=dict(title="Tempo"),
        uirevision="keep"
    )

    # 5. Tabelas Dinâmicas
    # Tabela Dispositivos
    table_devs = dbc.Table([
        html.Thead(html.Tr([html.Th("Device ID"), html.Th("Entidade URN"), html.Th("Tipo"), html.Th("Localização"), html.Th("Status")])),
        html.Tbody([
            html.Tr([
                html.Td(html.B(d["device_id"])),
                html.Td(d["entity_name"]),
                html.Td(d["entity_type"]),
                html.Td(d["location"]),
                html.Td(dbc.Badge(d["status"], color="success" if "ONLINE" in d["status"] else "info"))
            ]) for d in devices_list
        ])
    ], bordered=True, hover=True, responsive=True, size="sm", className="text-white small")

    # Tabela Alertas
    table_alerts = dbc.Table([
        html.Thead(html.Tr([html.Th("Data/Hora"), html.Th("Anomalia"), html.Th("Severidade"), html.Th("Valor"), html.Th("Atendimento")])),
        html.Tbody([
            html.Tr([
                html.Td(a["data_hora"]),
                html.Td(a["tipo"]),
                html.Td(dbc.Badge(a["severidade"], color="danger" if "EXTREMO" in a["severidade"] else "warning")),
                html.Td(a["valor"]),
                html.Td(dbc.Badge(a["atendimento"], color="success" if "Reconhecido" in a["atendimento"] else "secondary"))
            ]) for a in alerts_list
        ])
    ], bordered=True, hover=True, responsive=True, size="sm", className="text-white small")

    # Tabela Auditoria RFID
    table_audit = dbc.Table([
        html.Thead(html.Tr([html.Th("Horário"), html.Th("UID Tag"), html.Th("Operador"), html.Th("Status")])),
        html.Tbody([
            html.Tr([
                html.Td(aud["horario"]),
                html.Td(html.Code(aud["uid"], className="text-info")),
                html.Td(aud["operador"]),
                html.Td(dbc.Badge(aud["status"], color="success"))
            ]) for aud in audit_list
        ])
    ], bordered=True, hover=True, responsive=True, size="sm", className="text-white small")

    rfid_disp = telem["rfid"] if telem["rfid"] != "Nenhum" else "01:02:03:04 (Master)"

    return (
        telem, hist,
        f"{telem['temp']:.1f} °C", f"{telem['hum']:.1f} %", f"{telem['lum']} %",
        badge_t_txt, badge_t_cls,
        badge_h_txt, badge_h_cls,
        badge_l_txt, badge_l_cls,
        led_txt, led_cls,
        bz_txt, bz_cls,
        rfid_disp,
        tamagotchi_ui, banner,
        twin_badge_txt, twin_badge_col,
        fig_temp, fig_hum_lum,
        table_devs, table_alerts, table_audit
    )


# -----------------------------------------------------------------------------
# EXECUÇÃO DO SERVIDOR WEB
# -----------------------------------------------------------------------------
if __name__ == "__main__":
    print("\n=======================================================")
    print(" INICIANDO DASHBOARD DE SUPERVISÃO - CP5 (PORTA 8050) ")
    print(f" Conectado ao Broker MQTT: {MQTT_BROKER}:{PORT_MQTT}  ")
    print(" Acesse no seu navegador: http://localhost:8050        ")
    print("=======================================================\n")
    app.run(debug=False, host="0.0.0.0", port=8050)
