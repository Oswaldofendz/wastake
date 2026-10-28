import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PriceCard } from '../components/PriceCard.jsx';
import { CandleChart } from '../components/PriceChart.jsx';
import { AssetSearch } from '../components/AssetSearch.jsx';
import { Disclaimer } from '../components/Disclaimer.jsx';
import { AnalysisPanel } from '../components/AnalysisPanel.jsx';
import { NewsPanel } from '../components/NewsPanel.jsx';
import {OpportunityPanel} from '../components/OpportunityPanel.jsx';
import { MarketLeaders } from '../components/MarketLeaders.jsx';
import {useSelectedQuote} from '../hooks/useSelectedQuote.js';
import { currentSelection } from '../utils/marketConventions.js';
import { formatQuote } from '../utils/panoramaAnalysis.js';

// Visible zoom only; every technical view uses the same source history.
const TIMEFRAMES=['1D','1S','1M','3M','6M','1A'].map(label=>({label}));

export function Dashboard({marketData}) {
  const { t,i18n } = useTranslation();
  const { allAssets, loading, error, isStale, refresh } = marketData;
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [extraAssets, setExtraAssets]     = useState([]);
  const [sidebarOpen, setSidebarOpen]     = useState(false);
  const [expandedCats, setExpandedCats]   = useState({});
  const [activeTf, setActiveTf]           = useState(TIMEFRAMES.find(t=>t.label==='3M'));
  const [candleInterval,setCandleInterval]=useState('1d');

  // IDs deben coincidir exactamente con las claves de TRADITIONAL_ASSETS en el backend
  const CATALOG_CATEGORIES = [
    { id: 'crypto',      label: 'Crypto',         icon: '₿',  color: 'text-orange-400', ids: ['bitcoin','ethereum','solana','ripple','binancecoin','cardano','dogecoin','polkadot','avalanche-2','chainlink','shiba-inu','litecoin','cosmos','uniswap','near'] },
    { id: 'stocks',      label: 'Acciones',        icon: '🏢', color: 'text-sky-400',    ids: ['AAPL','MSFT','NVDA','TSLA','AMZN','GOOGL','META','NFLX','JPM','V','AMD','INTC','ORCL','CRM','ADBE','PYPL','UBER','SHOP','DIS','BA','GS','MS','WMT','KO','PEP','MCD','NKE','PFE','JNJ','XOM'] },
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

  const chartAsset = useSelectedQuote(currentSelection(selectedAsset,allAssets));

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
    <div className="mx-auto flex h-full w-full max-w-[1680px] flex-col">
      <Disclaimer />
      <MarketLeaders marketData={marketData} onSelect={handleSearch}/><OpportunityPanel/>

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
                    {(chartAsset.change24h ?? 0) >= 0 ? '+' : ''}{chartAsset.change24h != null && !isNaN(chartAsset.change24h) ? chartAsset.change24h.toFixed(2) : '0.00'}%
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
              <AssetSearch onSelect={handleSearch} catalogueAssets={displayAssets} />
            </div>

            {loading && !displayAssets.length ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '32px' }}>
                <div className="text-center">
                  <div className="w-6 h-6 border-2 border-slate-600 border-t-brand-400 rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-500">{t('loading')}</p>
                </div>
              </div>
            ) : error ? (
              <div className="px-2 py-4 text-center" role="alert">
                <p className="text-sm text-amber-300">{t('dashboard_data_unavailable')}</p>
                <button type="button" onClick={refresh} className="mt-3 text-xs font-semibold text-brand-300 underline underline-offset-2">
                  {t('retry')}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1">
                {CATALOG_CATEGORIES.map(cat => {
                  const kinds={stocks:"stock",etfs:"etf",bonds:"bond",commodities:"commodity",indices:"index",forex:"forex",crypto:"crypto"};
                  const catAssets=displayAssets.filter(a=>a.type===kinds[cat.id]);
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
          {isStale && chartAsset && (
            <p className="mb-3 rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-300" role="status">
              {t('market_data_stale')}
            </p>
          )}
          {chartAsset ? (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mb-3">
                <StatCard label={`${t('price')} · ${chartAsset.currency || (chartAsset.type==='crypto'?'USD':'—')}`} value={formatQuote(chartAsset.price,chartAsset.currency||(chartAsset.type==='crypto'?'USD':null),i18n.language,chartAsset.type==='forex'?5:null)} mono />
                <StatCard
                  label={t('change_24h')}
                  value={chartAsset.change24h != null && !isNaN(chartAsset.change24h) ? `${chartAsset.change24h >= 0 ? '+' : ''}${chartAsset.change24h.toFixed(2)}%` : '—'}
                  positive={Number.isFinite(chartAsset.change24h)?chartAsset.change24h>=0:undefined}
                />
                <StatCard label={t(chartAsset.type==='crypto'?'audit_crypto_volume':'audit_traded_volume')} value={chartAsset.type === 'crypto' ? fmtCompact(chartAsset.volume24h) : chartAsset.volume24h > 0 ? chartAsset.volume24h.toLocaleString(undefined,{notation:'compact',maximumFractionDigits:2}) : '—'} />
              </div>
              <p className="mb-3 text-xs leading-5 text-slate-400"><span translate="no">{chartAsset.source}</span>{chartAsset.quoteAsOf&&` · ${new Date(chartAsset.quoteAsOf).toLocaleString(i18n.language)}`}</p>

              {/* Timeframe selector + Chart container */}
              <div
                className="bg-slate-900 rounded-xl border border-slate-700/50 mb-3 overflow-hidden"
                style={{
                  width: '100%',
                  flex: 'none',
                  minHeight: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Barra de timeframes */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/50 px-3 py-2">
                 <div className="flex flex-wrap items-center gap-1" role="group" aria-label={t('audit_visible_period')}>
                  <span className="text-xs text-slate-500 mr-1">{t('audit_visible_period')}:</span>
                  {TIMEFRAMES.map(tf => (
                    <button
                      key={tf.label}
                      onClick={() => setActiveTf(tf)}
                      className={[
                        'px-2.5 py-1 rounded-md text-xs font-semibold transition-colors',
                        activeTf.label === tf.label
                          ? 'bg-brand-500/20 text-brand-300 border border-brand-500/40'
                          : 'text-slate-400 hover:text-white hover:bg-slate-800',
                      ].join(' ')}
                    >
                      {tf.label}
                    </button>
                  ))}
                 </div>
                 <label className="flex items-center gap-2 text-xs text-slate-400">{t('candle_interval')}<select value={candleInterval} onChange={e=>{const value=e.target.value;setCandleInterval(value);setActiveTf(TIMEFRAMES.find(tf=>tf.label===(value==='15m'?'1S':value==='4h'?'1M':'3M')));}} className="min-h-10 rounded-lg border border-slate-600 bg-slate-800 px-2 text-sm text-slate-100"><option value="15m">15 min</option><option value="4h">4 h</option><option value="1d">{t('candle_daily')}</option></select></label>
                </div>
                <p className="px-3 pt-2 text-[11px] leading-5 text-slate-400">{t('chart_time_controls_note')}</p>

                {/* Chart */}
                <div style={{ flex: 1, minHeight: 0, padding: isMobile ? '8px' : '12px' }}>
                  <CandleChart key={`chart:${chartAsset.type}:${chartAsset.id}`} asset={chartAsset} timeframe={activeTf.label} interval={candleInterval}/>
                </div>
              </div>

              <AnalysisPanel key={`analysis:${chartAsset.type}:${chartAsset.id}`} asset={chartAsset} />
              <NewsPanel key={`news:${chartAsset.type}:${chartAsset.id}`} asset={chartAsset} />
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px' }}
              className="text-slate-400 text-base">
              {loading ? (
                <div className="text-center" role="status" aria-live="polite">
                  <div className="w-6 h-6 border-2 border-slate-600 border-t-brand-400 rounded-full animate-spin mx-auto mb-3" />
                  <p>{t('loading')}</p>
                </div>
              ) : error ? (
                <div className="max-w-md text-center" role="alert">
                  <p>{t('dashboard_data_unavailable')}</p>
                  <button
                    type="button"
                    onClick={refresh}
                    className="mt-4 rounded-lg border border-slate-600 px-4 py-2 text-sm text-white hover:bg-slate-800"
                  >
                    {t('retry')}
                  </button>
                </div>
              ) : (
                <p role="status">{t('dashboard_no_assets')}</p>
              )}
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

function fmtPrice(n, currency=null) {
  if (n == null || isNaN(n)) return '—';
  if(currency!=='USD') return `${n.toLocaleString(undefined,{maximumFractionDigits:4})}${currency?` ${currency}`:''}`;
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1)    return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function fmtCompact(n) {
  if (n == null || isNaN(n) || n <= 0) return '—';
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
