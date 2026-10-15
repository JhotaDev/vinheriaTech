"""
========================================================================================
SISTEMA DE DESPACHO AUTOMATIZADO DE E-MAILS DE EMERGÊNCIA - VINHERIATECH (CP5)
AUTORES: Equipe Prisma
DISCIPLINA: Edge Computing e Computer Systems (Prof. Dr. Fábio Cabrini)
========================================================================================

Este serviço monitora o fluxo MQTT do ESP32/Wokwi em segundo plano.
Assim que detecta um ALERTA EXTREMO (temperatura > 20°C ou < 10°C, ou umidade > 85%),
dispara imediatamente um e-mail HTML formal de emergência para o enólogo e grava
uma cópia na pasta outbox_emails/ para auditoria e conferência.
========================================================================================
"""

import os
import sys
import smtplib
import time
import json
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import paho.mqtt.client as mqtt

# Suporte a UTF-8 no terminal Windows
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# -----------------------------------------------------------------------------
# CONFIGURAÇÕES DE AMBIENTE & SMTP
# -----------------------------------------------------------------------------
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
PORT_MQTT = int(os.getenv("PORT_MQTT", 1883))
TOPIC_ATTRS = "/TEF/wine001/attrs"
TOPIC_LOG = "/TEF/wine001/attrs/log"

# Configurações de E-mail
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", 587))
SMTP_USER = os.getenv("SMTP_USER", "@gmail.com") #email do remetente
# OBSERVAÇÃO CRÍTICA DO GOOGLE: Deve ser uma 'Senha de App' de 16 letras gerada em https://myaccount.google.com/apppasswords
SMTP_PASS = os.getenv("SMTP_PASS", "") #senha de app do Gmail (16 caracteres)
RECIPIENT_EMAIL = os.getenv("ALERT_RECIPIENT_EMAIL", "@gmail.com") #email do destinatário

OUTBOX_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "outbox_emails")
os.makedirs(OUTBOX_DIR, exist_ok=True)

# Cooldown de 25 segundos para evitar envio de e-mails duplicados em rajada
LAST_DISPATCH_TIME = 0
COOLDOWN_SECONDS = 25


def gerar_template_email_html(temperatura, umidade, luminosidade, data_hora, motivo):
    """
    Gera o corpo do e-mail em HTML de alta fidelidade visual (Tema VinheriaTech).
    """
    html = f"""<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>ALERTA EXTREMO - VinheriaTech</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0307; color: #f4f4f5; margin: 0; padding: 20px; }}
    .container {{ max-width: 600px; margin: 0 auto; background-color: #1a0b12; border: 1px solid #e11d48; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
    .header {{ background: linear-gradient(135deg, #881337, #e11d48); padding: 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 24px; letter-spacing: 1px; font-weight: 800; }}
    .header p {{ margin: 5px 0 0; font-size: 13px; opacity: 0.9; text-transform: uppercase; font-weight: 600; letter-spacing: 2px; }}
    .content {{ padding: 24px; }}
    .badge-alert {{ display: inline-block; background-color: #ef4444; color: #ffffff; padding: 6px 14px; border-radius: 20px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; }}
    .metric-box {{ background-color: #050103; border: 1px solid rgba(225, 29, 72, 0.3); border-radius: 12px; padding: 18px; margin: 20px 0; }}
    .metric-row {{ display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #27272a; font-size: 14px; }}
    .metric-row:last-child {{ border-bottom: none; }}
    .metric-label {{ color: #a1a1aa; }}
    .metric-value {{ font-family: monospace; font-weight: bold; color: #ffffff; font-size: 15px; }}
    .val-danger {{ color: #f87171 !important; }}
    .instructions {{ background-color: #18181b; border-left: 4px solid #06b6d4; padding: 14px; border-radius: 6px; font-size: 13px; color: #d4d4d8; line-height: 1.5; }}
    .footer {{ background-color: #0d0407; padding: 16px; text-align: center; font-size: 11px; color: #71717a; border-top: 1px solid #27272a; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>VINHERIATECH</h1>
      <p>Equipe Prisma • Supervisão Global de Adegas</p>
    </div>
    <div class="content">
      <div style="text-align: center; margin-bottom: 15px;">
        <span class="badge-alert">🚨 ALERTA EXTREMO DETECTADO</span>
      </div>
      <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; text-align: center;">Violação Severa dos Parâmetros de Conservação</h2>
      <p style="font-size: 13px; color: #d4d4d8; line-height: 1.6;">
        Prezado(a) <b>Enólogo(a) Responsável</b>,<br>
        O sistema de telemetria IoT detectou uma anomalia extrema que ameaça a integridade biológica e física das garrafas na <b>Cave Principal (Gran Reserva)</b>. O hardware local ativou o <b>som contínuo de emergência</b> e o LED azul constante.
      </p>

      <div class="metric-box">
        <div class="metric-row">
          <span class="metric-label">📅 Data e Horário Oficial:</span>
          <span class="metric-value">{data_hora}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">⚠️ Motivo do Disparo:</span>
          <span class="metric-value val-danger">{motivo}</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">🌡️ Temperatura Medida:</span>
          <span class="metric-value val-danger">{temperatura:.1f} °C (Ideal: 12.0°C - 16.0°C)</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">💧 Umidade Relativa:</span>
          <span class="metric-value">{umidade:.1f} % (Ideal: 60% - 75%)</span>
        </div>
        <div class="metric-row">
          <span class="metric-label">☀️ Luminosidade:</span>
          <span class="metric-value">{luminosidade}% (Máx tolerado: 30%)</span>
        </div>
      </div>

      <div class="instructions">
        <b>🛡️ Procedimento de Intervenção Imediata:</b><br>
        1. Dirija-se imediatamente à adega indicada.<br>
        2. Aproxime o <b>Cartão RFID Master (UID: 01:02:03:04)</b> do leitor MFRC522 para atestar a ronda e silenciar o buzzer.<br>
        3. Verifique os compressores de climatização e a vedação das portas térmicas.
      </div>
    </div>
    <div class="footer">
      VinheriaTech IoT Ecosystem • FIAP Check Point 5 • Prof. Dr. Fábio Henrique Cabrini<br>
      Este e-mail foi despachado automaticamente pelo serviço autônomo de supervisão.
    </div>
  </div>
</body>
</html>
"""
    return html


