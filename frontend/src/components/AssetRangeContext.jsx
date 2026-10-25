import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchOHLCV } from '../services/api.js';
import { getAnalysisType } from '../data/assetCatalog.js';
import { cleanCandles } from '../utils/chartLevels.js';

export function AssetRangeContext({ asset }) {
  const { t, i18n }=useTranslation();
  const [data,setData]=useState(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{
    let cancelled=false;setData(null);setLoading(true);
    fetchOHLCV(asset.id,getAnalysisType(asset),{days:90}).then(r=>{if(!cancelled)setData({...r,candles:cleanCandles(r.candles).slice(-90)});})
      .catch(()=>{}).finally(()=>{if(!cancelled)setLoading(false);});
    return ()=>{cancelled=true;};
  },[asset.id,asset.analysisType]);
  const bars=data?.candles??[];
  const low=bars.length?Math.min(...bars.map(c=>c.low)):null;
  const high=bars.length?Math.max(...bars.map(c=>c.high)):null;
  const close=bars.at(-1)?.close;
  const change=bars.length>1?(close/bars[0].close-1)*100:null;
  const pos=high>low?(close-low)/(high-low)*100:50;
  const prices=bars.map(c=>c.close);
  const points=prices.map((p,i)=>`${i/(prices.length-1)*280},${60-(p-low)/(high-low||1)*52}`).join(' ');
  const fmt=n=>Number.isFinite(n)?n.toLocaleString(i18n.language,{maximumFractionDigits:4}):'—';
  return <div className="w-full text-left">
    <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">{t('asset_context')}</p>
    <p translate="no" className="mt-1 text-xs text-slate-400">{asset.symbol} · {bars.length} {t('asset_bars')} · {data?.currency||asset.currency||'—'}</p>
    {loading?<p className="my-6 text-xs text-slate-400">{t('loading')}</p>:bars.length<2?<p className="my-4 text-xs text-amber-300">{t('technical_score_missing_data')}</p>:<>
      <svg viewBox="0 0 280 68" className="mt-3 h-20 w-full" role="img" aria-label={`${t('asset_change')}: ${fmt(change)}%`}><polyline points={points} fill="none" stroke={change>=0?'#34d399':'#fb7185'} strokeWidth="2" vectorEffect="non-scaling-stroke"/></svg>
      <div className="relative my-2 h-2 rounded bg-slate-700"><span className="absolute -top-1 h-4 w-1 rounded bg-sky-300" style={{left:`calc(${pos}% - 2px)`}}/></div>
      <div className="flex justify-between gap-2 text-[11px] text-slate-400"><span>{t('asset_low')}: {fmt(low)}</span><span>{t('asset_high')}: {fmt(high)}</span></div>
      <p className="mt-2 text-sm">{t('asset_change')}: <b className={change>=0?'text-emerald-400':'text-rose-400'}>{change>=0?'+':''}{change?.toFixed(2)}%</b></p>
    </>}
    <p className="mt-3 text-[11px] leading-5 text-slate-400">{t('asset_context_help')}</p>
    {data?.source&&<p className="mt-1 text-[10px] text-slate-500">{data.source} · {bars[0]&&new Date(bars[0].time*1000).toLocaleDateString(i18n.language)} – {bars.at(-1)&&new Date(bars.at(-1).time*1000).toLocaleDateString(i18n.language)}</p>}
  </div>;
}
