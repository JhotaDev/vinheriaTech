import React from 'react';
import { Volume2, VolumeX, Lightbulb, CreditCard, ShieldCheck, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';

interface DigitalTwinMirrorProps {
  temperature: number;
  humidity: number;
  luminosity: number;
  isAlarmActive: boolean;
  isAlarmExtreme: boolean;
  isAlarmCritical: boolean;
  isAcknowledged: boolean;
  alertTime: string;
  ackTime: string;
  lastRfid: string;
  onSendMqttCommand: (cmd: string) => void;
}

export const DigitalTwinMirror: React.FC<DigitalTwinMirrorProps> = ({
  temperature,
  humidity,
  luminosity,
  isAlarmActive,
  isAlarmExtreme,
  isAlarmCritical,
  isAcknowledged,
  alertTime,
  ackTime,
  lastRfid,
  onSendMqttCommand,
}) => {

  const handleSimulateMasterCard = () => {
    // Trigger confetti for master technician recognition
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7 },
      colors: ['#06b6d4', '#3b82f6', '#10b981', '#f59e0b']
    });

    // Send acknowledge command to ESP32
    onSendMqttCommand('alarm_off');
  };

  // Determine Tamagotchi Mood & OLED Status
  let moodFace = '( ^_^ )';
  let moodName = 'Feliz & Estável';
  let oledStatus = 'ADEGA SEGURA';
  let oledStatusColor = 'text-emerald-400';

  if (isAlarmActive && !isAcknowledged) {
    if (isAlarmExtreme) {
      moodFace = '( !_! )';
      moodName = 'PÂNICO TOTAL';
      oledStatus = '! EXTREMO !';
      oledStatusColor = 'text-red-500 animate-pulse';
    } else {
      if (temperature > 16.0) {
        moodFace = '( ;_; )';
        moodName = 'Calor Excessivo';
      } else if (temperature < 12.0) {
        moodFace = '( >_< )';
        moodName = 'Frio Excessivo';
      } else if (luminosity > 30) {
        moodFace = '( *O* )';
        moodName = 'Luz Excessiva';
      } else {
        moodFace = '( >_< )';
        moodName = 'Alerta Oscilação';
      }
      oledStatus = '! CRITICO !';
      oledStatusColor = 'text-amber-400 animate-pulse';
    }
  } else if (isAcknowledged) {
    moodFace = '( B-) )';
    moodName = 'Ronda Master';
    oledStatus = 'ALERTA RECONHECIDO';
    oledStatusColor = 'text-cyan-400';
  }

  // LED & Buzzer States
  const ledStateText = !isAlarmActive
    ? 'DESLIGADO'
    : isAcknowledged
    ? 'RONDA SUAVE (800ms)'
    : isAlarmExtreme
    ? 'ACESO CONTÍNUO'
    : 'PISCANDO RÁPIDO (1:1)';

  const buzzerStateText = !isAlarmActive
    ? 'SILENCIOSO'
    : isAcknowledged
    ? 'SILENCIADO POR MASTER'
    : isAlarmExtreme
    ? 'SOM CONSTANTE (SEM PARAR)'
    : 'BIPS ULTRARRÁPIDOS (50ms)';

  return (
    <div className="glass-panel rounded-2xl p-5 border border-rose-900/30">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <h3 className="font-bold text-white text-base tracking-wide flex items-center gap-2">
            GÊMEO DIGITAL (ESP32 HARDWARE MIRROR)
          </h3>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
          SPI / I2C / PWM ATIVO
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Virtual OLED Screen (Pixel Art Style) */}
        <div className="md:col-span-7 bg-[#050907] border-2 border-zinc-700 rounded-xl p-3.5 shadow-2xl font-mono text-xs flex flex-col justify-between min-h-[190px]">
          {/* Header Line */}
          <div className="flex items-center justify-between border-b border-zinc-800 pb-1 text-[11px]">
            <span className={`font-black tracking-wider uppercase ${oledStatusColor}`}>
              {oledStatus}
            </span>
            <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>MQTT ONLINE</span>
            </div>
          </div>

          {/* OLED Center: Tamagotchi + Readings */}
          <div className="grid grid-cols-12 gap-2 my-2 items-center">
            {/* Tamagotchi Mascot */}
            <div className="col-span-5 bg-black/70 border border-zinc-800 rounded-lg p-1.5 text-center flex flex-col items-center justify-center min-h-[58px]">
              <div className="text-sm font-bold font-mono text-emerald-300 select-none tracking-normal whitespace-nowrap py-0.5">
                {moodFace}
              </div>
              <div className="text-[9px] text-zinc-400 font-mono truncate max-w-full px-1">
                {moodName}
              </div>
            </div>

            {/* Live Measurements */}
            <div className="col-span-7 space-y-1.5 pl-2 text-zinc-200 text-xs">
              <div className="flex justify-between items-center bg-zinc-900/40 px-2 py-0.5 rounded">
                <span className="text-zinc-400">T:</span>
                <span className="font-bold text-rose-400">{temperature.toFixed(1)}°C</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900/40 px-2 py-0.5 rounded">
                <span className="text-zinc-400">U:</span>
                <span className="font-bold text-cyan-400">{humidity.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between items-center bg-zinc-900/40 px-2 py-0.5 rounded">
                <span className="text-zinc-400">L:</span>
                <span className="font-bold text-amber-400">{luminosity}%</span>
              </div>
            </div>
          </div>

          {/* Footer Line: Clock or Alarm Record */}
          <div className="border-t border-zinc-800 pt-1 flex items-center justify-between text-[10px] text-zinc-400">
            {isAcknowledged ? (
              <span className="text-cyan-300 font-bold truncate">ACK: {ackTime} MASTER</span>
            ) : isAlarmActive ? (
              <span className="text-red-400 font-bold truncate">ALERTA: {alertTime}</span>
            ) : (
              <span className="text-emerald-400 font-medium">SISTEMA ESTÁVEL | GMT-3</span>
            )}
            <span className="text-[9px] text-zinc-600">SSD1306/ST7735</span>
          </div>
        </div>

        {/* Physical Actuators State */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-3">
          {/* LED Azul Indicator */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${
                isAlarmActive && !isAcknowledged
                  ? (isAlarmExtreme ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50' : 'bg-blue-500/80 text-white animate-pulse')
                  : isAcknowledged
                  ? 'bg-blue-900/40 text-blue-300'
                  : 'bg-zinc-800 text-zinc-500'
              }`}>
                <Lightbulb className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">LED AZUL (GPIO 2)</div>
                <div className="text-xs font-bold text-white">{ledStateText}</div>
              </div>
            </div>
            <div className={`w-3.5 h-3.5 rounded-full border ${
              isAlarmActive && !isAcknowledged
                ? (isAlarmExtreme ? 'bg-blue-500 border-blue-300 shadow-lg shadow-blue-500/80' : 'bg-blue-400 border-blue-200 animate-pulse')
                : isAcknowledged
                ? 'bg-blue-700 border-blue-500'
                : 'bg-zinc-800 border-zinc-700'
            }`} />
          </div>

          {/* Buzzer Sound Indicator */}
          <div className="bg-black/40 border border-white/5 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`p-2 rounded-lg ${
                isAlarmActive && !isAcknowledged
                  ? (isAlarmExtreme ? 'bg-red-600 text-white shadow-lg shadow-red-500/50' : 'bg-amber-600/80 text-white animate-pulse')
                  : 'bg-zinc-800 text-zinc-500'
              }`}>
                {isAlarmActive && !isAcknowledged ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-[11px] text-zinc-400 font-medium">BUZZER MULTITOM (GPIO 13)</div>
                <div className="text-xs font-bold text-white">{buzzerStateText}</div>
              </div>
            </div>

            {/* Sound Wave Bars */}
            {isAlarmActive && !isAcknowledged ? (
              <div className="flex items-center gap-0.5 h-5">
                <span className={`w-1 rounded-full ${isAlarmExtreme ? 'bg-red-500 h-5' : 'bg-amber-400 sound-bar'}`} style={{ animationDelay: '0.1s' }} />
                <span className={`w-1 rounded-full ${isAlarmExtreme ? 'bg-red-500 h-5' : 'bg-amber-400 sound-bar'}`} style={{ animationDelay: '0.3s' }} />
                <span className={`w-1 rounded-full ${isAlarmExtreme ? 'bg-red-500 h-5' : 'bg-amber-400 sound-bar'}`} style={{ animationDelay: '0.2s' }} />
                <span className={`w-1 rounded-full ${isAlarmExtreme ? 'bg-red-500 h-5' : 'bg-amber-400 sound-bar'}`} style={{ animationDelay: '0.4s' }} />
              </div>
            ) : (
              <span className="text-[10px] text-zinc-600 font-mono">0 Hz</span>
            )}
          </div>
        </div>
      </div>

      {/* RFID Master Card Quick-Action Bar */}
      <div className="mt-4 pt-3 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-zinc-300">
          <CreditCard className="w-4 h-4 text-cyan-400" />
          <span>Último RFID Detectado:</span>
          <span className="font-mono font-bold text-cyan-300 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
            {lastRfid || '01:02:03:04 (Master)'}
          </span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Interactive Tap Master Button */}
          <button
            onClick={handleSimulateMasterCard}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950 transition-all active:scale-95 cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
            Passar Cartão Master (Silenciar)
          </button>

          {/* Test Buttons */}
          <button
            onClick={() => onSendMqttCommand('alarm_on')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-600/40 transition active:scale-95 cursor-pointer"
            title="Forçar Alerta Crítico (Bips Rápidos)"
          >
            <Zap className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onSendMqttCommand('alarm_extremo')}
            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-red-600/30 hover:bg-red-600/50 text-red-300 border border-red-600/40 transition active:scale-95 cursor-pointer"
            title="Forçar Alerta Extremo (Som Constante)"
          >
            🚨
          </button>
        </div>
      </div>
    </div>
  );
};

