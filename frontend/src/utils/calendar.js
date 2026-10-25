import { localizeMacroTitle } from './macroTitles.js';

export function localDayKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function localCalendarEvent(event) {
  const instant = event.scheduledAt ? new Date(event.scheduledAt) : null;
  if (!instant || !Number.isFinite(instant.getTime())) return event;
  return { ...event, date: localDayKey(instant), time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(instant) };
}

export function calendarTitle(event, t, language) {
  let title = event.titleKey && t(`calendar_event_${event.titleKey}`, { defaultValue: '' });
  if (!title) return localizeMacroTitle(event.title, language);
  if (event.period && /^\d{4}-\d{2}$/.test(event.period)) {
    const label = new Date(`${event.period}-15T12:00:00Z`).toLocaleDateString(language, { year: 'numeric', month: 'long', timeZone: 'UTC' });
    title += ` · ${label}`;
  }
  return title;
}

export function numericEventValue(value) {
  if (value == null || !String(value).trim()) return null;
  const source = String(value).trim().replace(/,/g, '');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)\s*(?:%|[KMB])?$/i.test(source)) return null;
  const unit = source.match(/[KMB]$/i)?.[0].toUpperCase();
  return parseFloat(source) * ({ K: 1e3, M: 1e6, B: 1e9 }[unit] ?? 1);
}

export function classifyEconomicEvent(title = '') {
  const text = title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/cpi|pce|\bppi\b|sppi|inflation|consumer price|producer price|employment cost|ipc/.test(text)) return 'inflation';
  if (/employment|payroll|jobless|unemployment|nonfarm|nfp|nomina|empleo|desempleo|job openings/.test(text)) return 'jobs';
  if (/interest|policy rate|cash rate|overnight rate|refinancing|funds rate|tasa|juros|taxa|fomc|monetary policy/.test(text)) return 'rates';
  if (/gdp|gross domestic|pib/.test(text)) return 'growth';
  if (/pmi|manufacturing|services|business activity|retail sales/.test(text)) return 'activity';
  return 'other';
}
