import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCalendar } from '../services/api.js';

// ── Helpers ────────────────────────────────────────────────────
const IMPACT_STYLES = {
  high:   { dot: 'bg-red-500',    badge: 'bg-red-900/40 text-red-400 border-red-700/40'       },
  medium: { dot: 'bg-amber-500',  badge: 'bg-amber-900/40 text-amber-400 border-amber-700/40' },
  low:    { dot: 'bg-slate-500',  badge: 'bg-slate-700/40 text-slate-400 border-slate-600/40' },
};

const CURRENCY_COLORS = {
  USD: 'text-blue-400',
  EUR: 'text-purple-400',
  GBP: 'text-indigo-400',
  JPY: 'text-pink-400',
  CNY: 'text-red-400',
  CAD: 'text-cyan-400',
  AUD: 'text-emerald-400',
  CHF: 'text-yellow-400',
  NZD: 'text-teal-400',
};

function isToday(dateStr) {
  return dateStr === new Date().toISOString().slice(0, 10);
}
function isPast(dateStr) {
  return dateStr < new Date().toISOString().slice(0, 10);
}

function groupByDate(events) {
  const groups = {};
  for (const ev of events) {
    if (!groups[ev.date]) groups[ev.date] = [];
    groups[ev.date].push(ev);
  }
  return groups;
}

function dateLabel(dateStr, language) {
  const d = new Date(dateStr + 'T12:00:00');
  const locale = language?.startsWith('pt') ? 'pt-PT' : language?.startsWith('en') ? 'en-US' : 'es-ES';
  return d.toLocaleDateString(locale, { weekday: 'long', day: '2-digit', month: 'long' });
}

function classifyEvent(title = '') {
  const text = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/rate|interest|tasa|tasas|tipo de interes|tipos de interes|juros|taxa|taxas|fomc|central bank|monetary policy|decision.*(bce|ecb|fed|boe|boj)|bce.*decision|ecb.*decision/.test(text)) return 'rates';
  if (/cpi|pce|inflation|consumer price|producer price|ipc|precios al consumidor/.test(text)) return 'inflation';
  if (/employment|payroll|jobless|unemployment|nonfarm|nfp|nomina|nominas|empleo|desempleo/.test(text)) return 'jobs';
  if (/gdp|gross domestic|pib/.test(text)) return 'growth';
  if (/pmi|manufacturing|services|business activity|retail sales/.test(text)) return 'activity';
  return 'other';
}

