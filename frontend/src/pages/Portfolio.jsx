import { useState, useMemo, useEffect, useRef } from 'react';
import { usePortfolio }   from '../hooks/usePortfolio.js';
import { usePortfolios }  from '../hooks/usePortfolios.js';
import { AuthModal }      from '../components/AuthModal.jsx';
import { AddPositionModal } from '../components/AddPositionModal.jsx';
import { DonutChart }     from '../components/DonutChart.jsx';
import { PortfolioChart } from '../components/PortfolioChart.jsx';
import { useToast }       from '../components/Toast.jsx';

// ─── Helpers numéricos ────────────────────────────────────────────────────────

function fmtUsd(n) {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `$${Math.abs(n) < 1 ? n.toFixed(4) : n.toFixed(2)}`;
}

function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function pnlColor(n) {
  if (n == null || n === 0) return 'text-slate-400';
  return n > 0 ? 'text-green-400' : 'text-red-400';
}

function holdingDays(createdAt) {
  if (!createdAt) return null;
  return Math.max(0, Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000));
}

function annualizedROI(pnlPct, days) {
  if (pnlPct == null || !days || days < 1) return null;
  return (Math.pow(1 + pnlPct / 100, 365 / days) - 1) * 100;
}

function fmtConverted(usdValue, currency, rates) {
  if (usdValue == null || isNaN(usdValue)) return '—';
  const sign = usdValue < 0 ? '-' : '';
  const abs  = Math.abs(usdValue);
  if (currency === 'EUR') {
    const v = abs * (rates.EUR ?? 0.92);
    return `${sign}€${v >= 1000 ? v.toLocaleString(undefined, { maximumFractionDigits: 0 }) : v < 1 ? v.toFixed(4) : v.toFixed(2)}`;
  }
  if (currency === 'BTC' && rates.BTC) {
    return `${sign}₿${(abs * rates.BTC).toFixed(6)}`;
  }
  return fmtUsd(usdValue);
}

// ─── Hook: tipo de cambio ─────────────────────────────────────────────────────

function useCurrencyRates(allAssets) {
  const [rates, setRates] = useState({ EUR: 0.92, BTC: null });

  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(r => r.json())
      .then(d => { if (d?.rates?.EUR) setRates(p => ({ ...p, EUR: d.rates.EUR })); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const btc = allAssets?.find(a => a.id === 'bitcoin');
    if (btc?.price) setRates(p => ({ ...p, BTC: 1 / btc.price }));
  }, [allAssets]);

  return rates;
}

// ─── Export CSV ───────────────────────────────────────────────────────────────

function exportPortfolioCSV(positions, totalValue, totalPnl, totalPnlPct) {
  const headers = ['Activo','Símbolo','Tipo','Días','Cantidad','P. entrada','P. actual','Valor','Costo','P&L (USD)','P&L (%)','24h (%)','ROI anual (%)','Simulación'];
  const rows = positions.map(p => {
    const days = holdingDays(p.created_at);
    const roi  = annualizedROI(p.pnlPct, days);
    return [
      p.asset_name, p.asset_id, p.asset_type,
      days ?? '', p.quantity, p.entry_price,
      p.currentPrice ?? '', p.currentValue ?? '', p.costBasis,
      p.pnlUsd ?? '', p.pnlPct?.toFixed(2) ?? '',
      p.change24h?.toFixed(2) ?? '', roi?.toFixed(2) ?? '',
      p.is_simulation ? 'Sí' : 'No',
    ];
  });
  rows.push([]);
  rows.push(['TOTAL','','','','','','', totalValue.toFixed(2),'', totalPnl.toFixed(2), totalPnlPct.toFixed(2),'','','']);
  const csv = [headers, ...rows]
    .map(r => r.map(v => `"${String(v ?? '').replace(/"/g,'""')}"`).join(','))
    .join('\n');
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })),
    download: `wastake-portfolio-${new Date().toISOString().slice(0, 10)}.csv`,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

