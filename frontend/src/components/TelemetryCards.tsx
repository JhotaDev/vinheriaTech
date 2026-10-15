import React from 'react';
import { Thermometer, Droplets, Sun, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TelemetryCardsProps {
  temperature: number;
  humidity: number;
  luminosity: number;
  tempMin: number;
  tempMax: number;
  humMin: number;
  humMax: number;
  lumMax: number;
}

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({
  temperature,
  humidity,
  luminosity,
  tempMin,
  tempMax,
  humMin,
  humMax,
  lumMax,
}) => {
  // Temperature evaluation
  const isTempExtreme = temperature < 10.0 || temperature > 20.0;
  const isTempCritical = (temperature < tempMin || temperature > tempMax) && !isTempExtreme;
  const tempStatusText = isTempExtreme
    ? 'EXTREMO! Risco Térmico Imediato'
    : isTempCritical
    ? (temperature > tempMax ? 'Crítico: Calor Excessivo' : 'Crítico: Frio Excessivo')
    : 'Faixa Ideal de Conservação';

  // Humidity evaluation
  const isHumExtreme = humidity < 50.0 || humidity > 85.0;
  const isHumCritical = (humidity < humMin || humidity > humMax) && !isHumExtreme;
  const humStatusText = isHumExtreme
    ? 'EXTREMO! Risco de Rolha/Mofo'
    : isHumCritical
    ? (humidity > humMax ? 'Crítico: Umidade Alta (Mofo)' : 'Crítico: Ar Seco (Rolha)')
    : 'Faixa Ideal de Umidade';

  // Luminosity evaluation
  const isLumExtreme = luminosity > 60;
  const isLumCritical = luminosity > lumMax && !isLumExtreme;
  const lumStatusText = isLumExtreme
    ? 'EXTREMO! Luz Nociva Direta'
    : isLumCritical
    ? 'Crítico: Exposição Nociva'
    : 'Adega Protegida da Luz';

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* 1. Card de Temperatura */}
      <div className={`glass-panel rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] relative overflow-hidden ${
        isTempExtreme
          ? 'card-border-glow-rose bg-gradient-to-br from-red-950/40 to-black'
          : isTempCritical
          ? 'card-border-glow-amber bg-gradient-to-br from-amber-950/30 to-black'
          : 'card-border-subtle hover:border-rose-500/40'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl border ${
              isTempExtreme
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : isTempCritical
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
            }`}>
              <Thermometer className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-200 tracking-wider uppercase">TEMPERATURA</span>
              <div className="text-[11px] text-zinc-400 font-medium">Sensor DHT-22 (Precisão 0.1°C)</div>
            </div>
          </div>
          {isTempExtreme || isTempCritical ? (
            <AlertTriangle className={`w-5 h-5 ${isTempExtreme ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-black font-mono tracking-tight text-white drop-shadow-md">
            {temperature.toFixed(1)}
          </span>
          <span className="text-xl font-bold text-rose-400">°C</span>
        </div>

        {/* Progress Range Bar */}
        <div className="w-full bg-zinc-950/90 rounded-full h-2.5 mb-3 overflow-hidden border border-white/10 p-0.5">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isTempExtreme ? 'bg-red-500 shadow-sm shadow-red-500' : isTempCritical ? 'bg-amber-500' : 'bg-gradient-to-r from-rose-500 to-emerald-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, ((temperature - 5) / 25) * 100))}%` }}
          />
        </div>

        {/* Status Badge */}
        <div className={`text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center justify-between border ${
          isTempExtreme
            ? 'bg-red-950/90 text-red-200 border-red-700/60 shadow-inner'
            : isTempCritical
            ? 'bg-amber-950/90 text-amber-200 border-amber-700/60 shadow-inner'
            : 'bg-emerald-950/80 text-emerald-200 border-emerald-700/50'
        }`}>
          <span>{tempStatusText}</span>
          <span className="font-mono text-[11px] text-zinc-300 font-bold">[{tempMin}°C - {tempMax}°C]</span>
        </div>
      </div>

      {/* 2. Card de Umidade */}
      <div className={`glass-panel rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] relative overflow-hidden ${
        isHumExtreme
          ? 'card-border-glow-rose bg-gradient-to-br from-red-950/40 to-black'
          : isHumCritical
          ? 'card-border-glow-amber bg-gradient-to-br from-amber-950/30 to-black'
          : 'card-border-subtle hover:border-cyan-500/40'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl border ${
              isHumExtreme
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : isHumCritical
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
            }`}>
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-200 tracking-wider uppercase">UMIDADE RELATIVA</span>
              <div className="text-[11px] text-zinc-400 font-medium">Sensor DHT-22 (Higrômetro)</div>
            </div>
          </div>
          {isHumExtreme || isHumCritical ? (
            <AlertTriangle className={`w-5 h-5 ${isHumExtreme ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-black font-mono tracking-tight text-white drop-shadow-md">
            {humidity.toFixed(1)}
          </span>
          <span className="text-xl font-bold text-cyan-400">%</span>
        </div>

        {/* Progress Range Bar */}
        <div className="w-full bg-zinc-950/90 rounded-full h-2.5 mb-3 overflow-hidden border border-white/10 p-0.5">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isHumExtreme ? 'bg-red-500 shadow-sm shadow-red-500' : isHumCritical ? 'bg-amber-500' : 'bg-gradient-to-r from-cyan-600 to-cyan-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, humidity))}%` }}
          />
        </div>

        {/* Status Badge */}
        <div className={`text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center justify-between border ${
          isHumExtreme
            ? 'bg-red-950/90 text-red-200 border-red-700/60 shadow-inner'
            : isHumCritical
            ? 'bg-amber-950/90 text-amber-200 border-amber-700/60 shadow-inner'
            : 'bg-emerald-950/80 text-emerald-200 border-emerald-700/50'
        }`}>
          <span>{humStatusText}</span>
          <span className="font-mono text-[11px] text-zinc-300 font-bold">[{humMin}% - {humMax}%]</span>
        </div>
      </div>

      {/* 3. Card de Luminosidade */}
      <div className={`glass-panel rounded-2xl p-5 transition-all duration-300 hover:scale-[1.01] relative overflow-hidden ${
        isLumExtreme
          ? 'card-border-glow-rose bg-gradient-to-br from-red-950/40 to-black'
          : isLumCritical
          ? 'card-border-glow-amber bg-gradient-to-br from-amber-950/30 to-black'
          : 'card-border-subtle hover:border-amber-500/40'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`p-2.5 rounded-xl border ${
              isLumExtreme
                ? 'bg-red-500/20 text-red-300 border-red-500/40'
                : isLumCritical
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-zinc-200 tracking-wider uppercase">LUMINOSIDADE</span>
              <div className="text-[11px] text-zinc-400 font-medium">Sensor LDR (Fotoresistor ADC1)</div>
            </div>
          </div>
          {isLumExtreme || isLumCritical ? (
            <AlertTriangle className={`w-5 h-5 ${isLumExtreme ? 'text-red-400 animate-bounce' : 'text-amber-400'}`} />
          ) : (
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
          )}
        </div>

        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-4xl font-black font-mono tracking-tight text-white drop-shadow-md">
            {luminosity}
          </span>
          <span className="text-xl font-bold text-amber-400">%</span>
        </div>

        {/* Progress Range Bar */}
        <div className="w-full bg-zinc-950/90 rounded-full h-2.5 mb-3 overflow-hidden border border-white/10 p-0.5">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isLumExtreme ? 'bg-red-500 shadow-sm shadow-red-500' : isLumCritical ? 'bg-amber-500' : 'bg-gradient-to-r from-amber-600 to-amber-400'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, luminosity))}%` }}
          />
        </div>

        {/* Status Badge */}
        <div className={`text-xs px-3 py-1.5 rounded-xl font-semibold flex items-center justify-between border ${
          isLumExtreme
            ? 'bg-red-950/90 text-red-200 border-red-700/60 shadow-inner'
            : isLumCritical
            ? 'bg-amber-950/90 text-amber-200 border-amber-700/60 shadow-inner'
            : 'bg-emerald-950/80 text-emerald-200 border-emerald-700/50'
        }`}>
          <span>{lumStatusText}</span>
          <span className="font-mono text-[11px] text-zinc-300 font-bold">[Máx: {lumMax}%]</span>
        </div>
      </div>
    </div>
  );
};
