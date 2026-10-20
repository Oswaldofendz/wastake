import { useTranslation } from 'react-i18next';

const SOURCES = [
  { bank: 'Federal Reserve (Fed)', country: 'EE. UU.', flag: '🇺🇸', url: 'https://www.federalreserve.gov/monetarypolicy.htm' },
  { bank: 'Banco Central Europeo (BCE)', country: 'Eurozona', flag: '🇪🇺', url: 'https://www.ecb.europa.eu/press/govcdec/mopo/html/index.es.html' },
  { bank: 'Bank of England (BoE)', country: 'Reino Unido', flag: '🇬🇧', url: 'https://www.bankofengland.co.uk/monetary-policy/the-interest-rate-bank-rate' },
  { bank: 'Bank of Japan (BoJ)', country: 'Japón', flag: '🇯🇵', url: 'https://www.boj.or.jp/en/mopo/mpmdeci/index.htm' },
  { bank: 'Swiss National Bank (SNB)', country: 'Suiza', flag: '🇨🇭', url: 'https://www.snb.ch/en/the-snb/mandates-goals/monetary-policy/decisions' },
  { bank: 'Banco de México (Banxico)', country: 'México', flag: '🇲🇽', url: 'https://www.banxico.org.mx/publications-and-press/announcements-of-monetary-policy-decisions/monetary-policy-announcements.html' },
];

export function MacroRatesTable() {
  const { t } = useTranslation();

  return (
    <section className="bg-[#111318]/90 border border-white/[8%] rounded-xl overflow-hidden" aria-labelledby="macro-rates-title">
      <header className="px-4 py-3 border-b border-slate-700/40">
        <h3 id="macro-rates-title" className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
          {t('macro_rates_sources')}
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl" role="note">
          {t('macro_rates_sources_note')}
        </p>
      </header>

      <ul className="divide-y divide-slate-700/30 sm:grid sm:grid-cols-2 sm:divide-y-0 sm:divide-x">
        {SOURCES.map((source, index) => (
          <li key={source.bank} className={`flex items-center justify-between gap-3 px-4 py-3 ${index > 1 ? 'sm:border-t sm:border-slate-700/30' : ''} ${index % 2 === 1 ? 'sm:border-l sm:border-slate-700/30' : ''}`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <span aria-hidden="true" className="text-base">{source.flag}</span>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white">{source.bank}</p>
                <p className="text-xs text-slate-500">{source.country}</p>
              </div>
            </div>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-brand-300 underline underline-offset-2 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-400"
            >
              {t('macro_rates_open_source')}
              <span className="sr-only"> — {source.bank}</span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
