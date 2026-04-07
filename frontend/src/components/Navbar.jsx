import { useTranslation } from 'react-i18next';
import { NotificationBell } from './NotificationBell.jsx';
import { WaLogoMark } from './WaLogo.jsx';

const LANGS = [
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'panorama',  label: 'Panorama'  },
  { id: 'markets',   label: 'Mercados'  },
  { id: 'portfolio', label: 'Cartera'   },
  { id: 'alerts',    label: 'Alertas'   },
];

function SunIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
      <path d="M10 2a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 2ZM10 15a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-1.5 0v-1.5A.75.75 0 0 1 10 15ZM10 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6ZM15.657 5.404a.75.75 0 1 0-1.06-1.06l-1.061 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM6.464 14.596a.75.75 0 1 0-1.06-1.06l-1.06 1.06a.75.75 0 0 0 1.06 1.06l1.06-1.06ZM18 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 18 10ZM5 10a.75.75 0 0 1-.75.75h-1.5a.75.75 0 0 1 0-1.5h1.5A.75.75 0 0 1 5 10ZM14.596 15.657a.75.75 0 0 0 1.06-1.06l-1.06-1.061a.75.75 0 1 0-1.06 1.06l1.06 1.06ZM5.404 6.464a.75.75 0 0 0 1.06-1.06L5.404 4.343a.75.75 0 1 0-1.06 1.06l1.06 1.061Z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 20 20" className="w-4 h-4 fill-current">
      <path fillRule="evenodd" d="M7.455 2.004a.75.75 0 0 1 .26.77 7 7 0 0 0 9.958 7.967.75.75 0 0 1 1.067.853A8.5 8.5 0 1 1 6.647 1.921a.75.75 0 0 1 .808.083Z" clipRule="evenodd" />
    </svg>
  );
}

export function Navbar({
  lastUpdated,
  currentPage,
  onNavigate,
  alerts,
  unreadCount,
  onMarkRead,
  onMarkAllRead,
  darkMode,
  onToggleDark,
}) {
  const { t, i18n } = useTranslation();

  return (
    <header className="h-14 border-b border-slate-700/50 flex items-center justify-between px-4 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-40 gap-2">
      {/* Logo + Nav */}
      <div className="flex items-center gap-4 min-w-0">
        {/* Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <WaLogoMark iconSize={30} />
          <span className="text-xs px-2 py-0.5 rounded-full bg-brand-900/60 text-brand-400 border border-brand-700/40 font-medium hidden sm:block">
            beta
          </span>
        </div>

        {/* Navigation tabs */}
        <nav className="flex gap-0.5 overflow-x-auto scrollbar-none">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate?.(item.id)}
              className={[
                'px-3 py-1.5 text-sm rounded-lg transition-colors font-medium whitespace-nowrap flex-shrink-0',
                currentPage === item.id
                  ? 'bg-slate-700/80 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {lastUpdated && (
          <span className="text-xs text-slate-500 hidden lg:block whitespace-nowrap">
            {t('last_updated')}: {lastUpdated.toLocaleTimeString()}
          </span>
        )}

        {/* Notification Bell */}
        <NotificationBell
          alerts={alerts ?? []}
          unreadCount={unreadCount ?? 0}
          onMarkRead={onMarkRead}
          onMarkAllRead={onMarkAllRead}
          onNavigateAlerts={() => onNavigate?.('alerts')}
        />

        {/* Dark/Light mode toggle */}
        <button
          onClick={onToggleDark}
          className={[
            'p-1.5 rounded-lg transition-colors',
            darkMode
              ? 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800'
              : 'text-yellow-500 hover:text-white hover:bg-slate-800',
          ].join(' ')}
          title={darkMode ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
        </button>

        {/* Language selector */}
        <div className="flex gap-0.5 border border-slate-700 rounded-lg p-0.5">
          {LANGS.map(l => (
            <button
              key={l.code}
              onClick={() => i18n.changeLanguage(l.code)}
              className={[
                'px-2 py-1 text-xs rounded-md transition-colors font-medium',
                i18n.language.startsWith(l.code)
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white',
              ].join(' ')}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
