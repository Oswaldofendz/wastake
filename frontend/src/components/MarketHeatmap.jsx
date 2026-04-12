import { useState, useEffect, useRef } from 'react';
import { fetchAllPrices } from '../services/api.js';

// ─── Market caps in billions USD (approximate) ────────────────────────────────
const MCAP = {
  // Crypto
  bitcoin: 1400, ethereum: 280, solana: 50, ripple: 120,
  binancecoin: 85, dogecoin: 22, cardano: 18, 'avalanche-2': 12,
  chainlink: 8, polkadot: 7, 'shiba-inu': 10, litecoin: 6,
  near: 5, uniswap: 5, 'bitcoin-cash': 7, stellar: 4,
  cosmos: 5, 'internet-computer': 8,
  // Technology
  AAPL: 3200, MSFT: 2900, NVDA: 2200, GOOGL: 1800,
  META: 1400, NFLX: 380, AMD: 240, ORCL: 400,
  CRM: 280, ADBE: 220, INTC: 90, UBER: 140,
  SHOP: 110, PYPL: 75,
  // Consumer / E-commerce
  AMZN: 1900, TSLA: 800, WMT: 750, MCD: 220,
  DIS: 200, KO: 260, PEP: 220, NKE: 120,
  // Finance
  JPM: 700, V: 600, GS: 160, MS: 150,
  // Healthcare
  JNJ: 380, PFE: 160,
  // Energy / Industrial
  XOM: 470, BA: 110,
  // Commodities
  'GC=F': 180, 'SI=F': 17,
};

