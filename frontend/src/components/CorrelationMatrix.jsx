import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchOHLCV } from '../services/api.js';

const ASSETS = [
  { id: 'bitcoin',  symbol: 'BTC',  type: 'crypto' },
  { id: 'ethereum', symbol: 'ETH',  type: 'crypto' },
  { id: 'solana',   symbol: 'SOL',  type: 'crypto' },
  { id: 'SPY',      symbol: 'SPY',  type: 'stock'  },
  { id: 'GC=F',     symbol: 'XAU',  type: 'stock'  },
  { id: 'URTH',     symbol: 'URTH', type: 'stock'  },
];

// Compute returns between shared UTC closing dates. This aligns Friday-to-Monday
// moves across crypto and exchange-traded assets instead of pairing unlike days.
function pearson(a, b) {
  const sharedDates = [...a.keys()].filter(date => b.has(date)).sort().slice(-90);
  if (sharedDates.length < 11) return null;
  const ax = [];
  const bx = [];
  for (let i = 1; i < sharedDates.length; i++) {
    const previous = sharedDates[i - 1];
    const current = sharedDates[i];
    const aPrev = a.get(previous);
    const bPrev = b.get(previous);
    const aNow = a.get(current);
    const bNow = b.get(current);
    if (aPrev > 0 && bPrev > 0) {
      ax.push((aNow - aPrev) / aPrev);
      bx.push((bNow - bPrev) / bPrev);
    }
  }
  const n = ax.length;
  if (n < 10) return null;
  const ma = ax.reduce((s, v) => s + v, 0) / n;
  const mb = bx.reduce((s, v) => s + v, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    const ra = ax[i] - ma;
    const rb = bx[i] - mb;
    num += ra * rb;
    da  += ra * ra;
    db  += rb * rb;
  }
  if (da < 1e-10 || db < 1e-10) return null;
  const r = num / Math.sqrt(da * db);
  return isNaN(r) ? null : Math.max(-1, Math.min(1, r));
}

// Closing prices keyed by UTC day; pairs use only shared observation dates.
function closeSeries(candles) {
  const ordered = [...candles]
    .filter(c => Number.isFinite(c.time) && Number.isFinite(c.close) && c.close > 0)
    .sort((a, b) => a.time - b.time);
  const result = new Map();
  for (const current of ordered) {
    const date = new Date(current.time * 1000).toISOString().slice(0, 10);
    result.set(date, current.close);
  }
  return result;
}

function dailyReturns(series) {
  const closes = [...series.values()];
  const result = [];
  for (let i = 1; i < closes.length; i++) {
    const change = (closes[i] - closes[i - 1]) / closes[i - 1];
    if (Number.isFinite(change)) result.push(change);
  }
  return result;
}

function corrColor(r) {
  if (r === null) return 'bg-slate-700/40 text-slate-500';
  if (r > 0.8)  return 'bg-green-700/70 text-green-200';
  if (r > 0.5)  return 'bg-green-900/60 text-green-300';
  if (r > 0.2)  return 'bg-green-950/50 text-green-400';
  if (r > -0.2) return 'bg-slate-700/40 text-slate-400';
  if (r > -0.5) return 'bg-red-950/50   text-red-400';
  if (r > -0.8) return 'bg-red-900/60   text-red-300';
  return              'bg-red-700/70   text-red-200';
}

function corrLabel(r) {
  if (r === null)  return '—';
  return r.toFixed(2);
}

