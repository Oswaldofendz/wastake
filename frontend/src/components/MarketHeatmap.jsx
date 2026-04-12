import { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { fetchAllPrices } from '../services/api.js';

// ─── Market caps ──────────────────────────────────────────────────────────────
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
  'GC=F': 200e9,
};

// ─── Stock brand colors for SVG fallback logos ────────────────────────────────
const STOCK_COLORS = {
  AAPL: '#555555', MSFT: '#00a4ef', NVDA: '#76b900', AMZN: '#ff9900',
  GOOGL: '#4285f4', META: '#0866ff', TSLA: '#e31937', JPM: '#003087',
  V: '#1a1f71', NFLX: '#e50914', AMD: '#ed1c24', INTC: '#0071c5',
  ORCL: '#f80000', CRM: '#00a1e0', ADBE: '#ff0000', PYPL: '#003087',
  UBER: '#000000', SHOP: '#96bf48', DIS: '#006e99', BA: '#1d428a',
  GS: '#6d6e71', MS: '#004f9f', WMT: '#0071ce', KO: '#f40009',
  PEP: '#004b93', MCD: '#ffbc0d', NKE: '#f05a22', PFE: '#0093d0',
  JNJ: '#d51f29', XOM: '#ee0000',
};

const SECTORS = [
  { id: 'crypto',      label: 'Crypto',        children: ['bitcoin','ethereum','solana','ripple','binancecoin','cardano','dogecoin','avalanche-2','chainlink','polkadot','shiba-inu','litecoin','uniswap','bitcoin-cash','stellar','cosmos','near','internet-computer'] },
  { id: 'tech',        label: 'Tecnología',    children: ['AAPL','MSFT','NVDA','GOOGL','META','NFLX','AMD','INTC','ORCL','CRM','ADBE'] },
  { id: 'consumer',    label: 'Consumo',       children: ['AMZN','TSLA','PYPL','UBER','SHOP','DIS','WMT','MCD','KO','PEP','NKE'] },
  { id: 'finance',     label: 'Finanzas',      children: ['JPM','V','GS','MS'] },
  { id: 'health',      label: 'Salud',         children: ['JNJ','PFE'] },
  { id: 'energy',      label: 'Energía/Ind.',  children: ['XOM','BA'] },
  { id: 'commodities', label: 'Mat. Primas',   children: ['GC=F'] },
];

function heatColor(change) {
  if (change == null || isNaN(change)) return '#1e293b';
  if (change >= 5)  return '#15803d';
  if (change >= 3)  return '#16a34a';
  if (change >= 1)  return '#166534';
  if (change >= 0)  return '#14532d';
  if (change >= -1) return '#7f1d1d';
  if (change >= -3) return '#991b1b';
  if (change >= -5) return '#b91c1c';
  return '#dc2626';
}

function fmtPrice(n) {
  if (n == null || isNaN(n) || n <= 0) return '—';
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1) return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

