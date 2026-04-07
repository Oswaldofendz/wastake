import { useState, useEffect } from 'react';
import { fetchGlobalMarket } from '../services/api.js';

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  return `$${n.toLocaleString()}`;
}

export function BTCDominance() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchGlobalMarket()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));

    const id = setInterval(() => {
      fetchGlobalMarket().then(d => setData(d)).catch(() => {});
    }, 3 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  if (loading) return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 animate-pulse">
      <div className="h-3 bg-slate-700 rounded w-1/2 mb-3" />
      <div className="h-8 bg-slate-700/50 rounded mb-2" />
      <div className="h-2 bg-slate-700/30 rounded-full" />
    </div>
  );

  if (!data) return null;

  const btc = data.btcDominance;
  const eth = data.ethDominance;
  const other = Math.max(0, 100 - btc - eth).toFixed(1);
  const change = data.marketCapChange24h;

  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Dominancia BTC</h3>
        <span className={`text-xs font-medium ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {change >= 0 ? '+' : ''}{change}% 24h
        </span>
      </div>

      {/* BTC Dominance big number */}
      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-orange-400 font-bold text-2xl font-mono">{btc}%</span>
        <span className="text-xs text-slate-500">Bitcoin</span>
      </div>

      {/* Dominance bar */}
      <div className="w-full h-3 bg-slate-700 rounded-full overflow-hidden flex">
        <div
          className="h-full bg-orange-500 rounded-l-full transition-all duration-500"
          style={{ width: `${btc}%` }}
          title={`BTC ${btc}%`}
        />
        <div
          className="h-full bg-blue-500 transition-all duration-500"
          style={{ width: `${eth}%` }}
          title={`ETH ${eth}%`}
        />
        <div
          className="h-full bg-slate-600 rounded-r-full flex-1"
          title={`Otros ${other}%`}
        />
      </div>

      {/* Legend */}
      <div className="flex justify-between mt-2 text-xs">
        <span className="flex items-center gap-1 text-orange-400">
          <span className="w-2 h-2 rounded-full bg-orange-500 inline-block" />
          BTC {btc}%
        </span>
        <span className="flex items-center gap-1 text-blue-400">
          <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          ETH {eth}%
        </span>
        <span className="flex items-center gap-1 text-slate-500">
          <span className="w-2 h-2 rounded-full bg-slate-600 inline-block" />
          Otros {other}%
        </span>
      </div>

      {/* Total market cap */}
      <div className="mt-3 pt-3 border-t border-slate-700/40 flex items-center justify-between">
        <span className="text-xs text-slate-500">Cap. total mercado</span>
        <span className="text-xs font-mono text-white">{fmt(data.totalMarketCap)}</span>
      </div>
    </div>
  );
}
