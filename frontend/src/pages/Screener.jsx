import { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getAssetGroup } from '../data/assetSectors.js';
import { AssetSearch } from '../components/AssetSearch.jsx';
import { AnalysisPanel } from '../components/AnalysisPanel.jsx';
import { CandleChart } from '../components/PriceChart.jsx';
import { AssetValuationCard } from '../components/AssetValuationCard.jsx';
import { MarketLeaders } from '../components/MarketLeaders.jsx';
import {OpportunityPanel} from '../components/OpportunityPanel.jsx';
import { ImportantNews } from '../components/ImportantNews.jsx';
import { AnalysisNarrative } from '../components/AnalysisNarrative.jsx';
import { formatQuote } from '../utils/panoramaAnalysis.js';
import { marketStats,currentSelection } from '../utils/marketConventions.js';

// ─── Helpers de formato ───────────────────────────────────────────────────────
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
  all:       'screener_type_all',
  crypto:    'screener_type_crypto',
  stock:     'screener_type_stock',
  etf:       'screener_type_etf',
  forex:     'screener_type_forex',
  commodity: 'screener_type_commodity',
  index:     'screener_type_index',
  bond:      'screener_type_bond',
};

const CHANGE_FILTERS = [
  { id: 'all',       labelKey: 'screener_change_any' },
  { id: 'up_3',      labelKey: 'screener_change_up_3' },
  { id: 'up5',       labelKey: 'screener_change_up_5' },
  { id: 'up2',       labelKey: 'screener_change_up_2' },
  { id: 'down2',     labelKey: 'screener_change_down_2' },
  { id: 'down5',     labelKey: 'screener_change_down_5' },
  { id: 'vol_5',     labelKey: 'screener_change_volatile' },
  { id: 'flat',      labelKey: 'screener_change_flat' },
];

