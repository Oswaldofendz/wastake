// Tasas de interés actuales por banco central — datos actualizados a abril 2026

const RATES = [
  {
    bank:        'Federal Reserve (Fed)',
    country:     'EE.UU.',
    flag:        '🇺🇸',
    rate:        3.75,
    prev:        4.50,
    direction:   'down',
    lastChange:  '2025-12-18',
    nextMeeting: '2026-05-07',
    bias:        'neutral',
    impact:      'USD, S&P500, BTC (correlación inversa con tasas)',
  },
  {
    bank:        'Banco Central Europeo (BCE)',
    country:     'Eurozona',
    flag:        '🇪🇺',
    rate:        2.15,
    prev:        2.40,
    direction:   'down',
    lastChange:  '2026-03-19',
    nextMeeting: '2026-04-30',
    bias:        'neutral',
    impact:      'EUR, acciones europeas, bonos soberanos',
  },
  {
    bank:        'Bank of England (BoE)',
    country:     'Reino Unido',
    flag:        '🇬🇧',
    rate:        3.75,
    prev:        4.50,
    direction:   'down',
    lastChange:  '2026-02-06',
    nextMeeting: '2026-05-08',
    bias:        'neutral',
    impact:      'GBP, FTSE 100, gilts',
  },
  {
    bank:        'Bank of Japan (BoJ)',
    country:     'Japón',
    flag:        '🇯🇵',
    rate:        0.75,
    prev:        0.50,
    direction:   'up',
    lastChange:  '2026-03-19',
    nextMeeting: '2026-04-30',
    bias:        'hawkish',
    impact:      'JPY, Nikkei, carry trade global',
  },
  {
    bank:        'Swiss National Bank (SNB)',
    country:     'Suiza',
    flag:        '🇨🇭',
    rate:        0.25,
    prev:        0.50,
    direction:   'down',
    lastChange:  '2026-03-20',
    nextMeeting: '2026-06-19',
    bias:        'dovish',
    impact:      'CHF, activos refugio',
  },
  {
    bank:        'Banco de México (Banxico)',
    country:     'México',
    flag:        '🇲🇽',
    rate:        8.50,
    prev:        9.50,
    direction:   'down',
    lastChange:  '2026-03-27',
    nextMeeting: '2026-05-15',
    bias:        'dovish',
    impact:      'MXN, BONO M, Bolsa Mexicana',
  },
];

const BIAS_STYLES = {
  hawkish: { label: 'Hawkish (sube tasas)', color: 'text-red-400',   bg: 'bg-red-900/30 border-red-700/40'   },
  dovish:  { label: 'Dovish (baja tasas)', color: 'text-green-400', bg: 'bg-green-900/30 border-green-700/40' },
  neutral: { label: 'Neutral',             color: 'text-slate-400',  bg: 'bg-slate-700/30 border-slate-600/40' },
};

function DirectionIcon({ direction }) {
  if (direction === 'up') return (
    <svg viewBox="0 0 16 16" className="w-3 h-3 fill-red-400 inline-block ml-0.5">
      <path d="M8 3 L12 10 L4 10 Z" />
    </svg>
  );
  if (direction === 'down') return (
    <svg viewBox="0 0 16 16" className="w-3 h-3 fill-green-400 inline-block ml-0.5">
      <path d="M8 13 L12 6 L4 6 Z" />
    </svg>
  );
  return <span className="text-slate-500 text-xs ml-0.5">—</span>;
}

export function MacroRatesTable() {
  return (
    <div className="bg-slate-800/50 border border-slate-700/40 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/40">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          Tasas de Interés Globales
        </h3>
        <p className="text-xs text-slate-500 mt-0.5">Tasas de referencia — Actualizado abril 2025</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700/40 text-xs text-slate-500">
              <th className="px-4 py-2 text-left font-medium">Banco Central</th>
              <th className="px-3 py-2 text-right font-medium">Tasa</th>
              <th className="px-3 py-2 text-right font-medium hidden sm:table-cell">Anterior</th>
              <th className="px-3 py-2 text-center font-medium hidden md:table-cell">Sesgo</th>
              <th className="px-3 py-2 text-left font-medium hidden lg:table-cell">Impacto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/30">
            {RATES.map((r, i) => {
              const bias = BIAS_STYLES[r.bias] ?? BIAS_STYLES.neutral;
              return (
                <tr key={i} className="hover:bg-slate-700/20 transition-colors">
                  {/* Bank */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{r.flag}</span>
                      <div>
                        <p className="text-white text-xs font-medium leading-tight">{r.bank}</p>
                        <p className="text-slate-500 text-xs">{r.country}</p>
                      </div>
                    </div>
                  </td>

                  {/* Current rate */}
                  <td className="px-3 py-3 text-right">
                    <span className="font-mono font-bold text-white">{r.rate.toFixed(2)}%</span>
                    <DirectionIcon direction={r.direction} />
                  </td>

                  {/* Previous rate */}
                  <td className="px-3 py-3 text-right text-slate-400 font-mono text-xs hidden sm:table-cell">
                    {r.prev.toFixed(2)}%
                  </td>

                  {/* Bias */}
                  <td className="px-3 py-3 text-center hidden md:table-cell">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${bias.color} ${bias.bg}`}>
                      {r.bias}
                    </span>
                  </td>

                  {/* Impact */}
                  <td className="px-3 py-3 hidden lg:table-cell">
                    <p className="text-xs text-slate-400 max-w-xs">{r.impact}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Próx. reunión: {new Date(r.nextMeeting + 'T12:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })}
                    </p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Explainer */}
      <div className="px-4 py-3 border-t border-slate-700/40 grid grid-cols-1 sm:grid-cols-3 gap-2">
        {Object.entries(BIAS_STYLES).map(([key, val]) => (
          <div key={key} className={`rounded-lg px-3 py-2 border ${val.bg}`}>
            <p className={`text-xs font-semibold ${val.color}`}>{val.label}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {key === 'hawkish' ? 'Presiona al alza los bonos, fortalece la moneda' :
               key === 'dovish'  ? 'Favorece activos de riesgo y cripto' :
               'Sin señal clara de cambio de política monetaria'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
