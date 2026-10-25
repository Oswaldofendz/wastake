import axios from 'axios';

export const FED_SCHEDULE = 'https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm';
const FEEDS = ['https://nfs.faireconomy.media/ff_calendar_thisweek.json', 'https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json'];
const MONTHS = 'January February March April May June July August September October November December'.split(' ');
const TTL = 30 * 60_000;
let cached;
let pending;
const text = value => String(value ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

// Convert an authoritative local release time to an instant, including US DST.
export function releaseInstant(date, time, timeZone = 'America/New_York') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time ?? '')) return null;
  const wall = Date.parse(`${date}T${time}:00Z`);
  let instant = wall;
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  for (let attempt = 0; attempt < 3; attempt++) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part => [part.type, part.value]));
    const represented = Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
    const correction = wall - represented;
    instant += correction;
    if (!correction) break;
  }
  return new Date(instant).toISOString();
}

function datedEvent(date, time, fields) {
  const scheduledAt = time ? releaseInstant(date, time) : null;
  return { date: scheduledAt?.slice(0, 10) ?? date, time: scheduledAt?.slice(11, 16) ?? null,
    scheduledAt, timeZone: scheduledAt ? 'UTC' : 'America/New_York', currency: 'USD',
    previous: null, forecast: null, actual: null, ...fields };
}

export function parseFedSchedule(html, year) {
  const section = String(html).split(`${year} FOMC Meetings`)[1]?.split(/\d{4} FOMC Meetings/)[0] ?? '';
  const events = [];
  const pattern = /class="[^"]*fomc-meeting__month[^\"]*"[^>]*>([\s\S]*?)<\/div>[\s\S]*?class="[^"]*fomc-meeting__date[^\"]*"[^>]*>([\s\S]*?)<\/div>/g;
  for (const match of section.matchAll(pattern)) {
    const monthText = text(match[1]).split('/').at(-1).trim();
    const month = MONTHS.findIndex(name => name.toLowerCase() === monthText.toLowerCase()) + 1;
    const days = text(match[2]);
    if (!month || !/^\d{1,2}(?:\s*[-–]\s*\d{1,2})?\*?$/.test(days)) continue;
    const day = days.match(/\d+/g).at(-1);
    const date = `${year}-${String(month).padStart(2, '0')}-${day.padStart(2, '0')}`;
    // The meeting calendar identifies the decision day, but not its release hour.
    events.push(datedEvent(date, null, { title: 'FOMC policy decision', titleKey: 'fomc', impact: 'high',
      impactMethod: 'wastake-rule', sourceName: 'Federal Reserve', sourceUrl: FED_SCHEDULE }));
  }
  return events;
}

export function parseBlsSchedule(html, year) {
  const definitions = [
    [/^Consumer Price Index\b/i, 'cpi', 'high'], [/^Employment Situation\b/i, 'employment', 'high'],
    [/^Producer Price Index\b/i, 'ppi', 'high'], [/^Employment Cost Index\b/i, 'employment_cost', 'medium'],
    [/^Job Openings and Labor Turnover Survey\b/i, 'job_openings', 'medium'],
    [/^Productivity and Costs\b/i, 'productivity', 'medium'],
  ];
  const events = [];
  for (const row of String(html).matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cell = kind => text(row[1].match(new RegExp(`<td[^>]*class="[^"]*${kind}-cell[^\"]*"[^>]*>([\\s\\S]*?)<\\/td>`, 'i'))?.[1]);
    const dateText = cell('date');
    const title = cell('desc');
    const definition = definitions.find(([pattern]) => pattern.test(title));
    const dateMatch = dateText.match(/([A-Za-z]+)\s+(\d{1,2}),\s+(\d{4})/);
    const timeMatch = cell('time').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!definition || !dateMatch || Number(dateMatch[3]) !== Number(year)) continue;
    const month = MONTHS.indexOf(dateMatch[1]) + 1;
    if (!month) continue;
    const date = `${year}-${String(month).padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
    const hour = timeMatch ? (Number(timeMatch[1]) % 12) + (/PM/i.test(timeMatch[3]) ? 12 : 0) : null;
    const time = timeMatch ? `${String(hour).padStart(2, '0')}:${timeMatch[2]}` : null;
    const reference = title.match(/for ([A-Za-z]+) (\d{4})/);
    const periodMonth = reference ? MONTHS.indexOf(reference[1]) + 1 : 0;
    events.push(datedEvent(date, time, { title, titleKey: definition[1], impact: definition[2],
      impactMethod: 'wastake-rule', period: periodMonth ? `${reference[2]}-${String(periodMonth).padStart(2, '0')}` : null,
      sourceName: 'BLS', sourceUrl: `https://www.bls.gov/schedule/${year}/` }));
  }
  return events;
}