const SORT_OPTIONS = [
  { id: 'change_desc',   labelKey: 'screener_sort_change_desc' },
  { id: 'change_asc',    labelKey: 'screener_sort_change_asc' },
  { id: 'price_desc',    labelKey: 'screener_sort_price_desc' },
  { id: 'price_asc',     labelKey: 'screener_sort_price_asc' },
  { id: 'mktcap_desc',   labelKey: 'screener_sort_mktcap_desc' },
  { id: 'name_asc',      labelKey: 'screener_sort_name_asc' },
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

const GROUP_ORDER = [
  'technology', 'communication', 'discretionary', 'financials', 'healthcare',
  'staples', 'industrials', 'energy', 'growth', 'broad_market', 'crypto',
  'bonds', 'commodities', 'forex', 'indices', 'unclassified', 'other',
];

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
function AssetRow({ asset, rank, t, showMarketCap, onSelect }) {
  const {i18n}=useTranslation();
  const positive = Number.isFinite(asset.change24h)?asset.change24h>=0:null;
  const typeColors = TYPE_COLORS[asset.type] ?? TYPE_COLORS.etf;

  return (
    <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-slate-700/20 last:border-0 hover:bg-slate-700/20 transition-colors">
      {/* Rank */}
      <span className="hidden sm:block w-6 text-xs text-slate-600 text-right flex-shrink-0">{rank}</span>

      {/* Logo + nombre */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <AssetAvatar asset={asset} />
        <div className="min-w-0">
          <button type="button" onClick={()=>onSelect(asset)} translate="no" className="min-h-9 max-w-full truncate text-left text-sm font-medium text-sky-200 underline decoration-sky-800 underline-offset-4 hover:text-white">{asset.name}</button>
          <p className="text-xs leading-relaxed text-slate-400"><span translate="no">{asset.symbol}</span>{asset.type==='stock'&&<span> · {t('screener_group_'+getAssetGroup(asset))}</span>}</p>
        </div>
      </div>

      {/* Tipo */}
      <span className={`asset-type hidden sm:inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border flex-shrink-0 ${typeColors}`}>
        {TYPE_LABELS[asset.type] ? t(TYPE_LABELS[asset.type]) : asset.type}
      </span>

      {/* Precio */}
      <span className="w-20 sm:w-24 break-words text-right text-sm font-mono font-semibold text-white flex-shrink-0">
        {formatQuote(asset.price,asset.currency,i18n.language,asset.type==='forex'?5:null)}
      </span>

      {/* Cambio 24h */}
      <span className={`w-16 sm:w-20 text-right text-sm font-mono font-semibold flex-shrink-0 ${positive===null?'text-slate-400':positive ? 'text-green-400' : 'text-red-400'}`}>
        {fmtChange(asset.change24h)}
      </span>

      {/* Market cap — solo desktop */}
      {showMarketCap && (
        <span className="hidden lg:block w-24 text-right text-xs text-slate-400 flex-shrink-0">
          {fmtMktCap(asset.marketCap)}
        </span>
      )}

      {/* Barra visual de variación */}
      <div className="asset-move-bar hidden md:flex items-center w-20 flex-shrink-0">
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
// ─── Componente principal ─────────────────────────────────────────────────────
export function Screener({marketData}) {
  const { t } = useTranslation();
  const { allAssets, loading, error, isStale, refresh } = marketData;

  const [search, setSearch]           = useState('');
  const [inspectedAsset, setInspectedAsset] = useState(null);
  const [analysisSnapshot,setAnalysisSnapshot]=useState(null);
  const inspectionRef=useRef(null),deepLinkRead=useRef(false);
  useEffect(()=>{
    if(deepLinkRead.current||!allAssets.length)return;
    const params=new URLSearchParams(window.location.search),id=params.get('inspect'),kind=params.get('kind');
    const found=allAssets.find(a=>a.id===id&&a.type===kind);
    if(found){deepLinkRead.current=true;setInspectedAsset(found);}
  },[allAssets]);
  useEffect(()=>{ if(inspectedAsset)inspectionRef.current?.scrollIntoView({behavior:'smooth',block:'start'}); },[inspectedAsset]);
  const [typeFilter, setTypeFilter]   = useState('all');
  const [changeFilter, setChangeFilter] = useState('all');
  const [sortBy, setSortBy]           = useState('mktcap_desc');
  const [sectorFilter,setSectorFilter]=useState('all');
  const [visibleCounts,setVisibleCounts]=useState({});
  useEffect(()=>{setVisibleCounts({});setCollapsedGroups({});},[search,typeFilter,changeFilter,sortBy,sectorFilter]);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  function resetFilters() {
    setSearch(''); setTypeFilter('all'); setChangeFilter('all'); setSortBy('mktcap_desc');setSectorFilter('all');
  }

  // ── Filtrado + ordenación ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let assets = allAssets.filter(a=>a?.id);
    if(sectorFilter!=='all')assets=assets.filter(a=>a.type==='stock'&&getAssetGroup(a)===sectorFilter);

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
    if (changeFilter === 'flat')  assets = assets.filter(a => Number.isFinite(a.change24h)&&Math.abs(a.change24h) <= 1);

    // Ordenación
    assets.sort((a, b) => {
      switch (sortBy) {
        case 'change_desc': return (b.change24h ?? 0) - (a.change24h ?? 0);
        case 'change_asc':  return (a.change24h ?? 0) - (b.change24h ?? 0);
        case 'price_desc':  return (b.price ?? 0) - (a.price ?? 0);
        case 'price_asc':   return (a.price ?? 0) - (b.price ?? 0);
        case 'mktcap_desc': {
          const aCap = Number.isFinite(a.marketCap) && a.marketCap > 0 ? a.marketCap : null;
          const bCap = Number.isFinite(b.marketCap) && b.marketCap > 0 ? b.marketCap : null;
          if (aCap == null) return bCap == null ? 0 : 1;
          if (bCap == null) return -1;
          return bCap - aCap;
        }
        case 'name_asc':    return (a.name ?? '').localeCompare(b.name ?? '');
        default: return 0;
      }
    });

    return assets;
  }, [allAssets, search, typeFilter, changeFilter, sortBy,sectorFilter]);

  const groupedAssets=useMemo(()=>{const groups=new Map();for(const a of filtered){const id=typeFilter==='all'?a.type:typeFilter;if(!groups.has(id))groups.set(id,[]);groups.get(id).push(a);}return [...groups].sort(([a],[b])=>['stock','crypto','etf','bond','forex','commodity','index'].indexOf(a)-['stock','crypto','etf','bond','forex','commodity','index'].indexOf(b)).map(([id,assets])=>({id,assets}));},[filtered,typeFilter]);
  const sectorOptions=[...new Set(allAssets.filter(a=>a.type==='stock').map(getAssetGroup))].sort();
  const availableSortOptions=SORT_OPTIONS;
  // ── Stats rápidas ────────────────────────────────────────────────────────────
  const stats=useMemo(()=>marketStats(filtered),[filtered]);
  const catalogTotal=allAssets.length;

  return (
    <div className="flex flex-col h-full p-4 max-w-6xl mx-auto w-full">

      {/* ── Header ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-bold text-white">{t('screener_title')}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('screener_results_count', { total: catalogTotal, results: filtered.length })}
              {(isStale || error) && <span className="ml-2 text-amber-500">⚠ {t('screener_stale_data')}</span>}
            </p>
            <p className="text-sm text-slate-400 mt-2">{t('screener_intro')}</p>
            {marketData.data?.catalogue&&<details className="mt-2 text-xs leading-relaxed text-slate-400"><summary className="min-h-8 cursor-pointer">{t('catalogue_source')}</summary><p>{t('catalogue_scope',{date:new Date(marketData.data.catalogue.asOf).toLocaleDateString(),stocks:marketData.data.catalogue.stockCount,crypto:marketData.data.catalogue.cryptoCount})}</p><div className="flex gap-4 text-sky-300 underline"><a href={marketData.data.catalogue.stockSource} target="_blank" rel="noopener noreferrer">CompaniesMarketCap ↗</a><a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer">CoinGecko ↗</a></div></details>}
          </div>
        </div>
        {error && allAssets.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-700/40 bg-amber-950/20 px-3 py-2" role="status">
            <p className="text-xs text-amber-300">{t('screener_data_unavailable')}</p>
            <button type="button" onClick={refresh} className="text-xs font-semibold text-white underline underline-offset-2">
              {t('retry')}
            </button>
          </div>
        )}

        {/* ── Stats rápidas ── */}
        {!inspectedAsset&&<><p className="mt-4 text-xs text-slate-400">{t('catalogue_coverage',{priced:stats.total,total:filtered.length})}</p><div className="grid grid-cols-3 gap-2 mt-2" aria-live="polite">
          {[
            { label: t('screener_rising'), value: stats.gainers, color: 'text-green-400', bg: 'bg-green-900/20 border-green-700/30' },
            { label: t('screener_falling'), value: stats.losers, color: 'text-red-400', bg: 'bg-red-900/20 border-red-700/30' },
            {
              label: t('screener_average_move'),
              value: stats.avgChange===null?'—':`${stats.avgChange >= 0 ? '+' : ''}${stats.avgChange.toFixed(2)}%`,
              color: stats.avgChange===null?'text-slate-400':stats.avgChange >= 0 ? 'text-green-400' : 'text-red-400',
              bg: 'bg-slate-800/60 border-slate-700/40',
            },
          ].map(s => (
            <div key={s.label} className={`min-w-0 px-4 py-3 rounded-xl border ${s.bg}`}>
              <p className="text-xs text-slate-400">{s.label}</p>
              <p className={`text-xl font-bold font-mono mt-0.5 ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div></>}
      </div>

      {/* ── Panel de búsqueda y filtros ── */}
      <section className="mb-4 rounded-xl border border-white/[8%] bg-[var(--bg-card)] p-3 sm:p-4" aria-labelledby="screener-filters-title">
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div>
            <h2 id="screener-filters-title" className="text-sm font-semibold text-white">{t('screener_filters_title')}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{t('screener_filters_description')}</p>
          </div>
          {(search || typeFilter !== 'all' || changeFilter !== 'all' || sortBy !== 'mktcap_desc'||sectorFilter!=='all') && (
            <button
              type="button"
              onClick={resetFilters}
              className="min-h-9 rounded-lg border border-slate-600/50 px-3 text-xs font-semibold text-slate-300 transition-colors hover:border-slate-400 hover:text-white"
            >
              {t('screener_clear_filters')}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="min-w-0 sm:col-span-2 xl:col-span-2"><AssetSearch query={search} onQueryChange={setSearch} onSelect={setInspectedAsset} catalogueAssets={allAssets}/></div>

          <label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">{t('screener_type_label')}</span>
            <select aria-label={t('screener_type_label')} value={typeFilter} onChange={e => {
              const nextType = e.target.value;
              setTypeFilter(nextType);
              setSectorFilter('all');
            }} className="min-h-11 w-full rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-brand-500/60 focus:outline-none">
              {Object.entries(TYPE_LABELS).map(([k, labelKey]) => <option key={k} value={k}>{t(labelKey)}</option>)}
            </select>
          </label>

          {(typeFilter==='all'||typeFilter==='stock')&&<label className="block min-w-0"><span className="mb-1.5 block text-xs text-slate-400">{t('catalogue_sector')}</span><select aria-label={t('catalogue_sector')} value={sectorFilter} onChange={e=>{setSectorFilter(e.target.value);if(e.target.value!=='all')setTypeFilter('stock');}} className="min-h-11 w-full rounded-lg border border-slate-700 bg-slate-800 px-3 text-sm"><option value="all">{t('catalogue_all_sectors')}</option>{sectorOptions.map(id=><option key={id} value={id}>{t('screener_group_'+id)}</option>)}</select></label>}
          <details className="rounded-lg border border-slate-700/60 p-3 sm:col-span-2 xl:col-span-4"><summary className="min-h-8 cursor-pointer text-sm font-semibold">{t('catalogue_advanced')}</summary><div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2"><label className="block min-w-0">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">{t('screener_change_label')}</span>
            <select aria-label={t('screener_change_label')} value={changeFilter} onChange={e => { setChangeFilter(e.target.value); }} className="min-h-11 w-full rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-brand-500/60 focus:outline-none">
              {CHANGE_FILTERS.map(f => <option key={f.id} value={f.id}>{t(f.labelKey)}</option>)}
            </select>
          </label><label className="block min-w-0 sm:col-span-2 xl:col-span-2">
            <span className="mb-1.5 block text-xs font-medium text-slate-400">{t('screener_sort_label')}</span>
            <select aria-label={t('screener_sort_label')} value={sortBy} onChange={e => { setSortBy(e.target.value); }} className="min-h-11 w-full rounded-lg border border-slate-700/50 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-brand-500/60 focus:outline-none">
              {availableSortOptions.map(s => <option key={s.id} value={s.id}>{t(s.labelKey)}</option>)}
            </select>
          </label></div><p className="mt-2 text-xs leading-relaxed text-slate-400">{t('catalogue_caps')}</p></details>

        </div>


      <div className="mt-4 mb-3 border-t border-slate-700/50 pt-4"><h3 className="text-sm font-semibold">{t('browse_catalogue')} · {filtered.length}</h3><p className="mt-1 text-xs leading-5 text-slate-400">{t('browse_help')}</p></div>
      <div className="grid min-w-0 grid-cols-1 items-start gap-4 md:grid-cols-2">
      <div className="catalogue-table min-w-0 bg-[var(--bg-card)] border border-white/[8%] rounded-xl overflow-hidden">
        {/* Header de columnas */}
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 text-xs text-slate-500 border-b border-slate-700/40 bg-slate-800/60">
          <span className="hidden sm:block w-6" />
          <span className="flex-1">{t('screener_column_asset')}</span>
          <span className="asset-type hidden sm:block w-20">{t('screener_column_type')}</span>
          <span className="w-20 sm:w-24 text-right">{t('price')}</span>
          <span className="w-16 sm:w-20 text-right">{t('change_24h')}</span>

          <span className="asset-move-bar hidden md:block w-20 text-center">{t('screener_column_change')}</span>
        </div>

        {loading && !allAssets.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-brand-400 rounded-full animate-spin" />
            <p className="text-sm text-slate-500">{t('screener_loading_assets')}</p>
          </div>
        ) : error && !allAssets.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-4" role="alert">
            <p className="text-sm text-amber-300">{t('screener_data_unavailable')}</p>
            <button type="button" onClick={refresh} className="text-xs font-semibold text-brand-300 hover:text-white underline underline-offset-2">
              {t('retry')}
            </button>
          </div>
        ) : !allAssets.length ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2" role="status">
            <p className="text-slate-500 text-sm">{t('screener_no_assets')}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-2">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <p className="text-slate-500 text-sm">{t('catalogue_no_local')}</p>
            <button
              onClick={() => { setSearch(''); setTypeFilter('all'); setChangeFilter('all'); setSortBy('mktcap_desc');setSectorFilter('all'); }}
              className="text-xs text-brand-400 hover:text-brand-300 transition-colors mt-1"
            >
              {t('screener_clear_filters')}
            </button>
          </div>
        ) : (
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 360px)' }}>
            {groupedAssets.map(({ id, assets }) => {
              const isCollapsed = collapsedGroups[id]??(typeFilter==='all'&&!search.trim());
              const shown=visibleCounts[id]??25;
              return (
                <section key={id} className="border-b border-slate-700/40 last:border-0">
                  <button
                    type="button"
                    aria-expanded={!isCollapsed}
                    onClick={() => setCollapsedGroups(current => ({ ...current, [id]: !isCollapsed }))}
                    className="sticky top-0 z-10 flex min-h-11 w-full items-center gap-2 border-b border-slate-700/30 bg-slate-800/95 px-4 py-2 text-left text-sm font-semibold text-slate-200 backdrop-blur hover:bg-slate-700/95"
                  >
                    <span className={`text-slate-400 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} aria-hidden="true">⌄</span>
                    <span className="flex-1">{t(TYPE_LABELS[id])}</span>
                    <span className="rounded-full bg-slate-700/70 px-2 py-0.5 text-xs font-medium text-slate-300">{assets.length}</span>
                  </button>
                  {!isCollapsed && assets.slice(0,shown).map(asset => (
                    <AssetRow key={asset.id} asset={asset} rank={filtered.findIndex(item => item.id === asset.id) + 1} t={t} showMarketCap={false} onSelect={setInspectedAsset}/>
                  ))}
                  {!isCollapsed&&assets.length>shown&&<button type="button" onClick={()=>setVisibleCounts(v=>({...v,[id]:shown+25}))} className="min-h-11 w-full border-t border-slate-700 text-sm text-sky-300">{t('catalogue_more',{remaining:assets.length-shown})}</button>}
                </section>
              );
            })}
          </div>
        )}
      </div>
      <MarketLeaders compact marketData={marketData} onSelect={setInspectedAsset}/>
      </div>

      {/* Footer con total */}
      {filtered.length > 0 && (
        <p className="text-xs text-slate-600 text-center mt-3">
          {t('screener_showing_count', { results: filtered.length, total: catalogTotal })}
        </p>
      )}
      </section>
      {inspectedAsset && <section ref={inspectionRef} className="mb-4 scroll-mt-24 rounded-xl border border-sky-700/50 p-3">
        <div className="mb-3 flex items-center justify-between gap-2"><h2 translate="no" className="font-semibold">{inspectedAsset.name} · {inspectedAsset.symbol}</h2><button type="button" onClick={()=>{setInspectedAsset(null);resetFilters();}} className="min-h-10 px-3" aria-label={t('catalogue_return')}>← {t('catalogue_return')}</button></div>
        <OpportunityPanel asset={inspectedAsset}/>
        <ImportantNews key={`news:${inspectedAsset.type}:${inspectedAsset.id}`} asset={currentSelection(inspectedAsset,allAssets)}/>
        <AssetValuationCard key={`valuation:${inspectedAsset.type}:${inspectedAsset.id}`} asset={currentSelection(inspectedAsset,allAssets)} technical={analysisSnapshot?.id===inspectedAsset.id&&analysisSnapshot?.type===inspectedAsset.type?analysisSnapshot:null}/><CandleChart key={`chart:${inspectedAsset.type}:${inspectedAsset.id}`} asset={currentSelection(inspectedAsset,allAssets)}/><details className="mt-3 rounded-xl border border-slate-700 p-3"><summary className="min-h-8 cursor-pointer text-sm font-semibold">{t('audit_technical_details')}</summary><AnalysisPanel key={`analysis:${inspectedAsset.type}:${inspectedAsset.id}`} asset={currentSelection(inspectedAsset,allAssets)} onAnalysis={setAnalysisSnapshot}/></details>
        <AnalysisNarrative key={`narrative:${inspectedAsset.type}:${inspectedAsset.id}`} asset={inspectedAsset}/>
      </section>}
    </div>
  );
}
