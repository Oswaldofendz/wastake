import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  'ADX / DMI (14)': {
    fullName: 'Average Directional Index / Directional Movement Index',
    description: 'El ADX estima la fuerza de una tendencia; +DI y −DI muestran qué dirección domina. ADX por sí solo no indica si el precio subirá o bajará.',
    levels: [
      { color: 'text-slate-400', label: 'ADX < 20', desc: 'Tendencia débil o mercado lateral; la dirección del DMI puede ser poco fiable.' },
      { color: 'text-amber-400', label: 'ADX 20–25', desc: 'La tendencia puede estar desarrollándose; conviene buscar confirmación.' },
      { color: 'text-green-400', label: 'ADX ≥ 25', desc: 'Tendencia más marcada. +DI frente a −DI aporta el sentido, no una predicción.' },
    ],
    tip: 'Método de J. Welles Wilder. Los umbrales son reglas orientativas y pueden variar según activo y marco temporal.',
  },
  'Volumen / media 20': {
    fullName: 'Volumen relativo',
    description: 'Compara el volumen de la última vela con su media de 20 velas. Ayuda a contextualizar el movimiento, pero no aporta dirección por sí solo.',
    levels: [
      { color: 'text-green-400', label: 'Por encima de la media', desc: 'Participación relativa elevada en la última vela.' },
      { color: 'text-slate-400', label: 'Cerca de la media', desc: 'Volumen parecido al promedio reciente.' },
      { color: 'text-amber-400', label: 'Por debajo de la media', desc: 'Menor participación relativa en la última vela.' },
    ],
    tip: 'El volumen depende de la calidad de la fuente y de la sesión. No se incorpora al índice direccional para evitar tratarlo como señal de compra o venta.',
  },
};

// ── Data fetching hook ────────────────────────────────────────

function useAnalysis(asset, days = 90) {
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
  }, [asset?.id, days]);

  return { data, loading, error };
}

// ── Helpers ───────────────────────────────────────────────────

const SIGNAL_STYLES = {
  buy:     'bg-green-900/60 text-green-300 border border-green-700/50',
  sell:    'bg-red-900/60   text-red-300   border border-red-700/50',
  neutral: 'bg-slate-700/60 text-slate-400 border border-slate-600/50',
};
const VOLATILITY_LABELS = { high: 'Alta', medium: 'Moderada', low: 'Baja' };

function fmtValue(v) {
  if (v == null) return '—';
  return typeof v === 'number' ? v.toFixed(2) : v;
}

// ── Fear & Greed inline ───────────────────────────────────────
function FearGreedInline() {
  const [value, setValue] = useState(null);
  useEffect(() => {
    import('../services/api.js').then(({ fetchFearGreed }) => {
      fetchFearGreed()
        .then(res => {
          const v = parseInt(res?.current?.value ?? res?.data?.[0]?.value ?? 0);
          if (!isNaN(v)) setValue(v);
        })
        .catch(() => {});
    });
  }, []);
  if (value === null) return <div className="h-16 flex items-center text-xs text-slate-500">Cargando...</div>;
  const colors =
    value <= 25 ? { text: 'text-red-400',    label: 'Miedo Extremo'   } :
    value <= 45 ? { text: 'text-orange-400', label: 'Miedo'           } :
    value <= 55 ? { text: 'text-yellow-400', label: 'Neutral'         } :
    value <= 75 ? { text: 'text-lime-400',   label: 'Codicia'         } :
                  { text: 'text-green-400',  label: 'Codicia Extrema' };
  return (
    <div className="flex flex-col items-center gap-1">
      <p className={`text-4xl font-bold font-mono leading-none ${colors.text}`}>{value}</p>
      <p className={`text-xs font-semibold ${colors.text}`}>{colors.label}</p>
    </div>
  );
}

// ── Gauge SVG (arc) ───────────────────────────────────────────
function ScoreGauge({ score, bias, t }) {
  const pct = Math.max(0, Math.min(100, score * 10));
  return (
    <div className="w-full">
      <div className="flex items-end justify-between gap-3">
        <p className="text-4xl font-bold font-mono leading-none text-white" aria-label={`${t('technical_score_title')}: ${score} ${t('technical_score_out_of_10')}`}>
          {Number(score).toFixed(1)}<span className="text-lg text-slate-500"> / 10</span>
        </p>
        <p className={`text-sm font-semibold ${bias === 'bullish' ? 'text-green-400' : bias === 'bearish' ? 'text-red-400' : 'text-amber-300'}`}>
          {t(`technical_score_${bias}`)}
        </p>
      </div>
      <div className="relative mt-4 h-3 rounded-full bg-gradient-to-r from-red-600 via-amber-400 to-green-500" role="img" aria-label={`${t('technical_score_scale')}: ${score} / 10`}>
        <span className="absolute -top-1.5 h-6 w-1 rounded-full border border-white bg-slate-950 shadow" style={{ left: `calc(${pct}% - 2px)` }} />
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>0 · {t('technical_score_negative')}</span>
        <span>5 · {t('technical_score_middle')}</span>
        <span>10 · {t('technical_score_positive')}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{t('technical_score_explainer')}</p>
    </div>
  );
}

