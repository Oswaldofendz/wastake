import { useState, useEffect, useRef } from 'react';
import { fetchAnalysis } from '../services/api.js';
import { getAnalysisType } from '../data/assetCatalog.js';
import { FearGreedWidget } from './FearGreedWidget.jsx';

// ── Indicator education content ───────────────────────────────
const INDICATOR_INFO = {
  'RSI (14)': {
    fullName: 'Relative Strength Index',
    description:
      'Oscilador de momentum que mide la velocidad y magnitud de los movimientos de precio en una escala de 0 a 100.',
    levels: [
      { color: 'text-red-400',   label: '> 70 — Sobrecomprado', desc: 'Posible corrección o agotamiento del impulso alcista.' },
      { color: 'text-slate-400', label: '30–70 — Zona neutral',  desc: 'El activo se mueve sin señal clara de extremo.' },
      { color: 'text-green-400', label: '< 30 — Sobrevendido',   desc: 'Posible rebote o agotamiento del impulso bajista.' },
    ],
    tip: 'Creado por J. Welles Wilder (1978). Funciona mejor en mercados laterales. En tendencias fuertes puede mantenerse sobrecomprado/vendido mucho tiempo.',
  },
  'MACD (12/26/9)': {
    fullName: 'Moving Average Convergence Divergence',
    description:
      'Indicador de tendencia y momentum que calcula la diferencia entre la EMA de 12 y 26 períodos, con una línea de señal de 9 períodos.',
    levels: [
      { color: 'text-green-400', label: 'Histograma > 0',         desc: 'El MACD está por encima de su señal: momentum alcista.' },
      { color: 'text-red-400',   label: 'Histograma < 0',         desc: 'El MACD está por debajo de su señal: momentum bajista.' },
      { color: 'text-amber-400', label: 'Cruce de líneas',        desc: 'Golden cross (alcista) o Death cross (bajista): señales de cambio de tendencia.' },
    ],
    tip: 'El valor mostrado es el histograma (MACD − señal). Divergencias entre precio y MACD pueden anticipar reversiones importantes.',
  },
  'EMA 20 / 50': {
    fullName: 'Exponential Moving Average',
    description:
      'Media móvil que pondera más los precios recientes. Se usan dos períodos (20 y 50) para detectar cruces de tendencia.',
    levels: [
      { color: 'text-green-400', label: 'EMA20 > EMA50 (Golden Cross)', desc: 'Tendencia alcista confirmada. Los precios recientes superan la media de largo plazo.' },
      { color: 'text-red-400',   label: 'EMA20 < EMA50 (Death Cross)',  desc: 'Tendencia bajista confirmada. Los precios recientes caen bajo la media de largo plazo.' },
    ],
    tip: 'La EMA reacciona más rápido que la SMA (Simple Moving Average). Los cruces son más fiables en marcos temporales altos (D, W).',
  },
  'Bollinger (20)': {
    fullName: 'Bandas de Bollinger',
    description:
      'Canal de volatilidad formado por una SMA-20 como banda central, más y menos 2 desviaciones estándar. Las bandas se expanden en alta volatilidad y se contraen en baja.',
    levels: [
      { color: 'text-red-400',   label: 'Precio en banda superior', desc: 'Activo sobrecomprado en términos estadísticos (95% del tiempo el precio está dentro de las bandas).' },
      { color: 'text-green-400', label: 'Precio en banda inferior', desc: 'Activo sobrevendido. Posible rebote hacia la banda media.' },
      { color: 'text-amber-400', label: 'Squeeze (bandas estrechas)', desc: 'Baja volatilidad. Suele anteceder a un movimiento fuerte (breakout).' },
    ],
    tip: 'Desarrolladas por John Bollinger (1980s). No indican dirección del breakout, solo que un movimiento es probable.',
  },
  'ATR (14)': {
    fullName: 'Average True Range',
    description:
      'Mide la volatilidad promedio de las últimas 14 velas calculando el rango verdadero (máximo − mínimo, ajustado por gaps).',
    levels: [
      { color: 'text-red-400',   label: 'ATR alto (> 5% del precio)', desc: 'Alta volatilidad. Mayor riesgo y mayores oportunidades de ganancia. Stops más amplios.' },
      { color: 'text-amber-400', label: 'ATR medio (2–5%)',           desc: 'Volatilidad moderada. Condiciones normales de mercado.' },
      { color: 'text-green-400', label: 'ATR bajo (< 2%)',            desc: 'Baja volatilidad. Mercado tranquilo. Posible acumulación antes de movimiento.' },
    ],
    tip: 'ATR no indica dirección, solo magnitud. Muy útil para dimensionar posiciones y colocar stop-loss adaptativos.',
  },
};

