import { useState, useMemo } from 'react';
import { usePrices } from '../hooks/usePrices.js';

// ─── Helpers de formato ───────────────────────────────────────────────────────
function fmtPrice(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1)    return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function fmtChange(n) {
  if (n == null || isNaN(n)) return '—';
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`;
}

function fmtMktCap(n) {
  if (!n || n <= 0) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString()}`;
}

// ─── Configuración de filtros ─────────────────────────────────────────────────
const TYPE_LABELS = {
  all:       'Todos',
  crypto:    'Crypto',
  stock:     'Acciones',
  etf:       'ETFs',
  forex:     'Forex',
  commodity: 'Materias Primas',
  index:     'Índices',
  bond:      'Bonos',
};

const CHANGE_FILTERS = [
  { id: 'all',       label: 'Cualquier variación' },
  { id: 'up_3',      label: '▲ +3% o más'         },
  { id: 'up5',       label: '▲ +5% o más'         },
  { id: 'up2',       label: '▲ +2% o más'         },
  { id: 'down2',     label: '▼ -2% o más'         },
  { id: 'down5',     label: '▼ -5% o más'         },
  { id: 'vol_5',     label: '⚡ ±5% (volátil)'     },
  { id: 'flat',      label: '➡ ±1% (plano)'       },
];

const SORT_OPTIONS = [
  { id: 'change_desc',   label: '% Cambio ↓' },
  { id: 'change_asc',    label: '% Cambio ↑' },
  { id: 'price_desc',    label: 'Precio ↓'   },
  { id: 'price_asc',     label: 'Precio ↑'   },
  { id: 'mktcap_desc',   label: 'Mkt Cap ↓'  },
  { id: 'name_asc',      label: 'Nombre A-Z'  },
];

// ─── Logos e íconos ───────────────────────────────────────────────────────────
const TYPE_COLORS = {
  crypto:    'bg-orange-900/50 text-orange-300 border-orange-700/40',
  stock:     'bg-sky-900/50 text-sky-300 border-sky-700/40',
  etf:       'bg-green-900/50 text-green-300 border-green-700/40',
  forex:     'bg-purple-900/50 text-purple-300 border-purple-700/40',
  commodity: 'bg-yellow-900/50 text-yellow-300 border-yellow-700/40',
  index:     'bg-blue-900/50 text-blue-300 border-blue-700/40',
  bond:      'bg-cyan-900/50 text-cyan-300 border-cyan-700/40',
};

function AssetAvatar({ asset }) {
  if (asset.image) {
    return (
      <img
        src={asset.image}
        alt={asset.symbol}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        onError={e => { e.target.style.display = 'none'; e.target.nextElementSibling?.style.removeProperty('display'); }}
      />
    );
  }
  const colors = TYPE_COLORS[asset.type] ?? TYPE_COLORS.etf;
  const initials = (asset.symbol ?? asset.name ?? '?').slice(0, 2).toUpperCase();
  return (
    <div className={`w-8 h-8 rounded-full border flex items-center justify-center flex-shrink-0 ${colors}`}>
      <span className="text-xs font-bold">{initials}</span>
    </div>
  );
}