export function normalizeFeed(data) {
  return (Array.isArray(data) ? data : []).flatMap(event => {
    const instant = Date.parse(event.date);
    if (!Number.isFinite(instant) || !event.title || /holiday/i.test(event.impact ?? '')) return [];
    const scheduledAt = new Date(instant).toISOString();
    return [{ date: scheduledAt.slice(0, 10), time: scheduledAt.slice(11, 16), scheduledAt, timeZone: 'UTC',
      title: String(event.title), currency: String(event.country ?? ''),
      impact: /^(high|medium)$/i.test(event.impact) ? event.impact.toLowerCase() : 'low', impactMethod: 'provider',
      previous: event.previous ?? null, forecast: event.forecast ?? null, actual: event.actual ?? null,
      sourceName: 'Forex Factory', sourceUrl: 'https://www.forexfactory.com/calendar' }];
  });
}

async function publicGet(url) {
  return (await axios.get(url, { timeout: 7000, maxContentLength: 1_000_000,
    headers: { 'User-Agent': 'WaStake/1.0 (public economic calendar)', Accept: 'application/json,text/html' } })).data;
}

async function refreshCalendar(now) {
  const year = new Date(now).getUTCFullYear();
  const [feedResult, fedResult, blsResult] = await Promise.allSettled([
    (async () => {
      for (const url of FEEDS) {
        try { const events = normalizeFeed(await publicGet(url)); if (events.length) return events; } catch { /* try the public mirror */ }
      }
      return [];
    })(),
    publicGet(FED_SCHEDULE),
    // Across December include next year's official dates if they are published.
    Promise.allSettled((new Date(now).getUTCMonth() === 11 ? [year, year + 1] : [year]).map(async target =>
      parseBlsSchedule(await publicGet(`https://www.bls.gov/schedule/${target}/`), target))),
  ]);
  const feed = feedResult.status === 'fulfilled' ? feedResult.value : [];
  const official = [
    ...(fedResult.status === 'fulfilled' ? [year, year + 1].flatMap(target => parseFedSchedule(fedResult.value, target)) : []),
    ...(blsResult.status === 'fulfilled' ? blsResult.value.flatMap(result => result.status === 'fulfilled' ? result.value : []) : []),
  ];
  const first = new Date(now - 7 * 86400_000).toISOString().slice(0, 10);
  const last = new Date(now + 30 * 86400_000).toISOString().slice(0, 10);
  const within = event => event.date >= first && event.date <= last;
  const liveEvents = feed.filter(within);
  const liveDates = liveEvents.map(event => event.date).sort();
  const events = liveEvents.length
    ? [...liveEvents, ...official.filter(event => within(event) && (event.date < liveDates[0] || event.date > liveDates.at(-1))) ]
    : official.filter(within);
  events.sort((a, b) => `${a.date}${a.time ?? ''}`.localeCompare(`${b.date}${b.time ?? ''}`));
  const fetchedAt = new Date(now).toISOString();
  if (!events.length && cached?.events.length && now - Date.parse(cached.fetchedAt) < 24 * 60 * 60_000) {
    return { ...cached, events: cached.events.filter(within), stale: true, source: 'cached' };
  }
  return { events, source: liveEvents.length ? 'live' : events.length ? 'official' : 'unavailable', fetchedAt,
    coverage: liveEvents.length ? 'Forex Factory + Fed/BLS scheduled releases' : 'Federal Reserve + BLS scheduled releases',
    stale: false };
}

export async function getEconomicCalendar() {
  const now = Date.now();
  if (cached && now - Date.parse(cached.fetchedAt) < TTL) return cached;
  if (!pending) pending = refreshCalendar(now).then(result => { cached = result; return result; }).finally(() => { pending = null; });
  return pending;
}
