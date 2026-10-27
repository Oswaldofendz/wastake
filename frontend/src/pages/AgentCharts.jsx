import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {AssetSearch} from '../components/AssetSearch.jsx';
import {AgentCanvas} from '../components/AgentCanvas.jsx';
import {fetchChartSnapshot,askChartAgent} from '../services/api.js';
import {getAnalysisType} from '../data/assetCatalog.js';
import {formatQuote} from '../utils/panoramaAnalysis.js';
import {initialWorkspace,applyChartActions,safeManualPrice,focusRange} from '../utils/chartWorkspace.js';

const starter={id:'bitcoin',name:'Bitcoin',symbol:'BTC',type:'crypto'};
export default function AgentCharts({marketData}){
 const {t,i18n}=useTranslation(),lang=i18n.language.split('-')[0];
 const [asset,setAsset]=useState(starter),[timeline,setTimeline]=useState({current:initialWorkspace(),past:[]});
 const workspace=timeline.current;
 const [snapshot,setSnapshot]=useState(null),[loading,setLoading]=useState(true),[dataError,setDataError]=useState(false),[reload,setReload]=useState(0);
 const [panel,setPanel]=useState('chart');
 const [messages,setMessages]=useState([]),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false),[linePrice,setLinePrice]=useState(''),[lineError,setLineError]=useState(false);
 const canvas=useRef(null),controller=useRef(null),currentContext=useRef(''),messageSequence=useRef(0),transcriptEnd=useRef(null),log=useRef(null);
 const contextKey=`${asset.type}:${asset.id}:${workspace.interval}:${lang}`;currentContext.current=contextKey;
 const fmt=n=>Number.isFinite(n)?n.toLocaleString(i18n.language,{maximumFractionDigits:Math.abs(n)<1?10:2}):'—';
 const date=stamp=>new Date(stamp*1000).toLocaleString(i18n.language,{timeZone:'UTC',dateStyle:'short',timeStyle:'short'});
 const quoteKeys=['close','low','high','ema20','ema50','support','resistance'];
 const fact=(data,key)=>quoteKeys.includes(key)?formatQuote(data.facts[key],data.currency,i18n.language):`${fmt(data.facts[key])}${['change','drawdown','atrPercent'].includes(key)&&Number.isFinite(data.facts[key])?'%':''}`;
 useEffect(()=>{
  let active=true;controller.current?.abort();setBusy(false);setLoading(true);setDataError(false);setSnapshot(null);
  fetchChartSnapshot(asset,getAnalysisType(asset),workspace.interval).then(data=>{
   if(active){if(data.id!==asset.id||data.interval!==workspace.interval||!Array.isArray(data.candles)||!data.snapshotId)throw new Error('Chart schema unavailable');setSnapshot(data);}
  }).catch(()=>{if(active)setDataError(true);}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;controller.current?.abort();};
 },[asset.id,asset.type,workspace.interval,reload]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 useEffect(()=>{controller.current?.abort();setBusy(false);setError(false);},[lang]);
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight;},[messages,busy]);
 function commit(next){setTimeline(previous=>({past:[...previous.past,previous.current].slice(-20),current:next}));}
 function undo(){setTimeline(previous=>previous.past.length?{current:previous.past.at(-1),past:previous.past.slice(0,-1)}:previous);}
 function operate(actions){
  if(actions.some(a=>a.type==='undo')){undo();return;}
  setTimeline(previous=>({past:[...previous.past,previous.current].slice(-20),current:applyChartActions(previous.current,actions)}));
 }
 function selectAsset(next){controller.current?.abort();currentContext.current='';setAsset(next);setMessages([]);setError(false);setQuery('');setLineError(false);setTimeline({current:initialWorkspace(),past:[]});}
 async function send(text=query){
  const message=text.trim();if(!message||busy||!snapshot)return;
  const captured=contextKey,request=++messageSequence.current;
  controller.current?.abort();controller.current=new AbortController();
  setMessages(previous=>[...previous,{role:'user',text:message,context:captured,id:`u${request}`,asset:asset.symbol,interval:workspace.interval}].slice(-24));setQuery('');setBusy(true);setError(false);
  try{
   const history=messages.filter(m=>m.context===captured).slice(-4).map(m=>({role:m.role,text:m.role==='user'?m.text:m.response.insight?.explanation??m.response.reading.sections.map(s=>s.text).join(' ')}));
   const response=await askChartAgent({id:asset.id,type:getAnalysisType(asset),interval:workspace.interval,message,lang:['es','pt','en'].includes(lang)?lang:'en',history},controller.current.signal);
   if(currentContext.current!==captured||request!==messageSequence.current)return;
   if(response.snapshot?.id!==asset.id||response.snapshot.interval!==workspace.interval||!response.reading||!Array.isArray(response.actions))throw new Error('Invalid context');
   setSnapshot(response.snapshot);
   if(response.actions.length)operate(response.actions);
   setMessages(previous=>[...previous,{role:'assistant',response,context:captured,id:`a${request}`,asset:asset.symbol,interval:workspace.interval}].slice(-24));
  }catch(e){if(e.name!=='AbortError'&&currentContext.current===captured)setError(true);}
  finally{if(currentContext.current===captured)setBusy(false);}
 }
 const actionName=a=>a.type==='ema'?`EMA ${a.period}`:a.type==='interval'?a.value:a.type==='levels'?t('agent_levels'):a.type==='focus'?t(a.value==='drop'?'agent_drop':'agent_recent'):a.type==='clear'?t('agent_clear'):a.type==='undo'?t('agent_undo'):a.type==='reset'?t('agent_reset'):a.type==='volume'?t('agent_volume'):a.type==='bollinger'?'Bollinger':'RSI';
 const ready=snapshot&&!loading&&!dataError;
 return <main className="mx-auto w-full max-w-[1680px] p-3 sm:p-5">
  <header className="mb-5 flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] font-semibold tracking-[.2em] text-sky-300">{t('agent_eyebrow')}</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">{t('agent_title')}</h1><p className="mt-2 text-sm text-slate-400">{t('agent_intro')}</p></div><details className="max-w-lg rounded-xl border border-slate-700/60 p-3 text-sm"><summary className="min-h-7 cursor-pointer font-semibold text-sky-200">{t('agent_help')}</summary><p className="mt-2 text-xs leading-5 text-slate-400">{t('agent_help_text')}</p><p className="mt-2 text-xs leading-5 text-slate-400">{t('agent_privacy')}</p></details></header>
  <div className="mb-4 grid gap-3 rounded-xl border border-slate-700/60 bg-[var(--bg-card)] p-3 md:grid-cols-[minmax(0,1fr)_auto]">
   <AssetSearch onSelect={selectAsset} catalogueAssets={marketData.allAssets}/>
   <div className="flex flex-wrap items-end gap-2"><span translate="no" className="mr-2 self-center text-sm font-semibold text-sky-200">{asset.name} · {asset.symbol}</span><label><span className="mb-1 block text-xs text-slate-400">{t('candle_interval')}</span><select aria-label={t('candle_interval')} value={workspace.interval} onChange={e=>operate([{type:'interval',value:e.target.value}])} className="min-h-11 rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm"><option value="15m">15 min</option><option value="4h">4 h</option><option value="1d">{t('candle_daily')}</option></select></label><button type="button" disabled={loading} onClick={()=>setReload(n=>n+1)} className="min-h-11 rounded-lg border border-slate-600 px-3 text-xs text-sky-200">{t('agent_refresh')}</button></div>
  </div>
  <div role="tablist" aria-label={t('chart_ai')} className="mb-3 grid grid-cols-2 gap-2 xl:hidden">{[['chart',t('chart_ai')],['chat','Alberto']].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={panel===id} aria-controls={`agent-${id}-panel`} onClick={()=>setPanel(id)} className={`min-h-11 rounded-lg border text-sm font-semibold ${panel===id?'border-sky-500 bg-sky-900/30 text-sky-100':'border-slate-700 text-slate-400'}`}>{label}</button>)}</div>
  <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_370px]">
   <section id="agent-chart-panel" className={`${panel==='chart'?'block':'hidden'} xl:block min-w-0 rounded-2xl border border-slate-700/60 bg-[var(--bg-card)] p-3 sm:p-4`} aria-label={t('chart_ai')}>
    <div className="mb-3 flex flex-wrap items-center gap-2"><button type="button" onClick={undo} disabled={!timeline.past.length} className="min-h-10 rounded border border-slate-700 px-3 text-xs disabled:opacity-40">↶ {t('agent_undo')}</button><button type="button" onClick={()=>operate([{type:'reset'}])} className="min-h-10 rounded border border-slate-700 px-3 text-xs">{t('agent_reset')}</button><button type="button" disabled={!ready} onClick={()=>canvas.current?.exportImage()} className="min-h-10 rounded border border-slate-700 px-3 text-xs">↓ {t('agent_export')}</button><span className="flex-1"/><button type="button" onClick={()=>operate([{type:'focus',value:'recent'}])} className="min-h-10 rounded border border-slate-700 px-3 text-xs">{t('agent_recent')}</button><button type="button" onClick={()=>operate([{type:'focus',value:'all'}])} className="min-h-10 rounded border border-slate-700 px-3 text-xs">{t('agent_all')}</button></div>
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-3 text-xs" aria-label={t('agent_tools')}>
     {[['levels',t('agent_levels')],['rsi','RSI 14'],['bollinger','Bollinger 20'],['volume',t('agent_volume')]].map(([key,label])=><label key={key} className="flex min-h-8 items-center gap-1.5"><input type="checkbox" checked={workspace[key]} onChange={e=>operate([{type:key,enabled:e.target.checked}])}/>{label}</label>)}
     {[20,50,200].map(period=><label key={period} className="flex min-h-8 items-center gap-1.5"><input type="checkbox" checked={workspace.ema.includes(period)} onChange={e=>operate([{type:'ema',period,enabled:e.target.checked}])}/><span className={period===20?'text-sky-300':period===50?'text-violet-300':'text-amber-300'}>EMA {period}</span></label>)}
    </div>
    {loading?<p role="status" className="grid min-h-96 place-items-center text-sm text-slate-400">{t('agent_loading')}</p>:dataError?<div role="alert" className="grid min-h-96 place-items-center p-5 text-center text-sm text-amber-200">{t('agent_data_error')}</div>:snapshot&&<>
     <AgentCanvas ref={canvas} snapshot={snapshot} asset={asset} workspace={workspace}/>
     <p className="mt-3 text-xs leading-5 text-slate-400"><span translate="no">{asset.symbol} · {snapshot.currency??'—'} · {snapshot.source??'—'}</span><br/>{t('agent_closed',{count:snapshot.closedCount,date:date(snapshot.asOf)})}</p>
     <p className="mt-2 text-xs leading-5 text-slate-400">{t('agent_chart_note')}</p>
     {workspace.focus==='drop'&&!focusRange(snapshot.candles,'drop')&&<p className="mt-2 text-xs text-amber-300">{t('agent_no_drop')}</p>}
     {workspace.ema.filter(period=>snapshot.candles.length<period).map(period=><p key={period} className="mt-2 text-xs text-amber-300">{t('agent_short_ema',{period,count:snapshot.candles.length})}</p>)}
     <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">{['close','score','rsi','atrPercent'].map(key=><div key={key} className="min-w-0 rounded-lg border border-slate-700/50 p-3"><p className="text-xs text-slate-400">{t('agent_fact_'+key)}</p><p className="mt-1 break-words font-mono text-base font-semibold">{fact(snapshot,key)}</p></div>)}</div>
     {workspace.levels&&<div className="mt-3 grid gap-2 sm:grid-cols-2">{snapshot.levels.length?snapshot.levels.map(level=><div key={level.kind} className={`rounded-lg border p-3 text-xs ${level.kind==='support'?'border-emerald-800 text-emerald-200':'border-rose-800 text-rose-200'}`}><p className="font-semibold">{t('chart_'+level.kind)} · {fmt(level.low)}–{fmt(level.high)} {snapshot.currency??''}</p><p className="mt-1 text-slate-400">{t('agent_evidence',{count:level.touches,date:date(level.confirmedAt)})}</p></div>):<p className="text-xs text-slate-400">{t('agent_no_levels')}</p>}</div>}
    </>}
    <details className="mt-4 rounded-lg border border-slate-700/50 p-3"><summary className="min-h-7 cursor-pointer text-sm font-semibold">{t('agent_manual')} · {workspace.lines.length}/4</summary><p className="mt-2 text-xs text-slate-400">{t('agent_manual_note')}</p><form className="mt-3 flex flex-wrap gap-2" onSubmit={e=>{e.preventDefault();const price=safeManualPrice(linePrice);if(!price){setLineError(true);return;}if(workspace.lines.length<4)commit({...workspace,lines:[...workspace.lines,{id:crypto.randomUUID(),price}]});setLinePrice('');setLineError(false);}}><input type="number" min="0" step="any" value={linePrice} onChange={e=>setLinePrice(e.target.value)} aria-label={t('agent_price')} placeholder={snapshot?.facts.close?.toString()??''} className="min-h-10 min-w-0 flex-1 rounded border border-slate-600 bg-slate-800 px-3"/><button disabled={workspace.lines.length>=4} className="min-h-10 rounded border border-amber-600 px-3 text-xs text-amber-200">{t('agent_add_line')}</button></form>{lineError&&<p role="alert" className="mt-2 text-xs text-amber-200">{t('agent_invalid_price')}</p>}{workspace.lines.map(mark=><div key={mark.id} className="mt-2 flex gap-2"><input type="number" step="any" aria-label={`${t('agent_price')} ${mark.id.slice(0,4)}`} value={mark.price} onChange={e=>{const price=safeManualPrice(e.target.value);if(price)commit({...workspace,lines:workspace.lines.map(l=>l.id===mark.id?{...l,price}:l)});}} className="min-h-10 min-w-0 flex-1 rounded border border-slate-600 bg-slate-800 px-2"/><button type="button" onClick={()=>commit({...workspace,lines:workspace.lines.filter(l=>l.id!==mark.id)})} className="min-h-10 px-3 text-xs text-rose-200">{t('agent_delete')}</button></div>)}</details>
   </section>
   <aside id="agent-chat-panel" className={`${panel==='chat'?'block':'hidden'} xl:block min-w-0 rounded-2xl border border-sky-800/60 bg-[var(--bg-card)]`} aria-label="Alberto">
    <div className="flex items-center gap-3 border-b border-slate-700/50 p-4"><span className="grid h-10 w-10 place-items-center rounded-xl border border-sky-500/40 bg-sky-900/30 font-semibold text-sky-100" aria-hidden="true">A</span><div className="flex-1"><h2 className="font-semibold">Alberto</h2><p className="text-xs text-slate-400">{t('chart_ai')}</p></div><button type="button" onClick={()=>{controller.current?.abort();messageSequence.current++;setMessages([]);setBusy(false);setError(false);}} className="min-h-10 text-xs text-sky-200">{t('agent_newchat')}</button></div>
    <div ref={log} className="max-h-[640px] space-y-4 overflow-y-auto p-4" role="log" aria-live="polite" aria-label="Alberto · chat"><p className="rounded-xl bg-sky-950/40 p-3 text-sm leading-6 text-slate-200">{t('agent_welcome')}</p>
     {messages.map(item=>item.role==='user'?<div key={item.id} className="ml-7 rounded-xl border border-slate-600/50 bg-slate-800/50 p-3"><p className="mb-1 text-[10px] text-slate-400">{t('agent_you')} · <span translate="no">{item.asset} · {item.interval}</span></p><p className="break-words text-sm leading-6">{item.text}</p></div>:<article key={item.id} className="rounded-xl border border-sky-900/70 p-3"><p className="mb-2 text-[10px] text-sky-300">{t(item.response.actions.length&&!item.response.explain?'agent_commands':item.response.mode==='ai'?'agent_ai':'agent_rules')}{item.response.provider&&` · ${item.response.provider}`}</p>{item.response.actions.length?<><p className="text-sm leading-6">{item.response.reading.actionText}</p><ul className="mt-2 flex flex-wrap gap-1">{item.response.actions.map((a,index)=><li key={index} className="rounded border border-slate-600 px-2 py-1 text-xs">{a.enabled===false?'−':a.enabled===true?'+':''} {actionName(a)}</li>)}</ul>{item.response.actions.some(a=>a.type==='interval')&&<p className="mt-2 text-xs leading-5 text-sky-200">{t('agent_interval_note')}</p>}</>:null}{item.response.explain&&<>{item.response.outsideScope&&<p className="mb-3 text-sm leading-6 text-amber-200">{item.response.reading.help}</p>}{item.response.insight?<p className="text-sm leading-6">{item.response.insight.explanation}</p>:item.response.reading.sections.map(section=><div key={section.title} className="mt-2"><h3 className="text-xs font-semibold text-sky-100">{section.title}</h3><p className="mt-1 text-sm leading-6 text-slate-300">{section.text}</p></div>)}<dl className="mt-3 grid grid-cols-2 gap-2">{[...new Set(item.response.insight?.citations??item.response.reading.sections.flatMap(s=>s.keys))].slice(0,8).map(key=><div key={key} className="min-w-0 rounded bg-slate-800/40 p-2"><dt className="text-[10px] text-slate-400">{t('agent_fact_'+key)}</dt><dd className="mt-1 break-words font-mono text-xs">{fact(item.response.snapshot,key)}</dd></div>)}</dl>{item.response.mode==='rules'&&!item.response.outsideScope&&<p className="mt-2 text-[10px] leading-5 text-amber-200">{t('agent_rules_note')}</p>}<p className="mt-2 text-[10px] leading-5 text-slate-400">{item.response.reading.scope}</p></>}
      <details className="mt-3 text-[10px] text-slate-400"><summary className="min-h-7 cursor-pointer">{t('agent_context')}</summary><p translate="no">{item.asset} · {item.interval} · {item.response.snapshot.source}</p><p>{date(item.response.snapshot.asOf)} UTC · {item.response.snapshot.closedCount}</p><p className="break-all">ID: {item.response.snapshot.snapshotId}</p></details></article>)}
     {busy&&<p role="status" className="text-sm text-sky-200">{t('agent_busy')}</p>}{error&&<p role="alert" className="text-xs leading-5 text-amber-200">{t('agent_error')}</p>}<div ref={transcriptEnd}/>
    </div>
    <div className="border-t border-slate-700/50 p-4"><div className="mb-3 flex flex-wrap gap-2">{['agent_analyze','agent_mark','agent_ema','agent_rsi','agent_drop','agent_clear'].map(key=><button key={key} type="button" disabled={busy||!ready} onClick={()=>send(t(key))} className="min-h-9 rounded-lg border border-slate-600/70 px-2 py-1 text-left text-[11px] text-sky-200 disabled:opacity-40">{t(key)}</button>)}</div><form onSubmit={e=>{e.preventDefault();send();}}><label htmlFor="chart-agent-question" className="sr-only">{t('agent_ask')}</label><textarea id="chart-agent-question" value={query} maxLength={600} onChange={e=>setQuery(e.target.value)} placeholder={t('agent_ask')} rows={3} className="w-full resize-y rounded-xl border border-slate-600 bg-slate-950/40 p-3 text-sm"/><div className="mt-2 flex items-center justify-between"><span className="text-[10px] text-slate-500">{query.length}/600</span><button disabled={busy||!ready||!query.trim()} className="min-h-10 rounded-lg bg-sky-600 px-5 text-sm font-semibold text-white disabled:opacity-40">{t('agent_send')} ↑</button></div></form><p className="mt-3 text-[10px] leading-5 text-slate-400">{t('agent_limits')}</p></div>
   </aside>
  </div>
 </main>;
}
