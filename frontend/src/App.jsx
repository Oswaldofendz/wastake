import { useState, useEffect } from 'react';
import { Navbar }    from './components/Navbar.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import { Portfolio } from './pages/Portfolio.jsx';
import { Alerts }    from './pages/Alerts.jsx';
import { Markets }   from './pages/Markets.jsx';
import { Panorama }  from './pages/Panorama.jsx';
import { usePrices } from './hooks/usePrices.js';
import { useAuth }   from './hooks/useAuth.js';
import { useAlerts } from './hooks/useAlerts.js';

export default function App() {
  const { lastUpdated, allAssets } = usePrices(60_000);
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { triggered, unreadCount, markRead, markAllRead } = useAlerts(user);
  const [currentPage, setCurrentPage] = useState('dashboard');

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
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
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
      />

      <div className="flex-1 flex flex-col min-h-0">
        {currentPage === 'dashboard' ? (
          <Dashboard />
        ) : currentPage === 'panorama' ? (
          <Panorama />
        ) : currentPage === 'markets' ? (
          <Markets allAssets={allAssets} />
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
            />
          )
        )}
      </div>
    </div>
  );
}
