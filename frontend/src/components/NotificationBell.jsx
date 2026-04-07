import { useState, useEffect, useRef } from 'react';

const ALERT_TYPE_LABELS = {
  price_above:    'Precio superó objetivo',
  price_below:    'Precio cayó bajo objetivo',
  change_above:   'Subida % alcanzada',
  change_below:   'Caída % alcanzada',
  rsi_overbought: 'RSI sobrecomprado',
  rsi_oversold:   'RSI sobrevendido',
  macd_bullish:   'MACD señal alcista',
  macd_bearish:   'MACD señal bajista',
};

function formatRelativeTime(dateString) {
  if (!dateString) return '';

  const now  = Date.now();
  const then = new Date(dateString).getTime();
  const diff = now - then; // ms

  if (diff < 0) return 'ahora';

  const minutes = Math.floor(diff / 60_000);
  const hours   = Math.floor(diff / 3_600_000);
  const days    = Math.floor(diff / 86_400_000);

  if (minutes < 1)   return 'hace un momento';
  if (minutes < 60)  return `hace ${minutes} min`;
  if (hours < 24)    return `hace ${hours}h`;
  if (days < 7)      return `hace ${days}d`;

  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
  });
}

export function NotificationBell({
  alerts,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  onNavigateAlerts,
}) {
  const [open, setOpen] = useState(false);
  const containerRef    = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;

    function handleOutsideClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [open]);

  const recentAlerts = (alerts ?? []).slice(0, 5);

  function handleMarkRead(id) {
    onMarkRead?.(id);
  }

  function handleMarkAllRead() {
    onMarkAllRead?.();
  }

  function handleNavigate() {
    setOpen(false);
    onNavigateAlerts?.();
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="relative p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        aria-label="Notificaciones"
      >
        {/* Bell SVG */}
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
            <span className="text-white font-semibold text-sm">Notificaciones</span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-brand-400 hover:text-brand-300 transition-colors font-medium"
              >
                Marcar todo leído
              </button>
            )}
          </div>

          {/* Alert list */}
          {recentAlerts.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 mx-auto mb-2 text-slate-600" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="text-slate-500 text-sm">Sin notificaciones</p>
            </div>
          ) : (
            <ul>
              {recentAlerts.map(alert => (
                <li key={alert.id}>
                  <button
                    onClick={() => handleMarkRead(alert.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-700/50 transition-colors text-left group"
                  >
                    {/* Unread indicator */}
                    <span className="mt-1.5 flex-shrink-0">
                      {alert.is_read === false ? (
                        <span className="w-2 h-2 rounded-full bg-brand-500 block" />
                      ) : (
                        <span className="w-2 h-2 rounded-full bg-transparent block" />
                      )}
                    </span>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate leading-tight">
                        {alert.asset_name}
                      </p>
                      <p className="text-slate-400 text-xs mt-0.5 truncate">
                        {ALERT_TYPE_LABELS[alert.alert_type] ?? alert.alert_type}
                      </p>
                    </div>

                    {/* Time */}
                    <span className="flex-shrink-0 text-slate-500 text-xs mt-0.5">
                      {formatRelativeTime(alert.triggered_at)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Footer */}
          <div className="border-t border-slate-700 px-4 py-3">
            <button
              onClick={handleNavigate}
              className="w-full text-center text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors"
            >
              Ver todas las alertas →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
