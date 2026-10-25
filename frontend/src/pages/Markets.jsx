import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FearGreedGauge }    from '../components/FearGreedGauge.jsx';
import { MarketHeatmap }     from '../components/MarketMap.jsx';
import { CorrelationMatrix } from '../components/CorrelationMatrix.jsx';
import { WhaleAlerts }       from '../components/WhaleAlerts.jsx';
import { EconomicCalendar }  from '../components/EconomicCalendar.jsx';
import { MacroRatesTable }   from '../components/MacroRatesTable.jsx';
import { EventCalendarChart } from '../components/EventCalendarChart.jsx';

const TABS = [
  { id: 'overview', key: 'markets_tab_overview' },
  { id: 'heatmap', key: 'markets_tab_heatmap' },
];

export function Markets({ allAssets }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('overview');

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 pt-4 pb-0 border-b border-slate-700/50">
        {/* Page title */}
        <div className="mb-3">
          <h1 className="text-xl font-bold text-white">{t('nav_markets')}</h1>
          <p className="text-sm text-slate-400">{t('market_subtitle')}</p>
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
        {/* ── Events & calendar ────────────────────────────────── */}
        {tab === 'overview' && (
          <>
            {/* Sentimiento + contexto del calendario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FearGreedGauge />
              <EventCalendarChart />
            </div>

            <EconomicCalendar />
            <MacroRatesTable />

            <details className="rounded-xl border border-white/[8%] bg-[var(--bg-card)]">
              <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-slate-200">
                {t('correlation_context_title')}
              </summary>
              <div className="px-4 pb-4">
                <p className="mb-3 text-xs leading-relaxed text-slate-400">{t('correlation_context_description')}</p>
                <CorrelationMatrix />
              </div>
            </details>

            <WhaleAlerts />
          </>
        )}

        {/* ── Heatmap ──────────────────────────────────────────── */}
        {tab === 'heatmap' && (
          <MarketHeatmap assets={allAssets} />
        )}

      </div>
    </div>
  );
}