const SECTORS = [
  {
    id: 'tech', label: 'Tecnología', color: '#3b82f6',
    ids: ['AAPL','MSFT','NVDA','GOOGL','META','NFLX','AMD','ORCL','CRM','ADBE','INTC','UBER','SHOP','PYPL'],
  },
  {
    id: 'consumer', label: 'Consumo', color: '#8b5cf6',
    ids: ['AMZN','TSLA','WMT','MCD','DIS','KO','PEP','NKE'],
  },
  {
    id: 'finance', label: 'Finanzas', color: '#10b981',
    ids: ['JPM','V','GS','MS'],
  },
  {
    id: 'healthcare', label: 'Salud', color: '#ec4899',
    ids: ['JNJ','PFE'],
  },
  {
    id: 'energy', label: 'Energía/Ind.', color: '#f59e0b',
    ids: ['XOM','BA'],
  },
  {
    id: 'crypto', label: 'Crypto', color: '#f97316',
    ids: ['bitcoin','ethereum','solana','ripple','binancecoin','dogecoin','cardano','avalanche-2','chainlink','polkadot','shiba-inu','litecoin','near','uniswap','bitcoin-cash','stellar','cosmos','internet-computer'],
  },
  {
    id: 'commodities', label: 'Mat. Primas', color: '#eab308',
    ids: ['GC=F','SI=F'],
  },
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

const GAP = 2;

// ─── Binary-split treemap layout ─────────────────────────────────────────────
function computeLayout(items, x, y, w, h) {
  if (!items.length) return [];
  if (items.length === 1) {
    return [{ id: items[0].id, x: x + GAP, y: y + GAP, w: Math.max(1, w - GAP * 2), h: Math.max(1, h - GAP * 2) }];
  }

  const total = items.reduce((s, i) => s + i.value, 0);

  // Find the split closest to 50/50 by cumulative value
  let cumVal = 0;
  let splitIdx = 1;
  for (let i = 0; i < items.length - 1; i++) {
    const before = Math.abs(cumVal - total / 2);
    cumVal += items[i].value;
    const after = Math.abs(cumVal - total / 2);
    splitIdx = i + 1;
    if (after >= before) break;
  }
  splitIdx = Math.max(1, Math.min(splitIdx, items.length - 1));

  const leftItems = items.slice(0, splitIdx);
  const rightItems = items.slice(splitIdx);
  const leftVal = leftItems.reduce((s, i) => s + i.value, 0);

  if (w >= h) {
    const leftW = Math.round((leftVal / total) * w);
    return [
      ...computeLayout(leftItems,  x,          y, leftW,     h),
      ...computeLayout(rightItems, x + leftW,  y, w - leftW, h),
    ];
  } else {
    const leftH = Math.round((leftVal / total) * h);
    return [
      ...computeLayout(leftItems,  x, y,          w, leftH),
      ...computeLayout(rightItems, x, y + leftH,  w, h - leftH),
    ];
  }
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
function AssetCell({ asset, layout }) {
  const { x, y, w, h } = layout;
  if (w < 4 || h < 4) return null;

  const change = asset?.change24h != null && !isNaN(asset.change24h) ? asset.change24h : 0;
  const bg     = heatColor(change);
  const symbol = asset?.symbol ?? layout.id;
  const logo   = asset?.image ?? CRYPTO_LOGOS[layout.id] ?? CRYPTO_LOGOS[asset?.id];
  const price  = fmtPrice(asset?.price);

  const isXL    = w > 140 && h > 100;
  const isLarge = w > 85  && h > 65;
  const isMed   = w > 50  && h > 42;
  const isSmall = w > 28  && h > 22;

  return (
    <div
      title={`${asset?.name ?? symbol}  ${fmtChange(change)}${price ? '  ' + price : ''}`}
      style={{
        position: 'absolute',
        left: x, top: y, width: w, height: h,
        backgroundColor: bg,
        borderRadius: 3,
        overflow: 'hidden',
        cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.05)',
        boxSizing: 'border-box',
        transition: 'filter 0.1s',
      }}
      onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.25)'; e.currentTarget.style.zIndex = 10; }}
      onMouseLeave={e => { e.currentTarget.style.filter = ''; e.currentTarget.style.zIndex = ''; }}
    >
      {isSmall && (
        <div style={{
          width: '100%', height: '100%',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: isLarge ? 3 : 1,
          padding: isXL ? 10 : isLarge ? 6 : 3,
        }}>
          {isLarge && logo && (
            <img
              src={logo} alt={symbol}
              style={{ width: isXL ? 38 : 24, height: isXL ? 38 : 24, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              onError={e => { e.target.style.display = 'none'; }}
            />
          )}
          {isMed && (
            <span style={{ color: 'rgba(255,255,255,0.95)', fontWeight: 700, fontSize: isXL ? 14 : isLarge ? 11 : 9, lineHeight: 1.1, textAlign: 'center' }}>
              {symbol}
            </span>
          )}
          {isXL && price && (
            <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, fontFamily: 'monospace' }}>{price}</span>
          )}
          <span style={{ color: 'white', fontWeight: 700, fontSize: isXL ? 17 : isLarge ? 13 : isMed ? 10 : 8, fontFamily: 'monospace', lineHeight: 1, textAlign: 'center' }}>
            {fmtChange(change)}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function MarketHeatmap({ assets: assetsProp }) {
  const containerRef = useRef(null);
  const [containerW, setContainerW] = useState(0);
  const [ownAssets, setOwnAssets]   = useState([]);
  const [loading, setLoading]       = useState(false);

  const HEIGHT = 600;
  const LABEL_H = 15;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerW(Math.floor(el.getBoundingClientRect().width));
    const ro = new ResizeObserver(entries => {
      setContainerW(Math.floor(entries[0].contentRect.width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  // Sector layout — sorted by total market cap descending
  const sectorItems = SECTORS
    .map(s => ({ id: s.id, value: s.ids.reduce((sum, id) => sum + (MCAP[id] ?? 5), 0) }))
    .sort((a, b) => b.value - a.value);

  const sectorLayouts = containerW > 0 ? computeLayout(sectorItems, 0, 0, containerW, HEIGHT) : [];

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

      {/* Treemap */}
      <div ref={containerRef} style={{ position: 'relative', height: HEIGHT, background: '#0f172a', overflow: 'hidden' }}>
        {(loading || containerW === 0) ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : sectorLayouts.map(sLayout => {
          const sector = SECTORS.find(s => s.id === sLayout.id);
          if (!sector) return null;

          const { x, y, w, h } = sLayout;

          // Asset layout within sector bounds, offset by label height
          const assetItems = sector.ids
            .map(id => ({ id, value: MCAP[id] ?? 5 }))
            .sort((a, b) => b.value - a.value);

          const assetLayouts = computeLayout(assetItems, x, y + LABEL_H, w, h - LABEL_H);

          return (
            <div key={sector.id}>
              {/* Sector border */}
              <div style={{
                position: 'absolute', left: x, top: y, width: w, height: h,
                border: `1px solid ${sector.color}45`,
                borderRadius: 5,
                pointerEvents: 'none',
                zIndex: 2,
                boxSizing: 'border-box',
              }} />
              {/* Sector label */}
              <div style={{
                position: 'absolute', left: x + 5, top: y + 3,
                zIndex: 3, color: sector.color,
                fontSize: 9, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.07em',
                background: 'rgba(0,0,0,0.55)', padding: '1px 4px', borderRadius: 2,
                pointerEvents: 'none', whiteSpace: 'nowrap',
              }}>
                {sector.label}
              </div>
              {/* Asset cells */}
              {assetLayouts.map(aLayout => {
                const asset = allAssets.find(a => a.id === aLayout.id || a.symbol === aLayout.id);
                return <AssetCell key={aLayout.id} asset={asset} layout={aLayout} />;
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
