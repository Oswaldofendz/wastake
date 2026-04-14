import { useState, useEffect } from 'react';
import { fetchFearGreed } from '../services/api.js';

const ZONES = [
  { max: 25,  label: 'Miedo Extremo', color: '#ef4444', bg: 'bg-red-900/30',    border: 'border-red-700/40',    text: 'text-red-400'    },
  { max: 45,  label: 'Miedo',         color: '#f97316', bg: 'bg-orange-900/30', border: 'border-orange-700/40', text: 'text-orange-400' },
  { max: 55,  label: 'Neutral',       color: '#eab308', bg: 'bg-yellow-900/30', border: 'border-yellow-700/40', text: 'text-yellow-400' },
  { max: 75,  label: 'Codicia',       color: '#84cc16', bg: 'bg-lime-900/30',   border: 'border-lime-700/40',   text: 'text-lime-400'   },
  { max: 100, label: 'Codicia Extrema', color: '#22c55e', bg: 'bg-green-900/30', border: 'border-green-700/40', text: 'text-green-400' },
];

function getZone(value) {
  return ZONES.find(z => value <= z.max) ?? ZONES[ZONES.length - 1];
}

// SVG arc gauge — semicircle 0°→180°
function ArcGauge({ value }) {
  const zone = getZone(value);
  const R  = 52;
  const cx = 60; const cy = 62;

  function polar(angleDeg) {
    const rad = ((angleDeg - 180) * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  }

  const angle     = (value / 100) * 180;
  const arcEnd    = polar(angle);
  const arcStart  = polar(0);
  const trackEnd  = polar(180);
  const largeArc  = angle > 90 ? 1 : 0;

  // Colored zone segments
  const zoneSegments = [];
  let prev = 0;
  for (const z of ZONES) {
    const startAngle = (prev / 100) * 180;
    const endAngle   = (z.max / 100) * 180;
    const s = polar(startAngle);
    const e = polar(endAngle);
    const large = endAngle - startAngle > 90 ? 1 : 0;
    zoneSegments.push({ s, e, large, color: z.color });
    prev = z.max;
  }

  return (
    <svg viewBox="0 0 120 70" className="w-full max-w-[200px]">
      {/* Zone arcs (track) */}
      {zoneSegments.map((seg, i) => (
        <path
          key={i}
          d={`M ${seg.s.x} ${seg.s.y} A ${R} ${R} 0 ${seg.large} 1 ${seg.e.x} ${seg.e.y}`}
          fill="none"
          stroke={seg.color}
          strokeWidth="10"
          strokeOpacity="0.25"
        />
      ))}

      {/* Value arc */}
      {angle > 1 && (
        <path
          d={`M ${arcStart.x} ${arcStart.y} A ${R} ${R} 0 ${largeArc} 1 ${arcEnd.x} ${arcEnd.y}`}
          fill="none"
          stroke={zone.color}
          strokeWidth="10"
          strokeLinecap="round"
        />
      )}

      {/* Needle */}
      {(() => {
        const needleRad = ((angle - 180) * Math.PI) / 180;
        const nx = cx + (R - 4) * Math.cos(needleRad);
        const ny = cy + (R - 4) * Math.sin(needleRad);
        return (
          <>
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke="white" strokeWidth="2" strokeLinecap="round" />
            <circle cx={cx} cy={cy} r="3" fill="white" />
          </>
        );
      })()}

      {/* Zone labels */}
      <text x="5"   y="68" fill="#ef4444" fontSize="5" fontFamily="monospace">Miedo</text>
      <text x="93"  y="68" fill="#22c55e" fontSize="5" fontFamily="monospace">Codicia</text>
    </svg>
  );
}

function HistoryBar({ history }) {
  if (!history?.length) return null;
  const reversed = [...history].reverse(); // oldest first

  return (
    <div className="flex gap-0.5 items-end h-8 mt-3">
      {reversed.map((entry, i) => {
        const zone = getZone(Number(entry.value));
        const h = Math.max(20, (Number(entry.value) / 100) * 100);
        return (
          <div
            key={i}
            title={`${entry.value} — ${new Date(entry.timestamp * 1000).toLocaleDateString('es-ES', { weekday: 'short' })}`}
            className="flex-1 rounded-t"
            style={{ height: `${h}%`, backgroundColor: zone.color, opacity: 0.7 }}
          />
        );
      })}
    </div>
  );
}

export function FearGreedGauge() {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);

  useEffect(() => {
    fetchFearGreed()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="bg-[#111318]/90 border border-white/[8%] rounded-xl p-4 animate-pulse">
      <div className="h-3 bg-slate-700 rounded w-2/3 mb-4" />
      <div className="h-24 bg-slate-700/50 rounded-lg" />
    </div>
  );

  if (error || !data) return (
    <div className="bg-[#111318]/90 border border-white/[8%] rounded-xl p-4">
      <p className="text-xs text-slate-500 text-center">Fear & Greed no disponible</p>
    </div>
  );

  const current  = data.current;
  const value    = Number(current.value);
  const zone     = getZone(value);
  const history  = data.history?.slice(1, 8); // 7 días anteriores

  return (
    <div className={`bg-slate-800/50 border ${zone.border} rounded-xl p-4`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Fear & Greed</h3>
        <span className="text-xs text-slate-500">Crypto</span>
      </div>

      {/* Gauge */}
      <div className="flex flex-col items-center">
        <ArcGauge value={value} />

        <p className={`text-3xl font-bold font-mono -mt-1 ${zone.text}`}>{value}</p>
        <p className={`text-sm font-semibold mt-1 ${zone.text}`}>{zone.label}</p>
        <p className="text-xs text-slate-500 mt-0.5">
          Actualizado: {new Date(Number(current.timestamp) * 1000).toLocaleDateString('es-ES')}
        </p>
      </div>

      {/* 7-day history bars */}
      {history?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-700/40">
          <p className="text-xs text-slate-500 mb-1.5">Últimos 7 días</p>
          <HistoryBar history={history} />
        </div>
      )}
    </div>
  );
}