// ── Data fetching hook ────────────────────────────────────────

function useAnalysis(asset) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!asset) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setData(null);
      setError(null);
      try {
        const type   = getAnalysisType(asset);
        const days   = 365;
        const result = await fetchAnalysis(asset.id, type, days);
        if (!cancelled) setData(result.analysis);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [asset?.id]);

  return { data, loading, error };
}

// ── Helpers ───────────────────────────────────────────────────

const SIGNAL_STYLES = {
  buy:     'bg-green-900/60 text-green-300 border border-green-700/50',
  sell:    'bg-red-900/60   text-red-300   border border-red-700/50',
  neutral: 'bg-slate-700/60 text-slate-400 border border-slate-600/50',
};
const SIGNAL_LABELS = { buy: 'COMPRA', sell: 'VENTA', neutral: 'NEUTRAL' };

const VOLATILITY_STYLES = {
  high:    'text-red-400',
  medium:  'text-amber-400',
  low:     'text-green-400',
  unknown: 'text-slate-500',
};
const VOLATILITY_LABELS = { high: 'Alta', medium: 'Moderada', low: 'Baja' };

function fmtValue(v) {
  if (v == null) return '—';
  return typeof v === 'number' ? v.toFixed(2) : v;
}

function scoreColor(score) {
  if (score > 25)  return { text: 'text-green-400', ring: 'stroke-green-500' };
  if (score < -25) return { text: 'text-red-400',   ring: 'stroke-red-500'   };
  return            { text: 'text-amber-400',        ring: 'stroke-amber-500' };
}

function scoreToSignal(score) {
  if (score > 25)  return 'buy';
  if (score < -25) return 'sell';
  return 'hold';
}

// ── Traffic light ─────────────────────────────────────────────
const TRAFFIC = {
  buy:  { label: 'COMPRAR',  textColor: 'text-green-400', glow: 'rgba(34,197,94,0.7)',   red: false, amber: false, green: true  },
  hold: { label: 'MANTENER', textColor: 'text-amber-400', glow: 'rgba(251,191,36,0.7)',  red: false, amber: true,  green: false },
  sell: { label: 'VENDER',   textColor: 'text-red-400',   glow: 'rgba(239,68,68,0.7)',   red: true,  amber: false, green: false },
};

function TrafficLight({ signal }) {
  const cfg = TRAFFIC[signal] ?? TRAFFIC.hold;
  const dot = (active, activeClass, darkClass, glowColor) => (
    <div
      className={`w-10 h-10 rounded-full border-2 transition-all duration-500 ${active ? activeClass : darkClass}`}
      style={active ? { boxShadow: `0 0 16px 4px ${glowColor}` } : {}}
    />
  );
  return (
    <div className="flex flex-col items-center gap-2 mb-4">
      <div className="flex flex-col gap-2 p-4 bg-slate-900 rounded-2xl border border-slate-700/50">
        {dot(cfg.red,   'bg-red-500 border-red-400',     'bg-red-950/40 border-red-900/20',     cfg.glow)}
        {dot(cfg.amber, 'bg-amber-400 border-amber-300', 'bg-amber-950/30 border-amber-900/10', cfg.glow)}
        {dot(cfg.green, 'bg-green-500 border-green-400', 'bg-green-950/30 border-green-900/10', cfg.glow)}
      </div>
      <p className={`text-3xl font-extrabold tracking-tight leading-none ${cfg.textColor}`}>
        {cfg.label}
      </p>
    </div>
  );
}

