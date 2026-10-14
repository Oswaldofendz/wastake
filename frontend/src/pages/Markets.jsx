import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FearGreedGauge }    from '../components/FearGreedGauge.jsx';
import { BTCDominance }      from '../components/BTCDominance.jsx';
import { MarketHeatmap }     from '../components/MarketHeatmap.jsx';
import { CorrelationMatrix } from '../components/CorrelationMatrix.jsx';
import { WhaleAlerts }       from '../components/WhaleAlerts.jsx';
import { EconomicCalendar }  from '../components/EconomicCalendar.jsx';
import { MacroRatesTable }   from '../components/MacroRatesTable.jsx';

const TABS = [
  { id: 'overview', key: 'markets_tab_overview' },
  { id: 'heatmap', key: 'markets_tab_heatmap' },
  { id: 'correlations', key: 'markets_tab_correlations' },
  { id: 'calendar', key: 'markets_tab_calendar' },
];

export function Markets({ allAssets }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('overview');

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-0 border-b border-slate-700/50">
        {/* Page title */}
        <div className="mb-3">
          <h1 className="text-lg font-bold text-white">Mercados</h1>
          <p className="text-xs text-slate-500">Visión global del mercado financiero</p>
        </div>

        {/* Tabs */}
        <nav className="grid grid-cols-2 gap-1 -mb-px sm:flex sm:overflow-x-auto sm:scrollbar-none" aria-label={t('markets_section_tabs')}>
          {TABS.map(item => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={[
                'min-w-0 px-2 sm:px-4 py-3 text-sm sm:text-base text-center font-medium transition-colors border-b-2 whitespace-normal sm:whitespace-nowrap min-h-[44px] sm:flex-shrink-0',
                tab === item.id
                  ? 'text-white border-brand-400 bg-slate-800/60'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800/40',
              ].join(' ')}
            >
              {t(item.key)}
            </button>
          ))}
        </nav>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* ── Overview ─────────────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {/* F&G + BTC Dom side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FearGreedGauge />
              <BTCDominance />
            </div>

            {/* Whale Alerts */}
            <WhaleAlerts />

            {/* Quick heatmap preview */}
            <MarketHeatmap assets={allAssets} />
          </>
        )}

        {/* ── Heatmap ──────────────────────────────────────────── */}
        {tab === 'heatmap' && (
          <MarketHeatmap assets={allAssets} />
        )}

        {/* ── Correlations ─────────────────────────────────────── */}
        {tab === 'correlations' && (
          <CorrelationMatrix />
        )}

        {/* ── Calendar & Macro ─────────────────────────────────── */}
        {tab === 'calendar' && (
          <div className="space-y-4">
            <EconomicCalendar />
            <MacroRatesTable />
          </div>
        )}
      </div>
    </div>
  );
}
