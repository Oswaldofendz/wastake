import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ANALYZABLE_CATEGORIES, getAnalysisType } from '../data/assetCatalog.js';
import { fetchNarrative } from '../services/api.js';
import { usePanoramaData } from '../hooks/usePanoramaData.js';
import { AssetSearch } from './AssetSearch.jsx';
import { AssetRangeContext } from './AssetRangeContext.jsx';
import { FearGreedGauge } from './FearGreedGauge.jsx';
import { MarketComparison } from './MarketComparison.jsx';
import { ScoreGauge, ComponentScore } from './TechnicalScore.jsx';
import { summarizeNews, formatQuote } from '../utils/panoramaAnalysis.js';

const DEFAULT_ASSET = ANALYZABLE_CATEGORIES[0].assets[0];
const panel = 'rounded-xl border border-slate-700/50 bg-[var(--bg-card)] p-4';
const groups = ['trend','momentum','structure','participation'];

function sourceLink(article) {
  try {
    const url=new URL(article.link||article.url);
    return ['https:','http:'].includes(url.protocol)?url.href:null;
  } catch { return null; }
}

function NewsTone({ news }) {
  const { t } = useTranslation();
  const summary = summarizeNews(news);
  const color = summary.tone==='positive'?'text-green-400':summary.tone==='negative'?'text-red-400':'text-slate-300';
  return <>
    <p className={`mt-3 text-lg font-semibold ${color}`}>{t(`pan_tone_${summary.tone}`)}</p>
    <div className="mt-3 grid grid-cols-3 gap-2">
      {['positive','neutral','negative'].map(tone=><div key={tone} className="rounded-lg border border-slate-700/40 p-2 text-center"><p className="text-xs text-slate-400">{t(`pan_${tone}`)}</p><p className="mt-1 font-mono text-lg">{summary.counts[tone]}</p></div>)}
    </div>
    <p className="mt-3 text-xs text-slate-400">{t('pan_news_coverage',summary)} · {t('pan_high_impact',{count:summary.highImpact})}</p>
    {summary.classified<summary.total&&<p className="mt-1 text-xs text-slate-400">{t('pan_news_unknown')}: {summary.total-summary.classified}</p>}
    <p className="mt-3 text-xs leading-5 text-slate-400">{t('pan_news_method')}</p>
    <details className="mt-3 text-xs"><summary className="cursor-pointer text-sky-300">{t('pan_news_sources')}</summary><ul className="mt-2 max-h-72 space-y-3 overflow-y-auto">{news.map((article,index)=>{const href=sourceLink(article);return <li key={article.link||article.url||index}>{href?<a translate="no" href={href} target="_blank" rel="noopener noreferrer" className="text-slate-300 underline underline-offset-2">{article.title}</a>:<span translate="no">{article.title}</span>}<p className="mt-1 text-slate-400">{article.source}</p></li>;})}</ul></details>
  </>;
}

function IndicatorDetails({ analysis }) {
  const { t, i18n } = useTranslation();
  const ind=analysis?.indicators;
  const fmt=n=>Number.isFinite(n)?n.toLocaleString(i18n.language,{maximumFractionDigits:2}):'—';
  const rows=[
    ['RSI (14)',fmt(ind?.rsi?.current),'pan_rsi_help'],
    ['MACD (12/26/9)',fmt(ind?.macd?.current?.histogram),'pan_macd_help'],
    ['EMA 20 / 50',`${fmt(ind?.ema20?.current)} / ${fmt(ind?.ema50?.current)}`,'pan_ema_help'],
    ['Bollinger (20)',`${fmt(ind?.bollingerBands?.current?.lower)} / ${fmt(ind?.bollingerBands?.current?.middle)} / ${fmt(ind?.bollingerBands?.current?.upper)}`,'pan_bb_help'],
    ['ADX / DMI (14)',`${fmt(ind?.adx?.current?.adx)} · +DI ${fmt(ind?.adx?.current?.pdi)} / −DI ${fmt(ind?.adx?.current?.mdi)}`,'pan_adx_help'],
    [t('volume'),Number.isFinite(ind?.volume?.ratio)?`${fmt(ind.volume.ratio)}×`:'—','pan_volume_help'],
  ];
  return <details className="mt-4 border-t border-slate-700/40 pt-3">
    <summary className="cursor-pointer text-sm font-semibold">{t('pan_indicators')}</summary>
    <dl className="mt-3 divide-y divide-slate-700/40">{rows.map(([label,value,help])=><div key={label} className="py-3"><div className="flex flex-wrap items-start justify-between gap-2"><dt className="text-sm font-semibold">{label}</dt><dd className="max-w-full break-words font-mono text-sm">{value}</dd></div><p className="mt-1 text-xs leading-5 text-slate-400">{t(help)}</p></div>)}</dl>
  </details>;
}

