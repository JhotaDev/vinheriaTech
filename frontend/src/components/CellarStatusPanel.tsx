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
  let mascotAvatar = '( ^ _ ^ )';
  let mascotTitle = 'VinhoGochi: Feliz & Equilibrado';
  let mascotAdvice = 'A adega está com clima ideal. Os compostos tânicos e aromas estão maturando perfeitamente.';
  let mascotMoodColor = 'text-emerald-300';
  let mascotBg = 'bg-emerald-950/30 border-emerald-800/40';

  if (isAlarmExtreme) {
    mascotAvatar = '( ! _ ! )';
    mascotTitle = 'VinhoGochi: PÂNICO TOTAL!';
    mascotAdvice = 'Temperatura ou umidade fora da barreira de segurança! Som constante e e-mail de alerta ativados.';
    mascotMoodColor = 'text-red-400';
    mascotBg = 'bg-red-950/50 border-red-800/60';
  } else if (isAlarmCritical) {
    mascotAvatar = '( > _ < )';
    mascotTitle = 'VinhoGochi: Em Alerta com a Oscilação';
    mascotAdvice = 'Oscilação detectada. O LED está piscando e o buzzer soando bips rápidos para alertar a ronda.';
    mascotMoodColor = 'text-amber-300';
    mascotBg = 'bg-amber-950/40 border-amber-800/50';
  } else if (isAcknowledged) {
    mascotAvatar = '( ^ _ ~ )';
    mascotTitle = 'VinhoGochi: Aliviado com a Ronda!';
    mascotAdvice = 'Alarme reconhecido pelo Enólogo Chefe (Master). A equipe de climatização está atuando.';
    mascotMoodColor = 'text-cyan-300';
    mascotBg = 'bg-cyan-950/40 border-cyan-800/50';
  }

  return (
    <div className="glass-panel-elevated rounded-2xl p-6 flex flex-col justify-between space-y-6 card-border-subtle hover:border-rose-500/30 transition-all">
      {/* Header with Title and Replay Intro Button */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="p-2.5 rounded-xl bg-rose-600/20 text-rose-300 border border-rose-500/30">
            <Wine className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">STATUS DE PRESERVAÇÃO DA ADEGA</h3>
            <p className="text-[11px] text-zinc-400">Cave Subterrânea 1 • Reserva Gran Cuvee</p>
          </div>
        </div>

        <button
          onClick={onReplayIntro}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 text-xs font-semibold transition active:scale-95 cursor-pointer"
          title="Executar novamente a animação de introdução com a logo da Equipe Prisma"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Ver Abertura Prisma</span>
        </button>
      </div>

      {/* Main Score & Mascot Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
        {/* Health Score Dial */}
        <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-black/50 border border-white/10 text-center relative overflow-hidden">
          <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
            Índice de Preservação
          </div>

          <div className="relative my-2 flex items-center justify-center">
            <span className={`text-5xl font-black font-mono tracking-tight ${
              isAlarmExtreme ? 'text-red-400' : isAlarmCritical ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {healthScore}%
            </span>
          </div>

          <div className={`text-[11px] font-bold px-3 py-1 rounded-full border mt-1 ${
            isAlarmExtreme
              ? 'bg-red-950/80 text-red-200 border-red-700/60'
              : isAlarmCritical
              ? 'bg-amber-950/80 text-amber-200 border-amber-700/60'
              : 'bg-emerald-950/80 text-emerald-200 border-emerald-700/60'
          }`}>
            {isAlarmExtreme ? '🚨 RISCO IMEDIATO' : isAlarmCritical ? '⚠️ ATENÇÃO TÉRMICA' : '🛡️ QUALIDADE GARANTIDA'}
          </div>
        </div>

        {/* Gamified Mascot VinhoGochi */}
        <div className={`sm:col-span-7 p-4 rounded-2xl border transition-all ${mascotBg}`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`text-2xl font-black tracking-widest font-mono select-none px-2.5 py-1 rounded-xl bg-black/60 border border-white/10 ${mascotMoodColor}`}>
              {mascotAvatar}
            </div>
            <div>
              <div className={`text-xs font-bold ${mascotMoodColor}`}>{mascotTitle}</div>
              <div className="text-[10px] text-zinc-400">Mascote Interativo da Vinheria</div>
            </div>
          </div>
          <p className="text-xs text-zinc-200 leading-relaxed font-normal">
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

