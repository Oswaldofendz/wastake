import {useTranslation} from 'react-i18next';
import './easy.css';
import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { Navbar }    from './components/Navbar.jsx';
import { Dashboard } from './pages/Dashboard.jsx';
import {ReleaseNotice} from './components/ReleaseNotice.jsx';
import { Portfolio } from './pages/Portfolio.jsx';
import { Alerts }    from './pages/Alerts.jsx';
import { Markets }   from './pages/Markets.jsx';
import { Panorama }  from './pages/Panorama.jsx';
import { Screener }  from './pages/Screener.jsx';
import { Fundamentals } from './pages/Fundamentals.jsx';
import { usePrices } from './hooks/usePrices.js';
import { useAuth }   from './hooks/useAuth.js';
import { useAlerts } from './hooks/useAlerts.js';
import { useBrowserNotifications } from './hooks/useBrowserNotifications.js';
import { usePWAInstall }           from './hooks/usePWAInstall.js';
const SimpleExperience=lazy(()=>import('./pages/SimpleExperience.jsx').then(m=>({default:m.SimpleExperience})));
const AgentCharts=lazy(()=>import('./pages/AgentCharts.jsx'));

// ── Hook: favicon dinámico con variación de BTC ───────────────────────────────
function useDynamicFavicon(allAssets) {
  useEffect(() => {
    const btc = allAssets?.find(a => a.id === 'bitcoin');
    if (!btc?.change24h) return;

    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 32;
    const ctx = canvas.getContext('2d');

    const up      = btc.change24h >= 0;
    const color   = up ? '#22c55e' : '#ef4444';
    const arrow   = up ? '▲' : '▼';
    const pct     = Math.abs(btc.change24h).toFixed(1);
    const label   = `${pct}%`;

    // Fondo
    ctx.fillStyle = '#09090a';
    ctx.fillRect(0, 0, 32, 32);

    // Círculo de color
    ctx.beginPath();
    ctx.arc(16, 16, 15, 0, Math.PI * 2);
    ctx.fillStyle = color + '22';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Flecha
    ctx.fillStyle = color;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(arrow, 16, 13);

    // Porcentaje
    ctx.font = 'bold 7px sans-serif';
    ctx.fillText(label.length > 4 ? label.slice(0, 4) : label, 16, 24);

    // Aplicar al favicon
    let link = document.querySelector("link[rel*='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = canvas.toDataURL();
  }, [allAssets]);
}

export default function App() {
  const {t}=useTranslation();
  const [experience,setExperience]=useState(()=>{try{return localStorage.getItem('wastake_experience')==='simple'?'simple':'advanced';}catch{return 'advanced';}});
  const simple=experience==='simple';
  const chooseExperience=value=>{setExperience(value);try{localStorage.setItem('wastake_experience',value);}catch{}window.scrollTo(0,0);};
  const marketData=usePrices(60_000);
  const { lastUpdated, allAssets, isStale } = marketData;
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { triggered, unreadCount, markRead, markAllRead } = useAlerts(user);
  const { canInstall, install, dismiss } = usePWAInstall();

  useDynamicFavicon(allAssets);
  useBrowserNotifications(triggered);

  const [currentPage, setCurrentPage] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    const valid = ['dashboard', 'panorama', 'markets', 'portfolio', 'alerts', 'screener', 'fundamentals', 'chart-ai'];
    return valid.includes(hash) ? hash : 'dashboard';
  });

  useEffect(() => {
    const sync = () => {
      const route = window.location.hash.slice(1);
      setCurrentPage(['dashboard', 'panorama', 'markets', 'portfolio', 'alerts', 'screener', 'fundamentals', 'chart-ai'].includes(route)?route:'dashboard');
    };
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  useEffect(() => {
    window.location.hash = currentPage;
    window.scrollTo(0, 0);
  }, [currentPage]);

  // ── Dark / Light mode ────────────────────────────────────────
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem('wf_theme');
    return stored ? stored === 'dark' : true; // dark by default
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.experience=experience;
    if (darkMode&&!simple) {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
    if(!simple)localStorage.setItem('wf_theme', darkMode ? 'dark' : 'light');
  }, [darkMode,experience]);

  return (
    <div className={`${simple?'mode-simple ':''}min-h-screen text-white flex flex-col`} style={{ background: 'var(--bg-primary)' }}>
      <ReleaseNotice/>
      <Navbar
        simple={simple}
        lastUpdated={lastUpdated}
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        alerts={triggered}
        unreadCount={unreadCount}
        onMarkRead={markRead}
        onMarkAllRead={markAllRead}
        darkMode={simple?false:darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
        isStale={isStale}
      />

      {simple?<div className="experience-bar"><span>🌱 <strong>{t('easy_badge')}</strong> <small>Beta</small></span><span className="experience-description">{t('easy_mode_help')}</span><button type="button" onClick={()=>chooseExperience('advanced')}>{t('easy_advanced')} ↗</button></div>:currentPage==='dashboard'?<div className="experience-invite"><span>{t('easy_invite')}</span><button type="button" onClick={()=>chooseExperience('simple')}>🌱 {t('easy_switch')} <small>Beta</small> →</button></div>:null}

      {/* ── Banner de instalación PWA ── */}
      {canInstall && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl border border-[#c0c0c0]/30 bg-[var(--bg-card)] backdrop-blur-sm shadow-xl">
          <span className="text-sm text-slate-300">Instala WaStake como app</span>
          <button
            onClick={install}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-black"
            style={{ background: 'linear-gradient(135deg, #e8e8e8 0%, #c0c0c0 100%)' }}
          >
            Instalar
          </button>
          <button onClick={dismiss} className="text-slate-500 hover:text-white transition-colors text-lg leading-none">✕</button>
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        {simple&&currentPage!=='chart-ai'?<Suspense fallback={<p role="status" className="p-6 text-slate-400">{t('loading')}</p>}><SimpleExperience page={currentPage} marketData={marketData} onNavigate={setCurrentPage} user={user} authLoading={authLoading} signIn={signIn} signUp={signUp} signOut={signOut}/></Suspense>:currentPage === 'dashboard' ? (
          <Dashboard marketData={marketData}/>
        ) : currentPage === 'chart-ai' ? (
          <Suspense fallback={<p role="status" className="p-6 text-slate-400">…</p>}><AgentCharts marketData={marketData} guided={simple}/></Suspense>
        ) : currentPage === 'panorama' ? (
          <Panorama />
        ) : currentPage === 'markets' ? (
          <Markets allAssets={allAssets} />
        ) : currentPage === 'screener' ? (
          <Screener marketData={marketData}/>
        ) : currentPage === 'alerts' ? (
          !authLoading && (
            <Alerts
              user={user}
              signIn={signIn}
              signUp={signUp}
              signOut={signOut}
              allAssets={allAssets}
              onNavigate={setCurrentPage}
            />
          )
        ) : currentPage === 'fundamentals' ? (
          <Fundamentals />
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