export function MarketHeatmap({ assets: assetsProp }) {
  const [assets, setAssets]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [tooltip, setTooltip]         = useState(null);
  const [focusedSector, setFocusedSector] = useState(null);
  const containerRef                  = useRef(null);
  const [dims, setDims]               = useState({ width: 1200, height: 600 });

  useEffect(() => {
    if (assetsProp?.length) {
      setAssets(assetsProp.filter(a => a.type !== 'etf'));
      setLoading(false);
      return;
    }
    fetchAllPrices()
      .then(data => {
        const list = [
          ...Object.values(data?.crypto ?? {}),
          ...Object.values(data?.traditional ?? {}),
        ].filter(a => a.type !== 'etf');
        setAssets(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assetsProp]);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      const { width } = entries[0].contentRect;
      setDims({ width, height: Math.max(500, width * 0.5) });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // When focused, expand height 1.8×
  const treeHeight = focusedSector ? dims.height * 1.8 : dims.height;

  const treemapData = {
    id: 'root',
    children: SECTORS
      .filter(s => !focusedSector || s.id === focusedSector)
      .map(sector => ({
        id: sector.id,
        label: sector.label,
        children: sector.children
          .map(id => assets.find(a => a.id === id || a.symbol === id))
          .filter(Boolean)
          .map(asset => ({
            id: asset.id,
            name: asset.name,
            symbol: asset.symbol,
            price: asset.price,
            change: asset.change24h ?? 0,
            image: asset.image,
            value: MARKET_CAPS[asset.id] ?? MARKET_CAPS[asset.symbol] ?? 5e9,
          })),
      })).filter(s => s.children.length > 0),
  };

  const root = d3.hierarchy(treemapData)
    .sum(d => d.value ?? 0)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([dims.width, treeHeight])
    .paddingOuter(4)
    .paddingTop(24)
    .paddingInner(2)
    .round(true)(root);

  if (loading) return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl p-6 animate-pulse" style={{ height: 600 }}>
      <div className="h-3 bg-slate-700 rounded w-40 mb-4" />
      <div className="h-full bg-slate-700/30 rounded" />
    </div>
  );

  return (
    <div className="bg-slate-900/80 border border-slate-700/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/40 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Heatmap de Mercado</h3>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: '#dc2626' }} /> {'≤-5%'}</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: '#14532d' }} /> 0%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-2 rounded" style={{ background: '#15803d' }} /> {'+5%'}</span>
        </div>
      </div>

      {/* Back button when zoomed into a sector */}
      {focusedSector && (
        <div className="px-4 py-2 border-b border-slate-700/40">
          <button
            onClick={() => setFocusedSector(null)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            ← Volver a todos los sectores
          </button>
        </div>
      )}

      {/* Treemap */}
      <div ref={containerRef} style={{ position: 'relative', width: '100%', height: treeHeight }}>
        <svg width={dims.width} height={treeHeight} style={{ position: 'absolute', top: 0, left: 0 }}>
          {root.children?.map(sector => (
            <g key={sector.data.id}>
              {/* Sector background border */}
              <rect
                x={sector.x0} y={sector.y0}
                width={sector.x1 - sector.x0}
                height={sector.y1 - sector.y0}
                fill="transparent"
                stroke="#334155"
                strokeWidth={1}
                rx={4}
              />
              {/* Sector label — click to zoom */}
              <text
                x={sector.x0 + 6}
                y={sector.y0 + 16}
                fill={focusedSector === sector.data.id ? '#60a5fa' : '#94a3b8'}
                fontSize={11}
                fontWeight={600}
                style={{ cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                onClick={() => setFocusedSector(s => s === sector.data.id ? null : sector.data.id)}
              >
                {sector.data.label}{focusedSector === sector.data.id ? ' ✕' : ''}
              </text>

              {/* Asset cells */}
              {sector.children?.map(node => {
                const w = node.x1 - node.x0;
                const h = node.y1 - node.y0;
                if (w < 20 || h < 20) return null;
                const d = node.data;
                const bg = heatColor(d.change);
                const showLogo  = w > 60 && h > 60;
                const showPrice = w > 70 && h > 55;
                const showName  = w > 45 && h > 35;

                const logoY = node.y0 + (showPrice ? h / 2 - 32 : h / 2 - 18);
                const isCryptoLogo = d.image && !STOCK_COLORS[d.symbol];
                const hasStockColor = !!STOCK_COLORS[d.symbol];
                const circleY = node.y0 + (showPrice ? h / 2 - 18 : h / 2 - 8);

                return (
                  <g
                    key={node.data.id}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, data: d })}
                    onMouseLeave={() => setTooltip(null)}
                    onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                  >
                    <rect
                      x={node.x0 + 1} y={node.y0 + 1}
                      width={w - 2} height={h - 2}
                      fill={bg}
                      rx={3}
                    />

                    {/* Logo: crypto uses image, stocks use colored circle + initials */}
                    {showLogo && isCryptoLogo && (
                      <image
                        href={d.image}
                        x={node.x0 + w / 2 - 14}
                        y={logoY}
                        width={28} height={28}
                      />
                    )}
                    {showLogo && !isCryptoLogo && (
                      <>
                        <circle
                          cx={node.x0 + w / 2}
                          cy={circleY + 6}
                          r={14}
                          fill={hasStockColor ? STOCK_COLORS[d.symbol] : '#334155'}
                          opacity={0.9}
                        />
                        <text
                          x={node.x0 + w / 2}
                          y={circleY + 10}
                          textAnchor="middle"
                          fill="white"
                          fontSize={9}
                          fontWeight={700}
                        >
                          {d.symbol.slice(0, 3)}
                        </text>
                      </>
                    )}

                    {/* Symbol */}
                    {showName && (
                      <text
                        x={node.x0 + w / 2}
                        y={node.y0 + h / 2 + (showLogo ? 6 : -4)}
                        textAnchor="middle"
                        fill="white"
                        fontSize={w > 80 ? 13 : 11}
                        fontWeight={700}
                      >
                        {d.symbol}
                      </text>
                    )}

                    {/* Price */}
                    {showPrice && (
                      <text
                        x={node.x0 + w / 2}
                        y={node.y0 + h / 2 + (showLogo ? 22 : 12)}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.75)"
                        fontSize={w > 80 ? 11 : 9}
                      >
                        {fmtPrice(d.price)}
                      </text>
                    )}

                    {/* % change */}
                    <text
                      x={node.x0 + w / 2}
                      y={node.y0 + h / 2 + (showLogo ? 38 : showPrice ? 26 : 8)}
                      textAnchor="middle"
                      fill="white"
                      fontSize={w > 80 ? 13 : w > 50 ? 11 : 9}
                      fontWeight={600}
                    >
                      {d.change >= 0 ? '+' : ''}{Number(d.change).toFixed(2)}%
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            style={{
              position: 'fixed',
              left: tooltip.x + 12,
              top: tooltip.y - 10,
              zIndex: 9999,
              pointerEvents: 'none',
            }}
            className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-2xl text-xs"
          >
            <p className="font-bold text-white text-sm">{tooltip.data.name} ({tooltip.data.symbol})</p>
            <p className="text-slate-300 mt-1">Precio: {fmtPrice(tooltip.data.price)}</p>
            <p className={tooltip.data.change >= 0 ? 'text-green-400' : 'text-red-400'}>
              Cambio 24h: {tooltip.data.change >= 0 ? '+' : ''}{Number(tooltip.data.change).toFixed(2)}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
