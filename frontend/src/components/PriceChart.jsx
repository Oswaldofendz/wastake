import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import { useTranslation } from 'react-i18next';
import { TradingViewChart,getTVSymbol } from './CandleChart.jsx';
import { fetchOHLCV } from '../services/api.js';
import { getAnalysisType } from '../data/assetCatalog.js';
import { cleanCandles, emaSeries, significantLevels } from '../utils/chartLevels.js';
import {timedCandles} from '../utils/timedCandles.js';
import {DrawingToolbar,DrawingOverlay} from './ChartDrawings.jsx';

const DAYS = { '1D':1,'1S': 7, '1M': 30, '3M': 90, '6M': 180, '1A': 365 };
export function CandleChart({ asset, timeframe = '3M',interval='1d' }) {
  const { t, i18n } = useTranslation();
  const ref = useRef(null);
  const savedRange=useRef(null);
  const [advanced, setAdvanced] = useState(false);
  const isFuture=asset.id.endsWith('=F');
  const showAdvanced=advanced&&!isFuture;
  const [drawings,setDrawings]=useState([]),[drawingPast,setDrawingPast]=useState([]),[tool,setTool]=useState('select'),[selectedDrawing,setSelectedDrawing]=useState(null),[handle,setHandle]=useState(null);
  const levelsOn=drawings.some(d=>d.origin==='computed');
  const changeDrawings=next=>{setDrawingPast(p=>[...p,drawings].slice(-20));setDrawings(next);};
  useEffect(()=>{setDrawings([]);setDrawingPast([]);setSelectedDrawing(null);setTool('select');},[asset.id,interval]);
  const [emaOn, setEmaOn] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshFailed,setRefreshFailed]=useState(false);
  const [retry, setRetry] = useState(0);
  const seconds=interval==='15m'?900:interval==='4h'?14400:86400;
  const levels=useMemo(()=>significantLevels(result?.candles??[],null,Date.now(),seconds),[result,seconds]);
  useEffect(() => {
    let cancelled=false;
    setLoading(true);setResult(null);setError(false);setRefreshFailed(false);
    const load=(initial=false)=>fetchOHLCV(asset.id,getAnalysisType(asset),{days:365,interval}).then(r=>{
      if(cancelled)return;
      if(interval!=='1d'&&r.interval!==interval)throw new Error('Requested intraday interval unavailable');
      const candles=interval==='1d'?cleanCandles(r.candles):timedCandles(r.candles);
      if(candles.length<2)throw new Error('No candles');
      setResult({...r,candles});setRefreshFailed(false);setError(false);
    }).catch(()=>{if(!cancelled){if(initial)setError(true);else setRefreshFailed(true);}}).finally(()=>{if(!cancelled)setLoading(false);});
    load(true);
    const timer=interval==='1d'?null:setInterval(()=>{if(document.visibilityState==='visible')load();},60000);
    return ()=>{cancelled=true;clearInterval(timer);};
  },[asset.id,asset.analysisType,asset.type,interval,retry]);
  useEffect(()=>{
    if(showAdvanced || loading || !ref.current || !result)return;
    const all=result.candles;
    const cutoff=all.at(-1).time-(DAYS[timeframe]??90)*86400;
    const visible=all.filter(c=>c.time>=cutoff);
    const text=getComputedStyle(ref.current).getPropertyValue('--text-primary').trim() || '#cbd5e1';
    const background=getComputedStyle(ref.current).getPropertyValue('--bg-card').trim() || '#111318';
    const node=ref.current;
    const chart=createChart(node,{autoSize:false,width:node.clientWidth,height:node.clientHeight,layout:{background:{type:ColorType.Solid,color:background},textColor:text,fontFamily:'Inter, sans-serif'},
      grid:{vertLines:{visible:false},horzLines:{color:'rgba(128,128,128,0.12)'}},
      rightPriceScale:{borderVisible:false,scaleMargins:{top:0.12,bottom:0.1}},
      timeScale:{borderVisible:false,timeVisible:interval!=='1d',secondsVisible:false},localization:{locale:i18n.language}});
    const close=all.at(-1).close;
    const precision=close>=1?2:Math.min(8,Math.max(4,-Math.floor(Math.log10(close))+2));
    const series=chart.addCandlestickSeries({upColor:'#16b981',downColor:'#f05262',borderVisible:false,wickUpColor:'#16b981',wickDownColor:'#f05262',priceFormat:{type:'price',precision,minMove:10**(-precision)}});
    series.setData(all);
    setHandle({id:crypto.randomUUID(),chart,series,candles:all});
    if(emaOn) [20,50].forEach((period,index)=>{
      const line=chart.addLineSeries({color:index?'#a78bfa':'#38bdf8',lineWidth:1,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false});
      line.setData(emaSeries(all,period).filter(p=>p.time>=cutoff));
    });
    const key=`${asset.type}:${asset.id}:${interval}:${timeframe}`;
    if(savedRange.current?.key===key&&savedRange.current.range)chart.timeScale().setVisibleLogicalRange(savedRange.current.range);
    else if(visible.length>=2)chart.timeScale().setVisibleRange({from:visible[0].time,to:visible.at(-1).time});
    else chart.timeScale().setVisibleLogicalRange({from:all.length-4,to:all.length+1});
    const observer=new ResizeObserver(()=>{const range=chart.timeScale().getVisibleLogicalRange();chart.resize(node.clientWidth,node.clientHeight);if(range)chart.timeScale().setVisibleLogicalRange(range);});observer.observe(node);
    return ()=>{savedRange.current={key,range:chart.timeScale().getVisibleLogicalRange()};observer.disconnect();setHandle(null);chart.remove();};
  },[result,loading,timeframe,interval,showAdvanced,emaOn,i18n.language]);
  const fmt=n=>n.toLocaleString(i18n.language,{maximumFractionDigits:n>=1?2:8});
  const date=time=>interval==='1d'?new Date(time*1000).toLocaleDateString(i18n.language,{timeZone:'UTC'}):new Date(time*1000).toLocaleString(i18n.language,{timeZone:'UTC',dateStyle:'short',timeStyle:'short'});
  return <div className="w-full min-w-0">
    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
      <button type="button" aria-pressed={!showAdvanced} onClick={()=>setAdvanced(false)} className={`min-h-9 rounded border px-3 ${!showAdvanced?'border-sky-500 text-sky-300':'border-slate-600'}`}>{t('chart_clean')}</button>
      {isFuture?<a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(getTVSymbol(asset))}`} target="_blank" rel="noopener noreferrer" className="flex min-h-9 items-center rounded border border-slate-600 px-3 text-sky-300">{t('audit_external_link')}</a>:<button type="button" aria-pressed={advanced} onClick={()=>setAdvanced(true)} className={`min-h-9 rounded border px-3 ${advanced?'border-sky-500 text-sky-300':'border-slate-600'}`}>{t('chart_advanced')}</button>}
      {!showAdvanced && <><button type="button" disabled={!result||!levels.length} onClick={()=>changeDrawings([...drawings.filter(d=>d.origin!=='computed'),...levels.map(l=>({id:crypto.randomUUID(),kind:'horizontal',points:[{time:l.confirmedAt,price:l.price}],label:t('chart_'+l.kind),origin:'computed',reason:t('draw_level_reason'),color:l.kind==='support'?'#34d399':'#fb7185'}))].slice(-30))} className="min-h-9 rounded border border-slate-600 px-2">{t('draw_suggest_levels')}</button><label className="flex items-center gap-1"><input type="checkbox" checked={emaOn} onChange={e=>setEmaOn(e.target.checked)}/><span className="text-sky-400">EMA 20</span> / <span className="text-violet-400">50</span></label></>}
    </div>
    {isFuture&&<p className="mb-2 text-xs leading-5 text-amber-200"><span translate="no">{asset.id}</span> · {t('audit_futures_note')} {t('audit_futures_external')}</p>}
    {showAdvanced?<TradingViewChart asset={asset} timeframe={timeframe} interval={interval}/>:loading?<p role="status" className="p-10 text-center text-sm text-slate-400">{t('loading')}</p>:error?<div role="alert" className="p-8 text-center text-sm"><p>{t(interval==='1d'?'chart_error':'intraday_error')}</p><button className="mt-3 underline" onClick={()=>setRetry(n=>n+1)}>{t('retry')}</button></div>:<>
      <DrawingToolbar tool={tool} setTool={setTool} drawings={drawings} onChange={changeDrawings} onUndo={()=>{setDrawings(drawingPast.at(-1));setDrawingPast(p=>p.slice(0,-1));}} canUndo={!!drawingPast.length}/>
      <div className="relative"><div ref={ref} style={{height:'clamp(340px, 36vw, 500px)',width:'100%'}} aria-label={`${asset.name} · ${timeframe}`} role="img"/><DrawingOverlay handle={handle} drawings={drawings} onChange={changeDrawings} tool={tool} setTool={setTool} selectedId={selectedDrawing} onSelect={setSelectedDrawing}/></div>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400" aria-live="polite">
        <span translate="no">{asset.symbol} · {result?.currency || asset.currency || '—'} · {result?.source}</span>
        {levelsOn && !levels.length && <span>{t('chart_no_levels')}</span>}
      </div>
      <p className="mt-2 text-xs leading-5 text-slate-400">{t(interval==='1d'?'chart_daily_context':'intraday_context',{interval,date:date(result.candles.at(-1).time)})}</p>
      <p className="mt-1 text-xs leading-5 text-slate-400">{t('chart_available_history',{count:result.candles.length,from:date(result.candles[0].time),to:date(result.candles.at(-1).time)})}</p>
      {interval!=='1d'&&<p role="status" className={`mt-1 text-xs leading-5 ${refreshFailed?'text-amber-300':'text-slate-400'}`}>{t(refreshFailed?'intraday_refresh_failed':'intraday_refresh')}{result.retrievedAt&&` · ${new Date(result.retrievedAt).toLocaleTimeString(i18n.language)}`}</p>}
      <p className="mt-1 text-[11px] leading-5 text-slate-400">{t('chart_close',{price:`${fmt(result.candles.at(-1).close)} ${result.currency??''}`,date:date(result.candles.at(-1).time)})}</p>
      {levelsOn&&<p className="mt-1 text-[11px] leading-5 text-slate-400">{t('chart_zone_hint')}</p>}
      {interval==='1d'&&<p className="mt-1 text-[11px] leading-5 text-slate-400">{t('audit_history_cache')}</p>}
      {levelsOn&&<div className="mt-2 grid gap-2 sm:grid-cols-2">{levels.map(l=><div key={l.kind} className={`rounded-lg border p-2 text-xs ${l.kind==='support'?'border-emerald-800/50 text-emerald-300':'border-rose-800/50 text-rose-300'}`}><p className="font-semibold">{t(`chart_${l.kind}`)}: {fmt(l.low)}–{fmt(l.high)} {result?.currency??''}</p><p className="mt-1 text-[11px] text-slate-400">{t('chart_level_evidence',{count:l.touches,date:date(l.confirmedAt),distance:l.distancePct.toLocaleString(i18n.language,{maximumFractionDigits:2})})}</p>{result.candles.at(-1).close>=l.low&&result.candles.at(-1).close<=l.high&&<p className="mt-1 text-[11px] text-amber-300">{t('chart_testing')}</p>}</div>)}</div>}
      <details className="mt-2 text-[11px] text-slate-400"><summary className="cursor-pointer">{t('chart_levels')} · {t('methodology','Método')}</summary><p className="mt-1 leading-5">{t(interval==='1d'?'chart_method':'intraday_method')}</p></details>
      <p className="mt-1 text-[10px] text-slate-500">TradingView Lightweight Charts™ · Copyright © 2023 TradingView, Inc. <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="underline">TradingView</a></p>
    </>}
  </div>;
}
