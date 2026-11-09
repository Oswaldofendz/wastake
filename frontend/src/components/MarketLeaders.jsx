import {compactNumber} from '../utils/compactNumber.js';
import {AssetLogo} from './AssetLogo.jsx';
import {useTranslation} from 'react-i18next';
import {OpportunityPanel} from './OpportunityPanel.jsx';
import {marketLeaders} from '../utils/discoveryHighlights.js';
import {useState} from 'react';

export function MarketLeaders({marketData,onSelect,compact=false,home=false}) {
  const {t,i18n}=useTranslation();
  const [active,setActive]=useState('cryptoCap');
  const allGroups=marketLeaders(marketData.allAssets);
  const groups=compact?{stockCap:allGroups.stockCap,cryptoCap:allGroups.cryptoCap}:allGroups;
  const icons={cryptoCap:'🪙',stockCap:'🏢',gainers:'🚀',cryptoGainers:'🔥'};
  const cap=n=>'$'+compactNumber(n,i18n.language);
  return <section aria-label={t('highlights_title')} className={`${home?'home-rankings ':''}${compact?'m-0':'mx-3 mt-3'} rounded-xl border border-slate-700/50 p-3`}>
    <div className={home?'home-rank-heading':'mb-2 flex flex-wrap items-baseline justify-between gap-1'}><h2 className="text-sm font-semibold">{home&&<span aria-hidden="true">⚡</span>}{t('highlights_title')}</h2><p className="text-[11px] text-slate-400">{t(home?'home_scope':'highlights_scope')}{!home&&marketData.lastUpdated&&` · ${marketData.lastUpdated.toLocaleTimeString(i18n.language,{hour:'2-digit',minute:'2-digit'})}`}{!home&&marketData.isStale&&` · ${t('screener_stale_data')}`}</p></div>
    {home&&<label className="home-rank-selector">{t('home_rank')}<select value={active} onChange={event=>setActive(event.target.value)}>{Object.keys(groups).map(key=><option key={key} value={key}>{t('highlights_'+key)}</option>)}<option value="opportunities">🎯 {t('ui_opportunities')}</option></select></label>}
    <div className={home?'home-rank-grid':compact?'grid grid-cols-1 sm:grid-cols-2 gap-3':'flex snap-x gap-3 overflow-x-auto pb-2'}>{Object.entries(groups).map(([key,assets])=><div key={key} data-active={active===key} data-ranking={home?key:undefined} className={`${compact?'min-w-0':'min-w-[224px] flex-1 snap-start'} rounded-lg border border-slate-700/50 bg-slate-800/30 p-3`}><h3 className="mb-2 flex items-center gap-2 text-xs font-semibold text-sky-200"><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-slate-700/40 text-base">{icons[key]}</span>{t('highlights_'+key)}</h3>{assets.length?<><ol>{assets.map((a,i)=><li key={`${a.type}:${a.id}`}><button type="button" onClick={()=>onSelect(a)} className="flex min-h-10 w-full items-center gap-2 rounded px-1 py-1 text-left hover:bg-slate-700/50"><span className={`w-3 shrink-0 text-xs ${i===0?'text-amber-300':'text-slate-500'}`}>{i+1}</span><AssetLogo asset={a} size={23}/><span translate="no" className="min-w-0 flex-1 truncate text-xs font-semibold" title={a.name}>{a.symbol}</span><span title={key.endsWith('Cap')?`${a.marketCap.toLocaleString(i18n.language)} USD · M 10⁶ / B 10⁹ / T 10¹²`:undefined} className={`shrink-0 text-[11px] font-mono ${key.endsWith('Cap')?'text-slate-200':'text-emerald-400'}`}>{key.endsWith('Cap')?cap(a.marketCap):`+${a.change24h.toLocaleString(i18n.language,{minimumFractionDigits:2,maximumFractionDigits:2})}%`}</span></button></li>)}</ol><p translate="no" className="mt-2 break-words text-[10px] text-slate-500">{[...new Set(assets.map(a=>a.source).filter(Boolean))].join(' · ')}</p>{key==='stockCap'&&<p className="mt-1 text-[10px] text-slate-400" title={t('home_company_note')}>{t('home_grouped')}</p>}</>:<p role="status" className="text-xs text-slate-400">{t(marketData.loading?'loading':'highlights_missing')}</p>}</div>)}{!compact&&<OpportunityPanel compact home={home} active={active==='opportunities'}/>}</div>
    {!compact&&!home&&<p className="mt-2 text-[11px] leading-5 text-slate-400">{t('highlights_moves')} {t('audit_compact_legend')}</p>}
  </section>;
}
