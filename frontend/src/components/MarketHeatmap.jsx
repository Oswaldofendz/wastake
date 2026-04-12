import { useState, useEffect } from 'react';
import { fetchAllPrices } from '../services/api.js';

// ─── Market caps in full USD ──────────────────────────────────────────────────
const MARKET_CAPS = {
  bitcoin: 1400e9, ethereum: 260e9, solana: 47e9, ripple: 120e9,
  binancecoin: 85e9, cardano: 25e9, dogecoin: 22e9, 'avalanche-2': 12e9,
  chainlink: 8e9, polkadot: 7e9, 'shiba-inu': 14e9, litecoin: 4e9,
  uniswap: 2e9, 'bitcoin-cash': 8e9, stellar: 5e9, cosmos: 1e9,
  near: 2e9, 'internet-computer': 1.3e9,
  AAPL: 3900e9, MSFT: 2800e9, NVDA: 2300e9, AMZN: 2100e9,
  GOOGL: 1900e9, META: 1500e9, TSLA: 1000e9, JPM: 700e9,
  V: 650e9, NFLX: 400e9, AMD: 400e9, INTC: 260e9,
  ORCL: 380e9, CRM: 160e9, ADBE: 200e9, PYPL: 65e9,
  UBER: 150e9, SHOP: 140e9, DIS: 180e9, BA: 130e9,
  GS: 180e9, MS: 150e9, WMT: 760e9, KO: 320e9,
  PEP: 210e9, MCD: 220e9, NKE: 65e9, PFE: 150e9,
  JNJ: 360e9, XOM: 500e9,
  'GC=F': 18000e9, 'SI=F': 1700e9,
};

const SECTORS = [
  { id: 'tech',       label: 'Tecnología',   color: '#3b82f6', ids: ['AAPL','MSFT','NVDA','GOOGL','META','NFLX','AMD','INTC','ORCL','CRM','ADBE'] },
  { id: 'consumer',   label: 'Consumo',      color: '#8b5cf6', ids: ['AMZN','TSLA','PYPL','UBER','SHOP','DIS','WMT','MCD','KO','PEP','NKE'] },
  { id: 'finance',    label: 'Finanzas',     color: '#10b981', ids: ['JPM','V','GS','MS'] },
  { id: 'health',     label: 'Salud',        color: '#ec4899', ids: ['JNJ','PFE'] },
  { id: 'energy',     label: 'Energía/Ind.', color: '#f59e0b', ids: ['XOM','BA'] },
  { id: 'crypto',     label: 'Crypto',       color: '#f97316', ids: ['bitcoin','ethereum','solana','ripple','binancecoin','cardano','dogecoin','avalanche-2','chainlink','polkadot','shiba-inu','litecoin','uniswap','bitcoin-cash','stellar','cosmos','near','internet-computer'] },
  { id: 'commodities',label: 'Mat. Primas',  color: '#eab308', ids: ['GC=F','SI=F'] },
];

const CRYPTO_LOGOS = {
  bitcoin: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png',
  ethereum: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png',
  solana: 'https://assets.coingecko.com/coins/images/4128/thumb/solana.png',
  ripple: 'https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png',
  binancecoin: 'https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png',
  cardano: 'https://assets.coingecko.com/coins/images/975/thumb/cardano.png',
  dogecoin: 'https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png',
  'avalanche-2': 'https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png',
  chainlink: 'https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png',
  polkadot: 'https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png',
  'shiba-inu': 'https://assets.coingecko.com/coins/images/11939/thumb/shiba.png',
  litecoin: 'https://assets.coingecko.com/coins/images/2/thumb/litecoin.png',
  near: 'https://assets.coingecko.com/coins/images/14877/thumb/NEAR.png',
  uniswap: 'https://assets.coingecko.com/coins/images/12504/thumb/uni.jpg',
  'bitcoin-cash': 'https://assets.coingecko.com/coins/images/780/thumb/bitcoin-cash-circle.png',
  stellar: 'https://assets.coingecko.com/coins/images/100/thumb/Stellar_symbol_black_RGB.png',
  cosmos: 'https://assets.coingecko.com/coins/images/1481/thumb/cosmos_hub.png',
  'internet-computer': 'https://assets.coingecko.com/coins/images/14495/thumb/Internet_Computer_logo.png',
};

// ─── Log-scale col span (12-column grid) ─────────────────────────────────────
function getColSpan(cap, minCap, maxCap) {
  if (!cap || cap <= 0) return 1;
  const logMin = Math.log10(Math.max(minCap, 1e8));
  const logMax = Math.log10(Math.max(maxCap, 1e8));
  const logCap = Math.log10(Math.max(cap, 1e8));
  const range = logMax - logMin || 1;
  const normalized = (logCap - logMin) / range;
  if (normalized > 0.85) return 4;
  if (normalized > 0.65) return 3;
  if (normalized > 0.40) return 2;
  return 1;
}

