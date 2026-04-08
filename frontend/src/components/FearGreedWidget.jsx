import { useState, useEffect } from 'react';
import { fetchFearGreed } from '../services/api.js';

function valueToStyle(v) {
  if (v <= 25) return { bg: 'bg-red-900/40 border-red-700/40',     text: 'text-red-400',    label: 'Miedo Extremo'   };
  if (v <= 45) return { bg: 'bg-orange-900/40 border-orange-700/40', text: 'text-orange-400', label: 'Miedo'           };
  if (v <= 55) return { bg: 'bg-yellow-900/40 border-yellow-700/40', text: 'text-yellow-400', label: 'Neutral'         };
  if (v <= 75) return { bg: 'bg-lime-900/40 border-lime-700/40',     text: 'text-lime-400',   label: 'Codicia'         };
  return              { bg: 'bg-green-900/40 border-green-700/40',   text: 'text-green-400',  label: 'Codicia Extrema' };
}

export function FearGreedWidget() {
  const [value, setValue] = useState(null);

  useEffect(() => {
    fetchFearGreed()
      .then(res => {
        const v = parseInt(res?.current?.value ?? res?.data?.[0]?.value ?? 0);
        if (!isNaN(v)) setValue(v);
      })
      .catch(() => {});
  }, []);

  if (value === null) return null;

  const { bg, text, label } = valueToStyle(value);
  // Simple arc: 0-100 mapped to 0-180 degrees
  const R = 28, cx = 40, cy = 36;
  const angle = (value / 100) * 180;
  function pt(deg) {
    const rad = ((deg - 180) * Math.PI) / 180;
    return { x: cx + R * Math.cos(rad), y: cy + R * Math.sin(rad) };
  }
  const start = pt(0), end = pt(angle);
  const largeArc = angle > 90 ? 1 : 0;

  return (
    <div className={`mt-3 rounded-xl border px-4 py-3 flex items-center gap-4 ${bg}`}>
      {/* Mini arc gauge */}
      <svg viewBox="0 0 80 42" className="w-16 h-10 flex-shrink-0">
        <path
          d={`M ${pt(0).x} ${pt(0).y} A ${R} ${R} 0 1 1 ${pt(180).x} ${pt(180).y}`}
          fill="none" stroke="#334155" strokeWidth="5" strokeLinecap="round"
        />
        {angle > 2 && (
          <path
            d={`M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`}
            fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round"
            className={text}
          />
        )}
      </svg>

      {/* Number */}
      <p className={`text-4xl font-bold font-mono leading-none flex-shrink-0 ${text}`}>{value}</p>

      {/* Label */}
      <div>
        <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Fear &amp; Greed</p>
        <p className={`text-base font-bold ${text}`}>{label}</p>
      </div>
    </div>
  );
}
