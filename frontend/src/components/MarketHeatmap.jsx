import { useState, useEffect } from 'react';
import { fetchAllPrices } from '../services/api.js';

const ASSET_LOGOS = {
  bitcoin:   'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png',
  ethereum:  'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png',
  solana:    'https://assets.coingecko.com/coins/images/4128/thumb/solana.png',
  ripple:    'https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png',
  cardano:   'https://assets.coingecko.com/coins/images/975/thumb/cardano.png',
  dogecoin:  'https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png',
};

function heatColor(change) {
  if (change >=  5) return { bg: 'bg-green-600',    text: 'text-white'     };
  if (change >=  3) return { bg: 'bg-green-700',    text: 'text-white'     };
  if (change >=  1) return { bg: 'bg-green-900/80', text: 'text-green-300' };
  if (change >=  0) return { bg: 'bg-green-950/60', text: 'text-green-400' };
  if (change >= -1) return { bg: 'bg-red-950/60',   text: 'text-red-400'   };
  if (change >= -3) return { bg: 'bg-red-900/80',   text: 'text-red-300'   };
  if (change >= -5) return { bg: 'bg-red-700',      text: 'text-white'     };
  return              { bg: 'bg-red-600',            text: 'text-white'     };
}

function fmtPrice(n) {
  if (n == null) return '—';
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1)    return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function AssetLogo({ asset }) {
  const src = ASSET_LOGOS[asset.id] ?? asset.image;
  if (src) return <img src={src} alt={asset.symbol} className="w-6 h-6 rounded-full" onError={e => { e.target.style.display = 'none'; }} />;
  return (
    <div className="w-6 h-6 rounded-full bg-slate-600/80 flex items-center justify-center text-xs font-bold text-white">
      {asset.symbol?.slice(0, 2)}
    </div>
  );
}

function HeatCell({ asset }) {
  const change = asset.change24h ?? 0;
  const { bg, text } = heatColor(change);
  return (
    <div className={`${bg} rounded-lg p-2.5 flex flex-col gap-1 border border-white/5 hover:scale-105 transition-transform cursor-default select-none`}>
      <div className="flex items-center gap-1.5">
        <AssetLogo asset={asset} />
        <span className="text-xs font-bold text-white/90 truncate">{asset.symbol}</span>
      </div>
      <p className="text-xs font-mono text-white/60 truncate">{fmtPrice(asset.price)}</p>
      <p className={`text-sm font-bold font-mono ${text}`}>
        {change >= 0 ? '+' : ''}{change.toFixed(2)}%
      </p>
    </div>
  );
}

export function MarketHeatmap({ assets: assetsProp }) {
  const [ownAssets, setOwnAssets] = useState([]);
  const [loading, setLoading]     = useState(false);

  // Si no recibimos activos por prop, los cargamos solos
  useEffect(() => {
    if (assetsProp?.length) return;
    setLoading(true);
    fetchAllPrices()
      .then(data => {
        const list = [
          ...Object.values(data?.crypto      ?? {}),
          ...Object.values(data?.traditional ?? {}),
        ];
        setOwnAssets(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assetsProp]);

  const assets = assetsProp?.length ? assetsProp : ownAssets;

  if (loading && !assets.length) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-4 animate-pulse">
        <div className="h-3 bg-slate-700 rounded w-40 mb-4" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {[...Array(8)].map((_, i) => <div key={i} className="h-20 bg-slate-700/50 rounded-lg" />)}
        </div>
      </div>
    );
  }

  if (!assets.length) {
    return (
      <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 text-center">
        <p className="text-slate-500 text-sm">Sin datos de mercado disponibles</p>
      </div>
    );
  }

  const sorted = [...assets].sort((a, b) => Math.abs(b.change24h ?? 0) - Math.abs(a.change24h ?? 0));

  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Heatmap de Mercado
        </h3>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-red-600 inline-block" />
            <span className="text-slate-500">{'< -5%'}</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-slate-700 inline-block" />
            <span className="text-slate-500">0%</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded bg-green-600 inline-block" />
            <span className="text-slate-500">{'+5%'}</span>
          </span>
        </div>
      </div>
      <div className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
        {sorted.map(asset => (
          <HeatCell key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}
