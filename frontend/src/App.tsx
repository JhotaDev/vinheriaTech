import { useState, useEffect, useRef } from 'react';
import mqtt, { type MqttClient } from 'mqtt';
import { TelemetryCards } from './components/TelemetryCards';
import { CellarStatusPanel } from './components/CellarStatusPanel';
import { DigitalTwinMirror } from './components/DigitalTwinMirror';
import { InteractiveCharts } from './components/InteractiveCharts';
import { TriggersCalibration } from './components/TriggersCalibration';
import { AlertHistoryTable, type AlertRecord, type AuditRecord } from './components/AlertHistoryTable';
import { EmailAlertModal, type EmailLogEntry } from './components/EmailAlertModal';
import { TutorialModal } from './components/TutorialModal';
import { DeviceManagerModal, type DeviceEntry } from './components/DeviceManagerModal';
import { PrismaIntroSplash } from './components/PrismaIntroSplash';
import {
  Radio,
  BookOpen,
  Mail,
  Cpu,
  AlertOctagon,
  Sparkles
} from 'lucide-react';

export function App() {
  // 0. Intro Animation State
  const [showIntro, setShowIntro] = useState<boolean>(true);

  // 1. Environmental Telemetry State
  const [temperature, setTemperature] = useState<number>(14.2);
  const [humidity, setHumidity] = useState<number>(68.0);
  const [luminosity, setLuminosity] = useState<number>(15);
  const [alarm, setAlarm] = useState<number>(0); // 0: Normal, 1: Crítico, 2: Extremo
  const [ack, setAck] = useState<number>(0);
  const [alertTime, setAlertTime] = useState<string>('--:--:--');
  const [ackTime, setAckTime] = useState<string>('--:--:--');
  const [lastRfid, setLastRfid] = useState<string>('01:02:03:04');

  // 2. Triggers State
  const [triggers, setTriggers] = useState({
    tempMin: 12.0,
    tempMax: 16.0,
    humMin: 60.0,
    humMax: 75.0,
    lumMax: 30.0,
  });

  // 3. Historical Telemetry for Curves
  const [history, setHistory] = useState<Array<{ time: string; temp: number; hum: number; lum: number }>>([
    { time: '23:00:00', temp: 14.0, hum: 67.5, lum: 12 },
    { time: '23:00:15', temp: 14.1, hum: 68.0, lum: 14 },
    { time: '23:00:30', temp: 14.2, hum: 68.0, lum: 15 },
  ]);

  // 4. Incident & Audit Records
  const [alerts, setAlerts] = useState<AlertRecord[]>([
    {
      id: 'alt-1',
      data_hora: '09/10/2026 22:30:15',
      tipo: 'TEMPERATURA',
      severidade: 'EXTREMO (Constante)',
      valor: '24.5 °C',
      atendimento: 'Reconhecido por Master (01:02:03:04)'
    }
  ]);

  const [audits, setAudits] = useState<AuditRecord[]>([
    {
      id: 'aud-1',
      horario: '22:31:05',
      uid: '01:02:03:04',
      operador: 'Enólogo Chefe (Master)',
      status: 'Alarme Silenciado [OK]'
    }
  ]);

  const [devices, setDevices] = useState<DeviceEntry[]>([
    {
      device_id: 'wine001',
      entity_name: 'urn:ngsi-ld:WineCellar:001',
      entity_type: 'WineCellar',
      location: 'Cave Subterrânea 1 - Gran Reserva',
      transport: 'MQTT / UltraLight 2.0',
      status: 'ONLINE'
    }
  ]);

  // 5. Email Notification System State
  const [recipientEmail, setRecipientEmail] = useState<string>('enologia@vinheriaprisma.com.br');
  const [emailLogs, setEmailLogs] = useState<EmailLogEntry[]>([
    {
      id: 'em-1',
      timestamp: '09/10/2026 22:30:16',
      recipient: 'enologia@vinheriaprisma.com.br',
      subject: '🚨 [ALERTA EXTREMO] Violação Crítica de Temperatura (24.5°C)',
      severity: 'EXTREMO',
      temp: 24.5,
      status: 'ENVIADO'
    }
  ]);
  const lastEmailDispatchRef = useRef<number>(0);

  // 6. Modals Visibility
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const [isDeviceModalOpen, setIsDeviceModalOpen] = useState(false);

  // 7. MQTT Client State
  const [mqttConnected, setMqttConnected] = useState<boolean>(false);
  const mqttClientRef = useRef<MqttClient | null>(null);

  // Status Evaluation
  const isTempExtreme = temperature < 10.0 || temperature > 20.0;
  const isHumExtreme = humidity < 50.0 || humidity > 85.0;
  const isLumExtreme = luminosity > 60;
  const isAlarmExtreme = isTempExtreme || isHumExtreme || isLumExtreme || alarm === 2;

  const isTempCritical = (temperature < triggers.tempMin || temperature > triggers.tempMax) && !isTempExtreme;
  const isHumCritical = (humidity < triggers.humMin || humidity > triggers.humMax) && !isHumExtreme;
  const isLumCritical = (luminosity > triggers.lumMax) && !isLumExtreme;
  const isAlarmCritical = (isTempCritical || isHumCritical || isLumCritical || alarm === 1) && !isAlarmExtreme;

  const isAlarmActive = isAlarmExtreme || isAlarmCritical;
  const isAcknowledged = ack === 1;

  // ---------------------------------------------------------------------------
  // MQTT CONNECTION & REAL-TIME WEBSOCKET BRIDGE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    // HiveMQ Public WebSocket broker on port 8884 (TLS/WSS) or fallback 8000 (WS)
    const wsUrl = 'wss://broker.hivemq.com:8884/mqtt';
    const clientId = `react_vinheria_${Math.random().toString(16).substring(2, 8)}`;

    const client = mqtt.connect(wsUrl, {
      clientId,
      clean: true,
      reconnectPeriod: 3000,
      connectTimeout: 5000,
    });

    client.on('connect', () => {
      console.log('>> [React MQTT] Conectado ao HiveMQ via WebSocket WSS!');
      setMqttConnected(true);
      client.subscribe('/TEF/wine001/attrs');
      client.subscribe('/TEF/wine001/attrs/#');
      client.subscribe('/TEF/wine001/cmdexe');
    });

    client.on('error', err => {
      console.warn('>> [React MQTT Erro]', err);
    });

    client.on('close', () => {
      setMqttConnected(false);
    });

    client.on('message', (topic, message) => {
      const payload = message.toString().trim();
      const nowTime = new Date().toLocaleTimeString('pt-BR');
      const nowDateTime = new Date().toLocaleString('pt-BR');

      // 1. Tópico com todos os atributos: t|...|h|...|l|...|alarm|...|ack|...
      if (topic === '/TEF/wine001/attrs') {
        const parts = payload.split('|');
        let newTemp = temperature;
        let newHum = humidity;
        let newLum = luminosity;

        for (let i = 0; i < parts.length - 1; i += 2) {
          const key = parts[i];
          const val = parts[i + 1];
          if (key === 't') {
            const v = parseFloat(val);
            if (!isNaN(v)) {
              newTemp = v;
              setTemperature(v);
            }
          } else if (key === 'h') {
            const v = parseFloat(val);
            if (!isNaN(v)) {
              newHum = v;
              setHumidity(v);
            }
          } else if (key === 'l') {
            const v = parseInt(val);
            if (!isNaN(v)) {
              newLum = v;
              setLuminosity(v);
            }
          } else if (key === 'alarm') {
            setAlarm(parseInt(val) || 0);
          } else if (key === 'ack') {
            setAck(parseInt(val) || 0);
          } else if (key === 'alert_time' && val !== '--/-- --:--:--') {
            setAlertTime(val);
          } else if (key === 'ack_time' && val !== '--/-- --:--:--') {
            setAckTime(val);
          }
        }

        // Add to history points
        setHistory(prev => {
          const updated = [...prev, { time: nowTime, temp: newTemp, hum: newHum, lum: newLum }];
          return updated.slice(-30);
        });
      }

      // 2. Individual Sensor Topics
      else if (topic === '/TEF/wine001/attrs/t') {
        const v = parseFloat(payload);
        if (!isNaN(v)) setTemperature(v);
      } else if (topic === '/TEF/wine001/attrs/h') {
        const v = parseFloat(payload);
        if (!isNaN(v)) setHumidity(v);
      } else if (topic === '/TEF/wine001/attrs/l') {
        const v = parseInt(payload);
        if (!isNaN(v)) setLuminosity(v);
      }

      // 3. RFID Card Scanned
      else if (topic === '/TEF/wine001/attrs/rfid') {
        setLastRfid(payload);
        setAck(1);
        setAckTime(nowTime);
        setAudits(prev => [
          {
            id: `aud-${Date.now()}`,
            horario: nowTime,
            uid: payload,
            operador: payload.includes('01:02:03:04') ? 'Enólogo Chefe (Master)' : 'Cartão RFID',
            status: 'Alarme Silenciado [OK]'
          },
          ...prev.slice(0, 15)
        ]);
      }

      // 4. Log of Alerts & Incident Events
      else if (topic === '/TEF/wine001/attrs/log') {
        if (payload.includes('alert_triggered')) {
          let sev = 'CRITICO';
          let tp = 'GERAL';
          let tmp = `${temperature.toFixed(1)} °C`;

          payload.split('|').forEach((item, idx, arr) => {
            if (item === 'severity') sev = arr[idx + 1] || 'CRITICO';
            if (item === 'type') tp = arr[idx + 1] || 'GERAL';
            if (item === 'temp') tmp = `${arr[idx + 1]} °C`;
          });

          const isExtr = sev.includes('EXTREMO');

          setAlerts(prev => [
            {
              id: `alt-${Date.now()}`,
              data_hora: nowDateTime,
              tipo: tp,
              severidade: isExtr ? 'EXTREMO (Constante)' : 'CRITICO (Bip Rápido)',
              valor: tmp,
              atendimento: 'Pendente de Reconhecimento'
            },
            ...prev.slice(0, 15)
          ]);

          setAlertTime(nowTime);

          // Disparo automático de e-mail se for EXTREMO
          if (isExtr) {
            triggerAutomaticEmailDispatch(tmp);
          }
        } else if (payload.includes('alarm_acknowledged')) {
          setAck(1);
          setAckTime(nowTime);
        }
      }
    });

    mqttClientRef.current = client;

    return () => {
      client.end();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // AUTOMATIC EMERGENCY EMAIL DISPATCH LOGIC
  // ---------------------------------------------------------------------------
  const triggerAutomaticEmailDispatch = (valMedido: string) => {
    const now = Date.now();
    // Cooldown de 20 segundos para não reenviar e-mail repetido na mesma violação
    if (now - lastEmailDispatchRef.current < 20000) return;
    lastEmailDispatchRef.current = now;

    const newLog: EmailLogEntry = {
      id: `em-${now}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      recipient: recipientEmail,
      subject: `🚨 [ALERTA EXTREMO] Anomalia Crítica de Temperatura (${valMedido}) - VinheriaTech`,
      severity: 'EXTREMO (Constante)',
      temp: temperature,
      status: 'ENVIADO'
    };

    setEmailLogs(prev => [newLog, ...prev]);
    console.log(`>> [E-MAIL DISPARADO] Enviado alerta extremo para ${recipientEmail}!`);
  };

  // Watch extreme condition to auto-dispatch email
  useEffect(() => {
    if (isAlarmExtreme && !isAcknowledged) {
      triggerAutomaticEmailDispatch(`${temperature.toFixed(1)} °C`);
    }
  }, [isAlarmExtreme, isAcknowledged]);

  // ---------------------------------------------------------------------------
  // SEND MQTT COMMAND TO ESP32 (WOKWI / REAL HARDWARE)
  // ---------------------------------------------------------------------------
  const sendMqttCommand = (cmd: string) => {
    if (!mqttClientRef.current || !mqttConnected) {
      console.warn('>> [MQTT] Não conectado no momento. Comando enfileirado localmente.');
    }
    const topic = '/TEF/wine001/cmd';
    const payload = `wine001@${cmd}|`;

    try {
      mqttClientRef.current?.publish(topic, payload);
      console.log(`>> [MQTT COMANDO ENVIADO] ${topic} -> ${payload}`);
    } catch (e) {
      console.error('>> [MQTT Erro]', e);
    }

    // Update local state mirrors
    if (cmd === 'alarm_on') {
      setAlarm(1);
      setAck(0);
    } else if (cmd === 'alarm_extremo') {
      setAlarm(2);
      setAck(0);
    } else if (cmd === 'alarm_off') {
      setAlarm(0);
      setAck(1);
    }
  };

  // ---------------------------------------------------------------------------
  // SAVE & SYNC TRIGGERS
  // ---------------------------------------------------------------------------
  const handleSaveTriggers = (tMin: number, tMax: number, hMin: number, hMax: number, lMax: number) => {
    setTriggers({
      tempMin: tMin,
      tempMax: tMax,
      humMin: hMin,
      humMax: hMax,
      lumMax: lMax,
    });
    // Send set_triggers command to ESP32
    sendMqttCommand(`set_triggers|${tMin},${tMax},${hMin},${hMax},${lMax}`);
  };

  return (
    <div className="min-h-screen bg-[#080206] text-zinc-100 flex flex-col font-['Poppins']">
      {/* Intro Splash Animation with Prisma Logo */}
      {showIntro && <PrismaIntroSplash onComplete={() => setShowIntro(false)} />}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 glass-panel-elevated border-b border-rose-950/60 px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand with Equipe Prisma Logo */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#240a1c] to-[#12040d] border border-rose-500/40 p-1.5 shadow-lg shadow-rose-950/60 flex items-center justify-center shrink-0">
            <img
              src="/logo.png"
              alt="Logo Equipe Prisma"
              className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(225,29,72,0.5)]"
              onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-extrabold tracking-wider text-white">VINHERIATECH</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-800/50 tracking-widest uppercase">
                EQUIPE PRISMA
              </span>
            </div>
            <div className="text-[11px] text-zinc-300 font-medium">
              Supervisão Global de Adegas • Check Point 5 (IoT & FIWARE)
            </div>
          </div>
        </div>

        {/* Action Buttons & Status Badges */}
        <div className="flex items-center flex-wrap gap-2 text-xs">
          {/* MQTT Connection Badge */}
          <div className={`px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold flex items-center gap-2 border ${
            mqttConnected
              ? 'bg-emerald-950/80 text-emerald-200 border-emerald-600/50 shadow-sm shadow-emerald-950'
              : 'bg-zinc-900 text-zinc-400 border-zinc-700'
          }`}>
            <Radio className={`w-3.5 h-3.5 ${mqttConnected ? 'text-emerald-400 animate-pulse' : 'text-zinc-500'}`} />
            <span>{mqttConnected ? 'MQTT ONLINE' : 'MQTT CONECTANDO...'}</span>
          </div>

          {/* Tutorial Button */}
          <button
            onClick={() => setIsTutorialModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-100 border border-white/15 font-bold transition active:scale-95 cursor-pointer shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-rose-400" />
            <span>Tutorial & Guia</span>
          </button>

          {/* Email Notifications Button */}
          <button
            onClick={() => setIsEmailModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-red-950/60 hover:bg-red-900/70 text-red-100 border border-red-700/50 font-bold transition active:scale-95 cursor-pointer shadow-sm shadow-red-950"
          >
            <Mail className="w-3.5 h-3.5 text-red-300" />
            <span>E-mail Alerta</span>
          </button>

          {/* IoT Devices Button */}
          <button
            onClick={() => setIsDeviceModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-100 border border-cyan-700/50 font-bold transition active:scale-95 cursor-pointer shadow-sm shadow-cyan-950"
          >
            <Cpu className="w-3.5 h-3.5 text-cyan-300" />
            <span>Dispositivos</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Emergency Alert Banner */}
        {isAlarmActive && (
          <div className={`p-4 rounded-2xl flex items-center justify-between gap-3 shadow-2xl animate-pulse ${
            isAlarmExtreme
              ? 'bg-gradient-to-r from-red-950 via-red-900 to-black border-2 border-red-500 text-white'
              : 'bg-gradient-to-r from-amber-950 via-amber-900 to-black border-2 border-amber-500 text-white'
          }`}>
            <div className="flex items-center gap-3">
              <AlertOctagon className={`w-8 h-8 ${isAlarmExtreme ? 'text-red-300 animate-bounce' : 'text-amber-300'}`} />
              <div>
                <div className="text-sm font-black tracking-wide uppercase flex items-center gap-2">
                  <span>{isAlarmExtreme ? '🚨 ALERTA EXTREMO EM ANDAMENTO (SOM CONSTANTE)' : '⚠️ ALERTA CRÍTICO ATIVO (BIPS RÁPIDOS)'}</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/70 border border-white/20">
                    {alertTime}
                  </span>
                </div>
                <div className="text-xs text-zinc-100 font-medium mt-0.5">
                  {isAlarmExtreme
                    ? 'Violação severa dos limites de conservação. E-mail de emergência despachado. Aproxime a tag Master RFID para silenciar.'
                    : 'Oscilação anormal dos parâmetros térmicos ou lumínicos. LED azul piscando e buzzer em bips ultrarrápidos.'}
                </div>
              </div>
            </div>

            <button
              onClick={() => sendMqttCommand('alarm_off')}
              className="px-4 py-2 rounded-xl text-xs font-black bg-white text-black hover:bg-zinc-200 transition active:scale-95 cursor-pointer shadow-lg shrink-0"
            >
              Silenciar Alarme
            </button>
          </div>
        )}

        {/* Section 1: Hero with Telemetry Cards + Cellar Status Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Telemetry Cards & Quick Triggers */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-5">
            <TelemetryCards
              temperature={temperature}
              humidity={humidity}
              luminosity={luminosity}
              tempMin={triggers.tempMin}
              tempMax={triggers.tempMax}
              humMin={triggers.humMin}
              humMax={triggers.humMax}
              lumMax={triggers.lumMax}
            />

            <TriggersCalibration
              tempMin={triggers.tempMin}
              tempMax={triggers.tempMax}
              humMin={triggers.humMin}
              humMax={triggers.humMax}
              lumMax={triggers.lumMax}
              onSaveTriggers={handleSaveTriggers}
            />
          </div>

          {/* Right: Cellar Status & Health Panel */}
          <div className="lg:col-span-5 flex flex-col">
            <CellarStatusPanel
              temperature={temperature}
              humidity={humidity}
              luminosity={luminosity}
              isAlarmActive={isAlarmActive}
              isAlarmExtreme={isAlarmExtreme}
              isAlarmCritical={isAlarmCritical}
              isAcknowledged={isAcknowledged}
              onSendMqttCommand={sendMqttCommand}
              onReplayIntro={() => setShowIntro(true)}
            />
          </div>
        </div>

        {/* Section 2: Digital Twin Hardware Mirror (ESP32 Actuators & OLED) */}
        <div>
          <DigitalTwinMirror
            temperature={temperature}
            humidity={humidity}
            luminosity={luminosity}
            isAlarmActive={isAlarmActive}
            isAlarmExtreme={isAlarmExtreme}
            isAlarmCritical={isAlarmCritical}
            isAcknowledged={isAcknowledged}
            alertTime={alertTime}
            ackTime={ackTime}
            lastRfid={lastRfid}
            onSendMqttCommand={sendMqttCommand}
          />
        </div>

        {/* Section 3: Interactive Temporal Curves (STH-Comet API 8666) */}
        <div>
          <InteractiveCharts
            history={history}
            tempMin={triggers.tempMin}
            tempMax={triggers.tempMax}
            humMin={triggers.humMin}
            humMax={triggers.humMax}
            lumMax={triggers.lumMax}
          />
        </div>

        {/* Section 4: Incident Records & RFID Master Audit Trail */}
        <div>
          <AlertHistoryTable
            alerts={alerts}
            audits={audits}
          />
        </div>
      </main>

      {/* Footer */}
      <footer className="glass-panel border-t border-rose-950/40 py-5 px-6 mt-10 text-center text-xs text-zinc-300 space-y-1">
        <div className="font-bold text-white tracking-wider flex items-center justify-center gap-2">
          <span>VINHERIATECH</span>
          <span className="text-rose-400">•</span>
          <span>SUPERVISÃO GLOBAL DE VINHERIAS</span>
        </div>
        <div>
          Equipe Prisma | FIAP Check Point 5 • Disruptive Architectures (Prof. Dr. Fábio Henrique Cabrini)
        </div>
      </footer>

      {/* Modals */}
      <EmailAlertModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        recipientEmail={recipientEmail}
        onUpdateRecipientEmail={email => setRecipientEmail(email)}
        emailLogs={emailLogs}
        onTriggerTestEmail={() => triggerAutomaticEmailDispatch(`${temperature.toFixed(1)} °C (Disparo Manual de Teste)`)}
      />

      <TutorialModal
        isOpen={isTutorialModalOpen}
        onClose={() => setIsTutorialModalOpen(false)}
      />

      <DeviceManagerModal
        isOpen={isDeviceModalOpen}
        onClose={() => setIsDeviceModalOpen(false)}
        devices={devices}
        onAddDevice={newDev => setDevices(prev => [...prev, newDev])}
      />
    </div>
  );
}
