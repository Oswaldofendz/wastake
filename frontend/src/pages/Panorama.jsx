import { useState, useEffect, useCallback } from 'react';
import { fetchAnalysis, fetchFearGreed, fetchNews, fetchOHLCV } from '../services/api.js';
import { ANALYZABLE_CATEGORIES } from '../data/assetCatalog.js';
import { usePrices } from '../hooks/usePrices.js';

// Primer activo del catálogo (Bitcoin)
const DEFAULT_ASSET = ANALYZABLE_CATEGORIES[0].assets[0];

// ─── Score helpers ────────────────────────────────────────────────────────────
// Backend summary.score: -100 to +100 → convert to 0-100
function toPanoramaScore(summary) {
  if (!summary) return 50;
  return Math.max(0, Math.min(100, Math.round((summary.score + 100) / 2)));
}
function scoreToSignal(score) {
  if (score >= 60) return 'buy';
  if (score <= 40) return 'sell';
  return 'hold';
}
const SIGNAL = {
  buy:  { label: 'COMPRAR',  color: 'text-green-400', glowColor: 'rgba(34,197,94,0.55)',  hex: '#22c55e', activeDot: 'bg-green-500 border-green-400',  darkDot: 'bg-green-950/30 border-green-900/10'  },
  hold: { label: 'MANTENER', color: 'text-amber-400', glowColor: 'rgba(251,191,36,0.55)', hex: '#f59e0b', activeDot: 'bg-amber-400 border-amber-300',  darkDot: 'bg-amber-950/30 border-amber-900/10'  },
  sell: { label: 'VENDER',   color: 'text-red-400',   glowColor: 'rgba(239,68,68,0.55)',  hex: '#ef4444', activeDot: 'bg-red-500 border-red-400',    darkDot: 'bg-red-950/40 border-red-900/20'      },
};

// ─── Natural language narrative ───────────────────────────────────────────────
function buildNarrative(analysis) {
  if (!analysis) return null;
  const { signals, indicators, summary } = analysis;
  const parts = [];
  const rsi   = indicators?.rsi?.current;
  const hist  = indicators?.macd?.current?.histogram;
  const e20   = indicators?.ema20?.current;
  const e50   = indicators?.ema50?.current;

  if (rsi != null) {
    if (rsi < 30)      parts.push('el RSI indica activo sobrevendido');
    else if (rsi > 70) parts.push('el RSI indica activo sobrecomprado');
    else               parts.push(`el RSI (${rsi.toFixed(1)}) está en zona neutral`);
  }
  if (hist != null) {
    parts.push(hist > 0 ? 'el MACD muestra momentum alcista' : 'el MACD muestra momentum bajista');
  }
  if (e20 && e50) {
    parts.push(e20 > e50
      ? 'las EMAs confirman tendencia alcista'
      : 'las EMAs muestran tendencia bajista');
  }

  const sig = scoreToSignal(toPanoramaScore(summary));
  const intro = sig === 'buy'  ? 'Los indicadores apuntan a un posible movimiento alcista: '
              : sig === 'sell' ? 'Los indicadores muestran presión bajista: '
              :                  'Los indicadores muestran señales mixtas: ';
  return intro + (parts.join(', ') || 'datos insuficientes') + '.';
}

// ─── Signal history via localStorage ─────────────────────────────────────────
const histKey = id => `wf_panorama_h_${id}`;
function loadHistory(id)  { try { return JSON.parse(localStorage.getItem(histKey(id)) ?? '[]'); } catch { return []; } }
function saveHistory(id, score) {
  const today = new Date().toISOString().slice(0, 10);
  const arr   = loadHistory(id).filter(h => h.date !== today);
  arr.push({ date: today, score });
  const last30 = arr.slice(-30);
  localStorage.setItem(histKey(id), JSON.stringify(last30));
  return last30;
}

