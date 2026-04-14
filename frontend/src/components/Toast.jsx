import { createContext, useContext, useState, useCallback, useRef } from 'react';

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastContext = createContext(null);

// ─── Hook público ─────────────────────────────────────────────────────────────
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return ctx;
}

// ─── Íconos SVG inline (sin dependencia externa) ─────────────────────────────
const ICONS = {
  success: (
    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current flex-shrink-0 mt-0.5">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z" clipRule="evenodd" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current flex-shrink-0 mt-0.5">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22Z" clipRule="evenodd" />
    </svg>
  ),
  warning: (
    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current flex-shrink-0 mt-0.5">
      <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current flex-shrink-0 mt-0.5">
      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z" clipRule="evenodd" />
    </svg>
  ),
};

const STYLES = {
  success: { container: 'bg-green-950/90 border-green-700/60',  icon: 'text-green-400',  title: 'text-green-300',  msg: 'text-green-200/80'  },
  error:   { container: 'bg-red-950/90 border-red-700/60',      icon: 'text-red-400',    title: 'text-red-300',    msg: 'text-red-200/80'    },
  warning: { container: 'bg-amber-950/90 border-amber-700/60',  icon: 'text-amber-400',  title: 'text-amber-300',  msg: 'text-amber-200/80'  },
  info:    { container: 'bg-slate-800/95 border-slate-600/60',   icon: 'text-blue-400',   title: 'text-slate-200',  msg: 'text-slate-400'     },
};

// ─── Toast individual ─────────────────────────────────────────────────────────
function ToastItem({ toast, onRemove }) {
  const s = STYLES[toast.type] ?? STYLES.info;
  return (
    <div
      className={[
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm',
        'w-80 max-w-[calc(100vw-2rem)]',
        'animate-in slide-in-from-right duration-300',
        s.container,
      ].join(' ')}
      style={{ animation: 'slideInRight 0.25s ease-out' }}
    >
      <span className={s.icon}>{ICONS[toast.type]}</span>
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className={`text-sm font-semibold leading-tight ${s.title}`}>{toast.title}</p>
        )}
        {toast.message && (
          <p className={`text-xs leading-relaxed mt-0.5 ${s.msg}`}>{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => onRemove(toast.id)}
        className="text-slate-500 hover:text-slate-300 transition-colors flex-shrink-0 p-0.5 rounded"
      >
        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
          <path d="M6.22 4.22a.75.75 0 0 1 1.06 0L9 5.94l1.72-1.72a.75.75 0 1 1 1.06 1.06L10.06 7l1.72 1.72a.75.75 0 0 1-1.06 1.06L9 8.06l-1.72 1.72a.75.75 0 0 1-1.06-1.06L7.94 7 6.22 5.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>
    </div>
  );
}

// ─── Provider — envuelve la app ───────────────────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timerRefs = useRef({});

  const remove = useCallback((id) => {
    clearTimeout(timerRefs.current[id]);
    delete timerRefs.current[id];
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const add = useCallback(({ type = 'info', title, message, duration = 4000 }) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev.slice(-4), { id, type, title, message }]); // máx 5 toasts
    if (duration > 0) {
      timerRefs.current[id] = setTimeout(() => remove(id), duration);
    }
    return id;
  }, [remove]);

  // Atajos de conveniencia
  const toast = {
    success: (title, message, opts) => add({ type: 'success', title, message, ...opts }),
    error:   (title, message, opts) => add({ type: 'error',   title, message, ...opts }),
    warning: (title, message, opts) => add({ type: 'warning', title, message, ...opts }),
    info:    (title, message, opts) => add({ type: 'info',    title, message, ...opts }),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}

      {/* Portal de toasts — esquina inferior derecha */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none"
          style={{ maxHeight: 'calc(100vh - 2rem)' }}
        >
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onRemove={remove} />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(110%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