function AssetSparkline({ asset, index, cumulativeData }) {
  if (!cumulativeData?.[index]?.length) return (
    <div className="bg-slate-900/40 rounded-lg p-3">
      <p className="text-xs font-semibold text-slate-400 mb-2">{asset.symbol}</p>
      <p className="text-xs text-slate-600">Sin datos</p>
    </div>
  );

  const cumulative = cumulativeData[index];
  const min = Math.min(...cumulative);
  const max = Math.max(...cumulative);
  const range = max - min || 0.001;
  const w = 200, h = 50;
  const points = cumulative.map((v, i) => {
    const x = (i / (cumulative.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  const totalReturn = (cumulative[cumulative.length - 1] - 1) * 100;
  const color = totalReturn >= 0 ? '#22c55e' : '#ef4444';

  return (
    <div className="bg-slate-900/40 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-slate-300">{asset.symbol}</p>
        <p className="text-xs font-mono font-bold" style={{ color }}>
          {totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
        <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

export function CorrelationMatrix() {
  const { t } = useTranslation();
  const [matrix, setMatrix]               = useState(null);
  const [cumulativeData, setCumulativeData] = useState(null);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [availableCount, setAvailableCount] = useState(0);

  const load = useCallback(async () => {
      setLoading(true);
      setError(null);
      try {
        const allReturns = await Promise.all(
          ASSETS.map(async a => {
            try {
              const raw = await fetchOHLCV(
                a.id,
                a.type === 'crypto' ? 'crypto' : 'stock',
                a.type === 'crypto' ? { days: 90 } : {}
              );
              const candles = Array.isArray(raw) ? raw : raw?.candles ?? [];
              if (candles.length < 10) return new Map();
              return closeSeries(candles);
            } catch {
              return new Map();
            }
          })
        );

        const usableCount = allReturns.filter(series => series.size > 0).length;
        if (usableCount === 0) throw new Error('No price series available');
        setAvailableCount(usableCount);

        const n = ASSETS.length;
        const mat = Array.from({ length: n }, (_, i) =>
          Array.from({ length: n }, (_, j) => {
            if (i === j) return allReturns[i].size ? 1 : null;
            if (!allReturns[i].size || !allReturns[j].size) return null;
            return pearson(allReturns[i], allReturns[j]);
          })
        );
        setMatrix(mat);
        const cumulativeReturns = allReturns.map(rets => {
          if (!rets.size) return [];
          const cumulative = [1];
          for (const r of dailyReturns(rets)) cumulative.push(cumulative[cumulative.length - 1] * (1 + r));
          return cumulative;
        });
        setCumulativeData(cumulativeReturns);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return (
    <div className="bg-[var(--bg-card)] border border-white/[8%] rounded-xl p-6 animate-pulse">
      <div className="h-3 bg-slate-700 rounded w-1/3 mb-4" />
      <div className="grid grid-cols-6 gap-1">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-700/40 rounded" />
        ))}
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-[var(--bg-card)] border border-white/[8%] rounded-xl p-6 text-center" role="alert">
      <p className="text-sm text-amber-300">{t('correlation_unavailable')}</p>
      <p className="mt-2 text-xs text-slate-500">{t('correlation_no_series')}</p>
      <button type="button" onClick={load} className="mt-4 rounded-lg border border-slate-600 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800">
        {t('retry')}
      </button>
    </div>
  );

  return (
    <div className="bg-[var(--bg-card)] border border-white/[8%] rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Correlación de Activos
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">{t('correlation_method')}</p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded bg-green-700/70 inline-block" />
            <span className="text-slate-400">Positiva</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded bg-slate-700 inline-block" />
            <span className="text-slate-400">Neutra</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-2 rounded bg-red-700/70 inline-block" />
            <span className="text-slate-400">Negativa</span>
          </span>
        </div>
      </div>

      <div className="p-4 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="w-12" />
              {ASSETS.map(a => (
                <th key={a.id} className="px-1 py-1 text-center font-semibold text-slate-400 w-16">
                  {a.symbol}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ASSETS.map((row, i) => (
              <tr key={row.id}>
                <td className="py-1 pr-2 text-right font-semibold text-slate-400 whitespace-nowrap">
                  {row.symbol}
                </td>
                {ASSETS.map((col, j) => {
                  const r = matrix?.[i]?.[j] ?? null;
                  const isDiag = i === j;
                  return (
                    <td key={col.id} className="p-0.5">
                      <div
                        className={`h-10 rounded flex items-center justify-center font-mono font-bold text-xs ${corrColor(r)} ${isDiag && r != null ? 'opacity-40' : ''}`}
                        title={`${row.symbol} / ${col.symbol}: ${r != null ? r.toFixed(4) : '—'}`}
                      >
                        {corrLabel(r)}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        <p className="mt-3 text-xs text-slate-500" role="note">{t('correlation_missing')}</p>
        {availableCount < ASSETS.length && (
          <p className="mt-3 text-xs text-amber-300" role="status">{t('correlation_partial')}</p>
        )}

        {/* Interpretation guide */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          {[
            { range: '0.8 – 1.0', label: 'Correlación fuerte', color: 'text-green-400' },
            { range: '-0.2 – 0.2', label: 'Sin correlación', color: 'text-slate-400' },
            { range: '-1.0 – -0.8', label: 'Correlación inversa', color: 'text-red-400' },
          ].map(item => (
            <div key={item.range} className="bg-slate-900/40 rounded-lg px-3 py-2">
              <p className={`text-xs font-mono font-bold ${item.color}`}>{item.range}</p>
              <p className="text-xs text-slate-500">{item.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Precios relativos — últimos 90 días</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ASSETS.map((asset, i) => (
              <AssetSparkline key={asset.id} asset={asset} index={i} cumulativeData={cumulativeData} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