function ComponentScore({ name, item, t }) {
  const score = item?.score ?? null;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score * 10));
  const barColor = score == null ? 'bg-slate-600' : score <= 4 ? 'bg-red-500' : score >= 6 ? 'bg-green-500' : 'bg-amber-400';
  return (
    <div className="rounded-lg border border-slate-700/40 bg-slate-950/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-300">{t(`technical_component_${name}`)}</span>
        <span className="text-xs font-mono text-white">{score == null ? '—' : `${score.toFixed(1)} / 10`}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-700">
        {score != null && <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">
        {item ? `${t('technical_component_weight')}: ${item.weight}%` : t('technical_component_unavailable')}
      </p>
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
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className="w-full grid grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto_auto] sm:grid-cols-[7rem_minmax(5rem,auto)_auto_minmax(0,1fr)_1rem] items-center gap-2 sm:gap-3 py-2.5 px-2 rounded-lg border-b border-slate-700/30 last:border-0 hover:bg-slate-700/30 transition-colors group text-left"
    >
      <span className="min-w-0 text-xs font-medium text-slate-300 group-hover:text-white transition-colors">
        {name}
      </span>
      <span className="min-w-0 break-words text-[11px] sm:text-xs font-mono text-white">{value}</span>
      <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${SIGNAL_STYLES[signal] ?? SIGNAL_STYLES.neutral}`}>
        {signal === 'neutral' ? t('technical_context') : signal === 'buy' ? t('technical_score_positive') : signal === 'sell' ? t('technical_score_negative') : signal}
      </span>
      <span className="text-xs text-slate-500 truncate hidden sm:block">{label}</span>
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

export function AnalysisPanel({ asset, days = 90 }) {
  const { t } = useTranslation();
  const { data, loading, error } = useAnalysis(asset, days);
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

  const volumeRatio = indicators.volume?.ratio;
  const volumeSignal = 'neutral';
  const rows = [
    {
      name:   'RSI (14)',
      value:  fmtValue(indicators.rsi.current),
      signal: 'neutral',
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
      signal: 'neutral',
      label:  signals.bb.label,
    },
    {
      name: 'ADX / DMI (14)',
      value: indicators.adx?.current
        ? `${fmtValue(indicators.adx.current.adx)} · +DI ${fmtValue(indicators.adx.current.pdi)} / −DI ${fmtValue(indicators.adx.current.mdi)}`
        : '—',
      signal: signals.adx?.signal ?? 'neutral',
      label: signals.adx?.label ?? 'ADX no disponible',
    },
    {
      name: 'Volumen / media 20',
      value: volumeRatio == null ? '—' : `${volumeRatio.toFixed(2)}×`,
      signal: volumeSignal,
      label: volumeRatio == null ? 'Volumen no disponible' : `Última vela: ${fmtValue(indicators.volume?.current)} · media: ${fmtValue(indicators.volume?.average)}`,
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
            {t('technical_analysis_title')}
          </h3>
          <span className="text-xs text-slate-500">
            {meta.candleCount} velas · {asset.name}
          </span>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4 items-stretch">

            {/* Card 1: Fear & Greed */}
            <div className="flex flex-col items-center justify-center bg-slate-900/60 border border-slate-700/40 rounded-xl px-3 py-4 gap-2">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Fear & Greed</p>
              {asset?.type === 'crypto' && <FearGreedInline />}
              {asset?.type !== 'crypto' && (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-slate-500 text-center">Sentimiento</p>
                  <p className="text-xs text-slate-400 text-center">Ver sección Panorama</p>
                </div>
              )}
            </div>

            {/* Composite technical score and its directional scale */}
            <div className="bg-slate-900/60 border border-slate-700/40 rounded-xl px-4 py-4">
              <p className="text-xs text-slate-400 uppercase tracking-wider mb-3 font-semibold">{t('technical_score_title')}</p>
              <ScoreGauge score={summary?.score10 ?? 5} bias={summary?.bias ?? 'mixed'} t={t} />
            </div>

          </div>

          <section className="mb-4 rounded-xl border border-slate-700/40 bg-slate-900/30 p-3" aria-labelledby="technical-components-title">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h4 id="technical-components-title" className="text-xs font-semibold uppercase tracking-wider text-slate-300">{t('technical_weighted_components')}</h4>
              <span className="text-[11px] text-slate-500">{t('technical_score_coverage')}: {summary?.coverage ?? 0}%</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">
              {['trend', 'momentum', 'structure', 'participation'].map(name => (
                <ComponentScore key={name} name={name} item={summary?.components?.[name]} t={t} />
              ))}
            </div>
          </section>

          <details className="mb-3 rounded-lg border border-slate-700/50 bg-slate-900/40 px-3 py-2 text-xs text-slate-400">
            <summary className="cursor-pointer font-medium text-slate-300">{t('technical_signal_method')}</summary>
            <p className="mt-2 leading-5">{t('technical_signal_method_details')}</p>
            <p className="mt-2 leading-5">{t('technical_score_context_indicators')}</p>
          </details>

          {/* Indicators list below */}
          <p className="text-xs text-slate-500 mb-2 px-2">{t('technical_indicators_guide')}</p>
          {rows.map(row => (
            <IndicatorRow key={row.name} {...row} onClick={() => openInfo(row.name)} />
          ))}
          <IndicatorRow
            name="ATR (14)"
            value={fmtValue(indicators.atr.current)}
            signal="neutral"
            label={`${VOLATILITY_LABELS[volatility.volatility] ?? '—'} · ${volatility.label}`}
            onClick={() => openInfo('ATR (14)')}
          />
        </div>
      </div>

      {/* Info modal */}
      {activeInfo && (
        <InfoModal info={activeInfo} onClose={() => setActiveInfo(null)} />
      )}
    </>
  );
}