export function Panorama() {
  const { t, i18n } = useTranslation();
  const lang=(i18n.resolvedLanguage||i18n.language).split('-')[0];
  const [asset,setAsset]=useState(DEFAULT_ASSET);
  const [attempt,setAttempt]=useState(0);
  const state=usePanoramaData(asset,attempt);
  const analysis=state.analysis.data?.analysis;
  const quote=state.quote.data;
  const hasQuote=Number.isFinite(quote?.price);
  const summary=analysis?.summary;
  const currency=quote?.currency??analysis?.meta?.currency??asset.currency??(asset.type==='crypto'?'USD':null);
  const price=hasQuote?quote.price:analysis?.meta?.lastPrice;
  const priceTime=hasQuote?quote.quoteAsOf:analysis?.meta?.to?analysis.meta.to*1000:null;
  const priceSource=hasQuote?quote.source:analysis?.meta?.source;
  const news=Array.isArray(state.news.data)?state.news.data:state.news.data?.news??[];
  const narrativeKey=`${state.key}:${lang}:${analysis?.meta?.to??''}`;
  const [narrative,setNarrative]=useState({key:null,loading:false,data:null});
  useEffect(()=>{
    if(!analysis)return;
    const controller=new AbortController();
    setNarrative({key:narrativeKey,loading:true,data:null});
    fetchNarrative(asset.id,getAnalysisType(asset),lang,{signal:controller.signal})
      .then(data=>{if(!controller.signal.aborted)setNarrative({key:narrativeKey,loading:false,data});})
      .catch(()=>{if(!controller.signal.aborted)setNarrative({key:narrativeKey,loading:false,data:null});});
    return()=>controller.abort();
  },[narrativeKey,asset.id,analysis,lang]);
  const explanation=narrative.key===narrativeKey?narrative:{loading:!!analysis,data:null};
  const provider=String(explanation.data?.provider??'').toLowerCase();
  const providerLabel=provider.includes('groq')?'Groq':provider.includes('gemini')?'Gemini':null;
  const date=value=>{
    const parsed=new Date(value);
    return value!=null&&!isNaN(parsed.getTime())?parsed.toLocaleString(i18n.language):'—';
  };
  const atr=analysis?.indicators?.atr?.current;
  const lastClose=analysis?.meta?.lastPrice;
  const atrPct=Number.isFinite(atr)&&lastClose>0?atr/lastClose*100:null;

  return <main className="mx-auto w-full max-w-7xl p-3 sm:p-4">
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold">{t('nav_panorama')}</h1><p className="mt-1 text-sm text-slate-400">{t('pan_subtitle')}</p></div>
      <button type="button" onClick={()=>setAttempt(n=>n+1)} disabled={state.analysis.loading} className="min-h-11 rounded-lg border border-slate-600 px-4 text-sm font-semibold disabled:opacity-60">{state.analysis.loading?t('loading'):t('pan_refresh')}</button>
    </header>
    <div className="mb-4"><AssetSearch onSelect={setAsset}/></div>
    <section className={`${panel} mb-4 flex flex-wrap items-center justify-between gap-4`} aria-label={t('pan_quote')}>
      <div><h2 translate="no" className="text-lg font-semibold">{asset.name}</h2><p translate="no" className="mt-1 text-sm text-slate-400">{asset.symbol}{asset.exchange?` · ${asset.exchange}`:''}</p></div>
      <div className="min-w-0 text-right"><p className="text-xs text-slate-400">{t(hasQuote?'pan_quote':'pan_close')}</p><p className="mt-1 break-words font-mono text-2xl font-bold">{formatQuote(price,currency,i18n.language)}</p>
        <p className="mt-1 text-xs text-slate-400">{priceTime?`${t('pan_asof')}: ${date(priceTime)}`:t('pan_not_available')}</p>
      </div>
      <p className="w-full text-xs text-slate-400">{t('pan_source')}: {priceSource||'—'} · {t('pan_checked')}: {date(hasQuote?state.quote.checkedAt:state.analysis.checkedAt)}</p>
    </section>
    <div className="grid items-start gap-4 lg:grid-cols-3">
      <section className={`${panel} lg:col-span-2`} aria-label={t('technical_score_title')}>
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-300">{t('technical_score_title')}</h2>
        {state.analysis.loading?<p role="status" className="py-8 text-sm text-slate-400">{t('pan_analysis_loading')}</p>:state.analysis.error?<p role="alert" className="py-4 text-sm text-amber-300">{t('pan_analysis_error')}</p>:<>
          <ScoreGauge score={summary?.score10??null} bias={summary?.bias??'unavailable'} t={t}/>
          <div className="mt-5 flex flex-wrap justify-between gap-2 text-xs text-slate-400"><h3 className="font-semibold">{t('technical_weighted_components')}</h3><span>{t('technical_score_coverage')}: {summary?.coverage??0}%</span></div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">{groups.map(name=><ComponentScore key={name} name={name} item={summary?.components?.[name]} t={t}/>)}</div>
          <p className="mt-3 text-xs text-slate-400">{t('pan_history_dates')}: {date(analysis?.meta?.from*1000)} → {date(analysis?.meta?.to*1000)}</p>
          <details className="mt-4 text-xs text-slate-400"><summary className="cursor-pointer font-semibold">{t('technical_signal_method')}</summary><p className="mt-2 leading-5">{t('technical_signal_method_details')}</p><p className="mt-2 leading-5">{t('technical_score_context_indicators')}</p></details>
          <IndicatorDetails analysis={analysis}/>
        </>}
      </section>
      <div className="space-y-4">
        {asset.type==='crypto'?<div><FearGreedGauge key={`${asset.id}:${attempt}`}/><p className="mt-2 text-xs text-slate-400">{t('asset_crypto_scope')}</p></div>:<section className={panel}><AssetRangeContext asset={asset} historyResult={state.history.data??{candles:[]}} historyLoading={state.history.loading}/></section>}
        <section className={panel}><h2 className="text-sm font-semibold">{t('pan_volatility')}</h2><p className="mt-3 font-mono text-2xl">{atrPct==null?'—':`${atrPct.toLocaleString(i18n.language,{maximumFractionDigits:2})}%`}</p><p className="mt-2 text-xs leading-5 text-slate-400">{t('pan_atr_note')}</p></section>
      </div>
      <section className={panel} aria-label={t('pan_news_tone')}>
        <h2 className="text-sm font-semibold">{t('pan_news_tone')}</h2>
        {state.news.loading?<p role="status" className="mt-4 text-sm text-slate-400">{t('pan_news_loading')}</p>:state.news.error?<p role="status" className="mt-4 text-sm text-amber-300">{t('news_error')}</p>:news.length?<><NewsTone news={news}/>{state.news.analyzing&&<p role="status" className="mt-3 text-xs text-sky-300">{t('pan_news_loading')}</p>}{state.news.analysisError&&<p role="status" className="mt-3 text-xs text-amber-300">{t('pan_news_ai_missing')}</p>}</>:<p className="mt-4 text-sm text-slate-400">{t('news_empty')}</p>}
      </section>
      <section className={panel} aria-label={t('pan_ai_title')}>
        <h2 className="text-sm font-semibold">{t('pan_ai_title')}{providerLabel&&<span className="ml-2 rounded border border-slate-600 px-2 py-0.5 text-xs text-slate-400">{providerLabel}</span>}</h2>
        {state.analysis.loading?<p role="status" className="mt-4 text-sm text-slate-400">{t('pan_ai_waiting')}</p>:explanation.loading?<p role="status" className="mt-4 text-sm text-slate-400">{t('pan_ai_loading')}</p>:explanation.data?.narrative?<p className="mt-4 text-sm leading-6 text-slate-300">{explanation.data.narrative}</p>:<p className="mt-4 text-sm text-slate-400">{t('pan_ai_missing')}</p>}
        <p className="mt-3 text-xs leading-5 text-slate-400">{t('pan_ai_note')}</p>
      </section>
      <MarketComparison asset={asset} candles={state.history.data?.candles??[]} revision={attempt}/>
    </div>
    <p className="mt-4 text-xs leading-5 text-slate-400">{t('pan_snapshot_note')}</p>
  </main>;
}
