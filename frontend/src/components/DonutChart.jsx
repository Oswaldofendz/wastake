// Gráfico de dona SVG — sin dependencias externas

const COLORS = [
  '#6366f1', // indigo
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#f97316', // orange
  '#84cc16', // lime
  '#ec4899', // pink
  '#14b8a6', // teal
];

const R  = 42;  // radio del arco
const CX = 60;
const CY = 60;
const CIRC = 2 * Math.PI * R; // circunferencia

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function buildArc(cx, cy, r, startDeg, endDeg) {
  const start  = polarToCartesian(cx, cy, r, endDeg);
  const end    = polarToCartesian(cx, cy, r, startDeg);
  const large  = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 0 ${end.x} ${end.y}`;
}

export function DonutChart({ positions }) {
  if (!positions || positions.length === 0) return (
    <div className="flex items-center justify-center h-40 text-slate-500 text-xs">
      Sin posiciones
    </div>
  );

  const total = positions.reduce((s, p) => s + (p.currentValue ?? p.costBasis), 0);
  if (total === 0) return null;

  // Calcular porcentajes y ángulos
  let cumDeg = 0;
  const slices = positions.map((p, i) => {
    const value   = p.currentValue ?? p.costBasis;
    const pct     = (value / total) * 100;
    const degrees = (value / total) * 360;
    const start   = cumDeg;
    cumDeg += degrees;
    return { ...p, pct, degrees, start, end: cumDeg, color: COLORS[i % COLORS.length] };
  });

  return (
    <div className="flex items-center gap-6 flex-wrap">
      {/* SVG Donut */}
      <svg viewBox="0 0 120 120" className="w-32 h-32 flex-shrink-0">
        {slices.map((s, i) => {
          // Caso especial: 100% → círculo completo
          if (s.degrees >= 359.9) {
            return (
              <circle
                key={i}
                cx={CX} cy={CY} r={R}
                fill="none"
                stroke={s.color}
                strokeWidth="14"
              />
            );
          }
          return (
            <path
              key={i}
              d={buildArc(CX, CY, R, s.start, s.end)}
              fill="none"
              stroke={s.color}
              strokeWidth="14"
              strokeLinecap="butt"
            />
          );
        })}
        {/* Centro */}
        <circle cx={CX} cy={CY} r="28" fill="#0f172a" />
        <text x={CX} y={CY - 4} textAnchor="middle" className="fill-white text-[9px] font-bold" fontSize="9">Total</text>
        <text x={CX} y={CY + 8} textAnchor="middle" className="fill-slate-400 text-[7px]" fontSize="7">
          {positions.length} activos
        </text>
      </svg>

      {/* Leyenda */}
      <ul className="space-y-1.5 flex-1 min-w-0">
        {slices.map((s, i) => (
          <li key={i} className="flex items-center gap-2 text-xs">
            <span
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-slate-300 truncate flex-1">{s.asset_name}</span>
            <span className="text-slate-400 font-mono flex-shrink-0">{s.pct.toFixed(1)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
