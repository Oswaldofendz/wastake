import { useEffect, useMemo, useRef, useState } from 'react';
import { hierarchy, treemap } from 'd3';
import { useTranslation } from 'react-i18next';
import { fetchAllPrices, fetchRankings } from '../services/api.js';
import { getAssetGroup } from '../data/assetSectors.js';

const color=n=>!Number.isFinite(n)?'#475569':n===0?'#334155':n>0?(n>3?'#057a55':'#16654b'):(n< -3?'#b42335':'#792635');
const cap=n=>Number.isFinite(n)&&n>0?new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',notation:'compact',maximumFractionDigits:2}).format(n):'—';
const change=n=>Number.isFinite(n)?`${n>=0?'+':''}${n.toFixed(2)}%`:'—';

export function MarketHeatmap({ assets: provided }) {
  const {t,i18n}=useTranslation();
  const [fallback,setFallback]=useState([]);
  const [universe,setUniverse]=useState(null);
  const [loading,setLoading]=useState(true);
  const [scope,setScope]=useState('all');
  const [size,setSize]=useState('equal');
  const [sector,setSector]=useState('all');
  const [attempt,setAttempt]=useState(0);
  const [width,setWidth]=useState(800);
  const ref=useRef(null);
  useEffect(()=>{
    if(provided)return;
    let cancelled=false;fetchAllPrices().then(d=>{if(!cancelled)setFallback([...Object.values(d.crypto??{}),...Object.values(d.traditional??{})].filter(a=>a?.id));}).catch(()=>{});
    return()=>{cancelled=true;};
  },[provided]);
  useEffect(()=>{
    let cancelled=false;setLoading(true);
    fetchRankings().then(r=>{if(!cancelled)setUniverse(r);}).catch(()=>{if(!cancelled)setUniverse({stocks:[],crypto:[],partial:true});}).finally(()=>{if(!cancelled)setLoading(false);});
    return()=>{cancelled=true;};
  },[attempt]);
  useEffect(()=>{if(!ref.current)return;const observer=new ResizeObserver(entries=>setWidth(Math.max(260,Math.floor(entries[0].contentRect.width))));observer.observe(ref.current);return()=>observer.disconnect();},[]);
  const caps=useMemo(()=>new Map([...(universe?.stocks??[]),...(universe?.crypto??[])].map(a=>[`${a.type}:${a.id}`,a])),[universe]);
  const catalog=(provided??fallback).filter(a=>a?.id&&a.price>0).filter(a=>scope==='all'||a.type===scope).map(a=>({...a,verifiedCap:caps.get(`${a.type}:${a.id}`)?.marketCap||(a.currency==='USD'||a.type==='crypto'?a.marketCap:null)}));
  const sectors=[...new Set(catalog.map(getAssetGroup))];
  const selected=catalog.filter(a=>sector==='all'||getAssetGroup(a)===sector);
  const missing=selected.filter(a=>!(a.verifiedCap>0)).length;
  const eligible=selected.filter(a=>size==='equal'||a.verifiedCap>0);
  const visible=width<500?[...eligible].sort((a,b)=>size==='cap'?b.verifiedCap-a.verifiedCap:Math.abs(b.change24h??0)-Math.abs(a.change24h??0)).slice(0,18):eligible;
  const height=width<500?380:440;
  const root=hierarchy({children:visible.map(a=>({...a,value:size==='equal'?1:a.verifiedCap}))}).sum(a=>a.value||0).sort((a,b)=>b.value-a.value);
  treemap().size([width,height]).padding(3).round(true)(root);
  const ranked=[...(scope==='crypto'?[]:universe?.stocks??[]),...(scope==='stock'?[]:universe?.crypto??[])].filter(a=>a.marketCap>0).sort((a,b)=>b.marketCap-a.marketCap).slice(0,15);
  return <section className="rounded-xl border border-slate-700/50 bg-[var(--bg-card)] p-3 sm:p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{t('map_title')}</h2><div className="flex gap-1">{[['all','map_all'],['stock','map_stocks'],['crypto','map_crypto']].map(([id,label])=><button type="button" key={id} onClick={()=>{setScope(id);setSector('all');}} aria-pressed={scope===id} className={`min-h-10 rounded-lg border px-3 text-xs ${scope===id?'border-sky-500 bg-sky-900/30 text-sky-300':'border-slate-600'}`}>{t(label)}</button>)}</div></div>
    <p className="mt-2 text-xs leading-5 text-slate-400">{t('map_scope')}</p>
    <div className="my-3 flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-xs">{t('map_size')}<select value={size} onChange={e=>setSize(e.target.value)} className="min-h-10 rounded border border-slate-600 bg-slate-800 px-2"><option value="equal">{t('map_equal')}</option><option value="cap">{t('map_cap')}</option></select></label>
      <label className="flex items-center gap-2 text-xs">{t('map_sector')}<select value={sector} onChange={e=>setSector(e.target.value)} className="min-h-10 max-w-48 rounded border border-slate-600 bg-slate-800 px-2"><option value="all">{t('map_all')}</option>{sectors.map(s=><option key={s} value={s}>{t(`screener_group_${s}`)}</option>)}</select></label>
      <span className="text-[11px] text-slate-400">−5% <span className="inline-block h-2 w-20 rounded bg-gradient-to-r from-rose-700 via-slate-600 to-emerald-600"/> +5%</span>
    </div>
    <div ref={ref} className="w-full min-w-0">
      <p className="mb-2 text-[11px] leading-5 text-slate-400">{t('map_display',{shown:visible.length,total:eligible.length})}</p>
      {visible.length?<svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${t('map_title')} · ${visible.length}`}>
        {root.leaves().map(n=>{const a=n.data,w=n.x1-n.x0,h=n.y1-n.y0;return <g key={a.id} tabIndex={0} role="img" aria-label={`${a.name}, ${a.symbol}, ${change(a.change24h)}`}><title>{a.name} ({a.symbol}) · {change(a.change24h)} · {t('map_cap')}: {cap(a.verifiedCap)}</title><rect x={n.x0} y={n.y0} width={w} height={h} rx="5" fill={color(a.change24h)}/>{w>40&&h>35&&<text translate="no" x={n.x0+w/2} y={n.y0+h/2-2} textAnchor="middle" fill="white" fontSize={w>100?16:11} fontWeight="700">{a.symbol}</text>}{w>45&&h>52&&<text x={n.x0+w/2} y={n.y0+h/2+17} textAnchor="middle" fill="white" fontSize="11">{change(a.change24h)}</text>}</g>;})}
      </svg>:<p className="py-14 text-center text-sm text-slate-400">{t(size==='cap'?'map_no_cap':'map_empty')}</p>}
    </div>
    {size==='cap'&&missing>0&&<p className="mt-2 text-xs text-amber-300">{t('map_missing',{count:missing})}</p>}
    <details className="mt-3 text-xs"><summary className="cursor-pointer text-sky-300">{t('map_table')} · {eligible.length}</summary><ul className="mt-2 max-h-80 divide-y divide-slate-700/40 overflow-y-auto">{eligible.map(a=><li key={a.id} className="flex items-center justify-between gap-2 py-2"><span translate="no" className="min-w-0 truncate">{a.symbol} · {a.name}</span><span className="shrink-0 font-mono">{change(a.change24h)}</span></li>)}</ul></details>
    <div className="mt-6 flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{t('map_rank')} · {t('map_top')}</h3><button type="button" disabled={loading} className="min-h-10 rounded border border-slate-600 px-3 text-xs" onClick={()=>setAttempt(n=>n+1)}>{t('retry')}</button></div>
    <p className="mt-2 text-xs leading-5 text-slate-400">{t('map_rank_scope')}</p>
    {loading&&<p className="my-3 text-sm text-sky-300" role="status">{t('map_loading')}</p>}
    {universe?.partial&&<p className="my-2 text-xs text-amber-300" role="status">{t('map_partial')}</p>}
    {!loading&&!ranked.length&&<p className="py-6 text-sm text-slate-400">{t('map_no_cap')}</p>}
    <ol className="mt-3 divide-y divide-slate-700/40">{ranked.map((a,i)=><li key={`${a.type}:${a.id}`} className="flex items-center gap-3 py-3 text-sm"><span className="w-5 text-xs text-slate-400">{i+1}</span><div className="min-w-0 flex-1"><p translate="no" className="truncate font-semibold">{a.symbol} · {a.name}</p><p className="text-[10px] text-slate-400">{a.source}</p></div><span className="font-mono">{cap(a.marketCap)}</span><span className={`w-16 text-right font-mono text-xs ${a.change24h>=0?'text-emerald-400':'text-rose-400'}`}>{change(a.change24h)}</span></li>)}</ol>
    <p className="mt-3 text-[11px] leading-5 text-slate-400">{t('map_source')}: {universe?.fetchedAt?new Date(universe.fetchedAt).toLocaleString(i18n.language):'—'} · <a className="underline" href="https://www.nasdaq.com/market-activity/stocks/screener" target="_blank" rel="noopener noreferrer">Nasdaq</a> · <a className="underline" href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer">CoinGecko</a></p>
  </section>;
}
