import React, { useState } from 'react';
import { Sliders, CheckCircle2, Send } from 'lucide-react';

interface TriggersCalibrationProps {
  tempMin: number;
  tempMax: number;
  humMin: number;
  humMax: number;
  lumMax: number;
  onSaveTriggers: (tMin: number, tMax: number, hMin: number, hMax: number, lMax: number) => void;
}

export const TriggersCalibration: React.FC<TriggersCalibrationProps> = ({
  tempMin,
  tempMax,
  humMin,
  humMax,
  lumMax,
  onSaveTriggers
}) => {
  const [tMin, setTMin] = useState(tempMin);
  const [tMax, setTMax] = useState(tempMax);
  const [hMin, setHMin] = useState(humMin);
  const [hMax, setHMax] = useState(humMax);
  const [lMax, setLMax] = useState(lumMax);
  const [synced, setSynced] = useState(false);

  const handleSave = () => {
    onSaveTriggers(tMin, tMax, hMin, hMax, lMax);
    setSynced(true);
    setTimeout(() => setSynced(false), 3000);
  };

  return (
    <div className="glass-panel rounded-2xl p-5 border border-rose-900/30">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sliders className="w-5 h-5 text-rose-500" />
          <h3 className="font-bold text-white text-base tracking-wide">
            CALIBRAÇÃO DINÂMICA DE TRIGGERS (LIMITES DE CONSERVAÇÃO)
          </h3>
        </div>
        <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-semibold bg-rose-950/80 text-rose-300 border border-rose-800/40">
          FIWARE UltraLight 2.0
        </span>
      </div>

      <p className="text-xs text-zinc-400 mb-5">
        Ajuste as faixas de corte da adega. Ao ultrapassar estes valores, o Front-end e o ESP32 acionam remotamente os alertas visuais e sonoros graduados.
      </p>

      <div className="space-y-5">
        {/* Temperatura Min / Max */}
        <div className="space-y-1.5 bg-black/40 p-3.5 rounded-xl border border-white/5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-zinc-200">Temperatura Ideal [Mín - Máx]</span>
            <span className="font-mono font-bold text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-900/40">
              {tMin}°C a {tMax}°C
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Mínima: {tMin}°C</label>
              <input
                type="range"
                min="5"
                max="16"
                step="0.5"
                value={tMin}
                onChange={e => setTMin(parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Máxima: {tMax}°C</label>
              <input
                type="range"
                min="14"
                max="26"
                step="0.5"
                value={tMax}
                onChange={e => setTMax(parseFloat(e.target.value))}
                className="w-full accent-rose-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Umidade Min / Max */}
        <div className="space-y-1.5 bg-black/40 p-3.5 rounded-xl border border-white/5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-zinc-200">Umidade Relativa [Mín - Máx]</span>
            <span className="font-mono font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-900/40">
              {hMin}% a {hMax}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Mínima: {hMin}%</label>
              <input
                type="range"
                min="35"
                max="65"
                step="1"
                value={hMin}
                onChange={e => setHMin(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Máxima: {hMax}%</label>
              <input
                type="range"
                min="65"
                max="90"
                step="1"
                value={hMax}
                onChange={e => setHMax(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Luminosidade Max */}
        <div className="space-y-1.5 bg-black/40 p-3.5 rounded-xl border border-white/5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-zinc-200">Luminosidade Máxima Tolerada</span>
            <span className="font-mono font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-900/40">
              Até {lMax}%
            </span>
          </div>
          <div className="pt-1">
            <input
              type="range"
              min="10"
              max="70"
              step="5"
              value={lMax}
              onChange={e => setLMax(parseInt(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer"
            />
          </div>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all duration-200 active:scale-98 cursor-pointer shadow-lg ${
            synced
              ? 'bg-emerald-600 text-white shadow-emerald-950'
              : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950 hover:shadow-rose-900/50'
          }`}
        >
          {synced ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              Sincronizado com o ESP32 com Sucesso!
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              Salvar & Sincronizar Triggers com Hardware (MQTT)
            </>
          )}
        </button>
      </div>
    </div>
  );
};

