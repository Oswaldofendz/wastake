import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationBell } from './NotificationBell.jsx';

const LANGS = [
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
];

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'panorama',  label: 'Panorama',  icon: '🚦' },
  { id: 'markets',   label: 'Mercados',  icon: '🌍' },
  { id: 'portfolio', label: 'Cartera',   icon: '💼' },
  { id: 'alerts',    label: 'Alertas',   icon: '🔔' },
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
  isStale,
}) {
  const { t, i18n } = useTranslation();
  const [menuOpen, setMenuOpen] = useState(false);

  function navigate(id) {
    onNavigate?.(id);
    setMenuOpen(false);
  }

  return (
    <>
      <header className="h-20 flex items-center justify-between px-4 backdrop-blur-sm sticky top-0 z-40 gap-3" style={{ background: 'linear-gradient(180deg, rgba(6,7,11,0.98) 0%, rgba(8,10,15,0.95) 100%)', borderBottom: '1px solid rgba(192,192,192,0.08)' }}>

        {/* Logo + Desktop Nav */}
        <div className="flex items-center gap-4 min-w-0">
          {/* Logo image — no text next to it, the image already includes the name */}
          <button
            onClick={() => onNavigate?.('dashboard')}
            className="flex items-center flex-shrink-0 hover:opacity-90 transition-opacity"
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <img
              src="/logo-completo.png"
              alt="WaStake"
              style={{
                height: '72px',
                width: 'auto',
                mixBlendMode: 'lighten',
                filter: 'brightness(1.3) contrast(1.1)',
              }}
            />
          </button>

          {/* Desktop nav — hidden below lg */}
          <nav className="hidden lg:flex gap-0.5">
            {NAV_ITEMS.map(item => (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={[
                  'px-3 py-1.5 text-sm rounded-lg transition-colors font-medium whitespace-nowrap',
                  currentPage === item.id
                    ? 'text-white relative nav-active bg-white/5'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
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
            <div className="hidden xl:flex items-center gap-1.5 text-xs whitespace-nowrap">
              {isStale ? (
                <span
                  className="flex items-center gap-1 text-amber-400"
                  title="Precios retrasados — CoinGecko no disponible, reintentando cada 30s"
                >
                  <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current flex-shrink-0">
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm7.5-3.5a.5.5 0 0 1 1 0v3.25l2.25 1.3a.5.5 0 0 1-.5.866L7.5 8.5V4.5Z"/>
                  </svg>
                  <span>retrasado</span>
                </span>
              ) : (
                <span className="text-slate-500">{t('last_updated')}: {lastUpdated.toLocaleTimeString()}</span>
              )}
            </div>
          )}

          <NotificationBell
            alerts={alerts ?? []}
            unreadCount={unreadCount ?? 0}
            onMarkRead={onMarkRead}
            onMarkAllRead={onMarkAllRead}
            onNavigateAlerts={() => navigate('alerts')}
          />

          <button
            onClick={onToggleDark}
            className={[
              'p-2 rounded-lg transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center',
              darkMode
                ? 'text-slate-400 hover:text-yellow-400 hover:bg-slate-800'
                : 'text-yellow-500 hover:text-white hover:bg-slate-800',
            ].join(' ')}
            title={darkMode ? 'Modo claro' : 'Modo oscuro'}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>

          {/* Language selector — desktop only */}
          <div className="hidden sm:flex gap-0.5 border border-slate-700 rounded-lg p-0.5">
            {LANGS.map(l => (
              <button
                key={l.code}
                onClick={() => i18n.changeLanguage(l.code)}
                className={[
                  'px-2 py-1 text-xs rounded-md transition-colors font-medium min-h-[36px]',
                  i18n.language.startsWith(l.code)
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white',
                ].join(' ')}
              >
                {l.label}
              </button>
            ))}
          </div>

          {/* Hamburger — visible below lg */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Menú"
          >
            {menuOpen
              ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
              : <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/></svg>
            }
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-30 top-14" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute top-0 left-0 right-0 bg-slate-900 border-b border-slate-700/50 shadow-2xl" onClick={e => e.stopPropagation()}>
            <nav className="px-4 py-3 space-y-1">
              {NAV_ITEMS.map(item => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-base font-medium transition-colors min-h-[52px]',
                    currentPage === item.id
                      ? 'bg-slate-700/80 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  ].join(' ')}
                >
                  <span className="text-xl">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </nav>
            <div className="px-4 pb-4 pt-2 border-t border-slate-700/40 flex gap-2">
              {LANGS.map(l => (
                <button
                  key={l.code}
                  onClick={() => { i18n.changeLanguage(l.code); setMenuOpen(false); }}
                  className={[
                    'flex-1 py-2.5 text-sm rounded-xl border font-medium transition-colors min-h-[44px]',
                    i18n.language.startsWith(l.code)
                      ? 'bg-slate-700 border-slate-600 text-white'
                      : 'border-slate-700/50 text-slate-400 hover:text-white',
                  ].join(' ')}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