// ─── Best day of week from OHLCV ──────────────────────────────────────────────
function computeBestDay(candles) {
  if (!candles || candles.length < 20) return null;
  const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const stats = Array.from({ length: 7 }, () => ({ wins: 0, total: 0 }));
  for (const c of candles) {
    const ts = typeof c.time === 'number' ? c.time * 1000 : new Date(c.time).getTime();
    const d  = new Date(ts).getDay();
    stats[d].total++;
    if (c.close > c.open) stats[d].wins++;
  }
  let best = 1, bestRate = 0;
  for (let i = 0; i < 7; i++) {
    if (stats[i].total >= 5) {
      const r = stats[i].wins / stats[i].total;
      if (r > bestRate) { bestRate = r; best = i; }
    }
  }
  return { day: DAYS[best], rate: Math.round(bestRate * 100) };
}

// ─── Format price ─────────────────────────────────────────────────────────────
function fmtPrice(n) {
  if (n == null) return '—';
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `$${n.toFixed(n < 1 ? 4 : 2)}`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Asset Logo ───────────────────────────────────────────────────────────────
function AssetLogo({ asset, size = 10 }) {
  const cls = `rounded-full flex-shrink-0 object-cover`;
  const dim = `w-${size} h-${size}`;
  if (asset.image) return <img src={asset.image} className={`${dim} ${cls}`} alt={asset.symbol} />;
  const bg = asset.type === 'crypto' ? 'bg-amber-600' : 'bg-blue-600';
  return (
    <div className={`${dim} ${bg} ${cls} flex items-center justify-center text-white font-bold text-sm`}>
      {asset.symbol.slice(0, 2)}
    </div>
  );
}

// ─── Traffic Light ────────────────────────────────────────────────────────────
function TrafficLight({ signal, size = 'lg' }) {
  const big = size === 'lg';
  const dot = big ? 'w-16 h-16 sm:w-20 sm:h-20' : 'w-5 h-5';
  const pad = big ? 'p-5 gap-3' : 'p-2 gap-1.5';
  const cfg = SIGNAL[signal];

  const glowStyle = (active) => active
    ? { boxShadow: `0 0 28px 8px ${cfg.glowColor}` }
    : {};

  return (
    <div className={`flex flex-col items-center ${pad} bg-slate-900 rounded-2xl border border-slate-700/50 flex-shrink-0`}>
      {/* Red = sell */}
      <div
        className={`${dot} rounded-full border-2 transition-all duration-700 ${signal === 'sell' ? `${SIGNAL.sell.activeDot} animate-pulse` : SIGNAL.sell.darkDot}`}
        style={signal === 'sell' ? glowStyle(true) : {}}
      />
      {/* Amber = hold */}
      <div
        className={`${dot} rounded-full border-2 transition-all duration-700 ${signal === 'hold' ? `${SIGNAL.hold.activeDot} animate-pulse` : SIGNAL.hold.darkDot}`}
        style={signal === 'hold' ? glowStyle(true) : {}}
      />
      {/* Green = buy */}
      <div
        className={`${dot} rounded-full border-2 transition-all duration-700 ${signal === 'buy' ? `${SIGNAL.buy.activeDot} animate-pulse` : SIGNAL.buy.darkDot}`}
        style={signal === 'buy' ? glowStyle(true) : {}}
      />
    </div>
  );
}

// ─── Confluence Gauge (semicircle) ────────────────────────────────────────────
function ConfluenceGauge({ score }) {
  const signal = scoreToSignal(score);
  const color  = SIGNAL[signal].hex;
  const r = 68, cx = 100, cy = 92;

  function pt(pct) {
    const rad = Math.PI * (1 - pct);
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }
  const start = pt(0), end = pt(1), curr = pt(score / 100);
  const large = score > 50 ? 1 : 0;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 100" className="w-52">
        {/* Background arc */}
        <path
          d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
          fill="none" stroke="#1e293b" strokeWidth="14" strokeLinecap="round"
        />
        {/* Colored arc */}
        {score > 0 && (
          <path
            d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${curr.x} ${curr.y}`}
            fill="none" stroke={color} strokeWidth="14" strokeLinecap="round"
          />
        )}
        {/* Zone labels */}
        <text x="18"  y="97" fill="#ef4444" fontSize="7" fontWeight="600">VENDER</text>
        <text x="84"  y="24" fill="#64748b" fontSize="7">HOLD</text>
        <text x="157" y="97" fill="#22c55e" fontSize="7" fontWeight="600">COMPRAR</text>
        {/* Score */}
        <text x="100" y="86" textAnchor="middle" fill={color} fontSize="32" fontWeight="800">{score}</text>
        <text x="100" y="98" textAnchor="middle" fill="#475569" fontSize="7">score de confluencia</text>
      </svg>
    </div>
  );
}

// ─── RSI Gauge ────────────────────────────────────────────────────────────────
function RSIGauge({ value }) {
  if (value == null) return <p className="text-xs text-slate-500 py-4 text-center">Sin datos</p>;
  const r = 34, cx = 50, cy = 44;

  function pt(pct) {
    const rad = Math.PI * (1 - pct);
    return { x: cx + r * Math.cos(rad), y: cy - r * Math.sin(rad) };
  }
  const start = pt(0), end = pt(1), curr = pt(value / 100);
  const large = value > 50 ? 1 : 0;
  const color = value < 30 ? '#22c55e' : value > 70 ? '#ef4444' : '#94a3b8';
  const label = value < 30 ? 'Sobrevendido' : value > 70 ? 'Sobrecomprado' : 'Neutral';

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 100 52" className="w-28">
        <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`} fill="none" stroke="#1e293b" strokeWidth="8" strokeLinecap="round" />
        <path d={`M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${curr.x} ${curr.y}`} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round" />
        <text x="50" y="48" textAnchor="middle" fill={color} fontSize="11" fontWeight="700">{value.toFixed(1)}</text>
        <text x="14" y="50" fill="#ef4444" fontSize="6">0</text>
        <text x="82" y="50" fill="#22c55e" fontSize="6">100</text>
      </svg>
      <p className="text-xs mt-0.5 font-medium" style={{ color }}>{label}</p>
    </div>
  );
}

// ─── Bollinger position bar ───────────────────────────────────────────────────
function BollingerBar({ bb, price }) {
  if (!bb || price == null) return <p className="text-xs text-slate-500">Sin datos</p>;
  const { upper, lower } = bb;
  const range = upper - lower;
  const pct   = range > 0 ? Math.max(0, Math.min(1, (price - lower) / range)) : 0.5;
  const color = pct < 0.2 ? '#22c55e' : pct > 0.8 ? '#ef4444' : '#94a3b8';
  const label = pct < 0.2 ? 'Banda inferior — posible rebote'
              : pct > 0.8 ? 'Banda superior — posible resistencia'
              : `Dentro de bandas (${Math.round(pct * 100)}%)`;
  return (
    <div className="w-full">
      <div className="relative h-3 rounded-full overflow-hidden bg-slate-800">
        <div className="absolute inset-0 bg-gradient-to-r from-green-900/50 via-slate-700/20 to-red-900/50" />
        <div className="absolute top-0 bottom-0 w-px bg-slate-500/60" style={{ left: '50%' }} />
        <div
          className="absolute top-0 w-3 h-3 rounded-full border-2 border-white -translate-x-1/2 transition-all duration-700"
          style={{ left: `${pct * 100}%`, background: color }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>Baja</span><span>Media</span><span>Alta</span>
      </div>
      <p className="text-xs mt-1 font-medium" style={{ color }}>{label}</p>
    </div>
  );
}


// ─── Volatility widget ────────────────────────────────────────────────────────
function VolatilityWidget({ atr, currentPrice, expertMode }) {
  if (!atr || !currentPrice) return null;
  const pctDay = (atr / currentPrice) * 100;
  const level  = pctDay > 5 ? 'Alta' : pctDay > 2 ? 'Moderada' : 'Baja';
  const color  = pctDay > 5 ? 'text-red-400' : pctDay > 2 ? 'text-amber-400' : 'text-green-400';
  const bars   = pctDay > 5 ? 3 : pctDay > 2 ? 2 : 1;
  const barColors = { 1: 'bg-green-500', 2: 'bg-amber-400', 3: 'bg-red-500' };

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${color}`}>Volatilidad {level}</p>
        <p className="text-xs text-slate-400 mt-0.5">
          {expertMode
            ? `ATR ${SIGNAL.buy.hex ? '' : ''}${fmtPrice(atr)} · ${pctDay.toFixed(1)}% del precio por día`
            : `El precio puede moverse ±${fmtPrice(atr)} en un día`}
        </p>
      </div>
      <div className="flex items-end gap-0.5">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className={`w-2 rounded-sm transition-all ${i <= bars ? barColors[bars] : 'bg-slate-700'}`}
            style={{ height: `${8 + i * 5}px` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── News sentiment ───────────────────────────────────────────────────────────
function NewsSummary({ news }) {
  if (!Array.isArray(news) || news.length === 0) return null;
  const highs = news.filter(n => n.impact === 'high').length;
  const meds  = news.filter(n => n.impact === 'medium').length;
  const total = news.length;
  const sentiment = highs > total * 0.3 ? 'negativas' : meds > total * 0.4 ? 'mixtas' : 'mayormente neutrales';
  const badgeColor = highs > total * 0.3
    ? 'bg-red-900/40 text-red-400 border-red-700/30'
    : meds > total * 0.4
    ? 'bg-amber-900/40 text-amber-400 border-amber-700/30'
    : 'bg-slate-700/40 text-slate-400 border-slate-600/30';
  const sentColor = highs > total * 0.3 ? 'text-red-400' : meds > total * 0.4 ? 'text-amber-400' : 'text-slate-200';

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm text-slate-300 flex-1">
        Las últimas noticias son <span className={`font-semibold ${sentColor}`}>{sentiment}</span>
      </p>
      <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${badgeColor}`}>
        {total} artículos
      </span>
    </div>
  );
}