// ── Mini traffic light (inline, small) ───────────────────────
function MiniTrafficLight({ signal }) {
  const cfg = TRAFFIC[signal] ?? TRAFFIC.hold;
  const dot = (active, activeClass, darkClass, glowColor) => (
    <div
      className={`w-4 h-4 rounded-full border transition-all duration-500 ${active ? activeClass : darkClass}`}
      style={active ? { boxShadow: `0 0 8px 2px ${glowColor}` } : {}}
    />
  );
  return (
    <div className="flex flex-col gap-1.5 p-2 bg-slate-900 rounded-xl border border-slate-700/50">
      {dot(cfg.red,   'bg-red-500 border-red-400',     'bg-red-950/40 border-red-900/20',     cfg.glow)}
      {dot(cfg.amber, 'bg-amber-400 border-amber-300', 'bg-amber-950/30 border-amber-900/10', cfg.glow)}
      {dot(cfg.green, 'bg-green-500 border-green-400', 'bg-green-950/30 border-green-900/10', cfg.glow)}
    </div>
  );
}

// ── Gauge SVG (arc) ───────────────────────────────────────────
// score: -100 → +100, displayed as arc 0–180°
function Gauge({ score }) {
  // Map score (-100..+100) to angle (0..180)
  const angle = ((score + 100) / 200) * 180;
  // Arc path on a 100×60 viewBox, center at 50,60, radius 44
  const R = 44;
  const cx = 50; const cy = 60;

  function polarToXY(angleDeg) {
    const rad = ((angleDeg - 180) * Math.PI) / 180;
    return {
      x: cx + R * Math.cos(rad),
      y: cy + R * Math.sin(rad),
    };
  }

  const start = polarToXY(0);
  const end   = polarToXY(angle);
  const largeArc = angle > 90 ? 1 : 0;

  const colors = scoreColor(score);
  const overallLabel =
    score > 25  ? 'Compra' :
    score < -25 ? 'Venta'  : 'Neutral';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 65" className="w-32 h-20 overflow-visible">
        {/* Track arc */}
        <path
          d={`M ${polarToXY(0).x} ${polarToXY(0).y} A ${R} ${R} 0 1 1 ${polarToXY(180).x} ${polarToXY(180).y}`}
          fill="none"
          stroke="#334155"
          strokeWidth="7"
          strokeLinecap="round"
        />
        {/* Value arc */}
        {angle > 2 && (
          <path
            d={`M ${start.x} ${start.y} A ${R} ${R} 0 ${largeArc} 1 ${end.x} ${end.y}`}
            fill="none"
            className={colors.ring}
            strokeWidth="7"
            strokeLinecap="round"
          />
        )}
        {/* Zone labels */}
        <text x="7"  y="62" className="fill-red-500"   style={{ fontSize: 7, fontFamily: 'monospace' }}>VENTA</text>
        <text x="72" y="62" className="fill-green-500" style={{ fontSize: 7, fontFamily: 'monospace' }}>COMPRA</text>
      </svg>

      {/* Score number */}
      <p className={`text-4xl font-bold font-mono leading-none -mt-2 ${colors.text}`}>
        {score > 0 ? '+' : ''}{score}
      </p>
      <p className={`text-xs font-semibold mt-1.5 ${colors.text}`}>{overallLabel}</p>

      {/* Buy/Neutral/Sell counts */}
    </div>
  );
}

// ── Indicator info modal ──────────────────────────────────────

