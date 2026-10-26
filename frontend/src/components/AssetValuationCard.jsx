import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchAssetResearch, translateText } from '../services/api.js';
import { companyRatios } from '../utils/companyValuation.js';
import { DcfScenario } from './DcfScenario.jsx';
import { AssetQuickSummary } from './AssetQuickSummary.jsx';

const linkStyle='text-sky-300 underline underline-offset-2';
export function AssetValuationCard({asset,technical}) {
  const {t,i18n}=useTranslation();
  const tr=(key,options)=>t(`valuation.${key}`,options);
  const lang=(i18n.resolvedLanguage||i18n.language).split('-')[0];
  const [state,setState]=useState({});
  const [attempt,setAttempt]=useState(0);
  const [description,setDescription]=useState(null);
  const [translating,setTranslating]=useState(false);
  const [translationAttempt,setTranslationAttempt]=useState(0);
  const [scenario,setScenario]=useState(null);
  useEffect(()=>{
    let active=true;setState({});setDescription(null);setScenario(null);
    if(asset.type!=='stock')return;
    fetchAssetResearch(asset).then(data=>{if(active)setState({data});}).catch(()=>{if(active)setState({error:true});});
    return ()=>{active=false;};
  },[asset.id,asset.type,attempt]);
  useEffect(()=>{
    let active=true;setDescription(null);
    const original=state.data?.company?.description;
    setTranslating(!!original&&lang!=='en');
    if(original&&lang!=='en')translateText(original,lang,'en',[asset.name,state.data.company.name,asset.symbol].filter(Boolean)).then(result=>{
      if(active&&result.translated===true&&result.translatedText)setDescription({text:result.translatedText,lang,original});
    }).catch(()=>{}).finally(()=>{if(active)setTranslating(false);});
    return ()=>{active=false;};
  },[state.data,lang,asset.name,asset.symbol,translationAttempt]);
  const data=state.data;
  const fmt=(v,digits=2)=>Number.isFinite(v)?v.toLocaleString(i18n.language,{maximumFractionDigits:digits}):'—';
  const date=v=>v?new Date(v).toLocaleDateString(i18n.language,{timeZone:'UTC'}):'—';
  const factValue=(f,shares=false)=>Number.isFinite(f?.value)?`${fmt(f.value/1e6)} M${shares?'':` ${f.currency||'—'}`}`:'—';
  const metrics=data?companyRatios(data):{};
  const f=data?.flows??{},b=data?.snapshot??{};
  const company=data?.company;
  const reading=Number.isFinite(f.earnings?.value)&&f.earnings.value<0?'loss':f.earnings?.value>0&&Number.isFinite(metrics.fcf)&&metrics.fcf<0?'cashStress':f.earnings?.value>0&&metrics.fcf>0?'cashPositive':'insufficient';
  const profileText=description?.lang===lang&&description.original===company?.description?description.text:company?.description;
  const item=(key,content)=> <div key={key} className="min-w-0 rounded-lg border border-slate-700/70 bg-slate-950/40 p-3"><dt className="text-xs leading-relaxed text-slate-400">{tr(key)}</dt><dd className="mt-1 break-words text-lg font-semibold tabular-nums text-white">{content}</dd></div>;
  return <><AssetQuickSummary asset={asset} data={data} technical={technical} scenario={scenario}/><section className="mb-4 rounded-xl border border-sky-800/70 bg-slate-900/60 p-4 sm:p-5" aria-label={tr(asset.type==='stock'?'title':'assetTitle')}>
    <h3 className="text-xl font-semibold text-white">{tr(asset.type==='stock'?'title':'assetTitle')}</h3><p className="mt-1 text-sm leading-relaxed text-slate-300">{tr(asset.type==='stock'?'intro':'assetIntro')}</p>
    {asset.type!=='stock'?<><p className="mt-4 rounded-lg bg-slate-800 p-4 text-sm leading-relaxed">{tr(['etf','crypto','bond'].includes(asset.type)?asset.type:'other')}</p><p className="mt-3 text-sm text-slate-400">{tr('technical')}</p></>:!data&&!state.error?<p role="status" className="py-6 text-sky-200">{tr('loading')}</p>:<>
      {(state.error||data?.partial)&&<div role="status" className="mt-3 rounded-lg border border-amber-800 p-3 text-sm text-amber-200">{tr('unavailable')} <button type="button" onClick={()=>setAttempt(n=>n+1)} className="min-h-10 px-2 underline">{tr('retry')}</button></div>}
      {data&&<>
        {company&&<div className="my-4 space-y-2 border-b border-slate-700 pb-4 text-sm leading-relaxed">
          <h4 className="font-semibold">{tr('company')} · <span translate="no">{company.name}</span></h4>
          {profileText&&<><p lang={description?.lang===lang?lang:'en'} translate="no">{profileText}</p>{lang!=='en'&&!description&&<div className="text-xs text-amber-200" role="status"><p>{tr(translating?'translating':'original')}</p>{!translating&&<button type="button" className="min-h-10 underline" onClick={()=>setTranslationAttempt(n=>n+1)}>{tr('retryTranslation')}</button>}</div>}</>}
          {(company.sector||company.industry)&&<p>{tr('sector')}: <span translate="no" lang="en">{[company.sector,company.industry].filter(Boolean).join(' · ')}</span><span className="mt-1 block text-xs text-slate-400">{tr('foreignProfile')}</span></p>}
          <div className="flex flex-wrap gap-4">{company.website&&<a className={linkStyle} href={company.website} target="_blank" rel="noopener noreferrer">{tr('website')}</a>}<a className={linkStyle} href={company.sourceUrl} target="_blank" rel="noopener noreferrer">Nasdaq ↗</a></div>
        </div>}
        <h4 className="mt-4 font-semibold">{tr('accounts')}</h4><p className="mt-1 text-xs leading-relaxed text-slate-400">{tr('periods',{year:data.yearEnd??'—',balance:data.balanceDate??'—'})}</p><p className="my-2 text-xs leading-relaxed text-amber-200">{tr('timing')}</p>
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {item('price',`${fmt(data.quote?.price)} ${data.quote?.currency??''}`)}{item('revenue',factValue(f.revenue))}{item('growth',Number.isFinite(metrics.revenueGrowth)?`${fmt(metrics.revenueGrowth)}%`:'—')}{item('earnings',factValue(f.earnings))}
          {item('fcf',Number.isFinite(metrics.fcf)?`${fmt(metrics.fcf/1e6)} M ${f.operatingCashFlow.currency}`:'—')}{item('debt',factValue(b.debt))}{item('cash',factValue(b.cash))}{item('marketCap',factValue(data.marketCap))}
        </dl>
        <p className="my-3 text-sm leading-relaxed text-slate-300">{tr('distinction')}</p>
        <dl className="grid grid-cols-2 gap-3 xl:grid-cols-3">{[['per',metrics.pe],['ps',metrics.ps],['pfcf',metrics.pfcf],['evEbitda',metrics.evEbitda]].map(([key,v])=>item(key,Number.isFinite(v)?`${fmt(v)}×`:'—'))}{item('eps',Number.isFinite(f.eps?.value)?`${fmt(f.eps.value)} ${f.eps.currency??''}`:'—')}{item('operatingMargin',Number.isFinite(metrics.operatingMargin)?`${fmt(metrics.operatingMargin)}%`:'—')}</dl>
        <p className="my-3 text-xs leading-relaxed text-slate-400">{tr('multiples')}</p>
        <aside className="my-3 rounded-lg border border-sky-800/60 bg-sky-950/30 p-3 text-sm leading-relaxed"><h4 className="mb-1 font-semibold text-sky-200">{tr('reading')}</h4><p>{tr(reading)}</p></aside>
        {asset.id.toUpperCase()==='BA'&&<aside className="my-4 rounded-lg border border-amber-700/60 p-3 text-sm leading-relaxed text-amber-100">{tr('boeing')} <a className="underline" href="https://www.sec.gov/Archives/edgar/data/12927/000162828026004357/ba-20251231.htm" target="_blank" rel="noopener noreferrer">10-K 2025 ↗</a></aside>}
        <details className="rounded-lg border border-slate-700 p-3"><summary className="min-h-8 cursor-pointer text-sm font-semibold">{tr('audit')}</summary><div className="mt-3 space-y-3 text-xs text-slate-300">
          <p>{tr('retrieved',{date:date(data.retrievedAt)})}</p><p>{tr('quoteTime',{date:date(data.quote?.quoteAsOf)})} · {data.quote?.source??'—'}</p>
          <p className="leading-relaxed">{tr('ratiosMethod')}</p>
          <dl className="space-y-2">{[...Object.entries(f),...Object.entries(b)].map(([key,fact])=><div key={key} className="grid grid-cols-1 gap-1 border-b border-slate-800 py-1 sm:grid-cols-2"><dt>{tr(key,{defaultValue:key})}</dt><dd className="break-words"><span className="tabular-nums">{fmt(fact?.value,4)} {key==='shares'?'':fact?.currency??''}</span> · {fact?.date??'—'}<span className="block text-slate-400">{fact?.tag??'—'}</span></dd></div>)}</dl>
          <div className="flex flex-wrap gap-4">{[data.financialSourceUrl,data.balanceSourceUrl,data.cashSourceUrl].map((url,i)=><a key={url} className={linkStyle} href={url} target="_blank" rel="noopener noreferrer">Yahoo Finance · {['income','balance','cash flow'][i]} ↗</a>)}<a className={linkStyle} href={`https://www.sec.gov/edgar/search/#/q=${encodeURIComponent(asset.symbol)}`} target="_blank" rel="noopener noreferrer">{tr('filings')}</a></div>
        </div></details>
        <DcfScenario key={asset.id} data={data} onResult={setScenario}/>
        <p className="mt-4 rounded-lg bg-slate-800/60 p-3 text-sm leading-relaxed text-sky-100">{tr('technical')}</p>
      </>}
    </>}
  </section></>;
}