def enviar_email_alerta(temperatura, umidade, luminosidade, motivo):
    """
    Envia o e-mail via SMTP e salva cópia na pasta outbox_emails/
    """
    global LAST_DISPATCH_TIME
    agora = time.time()

    if agora - LAST_DISPATCH_TIME < COOLDOWN_SECONDS:
        print(f">> [EMAIL IGNORADO] Em período de cooldown ({COOLDOWN_SECONDS}s).")
        return False

    LAST_DISPATCH_TIME = agora
    data_hora = datetime.now().strftime("%d/%m/%Y %H:%M:%S")
    assunto = f"🚨 [ALERTA EXTREMO] Violação Térmica na Adega ({temperatura:.1f}°C) - VinheriaTech"

    corpo_html = gerar_template_email_html(temperatura, umidade, luminosidade, data_hora, motivo)

    # 1. Salva arquivo HTML na pasta outbox para auditoria e teste imediato
    timestamp_arquivo = datetime.now().strftime("%Y%m%d_%H%M%S")
    caminho_html = os.path.join(OUTBOX_DIR, f"alerta_extremo_{timestamp_arquivo}.html")
    caminho_json = os.path.join(OUTBOX_DIR, f"alerta_extremo_{timestamp_arquivo}.json")

    with open(caminho_html, "w", encoding="utf-8") as f:
        f.write(corpo_html)

    log_data = {
        "timestamp": data_hora,
        "recipient": RECIPIENT_EMAIL,
        "subject": assunto,
        "temperature": temperatura,
        "humidity": umidade,
        "luminosity": luminosidade,
        "reason": motivo,
        "file_preview": caminho_html
    }
    with open(caminho_json, "w", encoding="utf-8") as f:
        json.dump(log_data, f, indent=2, ensure_ascii=False)

    print("\n" + "="*65)
    print(f">> [E-MAIL DE ALERTA EXTREMO GERADO COM SUCESSO!]")
    print(f"   Destinatário: {RECIPIENT_EMAIL}")
    print(f"   Assunto: {assunto}")
    print(f"   Arquivo gerado para auditoria: {caminho_html}")
    print("="*65 + "\n")

    # 2. Tenta envio real via SMTP se credenciais estiverem configuradas
    if SMTP_USER and SMTP_PASS:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = assunto
        msg["From"] = f"VinheriaTech Alertas <{SMTP_USER}>"
        msg["To"] = RECIPIENT_EMAIL
        msg.attach(MIMEText(corpo_html, "html"))

        clean_pass = SMTP_PASS.replace(" ", "").strip()
        enviado = False

        # Tentativa 1: Porta 465 (SSL Direto - Mais confiável no Brasil)
        try:
            with smtplib.SMTP_SSL(SMTP_SERVER, 465, timeout=12) as server:
                server.login(SMTP_USER, clean_pass)
                server.sendmail(SMTP_USER, [RECIPIENT_EMAIL], msg.as_string())
            print(f">> [SMTP SUCESSO - Porta 465 SSL] E-mail entregue aos servidores de {RECIPIENT_EMAIL}!")
            enviado = True
            return True
        except Exception as e_ssl:
            print(f">> [Tentativa SSL 465]: {e_ssl}")

        # Tentativa 2: Porta 587 (STARTTLS)
        if not enviado:
            try:
                with smtplib.SMTP(SMTP_SERVER, 587, timeout=12) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(SMTP_USER, clean_pass)
                    server.sendmail(SMTP_USER, [RECIPIENT_EMAIL], msg.as_string())
                print(f">> [SMTP SUCESSO - Porta 587 TLS] E-mail entregue aos servidores de {RECIPIENT_EMAIL}!")
                enviado = True
                return True
            except Exception as e_tls:
                print(f">> [Tentativa TLS 587]: {e_tls}")
                print("\n" + "!"*70)
                print(">> [FALHA DE AUTENTICAÇÃO NO GMAIL]:")
                print("   O Google exige uma 'Senha de App' de 16 caracteres!")
                print("   A sua senha normal de login é bloqueada pelo Google.")
                print("   Para criar sua senha de app em 1 minuto, acesse:")
                print("   👉 https://myaccount.google.com/apppasswords")
                print("!"*70 + "\n")
    else:
        print(">> [MODO SIMULAÇÃO DE E-MAIL ATIVO] Defina SMTP_PASS no script para disparo ao vivo.")

    return True