function numericValue(value) {
  if (value == null || value === '') return null;
  const parsed = Number(String(value).replace(/,/g, '').replace(/[^\d.+-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function getEventRead(ev) {
  const category = classifyEvent(ev.title);
  const actual = numericValue(ev.actual);
  const forecast = numericValue(ev.forecast);
  if (category === 'other') return { category, surprise: 'mixed' };
  if (actual == null || forecast == null || actual === forecast) return { category, surprise: actual == null ? 'pending' : 'inline' };
  return { category, surprise: actual > forecast ? 'above' : 'below' };
}

function sourceForEvent(ev, category) {
  const currency = String(ev.currency || '').toUpperCase();
  if (currency === 'USD') {
    if (category === 'rates') return 'https://www.federalreserve.gov/monetarypolicy.htm';
    if (category === 'inflation') return ev.title.toLowerCase().includes('pce') ? 'https://www.bea.gov/data/personal-consumption-expenditures-price-index' : 'https://www.bls.gov/news.release/cpi.htm';
    if (category === 'jobs') return 'https://www.bls.gov/news.release/empsit.htm';
    if (category === 'growth') return 'https://www.bea.gov/data/gdp/gross-domestic-product';
    return 'https://www.bea.gov/data';
  }
  if (currency === 'EUR') return category === 'rates' ? 'https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html' : 'https://ec.europa.eu/eurostat/web/main/news/euro-indicators';
  if (currency === 'GBP') return category === 'rates' ? 'https://www.bankofengland.co.uk/monetary-policy-summary-and-minutes' : 'https://www.ons.gov.uk/economy';
  if (currency === 'JPY') return 'https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm';
  if (currency === 'CAD') return 'https://www.bankofcanada.ca/core-functions/monetary-policy/key-interest-rate/';
  if (currency === 'AUD') return 'https://www.rba.gov.au/monetary-policy/int-rate-decisions/';
  if (currency === 'NZD') return 'https://www.rbnz.govt.nz/monetary-policy/monetary-policy-decisions';
  if (currency === 'CHF') return 'https://www.snb.ch/en/the-snb/mandates-goals/monetary-policy/monetary-policy-decisions';
  return 'https://www.forexfactory.com/calendar';
}

function eventAssets(ev, category, surprise) {
  if (surprise === 'pending' || surprise === 'inline' || surprise === 'mixed') {
    if (category === 'rates' || category === 'inflation') return [
      { symbol: ev.currency || 'FX', bias: 'neutral' }, { symbol: 'BTC', bias: 'neutral' },
      { symbol: 'QQQ', bias: 'neutral' }, { symbol: 'TLT', bias: 'neutral' },
    ];
    if (category === 'jobs' || category === 'growth' || category === 'activity') return [
      { symbol: ev.currency || 'FX', bias: 'neutral' }, { symbol: 'BTC', bias: 'neutral' }, { symbol: 'QQQ', bias: 'neutral' },
    ];
    return [{ symbol: 'BTC', bias: 'neutral' }, { symbol: 'QQQ', bias: 'neutral' }];
  }
  const higher = surprise === 'above';
  const restrictive = category === 'rates' || category === 'inflation';
  const currencyBias = higher ? 'up' : 'down';
  if (restrictive) return [
    { symbol: ev.currency || 'FX', bias: currencyBias },
    { symbol: 'BTC', bias: higher ? 'down' : 'up' },
    { symbol: 'QQQ', bias: higher ? 'down' : 'up' },
    { symbol: 'TLT', bias: higher ? 'down' : 'up' },
  ];
  if (category === 'jobs' || category === 'growth' || category === 'activity') return [
    { symbol: ev.currency || 'FX', bias: currencyBias },
    { symbol: 'BTC', bias: 'mixed' },
    { symbol: 'QQQ', bias: 'mixed' },
  ];
  return [{ symbol: 'BTC', bias: 'mixed' }, { symbol: 'QQQ', bias: 'mixed' }];
}

// ── Skeleton ───────────────────────────────────────────────────
function Skeleton() {
  return (
    <div className="animate-pulse divide-y divide-slate-700/30">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="px-4 py-3 flex items-start gap-3">
          <div className="w-2 h-2 rounded-full bg-slate-700 mt-1.5 flex-shrink-0" />
          <div className="w-20 flex-shrink-0 space-y-1">
            <div className="h-2.5 bg-slate-700 rounded w-14" />
            <div className="h-2 bg-slate-700/60 rounded w-10" />
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-slate-700 rounded w-3/4" />
            <div className="h-2 bg-slate-700/60 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────
export function EconomicCalendar() {
  const { t, i18n } = useTranslation();
  const [events, setEvents]       = useState([]);
  const [source, setSource]       = useState(null); // 'live' | 'fallback'
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(false);
  const [filterImpact, setImpact] = useState('all');
  const [showPast, setShowPast]   = useState(true);

  const load = useCallback(async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await fetchCalendar();
        // Soporta { events, source } o array directo
        if (Array.isArray(data)) {
          setEvents(data);
          setSource('live');
        } else {
          setEvents(Array.isArray(data.events) ? data.events : []);
          setSource(data.source ?? null);
        }
      } catch {
        setEvents([]);
        setSource(null);
        setError(true);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = events.filter(ev => {
    if (filterImpact !== 'all' && ev.impact !== filterImpact) return false;
    if (!showPast && isPast(ev.date)) return false;
    return true;
  });

  const grouped = groupByDate(filtered);
  const highCount   = events.filter(e => e.impact === 'high').length;
  const todayCount  = events.filter(e => isToday(e.date)).length;

  return (
    <div className="bg-[#111318]/90 border border-white/[8%] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/40">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              {t('calendar_title')}
              {source === 'live' && <span className="ml-2 text-green-400 normal-case font-normal">● {t('calendar_live')}</span>}
              {source === 'fallback' && <span className="ml-2 text-amber-400 normal-case font-normal">◐ {t('calendar_estimated')}</span>}
            </h3>
            {!loading && (
              <p className="text-xs text-slate-500 mt-0.5">
                {t('calendar_event_count', { count: events.length })} · {t('calendar_high_count', { count: highCount })}
                {todayCount > 0 && <span className="ml-1 text-brand-400">· {t('calendar_today_count', { count: todayCount })}</span>}
                {source === 'fallback' && <span className="ml-1 text-amber-500"> · {t('calendar_curated')}</span>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showPast}
                onChange={e => setShowPast(e.target.checked)}
                className="rounded"
              />
              {t('calendar_show_past')}
            </label>
            <button type="button" onClick={load} disabled={loading} className="text-xs text-brand-300 hover:text-white disabled:opacity-50">
              {t('retry')}
            </button>
          </div>
        </div>

        {/* Impact filters */}
        <div className="flex gap-1">
          {[
            { id: 'all',    label: t('calendar_all') },
            { id: 'high',   label: `🔴 ${t('calendar_high')}`  },
            { id: 'medium', label: `🟡 ${t('calendar_medium')}` },
            { id: 'low',    label: `🟢 ${t('calendar_low')}` },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setImpact(f.id)}
              className={[
                'px-2 py-0.5 text-xs rounded-full border transition-colors font-medium',
                filterImpact === f.id
                  ? 'bg-brand-600 border-brand-500 text-white'
                  : 'bg-slate-700/40 border-slate-600/40 text-slate-400 hover:text-white',
              ].join(' ')}
            >
              {f.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] leading-5 text-slate-400">{t('calendar_direction_legend')}</p>
      </div>

      {/* Body */}
      <div className="max-h-[520px] overflow-y-auto">
        {loading ? (
          <Skeleton />
        ) : Object.keys(grouped).length === 0 ? (
          <div className="px-4 py-8 text-center space-y-2" role={error ? 'alert' : 'status'}>
            <p className="text-slate-300 text-sm">
              {error ? t('calendar_unavailable') : events.length === 0 ? t('calendar_no_source_data') : t('calendar_no_filter_results')}
            </p>
            {!error && events.length > 0 && !showPast && (
              <button
                onClick={() => setShowPast(true)}
                className="text-xs text-brand-400 hover:text-brand-300 underline"
              >
                {t('calendar_show_past_events')}
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-700/30">
            {Object.entries(grouped).map(([date, dayEvents]) => (
              <div key={date}>
                {/* Day header */}
                <div className={`px-4 py-2 sticky top-0 z-10 ${isToday(date) ? 'bg-brand-900/40 border-l-2 border-brand-500' : 'bg-slate-900/50'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider capitalize ${isToday(date) ? 'text-brand-400' : 'text-slate-400'}`}>
                    {isToday(date) ? `★ ${t('calendar_today')} — ` : ''}{dateLabel(date, i18n.language)}
                  </p>
                </div>

                {/* Events */}
                {dayEvents.map((ev, i) => {
                  const { dot, badge } = IMPACT_STYLES[ev.impact] ?? IMPACT_STYLES.low;
                  const past = isPast(ev.date);
                  const currColor = CURRENCY_COLORS[ev.currency] ?? 'text-slate-400';
                  const { category, surprise } = getEventRead(ev);
                  const outlook = eventAssets(ev, category, surprise);
                  const sourceUrl = sourceForEvent(ev, category);
                  return (
                    <details
                      key={i}
                      className={`group border-t border-slate-700/20 px-3 py-2 hover:bg-slate-700/20 transition-colors ${past ? 'opacity-60' : ''}`}
                    >
                      <summary className="flex cursor-pointer list-none items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${dot} flex-shrink-0`} />
                        <span className="w-12 flex-shrink-0 font-mono text-[11px] text-slate-400">{ev.time || '—'}<span className={`block font-bold ${currColor}`}>{ev.currency}</span></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-medium leading-snug text-white sm:text-sm">{ev.title}</span>
                          <span className="mt-1 flex flex-wrap items-center gap-1">
                            <span className={`rounded-full border px-1.5 py-0.5 text-[10px] ${badge}`}>{t(`calendar_${ev.impact || 'low'}`)}</span>
                            {outlook.map(item => <span key={item.symbol} className={`rounded border px-1 py-0.5 text-[10px] font-semibold ${item.bias === 'up' ? 'border-emerald-800/50 text-emerald-300' : item.bias === 'down' ? 'border-red-800/50 text-red-300' : 'border-slate-600/50 text-slate-400'}`}>{item.bias === 'up' ? '↑' : item.bias === 'down' ? '↓' : item.bias === 'mixed' ? '↕' : '↔'} {item.symbol}</span>)}
                          </span>
                        </span>
                        <span className="pr-1 text-xs text-slate-500 transition-transform group-open:rotate-180" aria-hidden="true">⌄</span>
                      </summary>
                      <div className="ml-[3.75rem] mt-2 grid gap-2 border-l border-slate-700/50 pl-3 sm:grid-cols-[1fr_auto]">
                        <div className="space-y-1 text-xs leading-5 text-slate-400">
                          <p><span className="font-medium text-slate-300">{t('calendar_measures')}:</span> {t(`calendar_${category}_measure`)}</p>
                          <p><span className="font-medium text-slate-300">{t('calendar_market_relevance')}:</span> {t(`calendar_${category}_relevance`)}</p>
                          <p className="text-amber-300/90">{t(`calendar_surprise_${surprise}`, { currency: ev.currency || 'FX' })}</p>
                          <p className="text-slate-500">{t('calendar_bias_disclaimer')}</p>
                          <a className="inline-flex text-sky-300 underline underline-offset-2 hover:text-sky-200" href={sourceUrl} target="_blank" rel="noopener noreferrer">{t(category === 'other' ? 'calendar_provider_source' : 'calendar_official_source')} ↗</a>
                        </div>
                        <dl className="grid grid-cols-3 gap-2 text-[11px] sm:min-w-48">
                          {[[t('calendar_previous'), ev.previous], [t('calendar_forecast'), ev.forecast], [t('calendar_actual'), ev.actual]].map(([label, value]) => <div key={label}><dt className="text-slate-500">{label}</dt><dd className="font-mono text-slate-300">{value ?? '—'}</dd></div>)}
                        </dl>
                      </div>
                    </details>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
