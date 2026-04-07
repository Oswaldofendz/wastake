import { useState } from 'react';
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
  const [selectedAsset, setSelectedAsset]     = useState(null);
  const [extraAssets, setExtraAssets]         = useState([]);
  const [mobileShowChart, setMobileShowChart] = useState(false);

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
    setMobileShowChart(true);
  }

  function handleAssetClick(asset) {
    setSelectedAsset(asset);
    setMobileShowChart(true);
  }

  return (
    <div className="flex flex-col h-full">
      <Disclaimer />

      <div className="flex flex-col md:flex-row flex-1 min-h-0 gap-0 mt-3">

        {/* ── Asset list — full width on mobile, sidebar on desktop ── */}
        <aside className={[
          'w-full md:w-72 flex-shrink-0 flex flex-col',
          'border-b md:border-b-0 md:border-r border-slate-700/50',
          'px-3 pb-4 overflow-hidden',
          // Mobile: hide when chart is open
          mobileShowChart ? 'hidden md:flex' : 'flex',
          'md:max-h-none',
        ].join(' ')}>
          <div className="mb-3">
            <AssetSearch onSelect={handleSearch} />
          </div>

          {loading && !displayAssets.length ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-brand-400 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">{t('loading')}</p>
              </div>
            </div>
          ) : error ? (
            <p className="text-base text-red-400 px-2">{t('error_fetch')}: {error}</p>
          ) : (
            <ul className="flex-1 overflow-y-auto space-y-2 pr-1">
              {displayAssets.map(asset => (
                <li key={asset.id}>
                  <PriceCard
                    asset={asset}
                    isSelected={chartAsset?.id === asset.id}
                    onClick={handleAssetClick}
                  />
                </li>
              ))}
            </ul>
          )}
        </aside>

        {/* ── Chart panel — hidden on mobile when list is showing ── */}
        <main className={[
          'flex-1 min-w-0 flex flex-col p-3 md:p-4',
          !mobileShowChart ? 'hidden md:flex' : 'flex',
        ].join(' ')}>
          {/* Mobile back button */}
          <button
            onClick={() => setMobileShowChart(false)}
            className="md:hidden flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-3 min-h-[44px] px-1"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Volver a la lista
          </button>

          {chartAsset ? (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 md:gap-3 mb-3 md:mb-4">
                <StatCard
                  label={t('price')}
                  value={fmtPrice(chartAsset.price)}
                  mono
                />
                <StatCard
                  label={t('change_24h')}
                  value={`${chartAsset.change24h >= 0 ? '+' : ''}${chartAsset.change24h?.toFixed(2)}%`}
                  positive={chartAsset.change24h >= 0}
                />
                <StatCard
                  label={t('volume')}
                  value={fmtCompact(chartAsset.volume24h)}
                />
              </div>

              {/* Candlestick chart — min-height ensures it's tall enough on mobile */}
              <div className="min-h-[260px] md:flex-1 md:min-h-0 bg-slate-900 rounded-xl border border-slate-700/50 p-3 md:p-4">
                <CandleChart asset={chartAsset} />
              </div>

              {/* Technical analysis */}
              <AnalysisPanel asset={chartAsset} />

              {/* News */}
              <NewsPanel asset={chartAsset} />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 text-base">
              {t('loading')}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────

function StatCard({ label, value, mono = false, positive }) {
  const isColored = positive !== undefined;
  return (
    <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/40">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={[
        'text-base font-semibold',
        isColored
          ? positive ? 'text-green-400' : 'text-red-400'
          : 'text-white',
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