// ─── Sub-componentes UI ───────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, subColor }) {
  return (
    <div className="rounded-xl p-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
      <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-xl font-bold font-mono text-white">{value}</p>
      {sub && <p className={`text-xs font-medium mt-0.5 ${subColor ?? 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}

const TYPE_MAP = { all: 'Todos', crypto: 'Crypto', stock: 'Acciones', etf: 'ETF', forex: 'Forex', commodity: 'Materias' };

function FilterPills({ filterType, availableTypes, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {['all', ...availableTypes].map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
          style={{
            background: filterType === t ? 'var(--accent-silver)' : 'var(--bg-card)',
            color: filterType === t ? '#fff' : 'var(--text-muted)',
            border: `1px solid ${filterType === t ? 'var(--accent-silver)' : 'var(--border-subtle)'}`,
            cursor: 'pointer',
          }}
        >
          {TYPE_MAP[t] ?? t}
        </button>
      ))}
    </div>
  );
}

function CurrencyToggle({ currency, onChange }) {
  return (
    <div className="flex rounded-lg p-0.5" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
      {['USD', 'EUR', 'BTC'].map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="px-2 py-1 rounded-md text-xs font-medium transition-colors"
          style={{
            background: currency === c ? 'var(--bg-card-hover)' : 'transparent',
            color: currency === c ? 'var(--accent-silver)' : 'var(--text-muted)',
            border: 'none', cursor: 'pointer',
          }}
        >
          {c}
        </button>
      ))}
    </div>
  );
}

function SortBtn({ label, field, sortBy, sortDir, onSort, className = '' }) {
  const active = sortBy === field;
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-0.5 text-xs transition-colors ${className}`}
      style={{ color: active ? 'var(--accent-silver)' : 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      {label}
      <span style={{ opacity: active ? 1 : 0.3 }}>{active && sortDir === 'asc' ? '↑' : '↓'}</span>
    </button>
  );
}

// ─── Benchmark card ───────────────────────────────────────────────────────────

function BenchmarkCard({ portfolioChange24h, allAssets }) {
  const btc = allAssets?.find(a => a.id === 'bitcoin');
  const spy = allAssets?.find(a => a.id === 'spy' || a.symbol === 'SPY');

  const items = [
    { label: 'Tu cartera', value: portfolioChange24h, highlight: true },
    { label: 'BTC',        value: btc?.change24h ?? null },
    { label: 'SPY',        value: spy?.change24h ?? null },
  ].filter(x => x.value != null);

  if (items.length < 2) return null;

  return (
    <div className="rounded-xl p-4 border mb-5" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
        Benchmark 24h
      </p>
      <div className="flex gap-6 flex-wrap">
        {items.map(({ label, value, highlight }) => (
          <div key={label}>
            <p className="text-xs mb-0.5" style={{ color: highlight ? 'var(--accent-silver)' : 'var(--text-muted)' }}>{label}</p>
            <p className={`text-lg font-bold font-mono ${pnlColor(value)}`}>{fmtPct(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Fila de posición ─────────────────────────────────────────────────────────

function PositionRow({ pos, compact, currency, rates, onRemove, onQuickAlert }) {
  const days = holdingDays(pos.created_at);
  const roi  = annualizedROI(pos.pnlPct, days);

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
        <span className="text-sm text-white font-medium flex-1 truncate">{pos.asset_name}</span>
        <span className={`text-xs font-medium ${pnlColor(pos.pnlPct)}`}>{fmtPct(pos.pnlPct)}</span>
        <span className="text-xs font-mono text-white w-20 text-right">{fmtConverted(pos.currentValue, currency, rates)}</span>
        <button
          onClick={() => onQuickAlert(pos)}
          title="Crear alerta"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-silver)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
        <button
          onClick={() => onRemove(pos.id)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '4px' }}
          onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="py-3 border-b last:border-0" style={{ borderColor: 'var(--border-subtle)' }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-medium text-white">{pos.asset_name}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}>
              {pos.asset_type}
            </span>
            {pos.is_simulation && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-400 border border-amber-700/40 font-medium">
                Simulación
              </span>
            )}
          </div>

          <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {pos.quantity} × entrada {fmtUsd(pos.entry_price)}
            {days != null && <span className="ml-2">· <strong className="font-medium text-slate-400">{days}d</strong> en cartera</span>}
          </p>

          {roi != null && (
            <p className={`text-xs font-medium mt-0.5 ${pnlColor(roi)}`}>
              ROI anualizado: {fmtPct(roi)}
            </p>
          )}

          {/* Precio objetivo */}
          {pos.target_price != null && pos.currentPrice != null && (
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              🎯 Objetivo: {fmtUsd(pos.target_price)}
              {' '}
              <span className={pos.currentPrice >= pos.target_price ? 'text-green-400' : 'text-amber-400'}>
                ({pos.currentPrice >= pos.target_price ? '✓ alcanzado' : `faltan ${fmtPct(((pos.target_price - pos.currentPrice) / pos.currentPrice) * 100)}`})
              </span>
            </p>
          )}

          {/* Tags */}
          {pos.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {pos.tags.map(t => (
                <span key={t} className="text-xs px-1.5 py-0.5 rounded-full"
                  style={{ background: 'var(--accent-silver-glow)', color: 'var(--accent-silver)', border: '1px solid rgba(46,196,200,0.2)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {/* Notas */}
          {pos.notes && (
            <p className="text-xs mt-1 italic" style={{ color: 'var(--text-muted)' }}>
              "{pos.notes}"
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="text-right">
            <p className={`text-base font-mono font-semibold ${pnlColor(pos.pnlUsd)}`}>
              {pos.pnlUsd != null ? (pos.pnlUsd >= 0 ? '+' : '') + fmtConverted(pos.pnlUsd, currency, rates) : '—'}
            </p>
            <p className={`text-sm ${pnlColor(pos.pnlPct)}`}>{fmtPct(pos.pnlPct)}</p>
          </div>

          <div className="text-right hidden sm:block">
            <p className="text-sm font-mono text-white">{fmtConverted(pos.currentValue, currency, rates)}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtUsd(pos.currentPrice)} / ud.</p>
          </div>

          <div className={`text-right w-14 hidden md:block text-sm font-medium ${pnlColor(pos.change24h)}`}>
            {pos.change24h != null ? fmtPct(pos.change24h) : '—'}
          </div>

          {/* Alerta rápida */}
          <button
            onClick={() => onQuickAlert(pos)}
            title="Crear alerta para este activo"
            className="p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-silver)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>

          {/* Eliminar */}
          <button
            onClick={() => onRemove(pos.id)}
            title="Eliminar posición"
            className="p-2 rounded-lg transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#f87171'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sección de posiciones ────────────────────────────────────────────────────

function PositionsSection({ title, positions, compact, currency, rates, onRemove, onQuickAlert, isPaper, sortBy, sortDir, onSort }) {
  if (positions.length === 0) return null;
  return (
    <div className="rounded-xl overflow-hidden mb-4 border" style={{
      background: 'var(--bg-card)',
      borderColor: isPaper ? 'rgba(217,119,6,0.25)' : 'var(--border-subtle)',
    }}>
      {/* Cabecera */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b" style={{
        borderColor: isPaper ? 'rgba(217,119,6,0.2)' : 'var(--border-subtle)',
        background: isPaper ? 'rgba(120,53,15,0.08)' : 'transparent',
      }}>
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</h3>
          {isPaper && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-400 border border-amber-700/40 font-medium">
              Simulación
            </span>
          )}
        </div>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{positions.length} posición{positions.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* Encabezado columnas con sort */}
      {!compact && (
        <div className="flex items-center gap-3 px-4 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <SortBtn label="Activo"  field="name"     sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="flex-1" />
          <SortBtn label="Valor"   field="value"    sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="hidden sm:flex w-28 justify-end" />
          <SortBtn label="P&L"     field="pnlUsd"   sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="w-24 justify-end" />
          <SortBtn label="24h"     field="change24h" sortBy={sortBy} sortDir={sortDir} onSort={onSort} className="hidden md:flex w-14 justify-end" />
          <span className="w-20" />
        </div>
      )}

      <div className="px-4">
        {positions.map(pos => (
          <PositionRow
            key={pos.id}
            pos={pos}
            compact={compact}
            currency={currency}
            rates={rates}
            onRemove={onRemove}
            onQuickAlert={onQuickAlert}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

// ─── Selector de portfolios ───────────────────────────────────────────────────
function PortfolioSelector({ portfolios, selected, setSelected, onCreate, onRename, onDelete }) {
  const [open, setOpen]       = useState(false);
  const [renaming, setRenaming] = useState(null);  // id del que se está renombrando
  const [newName, setNewName]   = useState('');
  const [creating, setCreating] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm font-medium transition-colors"
        style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)', color: 'var(--accent-silver)' }}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v8.25m19.5 0A2.25 2.25 0 0 1 19.5 16.5h-15a2.25 2.25 0 0 1-2.25-2.25m19.5 0v-7.5A2.25 2.25 0 0 0 19.5 4.5h-15" />
        </svg>
        {selected?.name ?? 'Cartera'}
        <span className="text-xs">▾</span>
      </button>

      {open && (
        <div
          className="absolute top-full mt-1 left-0 rounded-xl border shadow-2xl z-50 min-w-[220px] py-1"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
        >
          {portfolios.map(p => (
            <div key={p.id} className="flex items-center gap-1 px-2 py-1 hover:bg-white/5 rounded-lg mx-1 group">
              {renaming === p.id ? (
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { onRename(p.id, newName); setRenaming(null); }
                    if (e.key === 'Escape') setRenaming(null);
                  }}
                  className="flex-1 bg-transparent text-sm text-white outline-none border-b border-[#c0c0c0]/50"
                />
              ) : (
                <button
                  className={`flex-1 text-left text-sm py-0.5 ${selected?.id === p.id ? 'text-[#c0c0c0] font-medium' : 'text-slate-300'}`}
                  onClick={() => { setSelected(p); setOpen(false); }}
                >
                  {selected?.id === p.id ? '✓ ' : '  '}{p.name}
                </button>
              )}
              <button
                className="opacity-0 group-hover:opacity-70 hover:!opacity-100 text-slate-400 text-xs px-1 transition-opacity"
                onClick={() => { setRenaming(p.id); setNewName(p.name); }}
                title="Renombrar"
              >✎</button>
              {portfolios.length > 1 && (
                <button
                  className="opacity-0 group-hover:opacity-70 hover:!opacity-100 text-red-400 text-xs px-1 transition-opacity"
                  onClick={() => { if (confirm(`¿Eliminar "${p.name}"?`)) onDelete(p.id); }}
                  title="Eliminar"
                >✕</button>
              )}
            </div>
          ))}

          <div className="border-t mx-2 my-1" style={{ borderColor: 'var(--border-subtle)' }} />

          {creating ? (
            <div className="px-3 py-1">
              <input
                autoFocus
                placeholder="Nombre de la cartera..."
                className="w-full bg-transparent text-sm text-white outline-none border-b border-[#c0c0c0]/50 pb-1"
                onKeyDown={e => {
                  if (e.key === 'Enter') { onCreate(e.target.value); setCreating(false); setOpen(false); }
                  if (e.key === 'Escape') setCreating(false);
                }}
              />
            </div>
          ) : (
            <button
              className="w-full text-left px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
              onClick={() => setCreating(true)}
            >
              + Nueva cartera
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Portfolio({ user, signIn, signUp, signOut, allAssets, onNavigate }) {
  const toast = useToast();
  const rates = useCurrencyRates(allAssets);

  const { portfolios, selected: activePortfolio, setSelected, createPortfolio, renamePortfolio, deletePortfolio } = usePortfolios(user);

  const {
    positions, real, paper,
    loading, error,
    addPosition, removePosition,
    totalValue, totalCost, totalPnl, totalPnlPct,
  } = usePortfolio(user, allAssets, activePortfolio?.id ?? null);

  const [showAdd,    setShowAdd]    = useState(false);
  const [compact,    setCompact]    = useState(false);
  const [currency,   setCurrency]   = useState('USD');
  const [filterType, setFilterType] = useState('all');
  const [sortBy,     setSortBy]     = useState('value');
  const [sortDir,    setSortDir]    = useState('desc');

  // ── Helpers ────────────────────────────────────────────────────
  function handleSort(field) {
    if (sortBy === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortBy(field); setSortDir('desc'); }
  }

  function handleQuickAlert(pos) {
    // Guarda el activo en sessionStorage para que Alerts lo recoja
    sessionStorage.setItem('wa_alert_prefill', JSON.stringify({ id: pos.asset_id, name: pos.asset_name, type: pos.asset_type }));
    onNavigate?.('alerts');
    toast.info('Crear alerta', `Abriendo alertas para ${pos.asset_name}`);
  }

  // ── Tipos disponibles ───────────────────────────────────────────
  const availableTypes = useMemo(() => [...new Set(real.map(p => p.asset_type).filter(Boolean))], [real]);

  // ── Filtrado y orden ────────────────────────────────────────────
  const sortFn = (a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'name':      return dir * a.asset_name.localeCompare(b.asset_name);
      case 'value':     return dir * ((a.currentValue ?? 0) - (b.currentValue ?? 0));
      case 'pnlUsd':    return dir * ((a.pnlUsd ?? 0) - (b.pnlUsd ?? 0));
      case 'pnlPct':    return dir * ((a.pnlPct ?? 0) - (b.pnlPct ?? 0));
      case 'change24h': return dir * ((a.change24h ?? 0) - (b.change24h ?? 0));
      default:          return 0;
    }
  };

  const filteredReal  = useMemo(() =>
    real.filter(p => filterType === 'all' || p.asset_type === filterType).sort(sortFn),
    [real, filterType, sortBy, sortDir]
  );

  const filteredPaper = useMemo(() => paper.sort(sortFn), [paper, sortBy, sortDir]);

  // ── Benchmark 24h ponderado ─────────────────────────────────────
  const portfolioChange24h = useMemo(() => {
    const weighted = real.filter(p => p.change24h != null && p.currentValue);
    const totalW   = weighted.reduce((s, p) => s + p.currentValue, 0);
    if (!totalW) return null;
    return weighted.reduce((s, p) => s + (p.change24h * p.currentValue) / totalW, 0);
  }, [real]);

  // ── Handlers ───────────────────────────────────────────────────
  async function handleAdd(data) {
    try {
      await addPosition(data);
      toast.success('Posición agregada', `${data.assetName} añadido a tu cartera`);
    } catch (err) {
      toast.error('Error al agregar', err.message);
    }
  }

  async function handleRemove(id) {
    try {
      await removePosition(id);
      toast.info('Posición eliminada');
    } catch (err) {
      toast.error('Error al eliminar', err.message);
    }
  }

  function handleExportCSV() {
    if (!positions.length) { toast.warning('Sin datos', 'No hay posiciones para exportar'); return; }
    exportPortfolioCSV(positions, totalValue, totalPnl, totalPnlPct);
    toast.success('CSV exportado', `${positions.length} posiciones descargadas`);
  }

  // ── Sin sesión ─────────────────────────────────────────────────
  if (!user) return <AuthModal onSignIn={signIn} onSignUp={signUp} />;

  // ── Cargando ───────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" style={{ borderTopColor: 'var(--accent-silver)' }} />
    </div>
  );

  const allPositions = [...real, ...paper];

  return (
    <div className="flex flex-col h-full p-4 max-w-4xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {portfolios.length > 0 && (
            <PortfolioSelector
              portfolios={portfolios}
              selected={activePortfolio}
              setSelected={setSelected}
              onCreate={async name => { try { await createPortfolio(name); } catch(e) { toast.error('Error', e.message); }}}
              onRename={async (id, name) => { try { await renamePortfolio(id, name); } catch(e) { toast.error('Error', e.message); }}}
              onDelete={async id => { try { await deletePortfolio(id); } catch(e) { toast.error('Error', e.message); }}}
            />
          )}
          <div>
            <h1 className="text-lg font-semibold text-white">{activePortfolio?.name ?? 'Mi Cartera'}</h1>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <CurrencyToggle currency={currency} onChange={setCurrency} />

          {/* Compact toggle */}
          <button
            onClick={() => setCompact(v => !v)}
            title={compact ? 'Vista detallada' : 'Vista compacta'}
            className="p-2 rounded-lg transition-colors"
            style={{
              background: compact ? 'var(--accent-silver-glow)' : 'var(--bg-card)',
              border: `1px solid ${compact ? 'var(--accent-silver)' : 'var(--border-subtle)'}`,
              color: compact ? 'var(--accent-silver)' : 'var(--text-muted)',
              cursor: 'pointer',
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {compact
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>

          {/* Export CSV */}
          {positions.length > 0 && (
            <button
              onClick={handleExportCSV}
              className="text-xs px-3 py-2 rounded-lg border transition-colors flex items-center gap-1.5"
              style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-card)', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
                <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v7.69l2.22-2.22a.75.75 0 0 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 0 1 1.06-1.06l2.22 2.22V3.75A.75.75 0 0 1 10 3ZM3.75 15a.75.75 0 0 0 0 1.5h12.5a.75.75 0 0 0 0-1.5H3.75Z" clipRule="evenodd" />
              </svg>
              CSV
            </button>
          )}

          <button
            onClick={() => setShowAdd(true)}
            className="text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all flex items-center gap-1.5 min-h-[44px]"
            style={{ background: 'linear-gradient(135deg, #3a3a3a, var(--accent-silver))', border: 'none', cursor: 'pointer', boxShadow: '0 4px 12px var(--accent-silver-glow)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar
          </button>

          <button
            onClick={signOut}
            className="text-xs px-3 py-2 rounded-lg border transition-colors"
            style={{ color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'transparent', cursor: 'pointer' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            Salir
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-2 mb-4">{error}</p>
      )}

      {allPositions.length === 0 ? (
        /* Estado vacío */
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="w-14 h-14 rounded-2xl border flex items-center justify-center mb-4"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
            <svg className="w-7 h-7" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-white font-medium">Sin posiciones</p>
          <p className="text-sm mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>Agrega tu primera posición para ver el análisis de tu cartera.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all"
            style={{ background: 'linear-gradient(135deg, #3a3a3a, var(--accent-silver))', border: 'none', cursor: 'pointer' }}
          >
            Agregar posición
          </button>
        </div>
      ) : (
        <>
          {/* Cards resumen */}
          {real.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <SummaryCard label="Valor total"   value={fmtConverted(totalValue, currency, rates)} />
              <SummaryCard label="Costo base"    value={fmtConverted(totalCost, currency, rates)} />
              <SummaryCard
                label="P&L total"
                value={(totalPnl >= 0 ? '+' : '') + fmtConverted(totalPnl, currency, rates)}
                subColor={pnlColor(totalPnl)}
              />
              <SummaryCard
                label="Rentabilidad"
                value={fmtPct(totalPnlPct)}
                subColor={pnlColor(totalPnlPct)}
              />
            </div>
          )}

          {/* Benchmark */}
          {real.length > 0 && (
            <BenchmarkCard portfolioChange24h={portfolioChange24h} allAssets={allAssets} />
          )}

          {/* Distribución */}
          {real.length > 0 && (
            <div className="rounded-xl p-4 mb-4 border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}>
              <h3 className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>
                Distribución
              </h3>
              <DonutChart positions={real} />
            </div>
          )}

          {/* Filtros */}
          {availableTypes.length > 1 && (
            <div className="mb-3">
              <FilterPills filterType={filterType} availableTypes={availableTypes} onChange={setFilterType} />
            </div>
          )}

          {/* ── Gráfico de evolución ── */}
          {real.length >= 2 && (
            <div
              className="rounded-xl border p-4 mb-4"
              style={{ background: 'var(--bg-card)', borderColor: 'var(--border-subtle)' }}
            >
              <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-muted)' }}>Evolución del portfolio</p>
              <PortfolioChart positions={real} />
            </div>
          )}

          {/* Posiciones reales */}
          <PositionsSection
            title="Posiciones"
            positions={filteredReal}
            compact={compact}
            currency={currency}
            rates={rates}
            onRemove={handleRemove}
            onQuickAlert={handleQuickAlert}
            isPaper={false}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />

          {/* Paper trading */}
          <PositionsSection
            title="Paper Trading"
            positions={filteredPaper}
            compact={compact}
            currency={currency}
            rates={rates}
            onRemove={handleRemove}
            onQuickAlert={handleQuickAlert}
            isPaper={true}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </>
      )}

      {showAdd && (
        <AddPositionModal onAdd={handleAdd} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      