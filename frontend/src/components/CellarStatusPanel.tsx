import React from 'react';
import { Wine, ShieldCheck, AlertTriangle, AlertOctagon, Sparkles, Zap, RotateCcw } from 'lucide-react';

interface CellarStatusPanelProps {
  temperature: number;
  humidity: number;
  luminosity: number;
  isAlarmActive: boolean;
  isAlarmExtreme: boolean;
  isAlarmCritical: boolean;
  isAcknowledged: boolean;
  onSendMqttCommand: (cmd: string) => void;
  onReplayIntro: () => void;
}

export const CellarStatusPanel: React.FC<CellarStatusPanelProps> = ({
  temperature,
  humidity,
  luminosity,
  isAlarmActive,
  isAlarmExtreme,
  isAlarmCritical,
  isAcknowledged,
  onSendMqttCommand,
  onReplayIntro
}) => {
  // Compute Cellar Health Score (0 - 100%)
  let healthScore = 100;
  if (isAlarmExtreme) {
    healthScore = 20;
  } else if (isAlarmCritical) {
    healthScore = 65;
  } else if (isAcknowledged) {
    healthScore = 80;
  }

  // Mascot details
  let mascotAvatar = '( ^_^ )';
  let mascotTitle = 'VinhoGochi: Feliz & Equilibrado';
  let mascotAdvice = 'Adega em perfeita harmonia! Taninos e aromas maturando no tempo ideal.';
  let mascotMoodColor = 'text-emerald-300';
  let mascotBg = 'bg-emerald-950/30 border-emerald-800/40';

  if (isAcknowledged) {
    mascotAvatar = '( B-) )';
    mascotTitle = 'VinhoGochi: Ronda Master';
    mascotAdvice = 'Alarme silenciado pelo Enólogo Chefe via RFID Master. Ronda presencial confirmada.';
    mascotMoodColor = 'text-cyan-300';
    mascotBg = 'bg-cyan-950/40 border-cyan-800/50';
  } else if (isAlarmExtreme) {
    mascotAvatar = '( !_! )';
    mascotTitle = 'VinhoGochi: PÂNICO TOTAL!';
    mascotAdvice = 'Condições extremas na adega! Alarme ininterrupto e e-mails disparados.';
    mascotMoodColor = 'text-red-400';
    mascotBg = 'bg-red-950/50 border-red-800/60';
  } else if (isAlarmCritical) {
    if (temperature > 16.0) {
      mascotAvatar = '( ;_; )';
      mascotTitle = 'VinhoGochi: Calor na Adega';
      mascotAdvice = 'Gotas de suor! Temperatura alta acelera a degradação e dilata o vinho.';
    } else if (temperature < 12.0) {
      mascotAvatar = '( >_< )';
      mascotTitle = 'VinhoGochi: Frio Excessivo';
      mascotAdvice = 'Tremendo de frio! Risco de precipitação de cristais tartáricos.';
    } else if (luminosity > 30) {
      mascotAvatar = '( *O* )';
      mascotTitle = 'VinhoGochi: Luz Excessiva';
      mascotAdvice = 'Luz ambiente alta! Risco de foto-oxidação e perda de taninos.';
    } else {
      mascotAvatar = '( >_< )';
      mascotTitle = 'VinhoGochi: Em Alerta';
      mascotAdvice = 'Oscilação ambiental detectada. O LED está piscando para alertar a ronda.';
    }
    mascotMoodColor = 'text-amber-300';
    mascotBg = 'bg-amber-950/40 border-amber-800/50';
  }

  return (
    <div className="glass-panel-elevated rounded-2xl p-5 flex flex-col justify-between space-y-5 card-border-subtle hover:border-rose-500/30 transition-all">
      {/* Header with Title and Replay Intro Button */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/30 shrink-0">
            <Wine className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide truncate">STATUS DE PRESERVAÇÃO</h3>
            <p className="text-[10px] text-zinc-400 truncate">Cave Subterrânea 1 • Gran Reserva</p>
          </div>
        </div>

        <button
          onClick={onReplayIntro}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-[11px] font-semibold transition active:scale-95 cursor-pointer shrink-0"
          title="Executar novamente a animação de introdução com a logo da Equipe Prisma"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Intro Prisma</span>
        </button>
      </div>

      {/* Main Score & Mascot Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-stretch">
        {/* Health Score Dial */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-3.5 rounded-xl bg-black/50 border border-white/10 text-center relative overflow-hidden min-h-[110px]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-0.5">
            Índice Preservação
          </div>

          <div className="relative my-1 flex items-center justify-center">
            <span className={`text-4xl font-black font-mono tracking-tight ${
              isAlarmExtreme ? 'text-red-400' : isAlarmCritical ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {healthScore}%
            </span>
          </div>

          <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full border mt-0.5 whitespace-nowrap ${
            isAlarmExtreme
              ? 'bg-red-950/80 text-red-200 border-red-700/60'
              : isAlarmCritical
              ? 'bg-amber-950/80 text-amber-200 border-amber-700/60'
              : 'bg-emerald-950/80 text-emerald-200 border-emerald-700/60'
          }`}>
            {isAlarmExtreme ? '🚨 RISCO IMEDIATO' : isAlarmCritical ? '⚠️ ATENÇÃO' : '🛡️ QUALIDADE IDEAL'}
          </div>
        </div>

        {/* Gamified Mascot VinhoGochi */}
        <div className={`sm:col-span-7 p-3.5 rounded-xl border transition-all flex flex-col justify-between min-w-0 ${mascotBg}`}>
          <div className="flex items-center gap-2.5 mb-1.5 min-w-0">
            <div className={`text-xs sm:text-sm font-black font-mono select-none px-2 py-0.5 rounded-lg bg-black/70 border border-white/15 whitespace-nowrap shrink-0 shadow-inner ${mascotMoodColor}`}>
              {mascotAvatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className={`text-xs font-bold truncate leading-tight ${mascotMoodColor}`}>{mascotTitle}</div>
              <div className="text-[10px] text-zinc-400 truncate">Mascote da Vinheria</div>
            </div>
          </div>
          <p className="text-[11px] text-zinc-200/90 leading-snug font-normal italic line-clamp-3 sm:line-clamp-none">
            "{mascotAdvice}"
          </p>
        </div>
      </div>

      {/* Cloud Remote Controls Bar */}
      <div className="pt-3 border-t border-white/10">
        <div className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-2.5">
          Comandos Rápidos no ESP32 (Cloud MQTT)
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => onSendMqttCommand('alarm_on')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-amber-600/20 hover:bg-amber-600/35 text-amber-200 border border-amber-500/40 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="truncate">Alerta Crítico</span>
          </button>

          <button
            onClick={() => onSendMqttCommand('alarm_extremo')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-red-600/20 hover:bg-red-600/35 text-red-200 border border-red-500/40 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <AlertOctagon className="w-3.5 h-3.5 text-red-400" />
            <span className="truncate">Alerta Extremo</span>
          </button>

          <button
            onClick={() => onSendMqttCommand('alarm_off')}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-bold bg-zinc-800 hover:bg-zinc-700 text-white border border-white/15 transition active:scale-95 cursor-pointer shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5 text-zinc-300" />
            <span className="truncate">Silenciar</span>
          </button>
        </div>
      </div>
    </div>
  );
};