// ─── Fila de la tabla ─────────────────────────────────────────────────────────
function AssetRow({ asset, rank }) {
  const positive = (asset.change24h ?? 0) >= 0;
  const typeColors = TYPE_COLORS[asset.type] ?? TYPE_COLORS.etf;

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700/20 last:border-0 hover:bg-slate-700/20 transition-colors">
      {/* Rank */}
      <span className="w-6 text-xs text-slate-600 text-right flex-shrink-0">{rank}</span>

      {/* Logo + nombre */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <AssetAvatar asset={asset} />
        <div className="min-w-0">
          <p className="text-sm font-medium text-white truncate leading-tight">{asset.name}</p>
          <p className="text-xs text-slate-500 leading-tight">{asset.symbol}</p>
        </div>
      </div>

      {/* Tipo */}
      <span className={`hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border flex-shrink-0 ${typeColors}`}>
        {TYPE_LABELS[asset.type] ?? asset.type}
      </span>

      {/* Precio */}
      <span className="w-24 text-right text-sm font-mono font-semibold text-white flex-shrink-0">
        {fmtPrice(asset.price)}
      </span>

      {/* Cambio 24h */}
      <span className={`w-20 text-right text-sm font-mono font-semibold flex-shrink-0 ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {fmtChange(asset.change24h)}
      </span>

      {/* Market cap — solo desktop */}
      <span className="hidden lg:block w-24 text-right text-xs text-slate-400 flex-shrink-0">
        {fmtMktCap(asset.marketCap)}
      </span>

      {/* Barra visual de variación */}
      <div className="hidden md:flex items-center w-20 flex-shrink-0">
        <div className="relative w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`absolute top-0 h-full rounded-full transition-all ${positive ? 'bg-green-500' : 'bg-red-500'}`}
            style={{
              width: `${Math.min(Math.abs(asset.change24h ?? 0) * 5, 100)}%`,
              left: positive ? '50%' : 'auto',
              right: positive ? 'auto' : '50%',
            }}
          />
          <div className="absolute top-0 left-1/2 w-px h-full bg-slate-500" />
        </div>
      </div>
    </div>
  );
}

// ─── Presets de búsqueda rápida ───────────────────────────────────────────────
const PRESETS = [
  {
    id: 'momentum',
    label: '🚀 Momentum',
    apply: () => ({ typeFilter: 'all', changeFilter: 'up_3', sortBy: 'change_desc', showOnlyPositive: true,  showOnlyNegative: false }),
  },
  {
    id: 'gainers',
    label: '▲ Gainers',
    apply: () => ({ typeFilter: 'all', changeFilter: 'up2',  sortBy: 'change_desc', showOnlyPositive: true,  showOnlyNegative: false }),
  },
  {
    id: 'losers',
    label: '▼ Losers',
    apply: () => ({ typeFilter: 'all', changeFilter: 'down2', sortBy: 'change_asc', showOnlyPositive: false, showOnlyNegative: true  }),
  },
  {
    id: 'volatile',
    label: '⚡ Alta Volatilidad',
    apply: () => ({ typeFilter: 'all', changeFilter: 'vol_5', sortBy: 'change_desc', showOnlyPositive: false, showOnlyNegative: false }),
  },
  {
    id: 'flat',
    label: '➡ Plano',
    apply: () => ({ typeFilter: 'all', changeFilter: 'flat',  sortBy: 'name_asc',   showOnlyPositive: false, showOnlyNegative: false }),
  },
  {
    id: 'crypto_only',
    label: '₿ Solo Crypto',
    apply: () => ({ typeFilter: 'crypto', changeFilter: 'all', sortBy: 'mktcap_desc', showOnlyPositive: false, showOnlyNegative: false }),
  },
  {
    id: 'stocks_only',
    label: '📈 Solo Acciones',
    apply: () => ({ typeFilter: 'stock', changeFilter: 'all', sortBy: 'mktcap_desc', showOnlyPositive: false, showOnlyNegative: false }),
  },
];

// ─── Componente principal ─────────────────────────────────────────────────────
export function Screener() {
  const { allAssets, loading, isStale } = usePrices(60_000);

  const [search, setSearch]           = useState('');
  const [typeFilter, setTypeFilter]   = useState('all');
  const [changeFilter, setChangeFilter] = useState('all');
  const [sortBy, setSortBy]           = useState('change_desc');
  const [showOnlyPositive, setShowOnlyPositive] = useState(false);
  const [showOnlyNegative, setShowOnlyNegative] = useState(false);
  const [activePreset, setActivePreset] = useState(null);

  function applyPreset(preset) {
    if (activePreset === preset.id) {
      // Segundo click: desactivar preset
      setActivePreset(null);
      setSearch('');
      setTypeFilter('all');
      setChangeFilter('all');
      setSortBy('change_desc');
      setShowOnlyPositive(false);
      setShowOnlyNegative(false);
      return;
    }
    const s = preset.apply();
    setSearch('');
    setTypeFilter(s.typeFilter);
    setChangeFilter(s.changeFilter);
    setSortBy(s.sortBy);
    setShowOnlyPositive(s.showOnlyPositive);
    setShowOnlyNegative(s.showOnlyNegative);
    setActivePreset(preset.id);
  }

  // ── Filtrado + ordenación ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let assets = [...allAssets].filter(a => a.price != null);

    // Filtro de texto
    if (search.trim()) {
      const q = search.toLowerCase();
      assets = assets.filter(a =>
        a.name?.toLowerCase().includes(q) ||
        a.symbol?.toLowerCase().includes(q) ||
        a.id?.toLowerCase().includes(q)
      );
    }

    // Filtro por tipo
    if (typeFilter !== 'all') {
      assets = assets.filter(a => a.type === typeFilter);
    }

    // Filtro por variación
    if (changeFilter === 'up_3')  assets = assets.filter(a => (a.change24h ?? 0) >= 3);
    if (changeFilter === 'up5')   assets = assets.filter(a => (a.change24h ?? 0) >= 5);
    if (changeFilter === 'up2')   assets = assets.filter(a => (a.change24h ?? 0) >= 2);
    if (changeFilter === 'down2') assets = assets.filter(a => (a.change24h ?? 0) <= -2);
    if (changeFilter === 'down5') assets = assets.filter(a => (a.change24h ?? 0) <= -5);
    if (changeFilter === 'vol_5') assets = assets.filter(a => Math.abs(a.change24h ?? 0) >= 5);
    if (changeFilter === 'flat')  assets = assets.filter(a => Math.abs(a.change24h ?? 0) <= 1);

    // Solo positivos / negativos
    if (showOnlyPositive) assets = assets.filter(a => (a.change24h ?? 0) > 0);
    if (showOnlyNegative) assets = assets.filter(a => (a.change24h ?? 0) < 0);

    // Ordenación
    assets.sort((a, b) => {
      switch (sortBy) {
        case 'change_desc': return (b.change24h ?? 0) - (a.change24h ?? 0);
        case 'change_asc':  return (a.change24h ?? 0) - (b.change24h ?? 0);
        case 'price_desc':  return (b.price ?? 0) - (a.price ?? 0);
        case 'price_asc':   return (a.price ?? 0) - (b.price ?? 0);
        case 'mktcap_desc': return (b.marketCap ?? 0) - (a.marketCap ?? 0);
        case 'name_asc':    return (a.name ?? '').localeCompare(b.name ?? '');
        default: return 0;
      }
    });

    return assets;
  }, [allAssets, search, typeFilter, changeFilter, sortBy, showOnlyPositive, showOnlyNegative]);

  // ── Stats rápidas ────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const withPrice = allAssets.filter(a => a.price != null && a.change24h != null);
    const gainers = withPrice.filter(a => a.change24h > 0).length;
    const losers  = withPrice.filter(a => a.change24h < 0).length;
    const avgChange = withPrice.length
      ? (withPrice.reduce((s, a) => s + a.change24h, 0) / withPrice.length).toFixed(2)
      : 0;
    return { total: withPrice.length, gainers, losers, avgChange };
  }, [allAssets]);

  return (
    <div className="flex flex-col h-full p-4 max-w-6xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-white">Screener de Activos</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {stats.total} activos · {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
              {isStale && <span className="ml-2 text-amber-500">⚠ datos desactualizados</span>}
            </p>
          </div>
        </div>

        {/* ── Stats rápidas ── */}
        <div className="flex gap-3 mt-4 flex-wrap">
          {[
            { label: 'Subiendo', value: stats.gainers, color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/30' },
            { label: 'Bajando',  value: stats.losers,  color: 'text-red-400',   bg: 'bg-red-900/20 border-red-700/30'     },
            {
              label: 'Cambio promedio',
              value: `${stats.avgChange >= 0 ? '+' : ''}${stats.avgChange}%`,
              color: Number(stats.avgChange) >= 0 ? 'text-green-400' : 'text-red-400',
              bg: 'bg-slate-800/60 border-slate-700/40',
            },
          ].map(s => (
            <div key={s.label} className={`flex-1 min-w-[100px] px-4 py-3 rounded-xl border ${s.bg}`}>
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className={`text-xl font-bold font-mono mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Presets ── */}
      <div className="flex flex-wrap gap-2 mb-3">
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              activePreset === preset.id
                ? 'bg-[#c0c0c0] text-black border-[#c0c0c0]'
                : 'bg-slate-800/60 border-slate-700/40 text-slate-400 hover:text-white hover:border-slate-500'
            }`}
          >
            {preset.label}
          </button>
        ))}
        {activePreset && (
          <button
            onClick={() => applyPreset({ id: activePreset, apply: () => ({}) })}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-600/40 text-slate-500 hover:text-white transition-colors"
          >
            ✕ Limpiar
          </button>
        )}
      </div>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap gap-2 mb-4">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[160px]">
          <svg viewBox="0 0 20 20" className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 fill-slate-500 pointer-events-none">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar activo..."
            className="w-full pl-8 pr-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500/60"
          />
        </div>

        {/* Tipo */}
        <select
          value={typeFilter}
          onChange={e => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-500/60"
        >
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Variación */}
        <select
          value={changeFilter}
          onChange={e => setChangeFilter(e.target.value)}
          className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-500/60"
        >
          {CHANGE_FILTERS.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>

        {/* Ordenar */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          className="px-3 py-2 bg-slate-800/60 border border-slate-700/50 rounded-lg text-sm text-slate-300 focus:outline-none focus:border-brand-500/60"
        >
          {SORT_OPTIONS.map(s => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        {/* Toggle positivos / negativos */}
        <button
          onClick={() => { setShowOnlyPositive(p => !p); setShowOnlyNegative(false); }}
          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
            showOnlyPositive
              ? 'bg-green-900/50 border-green-600/60 text-green-300'
              : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
          }`}
        >
          ▲ Solo subiendo
        </button>
        <button
          onClick={() => { setShowOnlyNegative(p => !p); setShowOnlyPositive(false); }}
          className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
            showOnlyNegative
              ? 'bg-red-900/50 border-red-600/60 text-red-300'
              : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-white'
          }`}
        >
          ▼ Solo bajando
        </button>
      </div>

      {/* ── Tabla ── */}
      <div className="flex-1 bg-[#111318]/90 border border-white/[8%] rounded-xl overflow-hidden">
        {/* Header de columnas */}
        <div className="flex items-center gap-3 px-4 py-2.5 text-xs text-slate-500 border-b border-slate-700/40 bg-slate-800/60">
          <span className="w-6" />
          <span className="flex-1">Activo</span>
          <span className="hidden sm:block w-20">Tipo</span>
          <span className="w-24 text-right">Precio</span>
          <span className="w-20 text-right">24h</span>
          <span className="hidden lg:block w-24 text-right">Mkt Cap</span>
          <span className="hidden md:block w-20 text-center">Variación</span>
        </div>

        {loading && !allAssets.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-brand-400 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">Cargando activos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <p className="text-slate-500 text-sm">Sin resultados para los filtros aplicados</p>
            <button
              onClick={() => { setSearch(''); setTypeFilter('all'); setChangeFilter('all'); setShowOnlyPositive(false); setShowOnlyNegative(false); }}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors mt-1"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 360px)' }}>
            {filtered.map((asset, i) => (
              <AssetRow key={asset.id} asset={asset} rank={i + 1} />
            ))}
          </div>
        )}
      </div>

      {/* Footer con total */}
      {filtered.length > 0 && (
        <p className="text-xs text-slate-600 text-center mt-3">
          Mostrando {filtered.length} de {stats.total} activos · Actualización automática cada 60s
        </p>
      )}
    </div>
  );
}
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       