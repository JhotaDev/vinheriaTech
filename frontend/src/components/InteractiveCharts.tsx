import React from 'react';
import { Activity, Clock } from 'lucide-react';

interface ChartPoint {
  time: string;
  temp: number;
  hum: number;
  lum: number;
}

interface InteractiveChartsProps {
  history: ChartPoint[];
  tempMin: number;
  tempMax: number;
  humMin: number;
  humMax: number;
  lumMax: number;
}

export const InteractiveCharts: React.FC<InteractiveChartsProps> = ({
  history,
  tempMin,
  tempMax,
  humMin,
  humMax,
  lumMax
}) => {
  // Ensure we have at least 2 points to render an SVG path
  const data = history.length > 1 ? history : [
    { time: '00:00:00', temp: 14.0, hum: 68.0, lum: 15 },
    { time: '00:00:03', temp: 14.2, hum: 68.2, lum: 15 }
  ];

  const svgWidth = 560;
  const svgHeight = 200;
  const padding = { top: 25, right: 30, bottom: 30, left: 45 };
  const graphW = svgWidth - padding.left - padding.right;
  const graphH = svgHeight - padding.top - padding.bottom;

  // Temperature scales (e.g. 5°C to 30°C)
  const minTempScale = 5;
  const maxTempScale = 30;
  const getYTemp = (val: number) => {
    const clamped = Math.max(minTempScale, Math.min(maxTempScale, val));
    return padding.top + graphH - ((clamped - minTempScale) / (maxTempScale - minTempScale)) * graphH;
  };

  // Humidity & Light scales (0% to 100%)
  const getYPct = (val: number) => {
    const clamped = Math.max(0, Math.min(100, val));
    return padding.top + graphH - (clamped / 100) * graphH;
  };

  const getX = (index: number) => {
    return padding.left + (index / (data.length - 1)) * graphW;
  };

  // Generate SVG paths
  const tempPath = data.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getYTemp(pt.temp);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const tempAreaPath = `${tempPath} L ${getX(data.length - 1)} ${padding.top + graphH} L ${getX(0)} ${padding.top + graphH} Z`;

  const humPath = data.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getYPct(pt.hum);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const lumPath = data.reduce((acc, pt, i) => {
    const x = getX(i);
    const y = getYPct(pt.lum);
    return i === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* 1. Gráfico Histórico de Temperatura */}
      <div className="glass-panel rounded-2xl p-5 border border-rose-900/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-500" />
            <h4 className="font-bold text-white text-sm">HISTÓRICO TEMPORAL DE TEMPERATURA</h4>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-mono">
            <Clock className="w-3.5 h-3.5 text-zinc-500" />
            <span>STH-Comet (API 8666)</span>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Monitoramento contínuo em série temporal com limites de tolerância do enólogo.
        </p>

        {/* SVG Chart */}
        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[10, 15, 20, 25].map(t => (
              <g key={t}>
                <line
                  x1={padding.left}
                  y1={getYTemp(t)}
                  x2={padding.left + graphW}
                  y2={getYTemp(t)}
                  stroke="#27272a"
                  strokeDasharray="4 4"
                />
                <text x={padding.left - 8} y={getYTemp(t) + 4} fill="#71717a" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {t}°C
                </text>
              </g>
            ))}

            {/* Threshold Max Line */}
            <line
              x1={padding.left}
              y1={getYTemp(tempMax)}
              x2={padding.left + graphW}
              y2={getYTemp(tempMax)}
              stroke="#f59e0b"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
            <text x={padding.left + graphW - 5} y={getYTemp(tempMax) - 5} fill="#f59e0b" fontSize="9" textAnchor="end" fontFamily="monospace">
              Máx ({tempMax}°C)
            </text>

            {/* Threshold Min Line */}
            <line
              x1={padding.left}
              y1={getYTemp(tempMin)}
              x2={padding.left + graphW}
              y2={getYTemp(tempMin)}
              stroke="#06b6d4"
              strokeWidth="1.5"
              strokeDasharray="5 3"
            />
            <text x={padding.left + graphW - 5} y={getYTemp(tempMin) + 12} fill="#06b6d4" fontSize="9" textAnchor="end" fontFamily="monospace">
              Mín ({tempMin}°C)
            </text>

            {/* Area & Line */}
            <path d={tempAreaPath} fill="url(#tempGradient)" />
            <path d={tempPath} fill="none" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />

            {/* Latest Marker */}
            {data.length > 0 && (
              <g>
                <circle
                  cx={getX(data.length - 1)}
                  cy={getYTemp(data[data.length - 1].temp)}
                  r="5"
                  fill="#f43f5e"
                  stroke="#ffffff"
                  strokeWidth="2"
                />
              </g>
            )}

            {/* Time labels */}
            <text x={padding.left} y={svgHeight - 8} fill="#71717a" fontSize="9" fontFamily="monospace">
              {data[0]?.time}
            </text>
            <text x={padding.left + graphW} y={svgHeight - 8} fill="#71717a" fontSize="9" textAnchor="end" fontFamily="monospace">
              {data[data.length - 1]?.time}
            </text>
          </svg>
        </div>
      </div>

      {/* 2. Gráfico de Umidade e Luz */}
      <div className="glass-panel rounded-2xl p-5 border border-rose-900/30">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400" />
            <h4 className="font-bold text-white text-sm">UMIDADE RELATIVA & LUMINOSIDADE</h4>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-2.5 h-0.5 bg-cyan-400 inline-block" /> Umid (%)
            </span>
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-2.5 h-0.5 bg-amber-400 border-b border-dashed inline-block" /> Luz (%)
            </span>
          </div>
        </div>
        <p className="text-xs text-zinc-400 mb-4">
          Proteção de rolhas (60-75%) e bloqueio de luz nociva (&lt; 30%).
        </p>

        {/* SVG Chart */}
        <div className="w-full overflow-hidden">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="humGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid Lines */}
            {[25, 50, 75, 100].map(pct => (
              <g key={pct}>
                <line
                  x1={padding.left}
                  y1={getYPct(pct)}
                  x2={padding.left + graphW}
                  y2={getYPct(pct)}
                  stroke="#27272a"
                  strokeDasharray="4 4"
                />
                <text x={padding.left - 8} y={getYPct(pct) + 4} fill="#71717a" fontSize="10" textAnchor="end" fontFamily="monospace">
                  {pct}%
                </text>
              </g>
            ))}

            {/* Humidity Threshold Max */}
            <line
              x1={padding.left}
              y1={getYPct(humMax)}
              x2={padding.left + graphW}
              y2={getYPct(humMax)}
              stroke="#06b6d4"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            {/* Luminosity Threshold Max */}
            <line
              x1={padding.left}
              y1={getYPct(lumMax)}
              x2={padding.left + graphW}
              y2={getYPct(lumMax)}
              stroke="#fbbf24"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />

            {/* Humidity Line */}
            <path d={humPath} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" />

            {/* Luminosity Line */}
            <path d={lumPath} fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="6 3" strokeLinecap="round" />

            {/* Latest Markers */}
            {data.length > 0 && (
              <g>
                <circle
                  cx={getX(data.length - 1)}
                  cy={getYPct(data[data.length - 1].hum)}
                  r="4.5"
                  fill="#06b6d4"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
                <circle
                  cx={getX(data.length - 1)}
                  cy={getYPct(data[data.length - 1].lum)}
                  r="4"
                  fill="#fbbf24"
                  stroke="#ffffff"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Time labels */}
            <text x={padding.left} y={svgHeight - 8} fill="#71717a" fontSize="9" fontFamily="monospace">
              {data[0]?.time}
            </text>
            <text x={padding.left + graphW} y={svgHeight - 8} fill="#71717a" fontSize="9" textAnchor="end" fontFamily="monospace">
              {data[data.length - 1]?.time}
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
};

