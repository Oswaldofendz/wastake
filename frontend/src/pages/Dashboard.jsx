import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrices } from '../hooks/usePrices.js';
import { PriceCard } from '../components/PriceCard.jsx';
import { CandleChart } from '../components/CandleChart.jsx';
import { AssetSearch } from '../components/AssetSearch.jsx';
import { Disclaimer } from '../components/Disclaimer.jsx';
import { AnalysisPanel } from '../components/AnalysisPanel.jsx';
import { NewsPanel } from '../components/NewsPanel.jsx';

export function Dashboard() {
  const { t } = useTranslation();
  const { allAssets, loading, error } = usePrices(60_000);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [extraAssets, setExtraAssets]     = useState([]);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [expandedCats, setExpandedCats]   = useState({ crypto: true });

  const CATALOG_CATEGORIES = [
    { id: 'crypto',      label: 'Crypto',         icon: '₿',  color: 'text-orange-400', ids: ['bitcoin','ethereum','solana','ripple','binancecoin','cardano','dogecoin','polkadot','avalanche-2','chainlink','shiba-inu','litecoin','cosmos','uniswap','near'] },
    { id: 'stocks',      label: 'Acciones',        icon: '🏢', color: 'text-sky-400',    ids: ['AAPL','MSFT','NVDA','TSLA','AMZN','GOOGL','META','NFLX','JPM','V'] },
    { id: 'etfs',        label: 'ETFs',            icon: '📊', color: 'text-green-400',  ids: ['SPY','QQQ','DIA','IWM','URTH','EEM','VTI','ARKK','XLK','XLF','XLE'] },
    { id: 'forex',       label: 'Forex',           icon: '💱', color: 'text-purple-400', ids: ['EURUSD=X','GBPUSD=X','USDJPY=X','USDMXN=X','USDBRL=X'] },
    { id: 'commodities', label: 'Materias Primas', icon: '🥇', color: 'text-yellow-400', ids: ['GC=F','SI=F'] },
    { id: 'indices',     label: 'Índices',         icon: '📈', color: 'text-blue-400',   ids: ['^GSPC','^NDX','^DJI','^FTSE','^N225','^GDAXI'] },
    { id: 'bonds',       label: 'Bonos',           icon: '🏛️', color: 'text-cyan-400',   ids: ['TLT','IEF','SHY','HYG','LQD'] },
  ];

  // JS-based breakpoint — bypasses any Tailwind purge issues
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  const chartAsset = selectedAsset ?? allAssets[0] ?? null;

  const displayAssets = [
    ...allAssets,
    ...extraAssets.filter(e => !allAssets.find(a => a.id === e.id)),
  ];

  function handleSearch(asset) {
    if (!displayAssets.find(a => a.id === asset.id)) {
      setExtraAssets(prev => [asset, ...prev]);
    }
    setSelectedAsset(asset);
    if (isMobile) setSidebarOpen(false);
  }

  return (
    <div className="flex flex-col h-full">
      <Disclaimer />

      {/* Layout: column on mobile, row on desktop */}
      <div
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          flex: 1,
          minHeight: 0,
          marginTop: '12px',
        }}
      >
        {/* ── Asset list ── */}
        <>
          {/* Mobile hamburger toggle */}
          {isMobile && (
            <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(100,116,139,0.3)' }}>
              <button
                onClick={() => setSidebarOpen(o => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700/50 text-sm text-slate-300 w-full hover:bg-slate-700/60 transition-colors"
              >
                <span className="text-base leading-none">{sidebarOpen ? '✕' : '☰'}</span>
                <span className="flex-1 text-left font-medium">
                  {chartAsset ? chartAsset.symbol : t('loading')}
                </span>
                {chartAsset && (
                  <span className={`text-sm font-mono font-bold ${(chartAsset.change24h ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {(chartAsset.change24h ?? 0) >= 0 ? '+' : ''}{chartAsset.change24h?.toFixed(2)}%
                  </span>
                )}
                <svg viewBox="0 0 16 16" fill="currentColor" className={`w-3 h-3 text-slate-500 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`}>
                  <path d="M8 10.5L2.5 5h11L8 10.5Z" />
                </svg>
              </button>
            </div>
          )}

          <aside
            style={{
              width: isMobile ? '100%' : '288px',
              flexShrink: 0,
              display: isMobile && !sidebarOpen ? 'none' : 'flex',
              flexDirection: 'column',
              borderRight: isMobile ? 'none' : '1px solid rgba(100,116,139,0.3)',
              borderBottom: isMobile ? '1px solid rgba(100,116,139,0.3)' : 'none',
              padding: '0 12px 12px',
              maxHeight: isMobile ? '320px' : 'none',
              overflowY: 'auto',
            }}
          >
            <div style={{ marginBottom: '12px', paddingTop: '12px' }}>
              <AssetSearch onSelect={handleSearch} />
            </div>

            {loading && !displayAssets.length ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-slate-600 border-t-brand-400 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-500">{t('loading')}</p>
                </div>
              </div>
            ) : error ? (
              <p className="text-base text-red-400 px-2">{t('error_fetch')}: {error}</p>
            ) : (
              <div className="flex flex-col gap-1">
                {CATALOG_CATEGORIES.map(cat => {
                  const catAssets = displayAssets.filter(a => cat.ids.includes(a.id));
                  if (!catAssets.length) return null;
                  const isOpen = !!expandedCats[cat.id];
                  return (
                    <div key={cat.id} className="rounded-lg overflow-hidden border border-slate-700/30">
                      <button
                        onClick={() => setExpandedCats(p => ({ ...p, [cat.id]: !p[cat.id] }))}
                        className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-slate-700/40 transition-colors"
                      >
                        <span className="text-sm leading-none">{cat.icon}</span>
                        <span className={`text-xs font-semibold uppercase tracking-wide ${cat.color}`}>{cat.label}</span>
                        <span className="text-xs text-slate-600 ml-1">({catAssets.length})</span>
                        <svg viewBox="0 0 16 16" fill="currentColor" className={`w-3 h-3 text-slate-500 ml-auto transition-transform ${isOpen ? 'rotate-180' : ''}`}>
                          <path d="M8 10.5L2.5 5h11L8 10.5Z" />
                        </svg>
                      </button>
                      {isOpen && (
                        <ul className="flex flex-col gap-1 p-1 bg-slate-900/20">
                          {catAssets.map(asset => (
                            <li key={asset.id}>
                              <PriceCard
                                asset={asset}
                                isSelected={chartAsset?.id === asset.id}
                                onClick={(a) => { setSelectedAsset(a); if (isMobile) setSidebarOpen(false); }}
                              />
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </aside>
        </>

        {/* ── Chart + analysis ── */}
        <main
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            padding: isMobile ? '8px' : '16px',
            overflowY: 'auto',
          }}
        >
          {chartAsset ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <StatCard label={t('price')} value={fmtPrice(chartAsset.price)} mono />
                <StatCard
                  label={t('change_24h')}
                  value={`${chartAsset.change24h >= 0 ? '+' : ''}${chartAsset.change24h?.toFixed(2)}%`}
                  positive={chartAsset.change24h >= 0}
                />
                <StatCard label={t('volume')} value={fmtCompact(chartAsset.volume24h)} />
              </div>

              {/* Chart container */}
              <div
                className="bg-slate-900 rounded-xl border border-slate-700/50 mb-3 overflow-hidden"
                style={{
                  width: '100%',
                  height: isMobile ? '300px' : undefined,
                  flex: isMobile ? 'none' : '1',
                  minHeight: isMobile ? '300px' : '260px',
                  padding: isMobile ? '8px' : '16px',
                }}
              >
                <CandleChart asset={chartAsset} />
              </div>

              <AnalysisPanel asset={chartAsset} fearGreedValue={null} />
              <NewsPanel asset={chartAsset} />
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px' }}
              className="text-slate-500 text-base">
              {t('loading')}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function StatCard({ label, value, mono = false, positive }) {
  const isColored = positive !== undefined;
  return (
    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={[
        'text-base font-semibold',
        isColored ? (positive ? 'text-green-400' : 'text-red-400') : 'text-white',
        mono ? 'font-mono' : '',
      ].join(' ')}>
        {value}
      </p>
    </div>
  );
}

function fmtPrice(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1)    return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function fmtCompact(n) {
  if (n == null) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
