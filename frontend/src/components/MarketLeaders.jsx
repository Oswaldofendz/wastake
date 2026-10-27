import {useTranslation} from 'react-i18next';
import {marketLeaders} from '../utils/discoveryHighlights.js';

export function MarketLeaders({marketData,onSelect}) {
  const {t,i18n}=useTranslation();
  const groups=marketLeaders(marketData.allAssets);
  const cap=n=>new Intl.NumberFormat(i18n.language,{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(n);
  return <section aria-label={t('highlights_title')} className="mx-3 mt-3 rounded-xl border border-slate-700/50 p-3">
    <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1"><h2 className="text-sm font-semibold">{t('highlights_title')}</h2><p className="text-[11px] text-slate-400">{t('highlights_scope')}{marketData.lastUpdated&&` · ${marketData.lastUpdated.toLocaleTimeString(i18n.language,{hour:'2-digit',minute:'2-digit'})}`}{marketData.isStale&&` · ${t('screener_stale_data')}`}</p></div>
    <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">{Object.entries(groups).map(([key,assets])=><div key={key} className="min-w-0 rounded-lg border border-slate-700/50 bg-slate-800/30 p-2 sm:p-3"><h3 className="mb-2 text-xs font-semibold text-sky-200">{t('highlights_'+key)}</h3>{assets.length?<><ol>{assets.map((a,i)=><li key={`${a.type}:${a.id}`}><button type="button" onClick={()=>onSelect(a)} className="grid min-h-11 w-full grid-cols-[12px_minmax(0,1fr)] items-center gap-x-1 rounded py-1 text-left hover:bg-slate-700/50 sm:flex sm:min-h-9 sm:gap-2"><span className="row-span-2 text-xs text-slate-500">{i+1}</span><span translate="no" className="min-w-0 flex-1 truncate text-xs font-semibold" title={a.name}>{a.symbol}</span><span className={`col-start-2 text-[11px] sm:text-xs font-mono ${key.endsWith('Cap')?'text-slate-200':'text-emerald-400'}`}>{key.endsWith('Cap')?cap(a.marketCap):`+${a.change24h.toLocaleString(i18n.language,{minimumFractionDigits:2,maximumFractionDigits:2})}%`}</span></button></li>)}</ol><p translate="no" className="mt-1 break-words text-[10px] text-slate-500">{[...new Set(assets.map(a=>a.source).filter(Boolean))].join(' · ')}</p></>:<p role="status" className="text-xs text-slate-400">{t(marketData.loading?'loading':'highlights_missing')}</p>}</div>)}</div>
    <p className="mt-2 text-[11px] leading-5 text-slate-400">{t('highlights_moves')}</p>
  </section>;
}
