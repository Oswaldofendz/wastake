import {CHART_INTERVALS,intervalInfo} from '../utils/chartIntervals.js';
import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {AssetSearch} from '../components/AssetSearch.jsx';
import {AgentCanvas} from '../components/AgentCanvas.jsx';
import {DrawingToolbar} from '../components/ChartDrawings.jsx';
import {fetchChartSnapshot,askChartAgent,searchAssets} from '../services/api.js';
import {getAnalysisType} from '../data/assetCatalog.js';
import {formatQuote} from '../utils/panoramaAnalysis.js';
import {mergeAutomaticAnalysis,chartContextMatches} from '../utils/automaticChart.js';
import {initialWorkspace,applyChartActions} from '../utils/chartWorkspace.js';

const starter={id:'bitcoin',name:'Bitcoin',symbol:'BTC',type:'crypto'};
function readWatchlist(){try{return JSON.parse(localStorage.getItem('wastake_chart_watchlist_v1')||'[]').filter(a=>a&&typeof a.id==='string'&&typeof a.symbol==='string'&&['stock','crypto','etf','bond','forex','index','commodity'].includes(a.type)).slice(0,20);}catch{return [];}}
function AlbertoIcon({busy}){return <svg viewBox="0 0 96 80" className={`alberto-bull h-16 w-20 shrink-0 ${busy?'is-thinking':''}`} aria-hidden="true"><ellipse cx="48" cy="72" rx="29" ry="4" fill="#071c22"/><g className="bull-head"><path d="M24 32C7 33 6 13 11 7c-1 13 11 13 19 14m42 11c17 1 18-19 13-25 1 13-11 13-19 14" fill="#ffdda2" stroke="#ca9d60" strokeWidth="2"/><path d="M26 29 13 25l4 15 13 3m40-14 13-4-4 15-13 3" fill="#377d7b"/><path d="M25 26q23-20 46 0l-3 30q-20 23-40 0Z" fill="#1e575a" stroke="#63c9bb" strokeWidth="2"/><path d="m35 16 7-7 4 8 8-9 5 12" fill="#66d4bb"/><path d="m32 36 10 3m12 0 10-3" stroke="#c0fbe6" strokeWidth="3" strokeLinecap="round"/><g className="bull-eyes" fill="#fff6c9"><ellipse cx="37" cy="42" rx="3" ry="4"/><ellipse cx="59" cy="42" rx="3" ry="4"/></g><ellipse cx="48" cy="59" rx="19" ry="11" fill="#58aa9b"/><ellipse cx="39" cy="58" rx="3" ry="2" fill="#14383f"/><ellipse cx="57" cy="58" rx="3" ry="2" fill="#14383f"/><path d="M41 65q7 4 14 0" fill="none" stroke="#14383f" strokeWidth="2" strokeLinecap="round"/></g></svg>;}

