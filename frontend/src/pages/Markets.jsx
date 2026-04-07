import { useState } from 'react';
import { FearGreedGauge }    from '../components/FearGreedGauge.jsx';
import { BTCDominance }      from '../components/BTCDominance.jsx';
import { MarketHeatmap }     from '../components/MarketHeatmap.jsx';
import { CorrelationMatrix } from '../components/CorrelationMatrix.jsx';
import { WhaleAlerts }       from '../components/WhaleAlerts.jsx';
import { EconomicCalendar }  from '../components/EconomicCalendar.jsx';
import { MacroRatesTable }   from '../components/MacroRatesTable.jsx';

const TABS = [
  { id: 'overview',   label: 'Resumen'        },
  { id: 'heatmap',    label: 'Heatmap'        },
  { id: 'correlations', label: 'Correlaciones' },
  { id: 'calendar',   label: 'Calendario'     },
  { id: 'macro',      label: 'Macro'          },
];

export function Markets({ allAssets }) {
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
        <nav className="flex gap-1">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                'px-3 py-1.5 text-sm rounded-t-lg font-medium transition-colors border-b-2',
                tab === t.id
                  ? 'text-white border-brand-400 bg-slate-800/60'
                  : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-800/40',
              ].join(' ')}
            >
              {t.label}
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

        {/* ── Calendar ─────────────────────────────────────────── */}
        {tab === 'calendar' && (
          <EconomicCalendar />
        )}

        {/* ── Macro ────────────────────────────────────────────── */}
        {tab === 'macro' && (
          <MacroRatesTable />
        )}
      </div>
    </div>
  );
}
