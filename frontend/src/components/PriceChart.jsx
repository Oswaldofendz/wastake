import { useEffect, useRef, useState, useMemo } from 'react';
import { createChart, ColorType, LineStyle } from 'lightweight-charts';
import { useTranslation } from 'react-i18next';
import { TradingViewChart,getTVSymbol } from './CandleChart.jsx';
import { fetchOHLCV } from '../services/api.js';
import { getAnalysisType } from '../data/assetCatalog.js';
import { cleanCandles, emaSeries, significantLevels } from '../utils/chartLevels.js';

const DAYS = { '1S': 7, '1M': 30, '3M': 90, '6M': 180, '1A': 365 };
export function CandleChart({ asset, timeframe = '3M' }) {
  const { t, i18n } = useTranslation();
  const ref = useRef(null);
  const [advanced, setAdvanced] = useState(false);
  const isFuture=asset.id.endsWith('=F');
  const showAdvanced=advanced&&!isFuture;
  const [levelsOn, setLevelsOn] = useState(true);
  const [emaOn, setEmaOn] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const levels=useMemo(()=>significantLevels(result?.candles??[]),[result]);
  useEffect(() => {
    let cancelled=false;
    setLoading(true);setResult(null);setError(false);
    fetchOHLCV(asset.id,getAnalysisType(asset),{days:365}).then(r=>{
      if(cancelled)return;
      const candles=cleanCandles(r.candles);
      if(candles.length<2)throw new Error('No candles');
      setResult({...r,candles});
    }).catch(()=>{if(!cancelled)setError(true);}).finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[asset.id,asset.analysisType,asset.type,retry]);
  useEffect(()=>{
    if(showAdvanced || loading || !ref.current || !result)return;
    const all=result.candles;
    const cutoff=all.at(-1).time-(DAYS[timeframe]??90)*86400;
    const visible=all.filter(c=>c.time>=cutoff);
    const text=getComputedStyle(ref.current).getPropertyValue('--text-primary').trim() || '#cbd5e1';
    const background=getComputedStyle(ref.current).getPropertyValue('--bg-card').trim() || '#111318';
    const chart=createChart(ref.current,{autoSize:true,layout:{background:{type:ColorType.Solid,color:background},textColor:text,fontFamily:'Inter, sans-serif'},
      grid:{vertLines:{visible:false},horzLines:{color:'rgba(128,128,128,0.12)'}},
      rightPriceScale:{borderVisible:false,scaleMargins:{top:0.12,bottom:0.1}},
      timeScale:{borderVisible:false,timeVisible:false},localization:{locale:i18n.language}});
    const close=all.at(-1).close;
    const precision=close>=1?2:Math.min(8,Math.max(4,-Math.floor(Math.log10(close))+2));
    const series=chart.addCandlestickSeries({upColor:'#16b981',downColor:'#f05262',borderVisible:false,wickUpColor:'#16b981',wickDownColor:'#f05262',priceFormat:{type:'price',precision,minMove:10**(-precision)}});
    series.setData(visible);
    if(emaOn) [20,50].forEach((period,index)=>{
      const line=chart.addLineSeries({color:index?'#a78bfa':'#38bdf8',lineWidth:1,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false});
      line.setData(emaSeries(all,period).filter(p=>p.time>=cutoff));
    });
    if(levelsOn)levels.forEach(level=>{
      const start=Math.max(level.confirmedAt,visible[0].time);
      const line=chart.addLineSeries({color:level.kind==='support'?'#34d399':'#fb7185',lineWidth:1,lineStyle:LineStyle.Dashed,priceLineVisible:false,lastValueVisible:true,crosshairMarkerVisible:false,title:t(`chart_${level.kind}`),priceFormat:{type:'price',precision,minMove:10**(-precision)}});
      line.setData([{time:start,value:level.price},{time:Math.max(all.at(-1).time,start+86400),value:level.price}]);
    });
    chart.timeScale().fitContent();
    return ()=>chart.remove();
  },[result,levels,loading,timeframe,showAdvanced,levelsOn,emaOn,i18n.language]);
  const fmt=n=>n.toLocaleString(i18n.language,{maximumFractionDigits:n>=1?2:8});
  const date=time=>new Date(time*1000).toLocaleDateString(i18n.language,{timeZone:'UTC'});
  return <div className="w-full min-w-0">
    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
      <button type="button" aria-pressed={!showAdvanced} onClick={()=>setAdvanced(false)} className={`min-h-9 rounded border px-3 ${!showAdvanced?'border-sky-500 text-sky-300':'border-slate-600'}`}>{t('chart_clean')}</button>
      {isFuture?<a href={`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(getTVSymbol(asset))}`} target="_blank" rel="noopener noreferrer" className="flex min-h-9 items-center rounded border border-slate-600 px-3 text-sky-300">{t('audit_external_link')}</a>:<button type="button" aria-pressed={advanced} onClick={()=>setAdvanced(true)} className={`min-h-9 rounded border px-3 ${advanced?'border-sky-500 text-sky-300':'border-slate-600'}`}>{t('chart_advanced')}</button>}
      {!showAdvanced && <><label className="flex items-center gap-1"><input type="checkbox" checked={levelsOn} onChange={e=>setLevelsOn(e.target.checked)}/>{t('chart_levels')}</label><label className="flex items-center gap-1"><input type="checkbox" checked={emaOn} onChange={e=>setEmaOn(e.target.checked)}/><span className="text-sky-400">EMA 20</span> / <span className="text-violet-400">50</span></label></>}
    </div>
    {isFuture&&<p className="mb-2 text-xs leading-5 text-amber-200"><span translate="no">{asset.id}</span> · {t('audit_futures_note')} {t('audit_futures_external')}</p>}
    {showAdvanced?<TradingViewChart asset={asset} timeframe={timeframe}/>:loading?<p role="status" className="p-10 text-center text-sm text-slate-400">{t('loading')}</p>:error?<div role="alert" className="p-8 text-center text-sm"><p>{t('chart_error')}</p><button className="mt-3 underline" onClick={()=>setRetry(n=>n+1)}>{t('retry')}</button></div>:<>
      <div ref={ref} style={{height:330,width:'100%'}} aria-label={`${asset.name} · ${timeframe}`} role="img"/>
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-400" aria-live="polite">
        <span translate="no">{asset.symbol} · {result?.currency || asset.currency || '—'} · {result?.source}</span>
        {levelsOn && !levels.length && <span>{t('chart_no_levels')}</span>}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-slate-400">{t('chart_daily_context',{date:date(result.candles.at(-1).time)})}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-400">{t('audit_history_cache')}</p>
      {levelsOn&&<div className="mt-2 grid gap-2 sm:grid-cols-2">{levels.map(l=><div key={l.kind} className={`rounded-lg border p-2 text-xs ${l.kind==='support'?'border-emerald-800/50 text-emerald-300':'border-rose-800/50 text-rose-300'}`}><p className="font-semibold">{t(`chart_${l.kind}`)}: {fmt(l.low)}–{fmt(l.high)} {result?.currency??''}</p><p className="mt-1 text-[11px] text-slate-400">{t('chart_level_evidence',{count:l.touches,date:date(l.confirmedAt),distance:l.distancePct.toLocaleString(i18n.language,{maximumFractionDigits:2})})}</p>{result.candles.at(-1).close>=l.low&&result.candles.at(-1).close<=l.high&&<p className="mt-1 text-[11px] text-amber-300">{t('chart_testing')}</p>}</div>)}</div>}
      <details className="mt-2 text-[11px] text-slate-400"><summary className="cursor-pointer">{t('chart_levels')} · {t('methodology','Método')}</summary><p className="mt-1 leading-5">{t('chart_method')}</p></details>
      <p className="mt-1 text-[10px] text-slate-500">TradingView Lightweight Charts™ · Copyright © 2023 TradingView, Inc. <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="underline">TradingView</a></p>
    </>}
  </div>;
}
