import { useState, useEffect } from 'react';
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

function dateLabel(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long' });
}

function ActualCell({ actual, forecast }) {
  if (!actual) return <span className="text-slate-500">—</span>;
  const numA = parseFloat(actual);
  const numF = parseFloat(forecast);
  const beat = !isNaN(numA) && !isNaN(numF) && numA > numF;
  const miss = !isNaN(numA) && !isNaN(numF) && numA < numF;
  return (
    <span className={beat ? 'text-green-400 font-bold' : miss ? 'text-red-400 font-bold' : 'text-white'}>
      {actual}
    </span>
  );
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
  const [events, setEvents]       = useState([]);
  const [source, setSource]       = useState(null); // 'live' | 'fallback'
  const [loading, setLoading]     = useState(true);
  const [filterImpact, setImpact] = useState('all');
  const [showPast, setShowPast]   = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await fetchCalendar();
        if (!cancelled) {
          // Soporta { events, source } o array directo
          if (Array.isArray(data)) {
            setEvents(data);
            setSource('live');
          } else {
            setEvents(Array.isArray(data.events) ? data.events : []);
            setSource(data.source ?? null);
          }
        }
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

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
              Calendario Económico
              {source === 'live' && <span className="ml-2 text-green-400 normal-case font-normal">● Live</span>}
              {source === 'fallback' && <span className="ml-2 text-amber-400 normal-case font-normal">◐ Estimado</span>}
            </h3>
            {!loading && (
              <p className="text-xs text-slate-500 mt-0.5">
                {events.length} eventos · {highCount} alto impacto
                {todayCount > 0 && <span className="ml-1 text-brand-400">· {todayCount} hoy</span>}
                {source === 'fallback' && <span className="ml-1 text-amber-500"> · datos curados</span>}
              </p>
            )}
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPast}
              onChange={e => setShowPast(e.target.checked)}
              className="rounded"
            />
            Ver pasados
          </label>
        </div>

        {/* Impact filters */}
        <div className="flex gap-1">
          {[
            { id: 'all',    label: 'Todos' },
            { id: 'high',   label: '🔴 Alto'  },
            { id: 'medium', label: '🟡 Medio' },
            { id: 'low',    label: '🟢 Bajo'  },
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
      </div>

      {/* Body */}
      <div className="max-h-[520px] overflow-y-auto">
        {loading ? (
          <Skeleton />
        ) : Object.keys(grouped).length === 0 ? (
          <div className="px-4 py-8 text-center space-y-2">
            <p className="text-slate-500 text-sm">Sin eventos para este período</p>
            {!showPast && (
              <button
                onClick={() => setShowPast(true)}
                className="text-xs text-brand-400 hover:text-brand-300 underline"
              >
                Mostrar eventos pasados
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
                    {isToday(date) ? '★ Hoy — ' : ''}{dateLabel(date)}
                  </p>
                </div>

                {/* Events */}
                {dayEvents.map((ev, i) => {
                  const { dot, badge } = IMPACT_STYLES[ev.impact] ?? IMPACT_STYLES.low;
                  const past = isPast(ev.date);
                  const currColor = CURRENCY_COLORS[ev.currency] ?? 'text-slate-400';
                  return (
                    <div
                      key={i}
                      className={`px-4 py-3 flex items-start gap-3 hover:bg-slate-700/20 transition-colors ${past ? 'opacity-60' : ''}`}
                    >
                      {/* Impact dot */}
                      <span className={`w-2 h-2 rounded-full ${dot} flex-shrink-0 mt-1.5`} />

                      {/* Time */}
                      <div className="w-12 flex-shrink-0">
                        <p className="text-xs font-mono text-slate-400">{ev.time || '—'}</p>
                        <p className={`text-xs font-bold ${currColor}`}>{ev.currency}</p>
                      </div>

                      {/* Title */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white font-medium leading-snug">{ev.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full border ${badge}`}>
                            {ev.impact === 'high' ? '●●● Alto' : ev.impact === 'medium' ? '●● Medio' : '● Bajo'}
                          </span>
                        </div>
                      </div>

                      {/* Values */}
                      <div className="flex-shrink-0 text-right space-y-0.5 hidden sm:block">
                        {ev.previous != null && (
                          <p className="text-xs text-slate-500">Ant: <span className="text-slate-400">{ev.previous}</span></p>
                        )}
                        {ev.forecast != null && (
                          <p className="text-xs text-slate-500">Est: <span className="text-slate-300">{ev.forecast}</span></p>
                        )}
                        {ev.actual != null && (
                          <p className="text-xs text-slate-500">Real: <ActualCell actual={ev.actual} forecast={ev.forecast} /></p>
                        )}
                      </div>
                    </div>
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