// ─── Heat color by % change ───────────────────────────────────────────────────
function heatColor(change) {
  if (change >= 5)  return '#15803d';
  if (change >= 3)  return '#16a34a';
  if (change >= 1)  return '#166534';
  if (change >= 0)  return '#14532d';
  if (change >= -1) return '#7f1d1d';
  if (change >= -3) return '#991b1b';
  if (change >= -5) return '#b91c1c';
  return '#dc2626';
}

function fmtChange(c) {
  if (c == null || isNaN(c)) return '+0.00%';
  return `${c >= 0 ? '+' : ''}${c.toFixed(2)}%`;
}

function fmtPrice(n) {
  if (!n || isNaN(n) || n <= 0) return null;
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

// ─── Single asset cell ────────────────────────────────────────────────────────
function HeatCell({ asset, colSpan = 1 }) {
  const change = asset?.change24h != null && !isNaN(asset.change24h) ? asset.change24h : 0;
  const bg     = heatColor(change);
  const id     = asset?.id ?? '';
  const symbol = asset?.symbol ?? id;
  const logo   = asset?.image ?? CRYPTO_LOGOS[id];
  const price  = fmtPrice(asset?.price);

  const isXL = colSpan >= 4;
  const isLg = colSpan >= 3;
  const isMd = colSpan >= 2;

  return (
    <div
      title={`${asset?.name ?? symbol}  ${fmtChange(change)}${price ? '  ' + price : ''}`}
      style={{
        backgroundColor: bg,
        gridColumn: `span ${colSpan}`,
        position: 'relative',
      }}
      className="rounded-lg border border-white/5 cursor-pointer transition-all duration-200 hover:scale-105 hover:z-10 hover:shadow-2xl group overflow-hidden"
    >
      <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1.5">
        {isLg && logo && (
          <img
            src={logo} alt={symbol}
            style={{ width: isXL ? 34 : 24, height: isXL ? 34 : 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
            onError={e => { e.target.style.display = 'none'; }}
          />
        )}
        <span style={{
          color: 'rgba(255,255,255,0.95)', fontWeight: 700,
          fontSize: isXL ? 13 : isLg ? 11 : isMd ? 10 : 8,
          lineHeight: 1.1, textAlign: 'center',
        }}>
          {symbol}
        </span>
        {isXL && price && (
          <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 9, fontFamily: 'monospace' }}>{price}</span>
        )}
        <span style={{
          color: 'white', fontWeight: 700,
          fontSize: isXL ? 15 : isLg ? 12 : isMd ? 10 : 9,
          fontFamily: 'monospace', lineHeight: 1, textAlign: 'center',
        }}>
          {fmtChange(change)}
        </span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MarketHeatmap({ assets: assetsProp }) {
  const [ownAssets, setOwnAssets] = useState([]);
  const [loading, setLoading]     = useState(false);

  useEffect(() => {
    if (assetsProp?.length) return;
    setLoading(true);
    fetchAllPrices()
      .then(data => {
        setOwnAssets([
          ...Object.values(data?.crypto ?? {}),
          ...Object.values(data?.traditional ?? {}),
        ]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assetsProp]);

  const allAssets = assetsProp?.length ? assetsProp : ownAssets;

  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-slate-700/40 flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Heatmap de Mercado</h3>
        <div className="flex items-center gap-1.5 flex-wrap">
          {SECTORS.map(s => (
            <span key={s.id} style={{ color: s.color, background: `${s.color}18` }} className="text-xs px-1.5 py-0.5 rounded font-medium">
              {s.label}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs">
          {[['#dc2626','≤−5%'],['#7f1d1d','−1%'],['#14532d','0%'],['#166534','+1%'],['#15803d','≥+5%']].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1">
              <span className="w-3 h-2 rounded inline-block" style={{ background: c }} />
              <span className="text-slate-500">{l}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Body */}
      <div style={{ background: '#0f172a' }}>
        {loading ? (
          <div className="flex items-center justify-center" style={{ height: 400 }}>
            <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {SECTORS.map(sector => {
              const sectorAssets = sector.ids.map(id => {
                const live = allAssets.find(a => a.id === id || a.symbol === id);
                return live ?? { id, symbol: id, name: id, price: null, change24h: null };
              });

              const caps   = sectorAssets.map(a => MARKET_CAPS[a.id] ?? MARKET_CAPS[a.symbol] ?? 10e9);
              const minCap = Math.min(...caps);
              const maxCap = Math.max(...caps);

              return (
                <div key={sector.id}>
                  {/* Sector label */}
                  <p style={{ color: sector.color, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                    {sector.label}
                  </p>
                  {/* 12-column asset grid */}
                  <div
                    className="grid gap-1"
                    style={{ gridTemplateColumns: 'repeat(12, 1fr)', gridAutoRows: '80px' }}
                  >
                    {sectorAssets.map(asset => {
                      const cap     = MARKET_CAPS[asset.id] ?? MARKET_CAPS[asset.symbol] ?? 10e9;
                      const colSpan = getColSpan(cap, minCap, maxCap);
                      return <HeatCell key={asset.id} asset={asset} colSpan={colSpan} />;
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
