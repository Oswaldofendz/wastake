import {useEffect,useState,useRef} from 'react';
import {useTranslation} from 'react-i18next';
import {fetchMarketImpactAlerts} from '../services/api.js';
import {useNewsTitles} from '../hooks/useNewsTitles.js';
import {visibleMarketAlerts,tickerMarketAlerts,tickerDuration} from '../utils/marketImpact.js';

const STORAGE='wastake-impact-dismissed-v1';
export function MarketImpactAlert(){
  const {t,i18n}=useTranslation(),[data,setData]=useState(null),[error,setError]=useState(false),[loading,setLoading]=useState(false),[attempt,setAttempt]=useState(0),[clock,setClock]=useState(Date.now),[detailsOpen,setDetailsOpen]=useState(false),[paused,setPaused]=useState(false);
  const [speed,setSpeed]=useState('fast'),[duration,setDuration]=useState(20);const sequenceRef=useRef(null);
  const [dismissed,setDismissed]=useState(()=>{try{const list=JSON.parse(sessionStorage.getItem(STORAGE)||'[]');return Array.isArray(list)?list.filter(x=>typeof x==='string').slice(-50):[];}catch{return [];}});
  useEffect(()=>{
    let alive=true,running=false;const controller=new AbortController();
    const read=async()=>{
      if(running||document.visibilityState==='hidden')return;
      running=true;setClock(Date.now());setLoading(true);
      try{const result=await fetchMarketImpactAlerts(controller.signal);if(alive){setData(result);setError(false);}}
      catch{if(alive)setError(true);}
      finally{running=false;if(alive){setLoading(false);setClock(Date.now());}}
    };
    const visible=()=>{if(document.visibilityState==='visible')read();};
    read();const timer=setInterval(read,60_000);document.addEventListener('visibilitychange',visible);
    return()=>{alive=false;controller.abort();clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[attempt]);
  const hide=id=>{const next=[...dismissed,id].slice(-50);setDismissed(next);try{sessionStorage.setItem(STORAGE,JSON.stringify(next));}catch{/* Session state is sufficient without storage. */}};
  const alerts=tickerMarketAlerts(visibleMarketAlerts(data,dismissed,clock)),all=visibleMarketAlerts(data,[],clock),partial=error||data?.status==='partial'||data?.status==='unavailable';
  const localizedTitle=useNewsTitles(alerts,i18n.language,12);
  useEffect(()=>{const node=sequenceRef.current;if(!node)return;const measure=()=>setDuration(tickerDuration(node.scrollWidth,speed==='fast'?82:45));measure();const observer=new ResizeObserver(measure);observer.observe(node);return()=>observer.disconnect();},[alerts.map(a=>a.id).join('|'),speed,i18n.language]);
  const detailsLink=()=>{const params=new URLSearchParams(window.location.search);params.set('news','global');return `${window.location.pathname}?${params}#fundamentals`;};
  const date=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleString(i18n.language,{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZoneName:'short'}):'—';
  const title=item=>{
    if(item.topic==='fed_decision'&&item.decision){const range=[item.decision.lower,item.decision.upper].map(x=>x.toLocaleString(i18n.language,{maximumFractionDigits:2})).join('–')+'%';return t('impact_fed_'+item.decision.action,{range});}
    return localizedTitle(item);
  };
  const expanded=<section aria-labelledby="market-impact-details-title" className={`market-impact mx-3 mt-3 overflow-hidden rounded-xl border ${alerts.length?'market-impact-active border-rose-700/70 bg-gradient-to-r from-rose-950/35 to-amber-950/15':'border-slate-700/60 bg-slate-900/20'}`}>
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"><h2 id="market-impact-details-title" className={`flex items-center gap-2 text-sm font-semibold ${alerts.length?'text-rose-200':'text-slate-300'}`}><span aria-hidden="true">{alerts.length?'🚨':'🛰️'}</span>{t('impact_title')}</h2><button type="button" onClick={()=>setAttempt(n=>n+1)} disabled={loading} aria-label={t('impact_refresh')} className="min-h-9 rounded-lg border border-slate-600 px-3 text-xs text-slate-300 disabled:opacity-50">↻ {t(loading?'impact_checking':'impact_refresh')}</button></div>
    <div aria-live="polite" aria-atomic="false">
      {alerts.map(item=><article key={item.id} className="border-t border-rose-900/40 px-4 py-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="mb-2 flex flex-wrap items-center gap-2 text-[11px]"><span className="rounded-full border border-rose-700 bg-rose-950/50 px-2 py-1 font-semibold text-rose-200">⚡ {t('world_priority')} {item.priority??'—'}/100</span><span className="text-slate-300" translate="no">{item.source}</span><span className="text-slate-400">{t(item.official?'impact_official':'impact_press')}</span><time dateTime={item.publishedAt} className="text-slate-400">{date(item.publishedAt)}</time></div><a href={item.url} target="_blank" rel="noopener noreferrer" className="text-base font-semibold leading-7 text-white underline-offset-4 hover:underline sm:text-lg">{title(item)} ↗</a><details className="mt-2"><summary className="min-h-8 cursor-pointer text-xs font-semibold text-sky-200">{t('impact_context')}</summary><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">{t('world_why_'+(item.category??'macro'))}</p><p className="mt-2 text-xs leading-5 text-amber-200">{t('impact_no_direction')}</p></details><div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-[11px] text-slate-400">{t('impact_watch')}</span>{item.assets.map(symbol=><span key={symbol} translate="no" className="rounded border border-slate-600 bg-slate-900/50 px-2 py-1 font-mono text-[11px] text-slate-200">{symbol}</span>)}</div></div><button type="button" onClick={()=>hide(item.id)} aria-label={t('impact_hide',{title:title(item)})} className="min-h-10 min-w-10 rounded-lg text-slate-400 hover:bg-slate-800">×</button></div><div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-sky-200"><a href={item.url} target="_blank" rel="noopener noreferrer" className="min-h-8 content-center underline">{t(item.official?'impact_source':'impact_read')} ↗</a><a href={detailsLink()} className="min-h-8 content-center underline">{t('world_full')}</a><details className="text-slate-400"><summary className="cursor-pointer">{t('impact_original')}</summary><p translate="no" className="mt-2 max-w-3xl leading-5">{item.title}</p></details></div></article>)}
      {!alerts.length&&<p role="status" className="px-4 pb-3 text-xs leading-5 text-slate-400">{t(!data?(error?'impact_unknown':'impact_loading'):all.length?'impact_hidden':partial?'impact_unknown':'impact_empty')}</p>}
    </div>
    <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-slate-700/40 px-4 py-2 text-[10px] leading-5 text-slate-400"><p>{t('impact_cadence')}{data?.checkedAt?` · ${t('impact_checked')}: ${date(data.checkedAt)}`:''}</p>{partial&&<p role="status" className="text-amber-200">{t('impact_partial')}</p>}{dismissed.length>0&&all.some(a=>dismissed.includes(a.id))&&<button type="button" onClick={()=>{setDismissed([]);try{sessionStorage.removeItem(STORAGE);}catch{}}} className="min-h-8 text-sky-200 underline">{t('impact_restore')}</button>}<details><summary className="cursor-pointer">{t('impact_coverage')}</summary><p className="max-w-3xl">{t('world_method_text')}</p>{data?.sources?.map(s=><p key={s.name}><span translate="no">{s.name}</span> · {t(s.status==='ok'?'impact_available':'impact_unavailable')}{s.checkedAt?` · ${date(s.checkedAt)}`:''}</p>)}</details></footer>
  </section>;
  return <><section className={`impact-ticker ${alerts.length?'has-news':''}`} aria-label={t('impact_title')}>
    <a className="impact-ticker-label" href={detailsLink()} title={t('world_full')}><span aria-hidden="true">{alerts.length?'🚨':'🛰️'}</span> {t('impact_ticker_title')}</a>
    <div className="impact-ticker-window"><div style={{animationDuration:`${duration}s`}} className={`impact-ticker-track ${paused||!alerts.length?'is-paused':''}`}>
      <div ref={sequenceRef} className="impact-ticker-sequence">{alerts.length?alerts.map(item=><a key={item.id} href={detailsLink()}><strong>{title(item)}</strong><span className="ticker-source" translate="no">{item.source}</span><time dateTime={item.publishedAt}>{date(item.publishedAt)}</time><span aria-hidden="true">◆</span></a>):<span className="ticker-status">{t(!data?(error?'impact_unknown':'impact_loading'):all.length?'impact_hidden':partial?'impact_unknown':'impact_empty')}</span>}</div>
      {alerts.length>0&&<div className="impact-ticker-sequence" aria-hidden="true">{alerts.map(item=><span key={item.id}><strong>{title(item)}</strong><span className="ticker-source" translate="no">{item.source}</span><span>{date(item.publishedAt)}</span><span>◆</span></span>)}</div>}
    </div></div>
    {partial&&<span title={t('impact_partial')} className="ticker-warning" role="status">⚠</span>}
    {alerts.length>0&&<button type="button" onClick={()=>setSpeed(value=>value==='fast'?'normal':'fast')} aria-label={t('world_speed')} aria-pressed={speed==='fast'} title={t('world_speed')}>{speed==='fast'?'2×':'1×'}</button>}
    {alerts.length>0&&<button type="button" onClick={()=>setPaused(p=>!p)} aria-label={t(paused?'impact_resume':'impact_pause')} title={t(paused?'impact_resume':'impact_pause')}>{paused?'▶':'Ⅱ'}</button>}
    <button type="button" onClick={()=>setDetailsOpen(x=>!x)} aria-expanded={detailsOpen} aria-label={t('impact_details')} title={t('impact_details')}>{detailsOpen?'×':'ⓘ'}</button>
  </section><p className="sr-only" aria-live="polite">{alerts.map(title).join('. ')}</p>{detailsOpen&&expanded}</>;
}
