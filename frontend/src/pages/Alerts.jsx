import { useState } from 'react';
import { useAlerts } from '../hooks/useAlerts.js';
import { CreateAlertModal } from '../components/CreateAlertModal.jsx';
import { AuthModal } from '../components/AuthModal.jsx';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALERT_TYPE_LABELS = {
  price_above:    'Precio objetivo (arriba)',
  price_below:    'Precio objetivo (abajo)',
  change_above:   'Variación % (sube)',
  change_below:   'Variación % (baja)',
  rsi_overbought: 'RSI sobrecomprado (>70)',
  rsi_oversold:   'RSI sobrevendido (<30)',
  macd_bullish:   'MACD alcista',
  macd_bearish:   'MACD bajista',
};

const ALERT_TYPE_COLORS = {
  price_above:    'bg-green-900/40 text-green-400 border-green-700/40',
  price_below:    'bg-red-900/40 text-red-400 border-red-700/40',
  change_above:   'bg-emerald-900/40 text-emerald-400 border-emerald-700/40',
  change_below:   'bg-orange-900/40 text-orange-400 border-orange-700/40',
  rsi_overbought: 'bg-purple-900/40 text-purple-400 border-purple-700/40',
  rsi_oversold:   'bg-blue-900/40 text-blue-400 border-blue-700/40',
  macd_bullish:   'bg-teal-900/40 text-teal-400 border-teal-700/40',
  macd_bearish:   'bg-rose-900/40 text-rose-400 border-rose-700/40',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(dateString) {
  if (!dateString) return '—';
  return new Date(dateString).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTargetValue(alertType, targetValue) {
  if (targetValue == null) return null;
  if (alertType === 'price_above' || alertType === 'price_below') {
    return `$${Number(targetValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
  }
  if (alertType === 'change_above' || alertType === 'change_below') {
    return `${Number(targetValue).toFixed(2)}%`;
  }
  return String(targetValue);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-slate-600 border-t-brand-400 rounded-full animate-spin" />
    </div>
  );
}

function ErrorMessage({ message }) {
  return (
    <div className="mx-auto max-w-4xl w-full px-4 mt-6">
      <div className="bg-red-900/20 border border-red-700/40 rounded-xl px-4 py-3 text-red-400 text-sm">
        {message}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700/40 rounded-xl px-5 py-4 flex-1 min-w-0">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold font-mono ${color ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

function AlertTypeBadge({ alertType }) {
  const label  = ALERT_TYPE_LABELS[alertType] ?? alertType;
  const colors = ALERT_TYPE_COLORS[alertType] ?? 'bg-slate-700/40 text-slate-400 border-slate-600/40';
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border ${colors}`}>
      {label}
    </span>
  );
}

function TrashIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ActiveAlertsSection({ alerts, onDelete }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white mb-3">
        Alertas Activas
        <span className="ml-2 text-sm text-slate-500 font-normal">({alerts.length})</span>
      </h2>

      {alerts.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-6 py-10 text-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <p className="text-slate-500 text-sm">No tienes alertas activas</p>
          <p className="text-slate-600 text-xs mt-1">Crea una alerta para monitorear precios e indicadores</p>
        </div>
      ) : (
        <div className="bg-[#111318]/90 border border-white/[8%] rounded-xl overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-500 border-b border-slate-700/40 bg-slate-800/60">
            <span className="flex-1">Activo</span>
            <span className="hidden sm:block w-44">Tipo</span>
            <span className="hidden md:block w-28">Valor objetivo</span>
            <span className="hidden lg:block w-36">Creada</span>
            <span className="w-8" />
          </div>

          {/* Rows */}
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/20 last:border-0 hover:bg-slate-700/20 transition-colors"
            >
              {/* Asset name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{alert.asset_name}</p>
                <p className="text-xs text-slate-500 mt-0.5 sm:hidden">
                  {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                </p>
              </div>

              {/* Type badge */}
              <div className="hidden sm:block w-44">
                <AlertTypeBadge alertType={alert.alert_type} />
              </div>

              {/* Target value */}
              <div className="hidden md:block w-28 text-sm font-mono text-slate-300">
                {formatTargetValue(alert.alert_type, alert.target_value) ?? (
                  <span className="text-slate-500 text-xs">—</span>
                )}
              </div>

              {/* Created at */}
              <div className="hidden lg:block w-36 text-xs text-slate-500">
                {formatDate(alert.created_at)}
              </div>

              {/* Delete */}
              <button
                onClick={() => onDelete(alert.id)}
                className="w-8 flex items-center justify-center text-slate-600 hover:text-red-400 transition-colors flex-shrink-0"
                title="Eliminar alerta"
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TriggeredAlertsSection({ alerts, onMarkRead }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-white mb-3">
        Historial de Alertas
        <span className="ml-2 text-sm text-slate-500 font-normal">({alerts.length})</span>
      </h2>

      {alerts.length === 0 ? (
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl px-6 py-10 text-center">
          <svg viewBox="0 0 24 24" className="w-8 h-8 mx-auto mb-3 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-500 text-sm">Sin alertas disparadas aún</p>
          <p className="text-slate-600 text-xs mt-1">Las alertas que se activen aparecerán aquí</p>
        </div>
      ) : (
        <div className="bg-[#111318]/90 border border-white/[8%] rounded-xl overflow-hidden">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-500 border-b border-slate-700/40 bg-slate-800/60">
            <span className="w-2 flex-shrink-0" />
            <span className="flex-1">Activo</span>
            <span className="hidden sm:block w-44">Tipo</span>
            <span className="hidden md:block w-36">Disparada</span>
            <span className="w-28 text-right">Estado</span>
          </div>

          {/* Rows */}
          {alerts.map(alert => (
            <div
              key={alert.id}
              className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/20 last:border-0 hover:bg-slate-700/20 transition-colors"
            >
              {/* Unread dot */}
              <div className="w-2 flex-shrink-0 flex items-center justify-center">
                {alert.is_read === false && (
                  <span className="w-2 h-2 rounded-full bg-brand-500 block flex-shrink-0" />
                )}
              </div>

              {/* Asset name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{alert.asset_name}</p>
                <p className="text-xs text-slate-500 mt-0.5 sm:hidden">
                  {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                </p>
              </div>

              {/* Type badge */}
              <div className="hidden sm:block w-44">
                <AlertTypeBadge alertType={alert.alert_type} />
              </div>

              {/* Triggered at */}
              <div className="hidden md:block w-36 text-xs text-slate-500">
                {formatDate(alert.triggered_at)}
              </div>

              {/* Status + action */}
              <div className="w-28 flex items-center justify-end gap-2">
                <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium bg-green-900/40 text-green-400 border border-green-700/40">
                  <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current">
                    <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                  </svg>
                  Disparada
                </span>
                {alert.is_read === false && (
                  <button
                    onClick={() => onMarkRead(alert.id)}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors whitespace-nowrap font-medium"
                  >
                    Leída
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Alerts({ user, signIn, signUp, signOut, allAssets }) {
  const {
    active,
    triggered,
    unreadCount,
    loading,
    error,
    createAlert,
    deleteAlert,
    markRead,
  } = useAlerts(user);

  const [showCreate, setShowCreate] = useState(false);

  // Not logged in
  if (!user) {
    return <AuthModal onSignIn={signIn} onSignUp={signUp} />;
  }

  // Loading
  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="flex flex-col h-full p-4 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-white">Mis Alertas</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitoreo automático de precios e indicadores técnicos
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Nueva Alerta
        </button>
      </div>

      {/* Error message */}
      {error && <ErrorMessage message={error} />}

      {/* Stats row */}
      <div className="flex gap-3 mb-6 flex-wrap">
        <StatCard
          label="Alertas activas"
          value={active.length}
          color="text-white"
        />
        <StatCard
          label="Disparadas"
          value={triggered.length}
          color="text-green-400"
        />
        <StatCard
          label="Sin leer"
          value={unreadCount}
          color={unreadCount > 0 ? 'text-brand-400' : 'text-slate-500'}
        />
      </div>

      {/* Sections */}
      <div className="flex flex-col gap-8">
        <ActiveAlertsSection alerts={active} onDelete={deleteAlert} />
        <TriggeredAlertsSection alerts={triggered} onMarkRead={markRead} />
      </div>

      {/* Create alert modal */}
      <CreateAlertModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onSave={createAlert}
        assets={allAssets ?? []}
      />
    </div>
  );
}
