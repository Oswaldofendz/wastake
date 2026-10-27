import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NotificationBell } from './NotificationBell.jsx';

const LANGS = [
  { code: 'es', label: 'ES' },
  { code: 'pt', label: 'PT' },
  { code: 'en', label: 'EN' },
];

const NAV_GROUPS = [
  { id: 'explore', titleKey: 'nav_group_explore', items: [
    { id: 'dashboard', labelKey: 'dashboard', icon: '📊' },
    { id: 'markets', labelKey: 'nav_markets', icon: '🌍' },
    { id: 'screener', labelKey: 'nav_screener', icon: '🔍' },
  ] },
  { id: 'analyze', titleKey: 'nav_group_analyze', items: [
    { id: 'chart-ai', labelKey: 'chart_ai', icon: '✦' },
    { id: 'panorama', labelKey: 'nav_panorama', icon: '🚦' },
    { id: 'fundamentals', labelKey: 'nav_fundamentals', icon: '🧭' },
  ] },
  { id: 'track', titleKey: 'nav_group_track', items: [
    { id: 'portfolio', labelKey: 'portfolio', icon: '💼' },
    { id: 'alerts', labelKey: 'alerts', icon: '🔔' },
  ] },
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

  useEffect(() => {
    const closeOnEscape = event => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, []);

  return (
    <>
      <header className="h-[72px] flex items-center justify-between px-4 backdrop-blur-sm sticky top-0 z-40 gap-3" style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border-normal)' }}>

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
                height: '88px',
                width: 'auto',
                mixBlendMode: darkMode ? 'lighten' : 'multiply',
                filter: darkMode ? 'brightness(1.5) contrast(1.1)' : 'invert(1)',
              }}
            />
          </button>

          {/* Desktop nav — hidden below lg */}
          <nav className="hidden xl:flex items-center gap-1">
            {NAV_GROUPS.map((group, groupIndex) => (
              <div key={group.id} className={`flex items-center gap-0.5 ${groupIndex ? 'ml-1 border-l border-slate-700/70 pl-1' : ''}`}>
                {group.items.map(item => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={[
                      'px-2.5 py-1.5 text-sm rounded-lg transition-colors font-medium whitespace-nowrap',
                      currentPage === item.id
                        ? 'relative nav-active nav-active-text'
                        : 'text-slate-300 hover:text-white hover:bg-white/5',
                    ].join(' ')}
                  >
                    {t(item.labelKey)}
                  </button>
                ))}
              </div>
            ))}
          </nav>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {lastUpdated && (
            <div className="hidden 2xl:flex items-center gap-1.5 text-xs whitespace-nowrap">
              {isStale ? (
                <span
                  className="flex items-center gap-1 text-amber-400"
                  title={t('screener_stale_data')}
                >
                  <svg viewBox="0 0 16 16" className="w-3 h-3 fill-current flex-shrink-0">
                    <path d="M8 1a7 7 0 1 0 0 14A7 7 0 0 0 8 1ZM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm7.5-3.5a.5.5 0 0 1 1 0v3.25l2.25 1.3a.5.5 0 0 1-.5.866L7.5 8.5V4.5Z"/>
                  </svg>
                  <span>{t('screener_stale_data')}</span>
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
            title={t(darkMode ? 'theme_light' : 'theme_dark')}
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
                    ? 'bg-slate-800 text-white'
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
            className="xl:hidden px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors min-h-[44px] flex items-center justify-center gap-2"
            aria-label={t(menuOpen ? 'nav_close_menu' : 'nav_open_menu')}
            aria-expanded={menuOpen}
            aria-controls="mobile-main-navigation"
          >
            {menuOpen
              ? <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="4" x2="16" y2="16"/><line x1="16" y1="4" x2="4" y2="16"/></svg>
              : <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="6" x2="17" y2="6"/><line x1="3" y1="10" x2="17" y2="10"/><line x1="3" y1="14" x2="17" y2="14"/></svg>
            }
            <span className="text-sm font-medium">{t(menuOpen ? 'nav_close_menu' : 'nav_open_menu')}</span>
          </button>
        </div>
      </header>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="xl:hidden fixed inset-0 z-30 top-[72px]" onClick={() => setMenuOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute top-0 left-0 right-0 bg-slate-900 border-b border-slate-700/50 shadow-2xl" onClick={e => e.stopPropagation()}>
            <nav id="mobile-main-navigation" className="px-4 py-3 space-y-3" aria-label={t('nav_label')}>
              {NAV_GROUPS.map(group => (
                <div key={group.id}>
                  <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">{t(group.titleKey)}</p>
                  <div className="space-y-1">
                    {group.items.map(item => (
                      <button
                        key={item.id}
                        onClick={() => navigate(item.id)}
                        className={[
                          'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-colors min-h-[48px]',
                          currentPage === item.id
                            ? 'bg-slate-800 border border-white/10 text-white'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                        ].join(' ')}
                      >
                        <span className="text-xl">{item.icon}</span>
                        {t(item.labelKey)}
                      </button>
                    ))}
                  </div>
                </div>
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
