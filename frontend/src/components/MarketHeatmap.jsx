import { useState, useEffect } from 'react';
import { fetchAllPrices } from '../services/api.js';

const MARKET_CAPS = {
  bitcoin:   1400e9, ethereum: 260e9, solana: 47e9, ripple: 120e9,
  binancecoin: 85e9, cardano: 25e9, dogecoin: 22e9, avalanche: 12e9,
  chainlink: 8e9, polkadot: 7e9,
  AAPL: 3900e9, MSFT: 2800e9, NVDA: 2300e9, AMZN: 2100e9,
  GOOGL: 1900e9, META: 1500e9, TSLA: 1000e9, JPM: 700e9,
  V: 650e9, NFLX: 400e9,
  'GC=F': 18000e9, 'SI=F': 1700e9,
};

const SECTORS = [
  { id: 'crypto', label: 'Crypto', color: '#f97316', ids: ['bitcoin','ethereum','solana','ripple','binancecoin','cardano','dogecoin','avalanche-2','chainlink','polkadot'] },
  { id: 'tech', label: 'Tecnología', color: '#3b82f6', ids: ['AAPL','MSFT','NVDA','GOOGL','META','NFLX'] },
  { id: 'consumer', label: 'Consumo', color: '#8b5cf6', ids: ['AMZN','TSLA'] },
  { id: 'finance', label: 'Finanzas', color: '#10b981', ids: ['JPM','V'] },
  { id: 'commodities', label: 'Materias Primas', color: '#eab308', ids: ['GC=F','SI=F'] },
];

const STOCK_COLORS = {
  AAPL: '#555', MSFT: '#00a4ef', NVDA: '#76b900', AMZN: '#ff9900',
  GOOGL: '#4285f4', META: '#0866ff', TSLA: '#cc0000', JPM: '#003087',
  V: '#1a1f71', NFLX: '#e50914',
};

function heatColor(change) {
  if (change >= 5)  return '#16a34a';
  if (change >= 3)  return '#15803d';
  if (change >= 1)  return '#166534';
  if (change >= 0)  return '#14532d';
  if (change >= -1) return '#7f1d1d';
  if (change >= -3) return '#991b1b';
  if (change >= -5) return '#b91c1c';
  return '#dc2626';
}

function AssetLogo({ asset }) {
  const [imgError, setImgError] = useState(false);
  const src = asset.image;
  if (src && !imgError) {
    return <img src={src} alt={asset.symbol} className="w-8 h-8 rounded-full object-cover flex-shrink-0" onError={() => setImgError(true)} />;
  }
  const bg = STOCK_COLORS[asset.id] ?? STOCK_COLORS[asset.symbol] ?? '#475569';
  return (
    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ backgroundColor: bg }}>
      {asset.symbol?.slice(0, 2)}
    </div>
  );
}

function HeatCell({ asset, size }) {
  const [expanded, setExpanded] = useState(false);
  const change = (asset.change24h != null && !isNaN(asset.change24h)) ? asset.change24h : 0;
  const bg = heatColor(change);
  const fmtPrice = n => {
    if (n == null || isNaN(n) || n <= 0) return '—';
    if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
    if (n >= 1) return `$${n.toFixed(2)}`;
    return `$${n.toFixed(4)}`;
  };

  const isLarge = size > 0.15;
  const isMed = size > 0.08;

  return (
    <div
      onClick={() => setExpanded(e => !e)}
      className="rounded-xl border border-white/10 cursor-pointer transition-all hover:brightness-110 overflow-hidden"
      style={{
        backgroundColor: bg,
        gridColumn: expanded ? 'span 2' : 'span 1',
        gridRow: expanded ? 'span 2' : 'span 1',
        minHeight: isLarge ? '120px' : isMed ? '90px' : '70px',
      }}
    >
      <div className="p-3 h-full flex flex-col justify-between">
        <div className="flex items-center gap-2">
          <AssetLogo asset={asset} />
          <div className="min-w-0">
            <p className="text-white font-bold text-sm truncate">{asset.symbol}</p>
            {isLarge && <p className="text-white/60 text-xs truncate">{asset.name}</p>}
          </div>
        </div>
        <div>
          {isMed && <p className="text-white/70 text-xs font-mono">{fmtPrice(asset.price)}</p>}
          <p className="text-white font-bold text-base">
            {change >= 0 ? '+' : ''}{Number(change).toFixed(2)}%
          </p>
        </div>
        {expanded && asset.volume24h > 0 && (
          <p className="text-white/50 text-xs mt-1">Vol: ${(asset.volume24h / 1e9).toFixed(1)}B</p>
        )}
      </div>
    </div>
  );
}

export function MarketHeatmap({ assets: assetsProp }) {
  const [ownAssets, setOwnAssets] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (assetsProp?.length) return;
    setLoading(true);
    fetchAllPrices()
      .then(data => {
        const list = [
          ...Object.values(data?.crypto ?? {}),
          ...Object.values(data?.traditional ?? {}),
        ].filter(a => a.type !== 'etf');
        setOwnAssets(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assetsProp]);

  const allAssets = assetsProp?.length
    ? assetsProp.filter(a => a.type !== 'etf')
    : ownAssets;

  if (loading && !allAssets.length) return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 animate-pulse">
      <div className="h-3 bg-slate-700 rounded w-40 mb-4" />
      <div className="grid grid-cols-6 gap-2">
        {[...Array(12)].map((_, i) => <div key={i} className="h-24 bg-slate-700/50 rounded-xl" />)}
      </div>
    </div>
  );

  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Heatmap de Mercado</h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-600 inline-block" /><span className="text-slate-500">{'< -5%'}</span></span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded inline-block" style={{ backgroundColor: '#14532d' }} /><span className="text-slate-500">0%</span></span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-600 inline-block" /><span className="text-slate-500">{'+5%'}</span></span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {SECTORS.map(sector => {
          const sectorAssets = sector.ids
            .map(id => allAssets.find(a => a.id === id || a.symbol === id))
            .filter(Boolean);
          if (!sectorAssets.length) return null;

          const totalCap = sectorAssets.reduce((s, a) => s + (MARKET_CAPS[a.id] ?? MARKET_CAPS[a.symbol] ?? 10e9), 0);

          return (
            <div key={sector.id}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: sector.color }}>
                {sector.label}
              </p>
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gridAutoFlow: 'dense' }}>
                {sectorAssets.map(asset => {
                  const cap = MARKET_CAPS[asset.id] ?? MARKET_CAPS[asset.symbol] ?? 10e9;
                  const size = cap / totalCap;
                  return <HeatCell key={asset.id} asset={asset} size={size} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
