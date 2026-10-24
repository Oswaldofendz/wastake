import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCalendar } from '../services/api.js';

function dayKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function EventCalendarChart() {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState([]);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchCalendar()
      .then(data => {
        if (cancelled) return;
        setEvents(Array.isArray(data?.events) ? data.events : Array.isArray(data) ? data : []);
        setSource(Array.isArray(data) ? 'live' : data?.source ?? null);
      })
      .catch(() => { if (!cancelled) setError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const locale = i18n.language?.startsWith('pt') ? 'pt-PT' : i18n.language?.startsWith('en') ? 'en-US' : 'es-ES';
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today);
      date.setDate(today.getDate() + offset);
      const key = dayKey(date);
      const scheduled = events.filter(event => event.date === key);
      return {
        key,
        label: date.toLocaleDateString(locale, { weekday: 'short' }).replace('.', ''),
        high: scheduled.filter(event => event.impact === 'high').length,
        medium: scheduled.filter(event => event.impact === 'medium').length,
        low: scheduled.filter(event => event.impact !== 'high' && event.impact !== 'medium').length,
      };
    });
  }, [events, i18n.language]);

  const maxTotal = Math.max(1, ...days.map(day => day.high + day.medium + day.low));
  const total = days.reduce((sum, day) => sum + day.high + day.medium + day.low, 0);

  return (
    <section className="rounded-xl border border-white/[8%] bg-[#111318]/90 p-4" aria-labelledby="event-load-title">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="event-load-title" className="text-xs font-semibold uppercase tracking-wider text-slate-300">{t('calendar_chart_title')}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{t('calendar_chart_subtitle')}</p>
        </div>
        {source === 'live' && <span className="shrink-0 text-[10px] text-emerald-400">● {t('calendar_live')}</span>}
        {source === 'fallback' && <span className="shrink-0 text-[10px] text-amber-400">◐ {t('calendar_estimated')}</span>}
      </div>

      {loading ? (
        <div className="mt-5 h-24 animate-pulse rounded-lg bg-slate-800/60" aria-label={t('loading')} />
      ) : error ? (
        <p className="mt-6 text-sm text-slate-400" role="status">{t('calendar_chart_unavailable')}</p>
      ) : total === 0 ? (
        <p className="mt-6 text-sm text-slate-400" role="status">{t('calendar_chart_empty')}</p>
      ) : (
        <>
          <div className="mt-4 flex h-28 items-end justify-between gap-2" role="img" aria-label={t('calendar_chart_accessible', { count: total })}>
            {days.map(day => {
              const count = day.high + day.medium + day.low;
              const maxHeight = 84;
              const scale = maxHeight / maxTotal;
              return (
                <div key={day.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                  <span className="h-3 text-[10px] font-mono text-slate-400">{count || ''}</span>
                  <div className="flex w-full max-w-9 flex-col-reverse overflow-hidden rounded-t-md bg-slate-800/50" style={{ height: `${Math.max(count ? 4 : 2, count * scale)}px` }}>
                    {day.low > 0 && <span className="bg-slate-500" style={{ height: `${day.low * scale}px` }} />}
                    {day.medium > 0 && <span className="bg-amber-400" style={{ height: `${day.medium * scale}px` }} />}
                    {day.high > 0 && <span className="bg-rose-500" style={{ height: `${day.high * scale}px` }} />}
                  </div>
                  <span className="text-[10px] capitalize text-slate-500">{day.label}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-700/40 pt-3">
            <p className="text-xs font-medium text-slate-300">{t('calendar_chart_total', { count: total })}</p>
            <div className="flex gap-3 text-[10px] text-slate-400">
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-500" />{t('calendar_high')}</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-amber-400" />{t('calendar_medium')}</span>
              <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-slate-500" />{t('calendar_low')}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
