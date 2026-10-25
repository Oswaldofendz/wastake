import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_ASSETS } from '../data/assetCatalog.js';
import { searchAssets, fetchAssetQuote } from '../services/api.js';

export function AssetSearch({ onSelect, query, onQueryChange }) {
  const { t }=useTranslation();
  const id=useId();
  const wrapper=useRef(null);
  const [text,setText]=useState('');
  const value=query??text;
  const [open,setOpen]=useState(false);
  const [results,setResults]=useState([]);
  const [loading,setLoading]=useState(false);
  const [partial,setPartial]=useState(false);
  const [active,setActive]=useState(-1);
  const [selecting,setSelecting]=useState(false);
  const [quoteError,setQuoteError]=useState(false);
  const selectVersion=useRef(0);
  useEffect(()=>{
    function outside(e){if(!wrapper.current?.contains(e.target))setOpen(false);}
    document.addEventListener('pointerdown',outside);
    return ()=>document.removeEventListener('pointerdown',outside);
  },[]);
  useEffect(()=>()=>{selectVersion.current++;},[]);
  useEffect(()=>{
    let cancelled=false;
    const q=value.trim().toLowerCase();
    setActive(-1);setPartial(false);setQuoteError(false);
    selectVersion.current++;setSelecting(false);
    const local=ALL_ASSETS.filter(a=>!q||[a.name,a.symbol,a.id].some(s=>s?.toLowerCase().includes(q))).slice(0,12);
    setResults(local);
    if(!q){setLoading(false);return;}
    setLoading(true);
    const timer=setTimeout(()=>{
      searchAssets(q).then(r=>{if(!cancelled){setResults(r.results??r);setPartial(!!r.partial);}})
        .catch(()=>{if(!cancelled)setPartial(true);}).finally(()=>{if(!cancelled)setLoading(false);});
    },400);
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[value]);
  async function choose(asset){
    const version=++selectVersion.current;
    setSelecting(true);setQuoteError(false);
    let selected=asset;
    try {selected={...asset,...await fetchAssetQuote(asset),name:asset.name,symbol:asset.symbol};}
    catch {selected={...asset,quoteUnavailable:true};}
    if(version!==selectVersion.current)return;
    setSelecting(false);setOpen(false);setQuoteError(!!selected.quoteUnavailable);
    onSelect?.(selected);
  }
  return <div ref={wrapper} className="relative min-w-0">
    <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-slate-400">{t('discovery_label')}</label>
    <input id={id} type="search" role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-results`} aria-activedescendant={active>=0?`${id}-${active}`:undefined} autoComplete="off" maxLength={80} spellCheck={false}
      value={value} onFocus={()=>setOpen(true)} onChange={e=>{onQueryChange?onQueryChange(e.target.value):setText(e.target.value);setOpen(true);}}
      onKeyDown={e=>{if(e.key==='Escape'){setOpen(false);return;}if(e.key==='ArrowDown'){e.preventDefault();setOpen(true);setActive(i=>Math.min(results.length-1,i+1));}if(e.key==='ArrowUp'){e.preventDefault();setActive(i=>Math.max(0,i-1));}if(e.key==='Enter'&&open&&active>=0){e.preventDefault();choose(results[active]);}}}
      placeholder={t('discovery_placeholder')} className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm text-white placeholder-slate-400 focus:border-sky-400"/>
    {open&&<div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-600 bg-[var(--bg-card)] p-2 shadow-2xl">
      <p role="status" className="px-2 py-1 text-xs text-slate-400">{loading||selecting?t('discovery_loading'):t('discovery_help')}</p>
      {partial&&<p role="status" className="px-2 py-1 text-xs text-amber-300">{t('discovery_partial')}</p>}
      <ul id={`${id}-results`} role="listbox" aria-label={t('discovery_label')}>
        {results.map((a,i)=><li key={`${a.analysisType}:${a.id}`} id={`${id}-${i}`} role="option" aria-selected={i===active}>
          <button type="button" disabled={selecting} onClick={()=>choose(a)} className={`flex min-h-12 w-full items-center justify-between gap-2 rounded-lg p-2 text-left hover:bg-slate-700/40 ${active===i?'bg-slate-700/40':''}`}>
            <span className="min-w-0"><span translate="no" className="block truncate text-sm font-semibold">{a.name}</span><span translate="no" className="text-xs text-slate-400">{a.symbol} · {a.exchange||a.source||t('discovery_catalog')}</span></span><span className="text-[11px] text-sky-300">{t('discovery_analyze')} ↗</span>
          </button>
        </li>)}
      </ul>
      {!loading&&!results.length&&<p className="p-3 text-sm text-slate-400">{t('discovery_empty')}</p>}
    </div>}
    {quoteError&&<p role="status" className="mt-1 text-xs text-amber-300">{t('discovery_quote_error')}</p>}
  </div>;
}
