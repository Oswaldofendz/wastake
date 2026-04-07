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
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [extraAssets, setExtraAssets]     = useState([]);

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
    <div className="flex flex-col h-full overflow-y-auto md:overflow-hidden">
      <Disclaimer />

      {/*
        Mobile-first layout:
        - Mobile: single column, list on top then chart+analysis below
        - Desktop (md+): two columns side by side
      */}
      <div className="flex flex-col md:flex-row md:flex-1 md:min-h-0 mt-3">

        {/* ── Asset list ─────────────────────────────────────────── */}
        <aside className="
          w-full md:w-72 md:flex-shrink-0
          flex flex-col
          border-b md:border-b-0 md:border-r border-slate-700/50
          px-3 pb-3
          md:overflow-hidden
          md:h-full
        ">
          <div className="mb-3">
            <AssetSearch onSelect={handleSearch} />
          </div>

          {loading && !displayAssets.length ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-brand-400 rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">{t('loading')}</p>
              </div>
            </div>
          ) : error ? (
            <p className="text-base text-red-400 px-2">{t('error_fetch')}: {error}</p>
          ) : (
            /* Mobile: show all cards in a scrollable horizontal strip or vertical list */
            <ul className="
              flex flex-row gap-2 overflow-x-auto pb-2
              md:flex-col md:overflow-x-hidden md:overflow-y-auto md:space-y-2 md:pr-1
              scrollbar-none
            ">
              {displayAssets.map(asset => (
                <li key={asset.id} className="flex-shrink-0 w-56 md:w-auto">
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

        {/* ── Chart + analysis — always visible below on mobile ── */}
        <main className="flex-1 min-w-0 flex flex-col p-3 md:p-4 md:overflow-y-auto">
          {chartAsset ? (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-3 gap-2 mb-3">
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

              {/* Candlestick chart — 400px on mobile, flex-1 on desktop */}
              <div className="h-[400px] md:h-auto md:flex-1 md:min-h-[300px] bg-slate-900 rounded-xl border border-slate-700/50 p-3 md:p-4 mb-3">
                <CandleChart asset={chartAsset} />
              </div>

              {/* Technical analysis — stacked vertically */}
              <AnalysisPanel asset={chartAsset} />

              {/* News */}
              <NewsPanel asset={chartAsset} />
            </>
          ) : (
            <div className="flex items-center justify-center py-16 text-slate-500 text-base">
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
