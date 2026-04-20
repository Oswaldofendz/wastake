import { useState, useEffect } from 'react';
import { Navbar }    from './components/Navbar.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Portfolio } from './pages/Portfolio.jsx';
import { Alerts }    from './pages/Alerts.jsx';
import { Markets }   from './pages/Markets.jsx';
import { Panorama }  from './pages/Panorama.jsx';
import { Screener }  from './pages/Screener.jsx';
import { usePrices } from './hooks/usePrices.js';
import { useAuth }   from './hooks/useAuth.js';
import { useAlerts } from './hooks/useAlerts.js';

export default function App() {
  const { lastUpdated, allAssets, isStale } = usePrices(60_000);
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { triggered, unreadCount, markRead, markAllRead } = useAlerts(user);
  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    const valid = ['dashboard', 'panorama', 'markets', 'portfolio', 'alerts', 'screener'];
    return valid.includes(hash) ? hash : 'dashboard';
  });

  useEffect(() => {
    window.location.hash = currentPage;
  }, [currentPage]);

  // ── Dark / Light mode ────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('wf_theme');
    return stored ? stored === 'dark' : true; // dark by default
  });

  useEffect(() => {
    const root = document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    localStorage.setItem('wf_theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <div className="min-h-screen text-white flex flex-col" style={{ background: 'linear-gradient(160deg, #090909 0%, #0c0c0d 40%, #09090a 100%)' }}>
      <Navbar
        lastUpdated={lastUpdated}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        alerts={triggered}
        unreadCount={unreadCount}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        isStale={isStale}
      />

      <div className="flex-1 flex flex-col min-h-0">
        {currentPage === 'dashboard' ? (
          <Dashboard />
        ) : currentPage === 'panorama' ? (
          <Panorama />
        ) : currentPage === 'markets' ? (
          <Markets allAssets={allAssets} />
        ) : currentPage === 'screener' ? (
          <Screener />
        ) : currentPage === 'alerts' ? (
          !authLoading && (
            <Alerts
              user={user}
              signIn={signIn}
              signUp={signUp}
              signOut={signOut}
              allAssets={allAssets}
            />
          )
        ) : (
          !authLoading && (
            <Portfolio
              user={user}
              signIn={signIn}
              signUp={signUp}
              signOut={signOut}
              allAssets={allAssets}
              onNavigate={setCurrentPage}
            />
          )
        )}
      </div>
    </div>
  );
}
