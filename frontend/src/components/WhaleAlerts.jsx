import { useState, useEffect } from 'react';
import { fetchWhaleAlerts } from '../services/api.js';

function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n != null && !isNaN(n) ? n : 0).toLocaleString()}`;
}

function timeAgo(ts) {
  const diff = Date.now() - ts * 1000;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'ahora';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h`;
}

function SizeIndicator({ btc }) {
  const size = btc >= 1000 ? 'xl' : btc >= 500 ? 'lg' : btc >= 200 ? 'md' : 'sm';
  const styles = {
    xl: 'bg-red-500/20 text-red-300 border-red-600/40',
    lg: 'bg-orange-500/20 text-orange-300 border-orange-600/40',
    md: 'bg-yellow-500/20 text-yellow-300 border-yellow-600/40',
    sm: 'bg-slate-700/40 text-slate-400 border-slate-600/40',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full border font-mono font-bold ${styles[size]}`}>
      {btc >= 1000 ? '🐋' : btc >= 500 ? '🦈' : '🐬'} {btc != null && !isNaN(btc) ? btc.toFixed(2) : '0'} BTC
    </span>
  );
}

export function WhaleAlerts() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);

  function load() {
    fetchWhaleAlerts()
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, []);

  const whales = data?.whales ?? [];

  return (
    <div className="bg-[#111318]/90 border border-white/[8%] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Whale Alerts — BTC
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">Grandes txs en mempool · mín 5 BTC</p>
        </div>
        <button
          onClick={load}
          className="text-slate-500 hover:text-white transition-colors"
          title="Actualizar"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
            <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {loading ? (
        <div className="p-4 space-y-2 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-700/40 rounded-lg" />
          ))}
        </div>
      ) : whales.length === 0 ? (
        <div className="px-4 py-8 text-center">
          <p className="text-slate-500 text-sm">Sin transacciones whale recientes</p>
          <p className="text-slate-600 text-xs mt-1">El mempool puede estar vacío o bajo actividad</p>
        </div>
      ) : (
        <ul className="divide-y divide-slate-700/30 max-h-64 overflow-y-auto">
          {whales.map((w, i) => (
            <li key={i}>
              <a
                href={w.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-700/30 transition-colors group"
              >
                {/* Time */}
                <span className="text-xs text-slate-500 w-8 flex-shrink-0 font-mono">
                  {timeAgo(w.time)}
                </span>

                {/* Amount */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-mono font-bold text-white">{fmt(w.usd ?? w.usdAmount)}</p>
                  <SizeIndicator btc={w.btc ?? w.btcAmount} />
                </div>

                {/* Link icon */}
                <svg viewBox="0 0 16 16" className="w-3 h-3 fill-slate-600 group-hover:fill-brand-400 transition-colors flex-shrink-0">
                  <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
                  <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
