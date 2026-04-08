import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePrices } from '../hooks/usePrices.js';
import { PriceCard } from '../components/PriceCard.jsx';
import { CandleChart } from '../components/CandleChart.jsx';
import { AssetSearch } from '../components/AssetSearch.jsx';
import { Disclaimer } from '../components/Disclaimer.jsx';
import { AnalysisPanel } from '../components/AnalysisPanel.jsx';
import { NewsPanel } from '../components/NewsPanel.jsx';
import { FearGreedWidget } from '../components/FearGreedWidget.jsx';

export function Dashboard() {
  const { t } = useTranslation();
  const { allAssets, loading, error } = usePrices(60_000);
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [extraAssets, setExtraAssets]     = useState([]);

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
        <aside
          style={{
            width: isMobile ? '100%' : '288px',
            flexShrink: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: isMobile ? 'none' : '1px solid rgba(100,116,139,0.3)',
            borderBottom: isMobile ? '1px solid rgba(100,116,139,0.3)' : 'none',
            padding: '0 12px 12px',
            maxHeight: isMobile ? '250px' : 'none',
            overflowY: 'auto',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
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
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {displayAssets.map(asset => (
                <li key={asset.id}>
                  <PriceCard
                    asset={asset}
                    isSelected={chartAsset?.id === asset.id}
                    onClick={setSelectedAsset}
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>

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

              <div style={{ marginBottom: '12px' }}>
                <FearGreedWidget />
              </div>
              <AnalysisPanel asset={chartAsset} />
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
  if (n == null) return '—';
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