function InfoModal({ info, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (overlayRef.current === e.target) onClose();
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-slate-700">
          <div>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{info.fullName}</p>
            <h3 className="text-white font-semibold text-base mt-0.5">{info.shortName}</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-700 flex-shrink-0 ml-3"
          >
            <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Description */}
          <p className="text-sm text-slate-300 leading-relaxed">{info.description}</p>

          {/* Levels */}
          <div className="space-y-2">
            {info.levels.map((lvl, i) => (
              <div key={i} className="bg-slate-900/60 rounded-lg p-2.5">
                <p className={`text-xs font-semibold ${lvl.color} mb-0.5`}>{lvl.label}</p>
                <p className="text-xs text-slate-400">{lvl.desc}</p>
              </div>
            ))}
          </div>

          {/* Tip */}
          <div className="flex gap-2.5 bg-brand-900/30 border border-brand-700/30 rounded-lg px-3 py-2.5">
            <svg viewBox="0 0 20 20" className="w-4 h-4 fill-brand-400 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-slate-400 leading-relaxed">{info.tip}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Indicator row ─────────────────────────────────────────────

function IndicatorRow({ name, value, signal, label, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 py-2.5 px-2 rounded-lg border-b border-slate-700/30 last:border-0 hover:bg-slate-700/30 transition-colors group text-left"
    >
      <span className="w-28 text-xs font-medium text-slate-300 flex-shrink-0 group-hover:text-white transition-colors">
        {name}
      </span>
      <span className="w-20 text-xs font-mono text-white flex-shrink-0">{value}</span>
      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${SIGNAL_STYLES[signal] ?? SIGNAL_STYLES.neutral}`}>
        {SIGNAL_LABELS[signal] ?? signal}
      </span>
      <span className="text-xs text-slate-500 truncate hidden sm:block flex-1">{label}</span>
      {/* Info icon */}
      <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-slate-600 group-hover:fill-brand-400 flex-shrink-0 transition-colors ml-auto">
        <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
      </svg>
    </button>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2 p-4">
      <div className="h-3 bg-slate-700 rounded w-1/3" />
      <div className="h-20 bg-slate-700/60 rounded-xl mt-3" />
      <div className="space-y-2 mt-4">
        {[...Array(4)].map((_, i) => <div key={i} className="h-8 bg-slate-700/40 rounded" />)}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────

export function AnalysisPanel({ asset }) {
  const { data, loading, error } = useAnalysis(asset);
  const [activeInfo, setActiveInfo]   = useState(null); // { shortName, ...INDICATOR_INFO }

  if (loading) return (
    <div className="mt-3 bg-slate-800/50 border border-slate-700/30 rounded-xl overflow-hidden">
      <Skeleton />
    </div>
  );

  if (error) return (
    <div className="mt-3 bg-slate-800/50 border border-slate-700/30 rounded-xl p-4 space-y-1">
      <p className="text-xs text-red-400 text-center">No se pudo cargar el análisis técnico.</p>
      <p className="text-xs text-slate-400 text-center">Cambia a un timeframe mayor para ver el análisis.</p>
    </div>
  );

  if (!data) return null;

  const { indicators, signals, volatility, summary, meta } = data;

  const rows = [
    {
      name:   'RSI (14)',
      value:  fmtValue(indicators.rsi.current),
      signal: signals.rsi.signal,
      label:  signals.rsi.label,
    },
    {
      name:   'MACD (12/26/9)',
      value:  indicators.macd.current ? fmtValue(indicators.macd.current.histogram) : '—',
      signal: signals.macd.signal,
      label:  signals.macd.label,
    },
    {
      name:   'EMA 20 / 50',
      value:  indicators.ema20.current != null
        ? `${fmtValue(indicators.ema20.current)} / ${fmtValue(indicators.ema50.current)}`
        : '—',
      signal: signals.ema.signal,
      label:  signals.ema.label,
    },
    {
      name:   'Bollinger (20)',
      value:  indicators.bollingerBands.current
        ? fmtValue(indicators.bollingerBands.current.middle)
        : '—',
      signal: signals.bb.signal,
      label:  signals.bb.label,
    },
  ];

  function openInfo(shortName) {
    const info = INDICATOR_INFO[shortName];
    if (info) setActiveInfo({ shortName, ...info });
  }

  return (
    <>
      <div className="mt-3 bg-slate-800/50 border border-slate-700/30 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-700/40">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Análisis Técnico
          </h3>
          <span className="text-xs text-slate-500">
            {meta.candleCount} velas · {asset.name}
          </span>
        </div>

        <div className="p-4">
          <div className="flex flex-col lg:flex-row items-center justify-center gap-6 mb-4">

            {/* Fear & Greed */}
            <FearGreedWidget />

            {/* Traffic light + signal */}
            <div className="flex flex-col items-center gap-2">
              <TrafficLight signal={scoreToSignal(summary?.score ?? 0)} />
              <p className={`text-2xl font-extrabold tracking-tight ${TRAFFIC[scoreToSignal(summary?.score ?? 0)]?.textColor}`}>
                {TRAFFIC[scoreToSignal(summary?.score ?? 0)]?.label}
              </p>
            </div>

            {/* Confluence gauge + mini traffic light */}
            <div className="flex flex-col items-center bg-slate-900/60 border border-slate-700/40 rounded-xl px-5 py-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 font-semibold">Confluencia</p>
              <div className="flex items-center gap-4">
                <Gauge score={summary?.score ?? 0} />
                <MiniTrafficLight signal={scoreToSignal(summary?.score ?? 0)} />
              </div>
              <div className="flex gap-2 mt-4">
                <span className="flex items-center gap-1 text-xs bg-green-900/40 text-green-400 border border-green-700/40 rounded-full px-2.5 py-0.5 font-semibold">
                  {summary.counts.buy ?? 0}
                  <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-current"><path d="M5 2 L8 7 L2 7 Z"/></svg>
                </span>
                <span className="flex items-center gap-1 text-xs bg-slate-700/40 text-slate-400 border border-slate-600/40 rounded-full px-2.5 py-0.5 font-semibold">
                  {summary.counts.neutral ?? 0} —
                </span>
                <span className="flex items-center gap-1 text-xs bg-red-900/40 text-red-400 border border-red-700/40 rounded-full px-2.5 py-0.5 font-semibold">
                  {summary.counts.sell ?? 0}
                  <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-current"><path d="M5 8 L8 3 L2 3 Z"/></svg>
                </span>
              </div>
            </div>

          </div>

          {/* Indicators list below */}
          <p className="text-xs text-slate-500 mb-2 px-2">Haz clic en un indicador para ver su explicación</p>
          {rows.map(row => (
            <IndicatorRow key={row.name} {...row} onClick={() => openInfo(row.name)} />
          ))}
          <button
            onClick={() => openInfo('ATR (14)')}
            className="w-full flex items-center gap-3 pt-2.5 px-2 rounded-lg hover:bg-slate-700/30 transition-colors group text-left"
          >
            <span className="w-28 text-xs font-medium text-slate-300 flex-shrink-0 group-hover:text-white transition-colors">ATR (14)</span>
            <span className="w-20 text-xs font-mono text-white flex-shrink-0">{fmtValue(indicators.atr.current)}</span>
            <span className={`text-xs font-semibold ${VOLATILITY_STYLES[volatility.volatility]}`}>{VOLATILITY_LABELS[volatility.volatility] ?? '—'}</span>
            <span className="text-xs text-slate-500 truncate hidden sm:block flex-1">{volatility.label}</span>
            <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-slate-600 group-hover:fill-brand-400 flex-shrink-0 ml-auto transition-colors">
              <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* Info modal */}
      {activeInfo && (
        <InfoModal info={activeInfo} onClose={() => setActiveInfo(null)} />
      )}
    </>
  );
}