export default function AgentCharts({marketData}){
 const {t,i18n}=useTranslation(),lang=(i18n.resolvedLanguage||i18n.language).split('-')[0];
 const [asset,setAsset]=useState(starter),[venue,setVenue]=useState('auto'),[timeline,setTimeline]=useState({current:initialWorkspace(),past:[]});
 const workspace=timeline.current;
 const [automatic,setAutomatic]=useState(true),[refreshFailed,setRefreshFailed]=useState(false);
 const automaticSeen=useRef(''),busyRef=useRef(false);
 const [snapshot,setSnapshot]=useState(null),[loading,setLoading]=useState(true),[dataError,setDataError]=useState(false),[reload,setReload]=useState(0);
 const [comparison,setComparison]=useState(null),[comparisonError,setComparisonError]=useState(false),[comparisonLoading,setComparisonLoading]=useState(false);
 const [messages,setMessages]=useState([]),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(false);
 const [tool,setTool]=useState('select'),[selectedId,setSelectedId]=useState(null),[picker,setPicker]=useState(null),[pickerQuery,setPickerQuery]=useState('');
 const [chatOpen,setChatOpen]=useState(()=>window.innerWidth>=760),[studyFilter,setStudyFilter]=useState(''),[railTab,setRailTab]=useState('chat'),[watchlist,setWatchlist]=useState(readWatchlist);
 const pickerNode=useRef(null),canvas=useRef(null),controller=useRef(null),currentContext=useRef(''),messageSequence=useRef(0),log=useRef(null);
 busyRef.current=busy;
 const contextKey=`${getAnalysisType(asset)}:${asset.id}:${workspace.interval}:${venue}:${lang}`;currentContext.current=contextKey;
 const matchesSnapshot=chartContextMatches(snapshot,{id:asset.id,type:getAnalysisType(asset),interval:workspace.interval,venue});
 const fmt=n=>Number.isFinite(n)?n.toLocaleString(i18n.language,{maximumFractionDigits:Math.abs(n)<1?8:2}):'—';
 const date=(stamp,interval=workspace.interval)=>new Date(stamp*1000).toLocaleString(i18n.language,{timeZone:'UTC',dateStyle:'short',...(intervalInfo(interval)?.seconds>=86400?{}:{timeStyle:'short'})});
 const quoteKeys=['close','low','high','ema20','ema50','support','resistance','atr','vwap','fvgLow','fvgHigh','liquidityLow','liquidityHigh','donchian','keltner'];
 const fact=(data,key)=>quoteKeys.includes(key)?formatQuote(data.facts[key],data.currency,i18n.language):`${fmt(data.facts[key])}${['change','drawdown','atrPercent'].includes(key)&&Number.isFinite(data.facts[key])?'%':''}`;
 useEffect(()=>{
   let active=true;controller.current?.abort();setBusy(false);setLoading(true);setDataError(false);setRefreshFailed(false);setSnapshot(null);setSelectedId(null);setTool('select');
   fetchChartSnapshot(asset,getAnalysisType(asset),workspace.interval,venue).then(data=>{
     if(active){if(data.id!==asset.id||data.interval!==workspace.interval||!Array.isArray(data.candles)||!data.snapshotId)throw new Error('Chart context unavailable');setSnapshot(data);}
   }).catch(()=>{if(active)setDataError(true);}).finally(()=>{if(active)setLoading(false);});
   return()=>{active=false;controller.current?.abort();};
 },[asset.id,asset.type,workspace.interval,venue,reload]);
 useEffect(()=>{controller.current?.abort();setBusy(false);setError(false);},[lang]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 useEffect(()=>{
   if(!picker||!pickerNode.current)return;
   const node=pickerNode.current,previous=document.activeElement;
   node.querySelector(picker==='asset'?'input':'button')?.focus();
   const key=e=>{if(e.key==='Escape'){setPicker(null);return;}if(e.key!=='Tab')return;const controls=[...node.querySelectorAll('button,input,select,textarea,a[href],[tabindex="0"]')].filter(n=>!n.disabled&&n.getClientRects().length);const first=controls[0],last=controls.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}};
   node.addEventListener('keydown',key);return()=>{node.removeEventListener('keydown',key);previous?.focus?.();};
 },[picker]);
 useEffect(()=>{if(log.current&&(messages.length||busy))log.current.scrollTop=log.current.scrollHeight;},[messages,busy]);
 useEffect(()=>{
   let active=true;setComparison(null);setComparisonError(false);
   const target=workspace.compare;if(!target){setComparisonLoading(false);return;}
   setComparisonLoading(true);
   fetchChartSnapshot(target.asset,getAnalysisType(target.asset),workspace.interval,target.venue??'auto').then(data=>{if(active)setComparison(data);}).catch(()=>{if(active)setComparisonError(true);}).finally(()=>{if(active)setComparisonLoading(false);});
   return()=>{active=false;};
 },[workspace.compare,workspace.interval,reload]);
 function commit(next){setTimeline(p=>({past:[...p.past,p.current].slice(-20),current:next}));}
 function undo(){setTimeline(p=>p.past.length?{current:p.past.at(-1),past:p.past.slice(0,-1)}:p);setSelectedId(null);setTool('select');}
 function operate(actions){
   if(actions.some(a=>a.type==='undo')){undo();return;}
   setTimeline(p=>{let next=applyChartActions(p.current,actions);if(next.interval!==p.current.interval)next={...next,drawings:[],compare:null};return {past:[...p.past,p.current].slice(-20),current:next};});
   if(actions.some(a=>['draw','clear','reset'].includes(a.type)))setSelectedId(null);
 }
 function selectAsset(next){controller.current?.abort();messageSequence.current++;currentContext.current='';setAsset(next);setVenue('auto');setMessages([]);setQuery('');setError(false);setSelectedId(null);setTool('select');setTimeline({current:initialWorkspace(),past:[]});setPicker(null);}
 function compareAsset(next,source='auto'){commit({...workspace,compare:{asset:next,venue:source}});setPicker(null);setTool('select');setSelectedId(null);}
 function saveAsset(){setWatchlist(previous=>{const found=previous.some(a=>a.id===asset.id&&a.type===asset.type);const list=found?previous.filter(a=>a.id!==asset.id||a.type!==asset.type):[...previous,{id:asset.id,type:asset.type,analysisType:asset.analysisType,name:asset.name,symbol:asset.symbol}].slice(-20);try{localStorage.setItem('wastake_chart_watchlist_v1',JSON.stringify(list));}catch{}return list;});}
 async function send(text=query,focusId=selectedId,auto=false){
   const message=text.trim();if(!message||busy||!matchesSnapshot)return;
   const captured=contextKey,request=++messageSequence.current;
   controller.current?.abort();controller.current=new AbortController();
   setMessages(p=>[...p,{role:'user',text:message,context:captured,id:`u${request}`,asset:asset.symbol,interval:workspace.interval}].slice(-30));setQuery('');setBusy(true);setError(false);setRailTab('chat');if(!auto)setChatOpen(true);
   try{
     const history=auto?[]:messages.filter(m=>m.context===captured).slice(-4).map(m=>({role:m.role,text:m.role==='user'?m.text:m.response.insight?.explanation??m.response.reading.sections.map(s=>s.text).join(' ')}));
     const response=await askChartAgent({id:asset.id,type:getAnalysisType(asset),interval:workspace.interval,venue,message,lang:['es','pt','en'].includes(lang)?lang:'en',history,context:{drawings:auto?[]:workspace.drawings,selectedId:auto?null:focusId}},controller.current.signal);
     if(currentContext.current!==captured||request!==messageSequence.current)return;
     if(response.snapshot?.id!==asset.id||response.snapshot.interval!==workspace.interval||!response.reading||!Array.isArray(response.actions))throw new Error('Invalid context');
     setSnapshot(response.snapshot);
     const actions=response.actions.filter(a=>a.type!=='compare'),requests=response.actions.filter(a=>a.type==='compare');let choices=[];
     for(const action of requests.slice(0,1)){
       if(action.venue){setTimeline(p=>({past:[...p.past,p.current].slice(-20),current:{...p.current,compare:{asset,venue:action.venue}}}));continue;}
       const matches=marketData.allAssets.filter(a=>[a.id,a.symbol,a.name].some(v=>v?.toLowerCase()===action.query.toLowerCase()));
       if(matches.length===1){setTimeline(p=>({past:[...p.past,p.current].slice(-20),current:{...p.current,compare:{asset:matches[0],venue:'auto'}}}));continue;}
       const result=await searchAssets(action.query);if(currentContext.current!==captured||request!==messageSequence.current)return;choices=(result.results??result).slice(0,6);
     }
     if(auto)setTimeline(p=>({past:[...p.past,p.current].slice(-20),current:mergeAutomaticAnalysis(p.current,actions)}));
     else if(actions.length)operate(actions);
     setMessages(p=>[...p,{role:'assistant',response:{...response,actions,comparisonRequested:requests[0]??null},choices,context:captured,id:`a${request}`,asset:asset.symbol,interval:workspace.interval,automatic:auto}].slice(-30));
   }catch(e){if(e.name!=='AbortError'&&currentContext.current===captured)setError(true);}
   finally{if(currentContext.current===captured&&request===messageSequence.current)setBusy(false);}
 }
 useEffect(()=>{
   if(!matchesSnapshot||loading||dataError||busy||!automatic)return;
   const key=`${contextKey}:${snapshot.snapshotId}`;
   if(automaticSeen.current===key)return;
   automaticSeen.current=key;
   send(`${t('studio_setup')}; ${t('agent_rsi')}${workspace.fvg?'; '+t('ui_imbalance_prompt'):''}${workspace.liquidity?'; '+t('cycle_liquidity_prompt'):''}`,null,true);
 },[snapshot?.snapshotId,contextKey,loading,dataError,busy,automatic]);
 useEffect(()=>{
   let active=true,inFlight=false;
   const refresh=async()=>{
     if(document.visibilityState!=='visible'||busyRef.current||inFlight)return;
     inFlight=true;
     try{const data=await fetchChartSnapshot(asset,getAnalysisType(asset),workspace.interval,venue);if(active&&data.id===asset.id&&data.interval===workspace.interval&&data.snapshotId){setSnapshot(data);setRefreshFailed(false);}}
     catch{if(active)setRefreshFailed(true);}finally{inFlight=false;}
   };
   const timer=setInterval(refresh,60000);
   document.addEventListener('visibilitychange',refresh);
   return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};
 },[asset.id,asset.type,workspace.interval,venue]);
 const ready=matchesSnapshot&&!loading&&!dataError,selected=workspace.drawings.find(d=>d.id===selectedId),isSaved=watchlist.some(a=>a.id===asset.id&&a.type===asset.type);
 const actionName=a=>['ema','sma'].includes(a.type)?`${a.type.toUpperCase()} ${a.period}`:a.type==='draw'?`${t('studio_objects')} · ${a.drawings.length}`:a.type==='interval'?a.value:a.type==='focus'?t(a.value==='drop'?'agent_drop':'agent_recent'):a.type==='liquidity'?t('cycle_liquidity'):a.type==='fvg'?'FVG · imbalance':a.type==='clear'?t('agent_clear'):a.type==='undo'?t('agent_undo'):a.type==='volume'?t('agent_volume'):a.type==='bollinger'?'Bollinger':a.type==='rsi'?'RSI':a.type==='macd'?'MACD':a.type==='uncompare'?t('studio_compare_remove'):['atr','adx','stoch','obv','vwap','cci','mfi','williams','roc','cmf','donchian','keltner'].includes(a.type)?a.type.toUpperCase():t('studio_objects');
 return <main className="studio-shell" aria-label={t('studio_name')}>
   <header className="studio-topbar"><label className="flex items-center gap-1 px-2 text-[11px] text-teal-200"><input type="checkbox" checked={automatic} onChange={e=>setAutomatic(e.target.checked)}/>{t('studio_autopilot')}</label>
     <button type="button" onClick={()=>{setPicker('asset');setPickerQuery('');}} className="flex min-h-10 min-w-0 items-center gap-2 rounded px-2 text-left hover:bg-slate-800" aria-label={t('search_assets')}><span className="text-teal-300">⌕</span><span translate="no" className="truncate text-sm font-semibold">{asset.symbol}</span><span className="text-xs text-slate-500">⌄</span></button>
     {ready&&<span title={t('agent_fact_close')} className="font-mono text-xs text-slate-300">{formatQuote(snapshot.facts.close,snapshot.currency,i18n.language)}</span>}
     <select aria-label={t('candle_interval')} value={workspace.interval} onChange={e=>operate([{type:'interval',value:e.target.value}])} className="min-h-10 rounded border border-slate-700 bg-transparent px-2 text-xs">{CHART_INTERVALS.map(x=><option key={x.id} value={x.id}>{x.id==='1w'?t('cycle_week'):x.id==='1mo'?t('cycle_month'):x.id==='1d'?t('candle_daily'):x.label}</option>)}</select>
     <select aria-label={t('studio_venue')} value={venue} onChange={e=>{setVenue(e.target.value);setTimeline(p=>({current:{...initialWorkspace(),interval:p.current.interval},past:[]}));}} className="min-h-10 max-w-28 rounded border border-slate-700 bg-transparent px-1 text-xs"><option value="auto">{t('studio_auto')}</option>{getAnalysisType(asset)==='crypto'&&<><option>Kraken</option><option>Coinbase</option></>}</select>
     <button type="button" onClick={()=>{setPicker('compare');setPickerQuery('');}} className="min-h-10 rounded px-2 text-xs text-sky-200">⊕ {t('studio_compare')}</button>
     <details className="studio-popover"><summary className="min-h-10 cursor-pointer rounded px-2 py-3 text-xs">ƒ {t('studio_indicators')}</summary><div className="studio-menu grid gap-2"><input aria-label={t('cycle_find_indicator')} placeholder={t('cycle_find_indicator')} value={studyFilter} onChange={e=>setStudyFilter(e.target.value)} className="min-h-10 rounded border border-slate-600 bg-transparent px-2 text-xs"/>{[['rsi','RSI 14'],['macd','MACD'],['bollinger','Bollinger 20'],['volume',t('volume')],['atr','ATR 14'],['adx','ADX / DMI 14'],['stoch','Stochastic 14 / 3'],['obv','OBV'],['vwap','VWAP · UTC'],['cci','CCI 20'],['mfi','MFI 14'],['williams','Williams %R 14'],['roc','ROC 12'],['cmf','Chaikin Money Flow 20'],['donchian','Donchian 20'],['keltner','Keltner 20 / ATR10 ×2']].filter(([key,label])=>(key+' '+label).toLowerCase().includes(studyFilter.toLowerCase())).map(([key,label])=><label key={key} className="flex min-h-9 items-center gap-2 text-xs"><input type="checkbox" checked={workspace[key]} onChange={e=>operate([{type:key,enabled:e.target.checked}])}/>{label}</label>)}{['ema','sma'].flatMap(kind=>[20,50,200].filter(period=>(kind+' '+period).toLowerCase().includes(studyFilter.toLowerCase())).map(period=><label key={kind+period} className="flex min-h-9 items-center gap-2 text-xs"><input type="checkbox" checked={workspace[kind].includes(period)} onChange={e=>operate([{type:kind,period,enabled:e.target.checked}])}/>{kind.toUpperCase()} {period}</label>))}<label className="flex min-h-10 items-center gap-2 text-xs text-teal-200"><input type="checkbox" checked={workspace.fvg} disabled={!ready||busy} onChange={e=>{if(e.target.checked)send(t('ui_imbalance_prompt'));else operate([{type:'removeFvg'}]);}}/>◫ FVG · imbalance</label><label className="flex min-h-10 items-center gap-2 text-xs text-amber-200"><input type="checkbox" checked={workspace.liquidity} disabled={!ready||busy} onChange={e=>{if(e.target.checked)send(t('cycle_liquidity_prompt'));else operate([{type:'removeLiquidity'}]);}}/>{t('cycle_liquidity')}</label></div></details>
     <button type="button" onClick={saveAsset} className="min-h-10 min-w-9 text-amber-300" title={t(isSaved?'studio_remove':'studio_save')} aria-label={t(isSaved?'studio_remove':'studio_save')}>{isSaved?'★':'☆'}</button>
     <span className="flex-1"/><button type="button" disabled={loading} onClick={()=>setReload(n=>n+1)} aria-label={t('agent_refresh')} title={t('agent_refresh')} className="min-h-10 min-w-9 text-slate-400">↻</button><button type="button" disabled={!ready} onClick={()=>canvas.current?.exportImage().catch(()=>setError(true))} aria-label={t('agent_export')} title={t('agent_export')} className="min-h-10 min-w-9 text-slate-400">↓</button><button type="button" aria-label={t('studio_chat_toggle')} onClick={()=>setChatOpen(v=>!v)} className="min-h-10 rounded border border-teal-900 px-3 text-xs text-teal-200">✦ Alberto</button>
   </header>
   <div className={`studio-layout ${chatOpen?'':'studio-collapsed'}`}>
     <section className="studio-chart" aria-label={t('chart_ai')}>
       <div className="flex shrink-0 flex-wrap items-center justify-between gap-1 border-b border-slate-800 px-2"><DrawingToolbar tool={tool} setTool={setTool} drawings={workspace.drawings} onChange={next=>commit({...workspace,drawings:next})} onUndo={undo} canUndo={!!timeline.past.length} disabled={!ready||!!workspace.compare}/><div className="flex gap-1"><button type="button" title={t('agent_recent')} aria-label={t('agent_recent')} onClick={()=>operate([{type:'focus',value:'recent'}])} className="min-h-9 px-2 text-xs text-slate-400">◎</button><button type="button" title={t('agent_all')} aria-label={t('agent_all')} onClick={()=>operate([{type:'focus',value:'all'}])} className="min-h-9 px-2 text-xs text-slate-400">↔</button><button type="button" title={t('studio_reset')} aria-label={t('studio_reset')} onClick={()=>operate([{type:'reset'}])} className="min-h-9 px-2 text-xs text-slate-400">⟲</button></div></div>
       {workspace.compare&&<div className="flex shrink-0 items-center justify-between gap-2 bg-purple-950/20 px-3 py-2 text-xs"><span translate="no">{asset.symbol} · {snapshot?.source} / {workspace.compare.asset.symbol} · {comparison?.source??workspace.compare.venue}</span><button type="button" onClick={()=>operate([{type:'uncompare'}])} className="text-purple-200">× {t('studio_compare_remove')}</button></div>}
       {comparisonLoading&&<p role="status" className="px-3 py-1 text-xs text-purple-200">{t('loading')}</p>}{comparisonError&&<p role="status" className="px-3 py-2 text-xs text-amber-200">{t('studio_compare_missing')}</p>}
       {loading?<p role="status" className="grid min-h-80 flex-1 place-items-center text-sm text-slate-400">{t('agent_loading')}</p>:dataError?<div role="alert" className="grid min-h-80 flex-1 place-items-center p-5 text-center text-sm text-amber-200"><div>{t('studio_unavailable')}<button type="button" onClick={()=>setReload(n=>n+1)} className="mt-3 block w-full text-sky-200 underline">{t('retry')}</button></div></div>:snapshot&&<AgentCanvas ref={canvas} snapshot={snapshot} asset={asset} workspace={workspace} comparison={comparison} tool={tool} setTool={setTool} onDrawings={next=>commit({...workspace,drawings:next})} selectedId={selectedId} onSelect={setSelectedId}/>}
       <div className="studio-status"><span className="text-teal-300">{t(refreshFailed?'studio_refresh_failed':'studio_refresh_policy')}{snapshot?.retrievedAt&&` · ${new Date(snapshot.retrievedAt).toLocaleTimeString(i18n.language)}`}</span><span translate="no">{asset.symbol} · {snapshot?.source??'—'} · {snapshot?.currency??'—'}</span><span>{ready?`${date(snapshot.asOf)} UTC · ${snapshot.closedCount} ${t('studio_closed_bars')}`:t('loading')}</span>{ready&&<span>RSI {fmt(snapshot.facts.rsi)} · {t('studio_score')} {fmt(snapshot.facts.score)}/10</span>}</div>
     </section>
     <aside className="studio-rail" data-open={chatOpen} aria-label="Alberto">
       <div className="flex shrink-0 items-center gap-2 border-b border-slate-800 px-3 py-2"><AlbertoIcon busy={busy}/><div className="flex-1"><h1 className="text-sm font-semibold text-teal-100">Alberto</h1><p className="text-[10px] text-slate-400">{t('studio_tagline')}</p></div><button type="button" onClick={()=>{controller.current?.abort();messageSequence.current++;setMessages([]);setBusy(false);setError(false);}} aria-label={t('studio_new')} title={t('studio_new')} className="min-h-9 min-w-8 text-slate-400">＋</button><button type="button" onClick={()=>setChatOpen(false)} aria-label={t('draw_close')} className="min-h-9 min-w-8 text-slate-400">×</button></div>
       <div className="flex shrink-0 border-b border-slate-800 px-2">{[['chat',t('studio_chat')],['objects',`${t('studio_objects')} · ${workspace.drawings.length}`],['watch',t('studio_watchlist')]].map(([id,label])=><button type="button" key={id} aria-pressed={railTab===id} onClick={()=>setRailTab(id)} className={`min-h-10 flex-1 border-b px-1 text-[11px] ${railTab===id?'border-teal-400 text-teal-200':'border-transparent text-slate-500'}`}>{label}</button>)}</div>
       {railTab==='chat'?<>
         <div ref={log} role="log" aria-live="polite" aria-label="Alberto · chat" className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
           {!messages.length&&<div className="studio-intro"><p className="text-sm leading-6 text-slate-300">{t('studio_welcome')}</p><div className="mt-4 flex flex-col items-start gap-2">{['studio_setup','cycle_liquidity_prompt','ui_imbalance_prompt','studio_trend','agent_ema','agent_rsi','studio_fib','agent_drop'].map(key=><button type="button" key={key} disabled={!ready||busy} onClick={()=>send(t(key))} className="min-h-9 rounded-xl border border-slate-700 px-3 py-2 text-left text-xs text-slate-300 hover:border-teal-700 disabled:opacity-40">{t(key)}</button>)}</div></div>}
           {messages.map(item=>item.role==='user'?<div key={item.id} className="ml-6 rounded-xl bg-slate-800/60 p-3"><p className="mb-1 text-[9px] text-slate-500" translate="no">{item.asset} · {item.interval}</p><p className="break-words text-sm leading-6">{item.text}</p></div>:<article key={item.id} className="border-l-2 border-teal-800 pl-3">
             <p className="mb-2 text-[9px] text-teal-400">{t(item.response.insight?'agent_ai':item.response.planner==='model'?'studio_plan_ai':item.response.explain?'agent_rules':'agent_commands')}{item.response.provider&&` · ${item.response.provider}`}</p>
             {item.response.insight?<p className="text-sm leading-6 text-slate-200">{item.response.insight.explanation}</p>:item.response.explain&&item.response.reading.sections.map(section=><div key={section.title} className="mb-2"><p className="text-[11px] font-semibold text-slate-300">{section.title}</p><p className="mt-1 text-xs leading-6 text-slate-400">{section.text}</p></div>)}
             {item.response.outsideScope&&<p className="mt-2 text-xs leading-5 text-amber-200">{t('studio_scope')}</p>}
             {!!item.response.annotations?.length&&<ul className="mt-3 space-y-2">{item.response.annotations.map(mark=><li key={mark.id}><button type="button" disabled={!workspace.drawings.some(d=>d.id===mark.id)} onClick={()=>{setSelectedId(mark.id);setTool('select');}} className="w-full rounded-lg border border-teal-900/60 bg-teal-950/20 p-2 text-left text-xs disabled:opacity-40"><span className="font-semibold text-teal-200">⌖ {mark.label}</span><span className="mt-1 block text-[11px] leading-5 text-slate-400">{mark.reason}</span></button></li>)}</ul>}
             {!!item.response.actions.filter(a=>a.type!=='draw').length&&<div className="mt-2 flex flex-wrap gap-1">{item.response.actions.filter(a=>a.type!=='draw').map((a,i)=><span key={i} className="rounded border border-slate-700 px-2 py-1 text-[10px] text-sky-200">{a.enabled===false?'−':a.enabled===true?'+':''} {actionName(a)}</span>)}</div>}
             {item.response.comparisonRequested&&<p className="mt-2 text-xs text-purple-200">{t('studio_compare')} · <span translate="no">{item.response.comparisonRequested.venue??item.response.comparisonRequested.query}</span></p>}{item.response.partial&&<p className="mt-2 text-xs text-amber-200">{t('studio_partial')}</p>}
             {item.response.actions.some(a=>a.type==='interval')&&<p className="mt-2 text-xs leading-5 text-sky-200">{t('agent_interval_note')}</p>}
             {!!item.choices.length&&<div className="mt-3"><p className="text-xs text-slate-400">{t('studio_compare_pick')}</p>{item.choices.map(choice=><button type="button" key={`${choice.type}:${choice.id}`} onClick={()=>compareAsset(choice)} className="mt-1 block min-h-9 w-full rounded border border-slate-700 px-2 text-left text-xs" translate="no">{choice.name} · {choice.symbol} · {choice.source}</button>)}</div>}
             {item.response.explain&&<dl className="mt-3 grid grid-cols-2 gap-2">{[...new Set(/imbalance|fvg|desequilibri/i.test(item.response.reading.sections[0]?.title??'')?['fvgCount','fvgBullish','fvgBearish','fvgLow','fvgHigh']:item.response.insight?.citations??item.response.reading.sections[0]?.keys??['close','score','rsi','atrPercent'])].slice(0,5).map(key=><div key={key}><dt className="text-[9px] text-slate-500">{t('agent_fact_'+key)}</dt><dd className="mt-1 font-mono text-xs text-slate-300">{fact(item.response.snapshot,key)}</dd></div>)}</dl>}
             {item.response.explain&&!item.response.insight&&!item.response.outsideScope&&<p className="mt-2 text-[10px] leading-5 text-amber-200">{t('studio_limited')}</p>}
             <details className="mt-2 text-[9px] text-slate-500"><summary className="min-h-7 cursor-pointer">{t('agent_context')}</summary><p translate="no">{item.asset} · {item.interval} · {item.response.snapshot.source}</p><p>{date(item.response.snapshot.asOf,item.interval)} UTC · {item.response.snapshot.snapshotId}</p></details>
           </article>)}
           {busy&&<p role="status" className="animate-pulse text-xs leading-5 text-teal-200">{t('studio_working')}</p>}{error&&<p role="alert" className="text-xs leading-5 text-amber-200">{t('agent_error')}</p>}
         </div>
         <form onSubmit={e=>{e.preventDefault();send();}} className="shrink-0 border-t border-slate-800 p-3"><label htmlFor="chart-agent-question" className="sr-only">{t('studio_why_placeholder')}</label><div className="rounded-xl border border-slate-700 bg-slate-900/30 focus-within:border-teal-700"><textarea id="chart-agent-question" value={query} maxLength={600} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}}} placeholder={t('studio_why_placeholder')} rows={2} className="w-full resize-none bg-transparent p-3 text-xs leading-5 outline-none"/><div className="flex items-center justify-between px-3 pb-2"><span className="text-[9px] text-slate-600">{query.length}/600</span><button type="submit" disabled={busy||!ready||!query.trim()} aria-label={t('agent_send')} className="min-h-8 min-w-9 rounded-lg bg-teal-500 font-semibold text-black disabled:opacity-30">↑</button></div></div><p className="mt-2 text-[9px] leading-4 text-slate-500">{t('agent_limits')}</p></form>
       </>:railTab==='objects'?<div className="min-h-0 flex-1 overflow-y-auto p-3">{workspace.drawings.length?workspace.drawings.map(mark=><div key={mark.id} className="mb-3 rounded-lg border border-slate-700 p-3"><button type="button" onClick={()=>{setSelectedId(mark.id);setTool('select');}} className="min-h-9 text-left text-sm font-semibold text-teal-200">⌖ {mark.label}</button><p className="mt-1 text-xs leading-5 text-slate-400">{mark.origin==='manual'?t('draw_manual_reason'):mark.reason}</p><div className="mt-2 flex gap-3"><button type="button" disabled={busy||!ready} onClick={()=>{setSelectedId(mark.id);send(`${t('studio_explain_mark')}: ${mark.label}`,mark.id);}} className="min-h-8 text-[11px] text-sky-200">{t('studio_explain_mark')}</button><button type="button" onClick={()=>operate([{type:'removeDrawing',id:mark.id}])} className="min-h-8 text-[11px] text-rose-300">{t('agent_delete')}</button></div></div>):<p className="text-sm leading-6 text-slate-400">{t('studio_no_objects')}</p>}</div>:<div className="min-h-0 flex-1 overflow-y-auto p-3"><button type="button" onClick={saveAsset} className="mb-3 min-h-10 rounded border border-slate-700 px-3 text-xs text-amber-200">★ {t(isSaved?'studio_remove':'studio_save')}</button>{watchlist.length?watchlist.map(a=><button type="button" key={`${a.type}:${a.id}`} onClick={()=>selectAsset(a)} className="mb-2 block min-h-11 w-full rounded border border-slate-800 p-3 text-left text-sm" translate="no">{a.name} · {a.symbol}</button>):<p className="text-xs leading-6 text-slate-400">{t('studio_watch_empty')}</p>}</div>}
       <details className="shrink-0 border-t border-slate-800 px-3 py-1 text-[10px] text-slate-500"><summary className="min-h-8 cursor-pointer py-2">{t('studio_help')}</summary><p className="mb-2 leading-5">{t('studio_help_text')}</p><p className="mb-2 leading-5">{t('agent_privacy')}</p><p className="mb-2 leading-5">{t('studio_scope')}</p></details>
     </aside>
   </div>
   {picker&&<div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-4 pt-24" onPointerDown={e=>{if(e.target===e.currentTarget)setPicker(null);}}><section ref={pickerNode} role="dialog" aria-modal="true" aria-label={t(picker==='compare'?'studio_compare':'search_assets')} className="w-full max-w-xl rounded-2xl border border-slate-600 bg-[var(--bg-card)] p-4"><div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">{t(picker==='compare'?'studio_compare':'search_assets')}</h2><button type="button" onClick={()=>setPicker(null)} aria-label={t('draw_close')} className="min-h-10 min-w-10">×</button></div>{picker==='compare'&&getAnalysisType(asset)==='crypto'&&<div className="mt-4 flex flex-wrap gap-2">{['Kraken','Coinbase'].map(source=><button type="button" key={source} onClick={()=>compareAsset(asset,source)} className="min-h-10 rounded border border-purple-800 px-3 text-xs text-purple-200" translate="no">{asset.symbol} · {source}</button>)}</div>}<AssetSearch query={pickerQuery} onQueryChange={setPickerQuery} onSelect={picker==='compare'?compareAsset:selectAsset} catalogueAssets={marketData.allAssets}/><p className="mt-4 text-[10px] leading-5 text-slate-400">{t(picker==='compare'?'studio_compare_note':'agent_chart_note')}</p></section></div>}
 </main>;
}