# -----------------------------------------------------------------------------
# CLIENTE MQTT MONITOR
# -----------------------------------------------------------------------------
def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f">> [SERVIÇO DE E-MAIL] Conectado ao Broker MQTT {MQTT_BROKER}:{PORT_MQTT}!")
        client.subscribe(TOPIC_ATTRS)
        client.subscribe(TOPIC_LOG)
    else:
        print(f">> [ERRO] Conexão MQTT falhou com código: {rc}")


def on_message(client, userdata, msg):
    payload = msg.payload.decode("utf-8", errors="ignore").strip()

    # Avaliação de Alerta Extremo via /TEF/wine001/attrs
    if msg.topic == TOPIC_ATTRS:
        parts = payload.split("|")
        t = None
        h = None
        l = None
        alarm = 0

        for i in range(0, len(parts) - 1, 2):
            k = parts[i]
            v = parts[i + 1]
            if k == "t":
                try: t = float(v)
                except ValueError: pass
            elif k == "h":
                try: h = float(v)
                except ValueError: pass
            elif k == "l":
                try: l = int(float(v))
                except ValueError: pass
            elif k == "alarm":
                try: alarm = int(v)
                except ValueError: pass

        if t is not None:
            # Condições de Alerta Extremo
            if t > 20.0 or t < 10.0 or (h is not None and (h > 85.0 or h < 50.0)) or alarm == 2:
                motivo = "Temperatura Crítica Extrema" if (t > 20.0 or t < 10.0) else "Oscilação Severa de Umidade"
                enviar_email_alerta(t, h if h is not None else 68.0, l if l is not None else 15, motivo)

    # Avaliação via Logs de Eventos
    elif msg.topic == TOPIC_LOG and "alert_triggered" in payload and "EXTREMO" in payload:
        enviar_email_alerta(24.0, 70.0, 15, "Evento Registrado de Severidade Extrema")


if __name__ == "__main__":
    print("\n=================================================================")
    print(" INICIANDO DISPACHADOR DE E-MAILS DE EMERGÊNCIA - VINHERIATECH  ")
    print(f" Monitorando Alertas em tempo real no broker {MQTT_BROKER}    ")
    print(f" Destinatário padrão: {RECIPIENT_EMAIL}                 ")
    print("=================================================================\n")

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2 if hasattr(mqtt, "CallbackAPIVersion") else "email_dispatcher")
    client.on_connect = on_connect
    client.on_message = on_message

    try:
        client.connect(MQTT_BROKER, PORT_MQTT, 60)
        client.loop_forever()
    except KeyboardInterrupt:
        print("\n>> Serviço de e-mail encerrado.")
