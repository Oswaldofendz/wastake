import { useState } from 'react';
import { usePortfolio } from '../hooks/usePortfolio.js';
import { AuthModal } from '../components/AuthModal.jsx';
import { AddPositionModal } from '../components/AddPositionModal.jsx';
import { DonutChart } from '../components/DonutChart.jsx';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtUsd(n) {
  if (n == null || isNaN(n)) return '—';
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  return `$${Math.abs(n) < 1 ? n.toFixed(4) : n.toFixed(2)}`;
}

function fmtPct(n) {
  if (n == null) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function pnlColor(n) {
  if (n == null || n === 0) return 'text-slate-400';
  return n > 0 ? 'text-green-400' : 'text-red-400';
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function SummaryCard({ label, value, sub, subColor }) {
  return (
    <div className="bg-slate-800/60 rounded-xl p-4 border border-slate-700/40">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-xl font-bold font-mono text-white">{value}</p>
      {sub && <p className={`text-xs font-medium mt-0.5 ${subColor ?? 'text-slate-400'}`}>{sub}</p>}
    </div>
  );
}

function PositionRow({ pos, onRemove }) {
  return (
    <div className="py-3 border-b border-slate-700/30 last:border-0">
      {/* Mobile: card layout */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-medium text-white">{pos.asset_name}</span>
            {pos.is_simulation && (
              <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-400 border border-amber-700/40 font-medium">
                Simulación
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            {pos.quantity} × entrada {fmtUsd(pos.entry_price)}
          </p>
          {/* Mobile: show value + 24h inline */}
          <div className="flex items-center gap-3 mt-1.5 sm:hidden">
            <span className="text-sm font-mono text-white">{fmtUsd(pos.currentValue)}</span>
            {pos.change24h != null && (
              <span className={`text-xs font-medium ${pnlColor(pos.change24h)}`}>
                24h: {fmtPct(pos.change24h)}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* P&L */}
          <div className="text-right">
            <p className={`text-base font-mono font-semibold ${pnlColor(pos.pnlUsd)}`}>
              {pos.pnlUsd != null ? (pos.pnlUsd >= 0 ? '+' : '') + fmtUsd(pos.pnlUsd) : '—'}
            </p>
            <p className={`text-sm ${pnlColor(pos.pnlPct)}`}>{fmtPct(pos.pnlPct)}</p>
          </div>

          {/* Valor actual — desktop only */}
          <div className="text-right hidden sm:block">
            <p className="text-sm font-mono text-white">{fmtUsd(pos.currentValue)}</p>
            <p className="text-xs text-slate-500">{fmtUsd(pos.currentPrice)} / ud.</p>
          </div>

          {/* 24h — desktop only */}
          <div className={`text-right w-16 hidden md:block text-sm font-medium ${pnlColor(pos.change24h)}`}>
            {pos.change24h != null ? fmtPct(pos.change24h) : '—'}
          </div>

          {/* Delete */}
          <button
            onClick={() => onRemove(pos.id)}
            className="text-slate-600 hover:text-red-400 transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
            title="Eliminar posición"
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

function PositionsSection({ title, positions, onRemove, isPaper }) {
  if (positions.length === 0) return null;

  return (
    <div className={`bg-slate-800/50 border rounded-xl overflow-hidden mb-4 ${
      isPaper ? 'border-amber-700/30' : 'border-slate-700/30'
    }`}>
      {/* Cabecera */}
      <div className={`flex items-center justify-between px-4 py-2.5 border-b ${
        isPaper ? 'border-amber-700/30 bg-amber-900/10' : 'border-slate-700/40'
      }`}>
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{title}</h3>
          {isPaper && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-900/50 text-amber-400 border border-amber-700/40 font-medium">
              Simulación
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">{positions.length} posición{positions.length !== 1 ? 'es' : ''}</span>
      </div>

      {/* Encabezado columnas */}
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-slate-500 border-b border-slate-700/20">
        <span className="flex-1">Activo</span>
        <span className="hidden sm:block w-28 text-right">Valor actual</span>
        <span className="w-24 text-right">P&L</span>
        <span className="hidden md:block w-16 text-right">24h</span>
        <span className="w-4 ml-1" />
      </div>

      {/* Filas */}
      <div className="px-4">
        {positions.map(pos => (
          <PositionRow key={pos.id} pos={pos} onRemove={onRemove} />
        ))}
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function Portfolio({ user, signIn, signUp, signOut, allAssets }) {
  const {
    real, paper,
    loading, error,
    addPosition, removePosition,
    totalValue, totalCost, totalPnl, totalPnlPct,
  } = usePortfolio(user, allAssets);

  const [showAdd, setShowAdd] = useState(false);

  // ── Sin sesión ───────────────────────────────────────────────
  if (!user) {
    return <AuthModal onSignIn={signIn} onSignUp={signUp} />;
  }

  // ── Cargando ─────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-slate-600 border-t-brand-400 rounded-full animate-spin" />
    </div>
  );

  const allPositions = [...real, ...paper];

  return (
    <div className="flex flex-col h-full p-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-lg font-semibold text-white">Mi Cartera</h1>
          <p className="text-xs text-slate-500">{user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdd(true)}
            className="bg-brand-600 hover:bg-brand-500 text-white text-base font-medium px-4 py-2.5 rounded-lg transition-colors flex items-center gap-1.5 min-h-[44px]"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Agregar
          </button>
          <button
            onClick={signOut}
            className="text-slate-400 hover:text-white text-xs px-3 py-2 rounded-lg border border-slate-700/50 hover:border-slate-600 transition-colors"
          >
            Salir
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-2 mb-4">
          {error}
        </p>
      )}

      {allPositions.length === 0 ? (
        /* Estado vacío */
        <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700/40 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-white font-medium">Sin posiciones</p>
          <p className="text-slate-400 text-sm mt-1 mb-4">Agrega tu primera posición para ver el análisis de tu cartera.</p>
          <button
            onClick={() => setShowAdd(true)}
            className="bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
          >
            Agregar posición
          </button>
        </div>
      ) : (
        <>
          {/* Cards resumen (solo posiciones reales) */}
          {real.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <SummaryCard label="Valor total" value={fmtUsd(totalValue)} />
              <SummaryCard label="Costo base" value={fmtUsd(totalCost)} />
              <SummaryCard
                label="P&L total"
                value={(totalPnl >= 0 ? '+' : '') + fmtUsd(totalPnl)}
                subColor={pnlColor(totalPnl)}
              />
              <SummaryCard
                label="Rentabilidad"
                value={fmtPct(totalPnlPct)}
                subColor={pnlColor(totalPnlPct)}
              />
            </div>
          )}

          {/* Gráfico de dona */}
          {real.length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700/30 rounded-xl p-4 mb-5">
              <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3">
                Distribución
              </h3>
              <DonutChart positions={real} />
            </div>
          )}

          {/* Posiciones reales */}
          <PositionsSection
            title="Posiciones"
            positions={real}
            onRemove={removePosition}
            isPaper={false}
          />

          {/* Paper trading */}
          <PositionsSection
            title="Paper Trading"
            positions={paper}
            onRemove={removePosition}
            isPaper={true}
          />
        </>
      )}

      {/* Modal agregar posición */}
      {showAdd && (
        <AddPositionModal
          onAdd={addPosition}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}