// ─── Indicator card wrapper ───────────────────────────────────────────────────
function IndicatorCard({ title, badge, badgeColor, children }) {
  return (
    <div className="bg-slate-900/60 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-300">{title}</p>
        {badge && (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function signalBadge(sig) {
  if (sig === 'buy')  return { badge: '↑ Compra',    cls: 'bg-green-900/40 text-green-400' };
  if (sig === 'sell') return { badge: '↓ Venta',     cls: 'bg-red-900/40 text-red-400'    };
  return                     { badge: '→ Neutral',   cls: 'bg-slate-700/40 text-slate-400' };
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────
function LoadingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6 px-4 py-8 animate-pulse">
      {/* Traffic light skeleton */}
      <div className="flex flex-col items-center gap-3 bg-slate-900 rounded-2xl p-5 border border-slate-700/50">
        {[1, 2, 3].map(i => <div key={i} className="w-16 h-16 rounded-full bg-slate-800" />)}
      </div>
      {/* Text skeleton */}
      <div className="space-y-3 text-center w-full max-w-xs">
        <div className="h-10 bg-slate-800 rounded-xl mx-auto w-48" />
        <div className="h-4 bg-slate-800/60 rounded mx-auto w-64" />
        <div className="h-4 bg-slate-800/60 rounded mx-auto w-56" />
      </div>
      {/* Gauge skeleton */}
      <div className="w-52 h-24 bg-slate-800 rounded-xl" />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
export function Panorama() {
  const { allAssets } = usePrices(60_000);
  const [asset, setAsset]           = useState(DEFAULT_ASSET);
  const [expertMode, setExpertMode] = useState(false);
  const [expanded, setExpanded]     = useState(false);
  const [fadeIn, setFadeIn]         = useState(true);
  const [dropOpen, setDropOpen]     = useState(false);
  const [expandedCats, setExpandedCats] = useState({ crypto: true });

  // Data states
  const [mainData,   setMainData]   = useState(null);
  const [fgData,     setFgData]     = useState(null);
  const [newsData,   setNewsData]   = useState(null);
  const [candles,    setCandles]    = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);

  const load = useCallback(async (a) => {
    setLoading(true);
    setError(null);

    // analysisType: 'crypto' | 'stock' — determina qué fuente OHLCV usa el backend
    const aType = a.analysisType ?? (a.type === 'crypto' ? 'crypto' : 'stock');

    // Single analysis call — 90 days is enough for RSI, MACD, EMA
    const [main, fg, news, ohlcv] = await Promise.allSettled([
      fetchAnalysis(a.id, aType, 90),
      fetchFearGreed(),
      fetchNews(a.id, aType),
      fetchOHLCV(a.id, aType, aType === 'crypto' ? { days: 90 } : {}),
    ]);

    if (main.status === 'fulfilled') {
      setMainData(main.value);
      const s = toPanoramaScore(main.value?.analysis?.summary);
      saveHistory(a.id, s);
    } else {
      setError(main.reason?.message ?? 'Error al cargar el análisis');
    }
    if (fg.status   === 'fulfilled') setFgData(fg.value);
    if (news.status === 'fulfilled') {
      const raw = news.value;
      setNewsData(Array.isArray(raw) ? raw : raw?.news ?? null);
    }
    if (ohlcv.status === 'fulfilled') {
      const raw = ohlcv.value;
      setCandles(Array.isArray(raw) ? raw : raw?.candles ?? null);
    }

    setLoading(false);
  }, []);

  // On asset change: reset data and auto-load
  useEffect(() => {
    setFadeIn(false);
    loadHistory(asset.id);
    setMainData(null); setCandles(null); setNewsData(null); setError(null);
    const t = setTimeout(() => {
      setFadeIn(true);
      load(asset);
    }, 180);
    return () => clearTimeout(t);
  }, [asset]);

  // ── Derived values ──────────────────────────────────────────────────────────
  const analysis = mainData?.analysis;
  // Live price from usePrices (refreshes every 60s), falls back to analysis cache
  const liveAsset    = allAssets.find(a => a.id === asset.id);
  const currentPrice = liveAsset?.price ?? analysis?.meta?.lastPrice ?? null;
  const score        = analysis ? toPanoramaScore(analysis.summary) : 50;
  const signal       = scoreToSignal(score);
  const cfg          = SIGNAL[signal];
  const strongSignal = score >= 75 || score <= 25;
  const narrative    = analysis ? buildNarrative(analysis) : null;
  const bestDay      = computeBestDay(candles);
  const ind          = analysis?.indicators;
  const sigs         = analysis?.signals;

  // Fear & Greed
  const fgVal  = fgData?.current?.value ? parseInt(fgData.current.value) : null;
  const fgText = fgData?.current?.value_classification ?? '';
  const fgCtx  = fgVal != null
    ? `"${fgText}" (${fgVal}/100) — ${fgVal < 25 ? 'históricamente buen momento de acumulación' : fgVal > 75 ? 'históricamente zona de euforia y precaución' : 'sentimiento neutral de mercado'}`
    : null;

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      onClick={() => dropOpen && setDropOpen(false)}
    >
      <div className={`transition-opacity duration-300 w-full px-4 pb-6 ${fadeIn ? 'opacity-100' : 'opacity-0'}`}>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-4 pb-3">
          <div>
            <h1 className="text-lg font-bold text-white">Panorama</h1>
            <p className="text-xs text-slate-500">Señal de trading en tiempo real</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(asset)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors bg-brand-700/30 border-brand-500/40 text-brand-300 hover:bg-brand-700/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="w-3 h-3 border border-brand-400 border-t-transparent rounded-full animate-spin" />
              ) : '↻'}
              {loading ? 'Cargando…' : mainData ? 'Actualizar' : 'Analizar'}
            </button>
            <button
              onClick={() => setExpertMode(e => !e)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
                expertMode
                  ? 'bg-brand-700/40 border-brand-500/40 text-brand-300'
                  : 'bg-slate-800 border-slate-700/50 text-slate-400 hover:text-white'
              }`}
            >
              {expertMode ? '⚡ Experto' : '👁 Simple'}
            </button>
          </div>
        </div>

        {/* ── Asset selector ──────────────────────────────────────── */}
        <div className="relative mb-6" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setDropOpen(d => !d)}
            className="w-full flex items-center gap-3 bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-3 hover:bg-slate-800 transition-colors"
          >
            <AssetLogo asset={asset} size={10} />
            <div className="flex-1 text-left min-w-0">
              <p className="text-base font-bold text-white truncate">{asset.name}</p>
              <p className="text-xs text-slate-400">{asset.symbol} · {asset.type === 'crypto' ? 'Criptomoneda' : 'Activo tradicional'}</p>
            </div>
            {currentPrice != null && (
              <p className="text-lg font-mono font-bold text-white flex-shrink-0">{fmtPrice(currentPrice)}</p>
            )}
            <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${dropOpen ? 'rotate-180' : ''}`}>
              <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>

          {dropOpen && (
            <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden max-h-96 overflow-y-auto">
              {ANALYZABLE_CATEGORIES.map(cat => {
                const isOpen = !!expandedCats[cat.id];
                return (
                  <div key={cat.id} className="border-b border-slate-700/30 last:border-0">
                    {/* Category header — clickable accordion */}
                    <button
                      onClick={() => setExpandedCats(p => ({ ...p, [cat.id]: !p[cat.id] }))}
                      className={`w-full flex items-center gap-2 px-3 py-2 transition-colors hover:bg-slate-700/30 ${isOpen ? cat.bg : ''}`}
                    >
                      <span className="text-sm">{cat.icon}</span>
                      <span className={`text-xs font-semibold uppercase tracking-wider ${cat.color}`}>{cat.label}</span>
                      <span className="text-xs text-slate-600 ml-1">({cat.assets.length})</span>
                      <svg viewBox="0 0 16 16" fill="currentColor" className={`w-3 h-3 text-slate-500 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                        <path d="M8 10.5L2.5 5h11L8 10.5Z" />
                      </svg>
                    </button>
                    {/* Assets — only shown when expanded */}
                    {isOpen && cat.assets.map(a => (
                      <button
                        key={a.id}
                        onClick={() => { setAsset(a); setDropOpen(false); }}
                        className={`w-full flex items-center gap-3 pl-8 pr-3 py-2 hover:bg-slate-700/50 transition-colors text-left ${a.id === asset.id ? 'bg-slate-700/40' : ''}`}
                      >
                        <AssetLogo asset={a} size={7} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{a.name}</p>
                        </div>
                        <span className="text-xs text-slate-500 font-mono flex-shrink-0">{a.symbol}</span>
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Main signal ─────────────────────────────────────────── */}
        {!loading && !mainData && !error ? (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700/50 flex items-center justify-center text-3xl">📊</div>
            <p className="text-slate-300 font-medium">Cargando análisis...</p>
          </div>
        ) : loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <div className="py-10 text-center space-y-3">
            <p className="text-red-400 text-sm">{error}</p>
            <button
              onClick={() => load(asset)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700/50 rounded-lg text-xs text-slate-300 transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3" style={{ gridTemplateRows: 'auto auto' }}>

            {/* Card 1: Señal */}
            <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 flex flex-col items-center justify-center gap-2 min-h-[280px]">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold self-start">Señal</p>
              <div className="flex items-center gap-4 w-full justify-center">
                <TrafficLight signal={signal} size="lg" />
                <div className="flex flex-col gap-1">
                  <p className={`text-3xl font-extrabold tracking-tight ${cfg.color}`} style={{ textShadow: `0 0 30px ${cfg.glowColor}` }}>
                    {cfg.label}
                  </p>
                  {strongSignal && (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border w-fit ${
                      signal === 'buy' ? 'bg-green-900/40 border-green-500/40 text-green-400' :
                      signal === 'sell' ? 'bg-red-900/40 border-red-500/40 text-red-400' :
                      'bg-amber-900/40 border-amber-500/40 text-amber-400'
                    }`}>⚡ Señal fuerte</span>
                  )}
                  {narrative && <p className="text-xs text-slate-400 leading-relaxed max-w-[180px]">{narrative}</p>}
                </div>
              </div>
            </div>

            {/* Card 2: Confluencia */}
            <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 flex flex-col items-center justify-center gap-2 min-h-[280px]">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold self-start">Confluencia</p>
              <ConfluenceGauge score={score} />
              <div className="flex gap-2 mt-1">
                <span className="flex items-center gap-1 text-xs bg-green-900/40 text-green-400 border border-green-700/40 rounded-full px-2 py-0.5 font-semibold">
                  {analysis?.summary?.counts?.buy ?? 0}
                  <svg viewBox="0 0 10 10" className="w-2 h-2 fill-current"><path d="M5 2 L8 7 L2 7 Z"/></svg>
                </span>
                <span className="flex items-center gap-1 text-xs bg-slate-700/40 text-slate-400 border border-slate-600/40 rounded-full px-2 py-0.5 font-semibold">
                  {analysis?.summary?.counts?.neutral ?? 0} —
                </span>
                <span className="flex items-center gap-1 text-xs bg-red-900/40 text-red-400 border border-red-700/40 rounded-full px-2 py-0.5 font-semibold">
                  {analysis?.summary?.counts?.sell ?? 0}
                  <svg viewBox="0 0 10 10" className="w-2 h-2 fill-current"><path d="M5 8 L8 3 L2 3 Z"/></svg>
                </span>
              </div>
            </div>

            {/* Card 3: Indicadores */}
            <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 min-h-[280px]">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-3">Indicadores técnicos</p>
              <div className="grid grid-cols-2 gap-2">
                {(() => { const { badge, cls } = signalBadge(sigs?.rsi?.signal); return (
                  <IndicatorCard title="RSI (14)" badge={badge} badgeColor={cls}>
                    <RSIGauge value={ind?.rsi?.current} />
                  </IndicatorCard>
                ); })()}
                {(() => { const { badge, cls } = signalBadge(sigs?.macd?.signal); return (
                  <IndicatorCard title="MACD" badge={badge} badgeColor={cls}>
                    <p className="text-xs font-mono text-slate-300 mt-1">{ind?.macd?.current?.histogram?.toFixed(2) ?? '—'}</p>
                  </IndicatorCard>
                ); })()}
                {(() => { const { badge, cls } = signalBadge(sigs?.ema?.signal); return (
                  <IndicatorCard title="EMA 20/50" badge={badge} badgeColor={cls}>
                    <p className="text-xs font-mono text-slate-300 mt-1">{ind?.ema20?.current?.toFixed(0) ?? '—'} / {ind?.ema50?.current?.toFixed(0) ?? '—'}</p>
                  </IndicatorCard>
                ); })()}
                {(() => { const { badge, cls } = signalBadge(sigs?.bb?.signal); return (
                  <IndicatorCard title="Bollinger" badge={badge} badgeColor={cls}>
                    <BollingerBar bb={ind?.bollingerBands?.current} price={currentPrice} />
                  </IndicatorCard>
                ); })()}
              </div>
            </div>

            {/* Card 4: Contexto */}
            <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 min-h-[280px] flex flex-col gap-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Contexto de mercado</p>
              {fgCtx && (
                <div className="bg-slate-900/60 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-semibold mb-1">Fear &amp; Greed</p>
                  <p className="text-xs text-slate-300 leading-relaxed">{fgCtx}</p>
                </div>
              )}
              {bestDay && (
                <div className="bg-slate-900/60 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-semibold mb-1">Mejor día histórico</p>
                  <p className="text-xs text-slate-300">{bestDay.day} — {bestDay.rate}% alcista</p>
                </div>
              )}
              <VolatilityWidget atr={ind?.atr?.current} currentPrice={currentPrice} expertMode={expertMode} />
              {newsData?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-400 font-semibold mb-2">Últimas noticias</p>
                  <NewsSummary news={newsData} />
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
