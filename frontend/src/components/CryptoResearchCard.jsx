import { useEffect,useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchAssetResearch,translateText } from '../services/api.js';
import { isCryptoResearch } from '../utils/cryptoResearch.js';
export function CryptoResearchCard({asset}){
 const {t,i18n}=useTranslation(),lang=(i18n.resolvedLanguage||i18n.language).split('-')[0];
 const [data,setData]=useState(null),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[description,setDescription]=useState(null);
 useEffect(()=>{let active=true;setData(null);setError(false);fetchAssetResearch(asset).then(d=>{if(active){if(isCryptoResearch(d))setData(d);else setError(true);}}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[asset.id,attempt]);
 useEffect(()=>{let active=true;setDescription(null);if(data?.description&&lang!=='en')translateText(data.description,lang,'en',[data.name,data.symbol]).then(r=>{if(active&&r.translated)setDescription(r.translatedText);}).catch(()=>{});return()=>{active=false;};},[data,lang]);
 const fmt=(n,style)=>Number.isFinite(n)?new Intl.NumberFormat(i18n.language,{maximumFractionDigits:2,...style}).format(n):'—';
 const compact=n=>fmt(n,{notation:'compact'}),when=v=>v?new Date(v).toLocaleString(i18n.language):'—';
 const item=(key,value)=><div key={key} className="min-w-0 rounded-lg border border-slate-700 bg-slate-950/30 p-3"><dt className="text-xs text-slate-400">{t(key)}</dt><dd className="mt-1 break-words text-base font-semibold tabular-nums">{value}</dd></div>;
 return <section className="mb-4 rounded-xl border border-sky-800/70 bg-slate-900/60 p-4 sm:p-5" aria-label={t('crypto_title')}>
  <h3 className="text-xl font-semibold">{t('crypto_title')}</h3><p className="mt-2 text-sm leading-relaxed text-slate-300">{t('crypto_intro')}</p>
  {!data&&!error?<p role="status" className="py-5 text-sky-200">{t('crypto_loading')}</p>:error?<p role="status" className="mt-4 text-amber-200">{t('crypto_error')} <button type="button" className="min-h-10 underline" onClick={()=>setAttempt(n=>n+1)}>{t('retry')}</button></p>:<>
  <p translate="no" className="mt-4 font-semibold">{data.name} · {data.symbol}{data.rank?` · #${data.rank}`:''}</p>
  {data.description&&<p translate="no" lang={description?lang:'en'} className="mt-2 text-sm leading-relaxed text-slate-300">{description||data.description}</p>}
  {lang!=='en'&&data.description&&!description&&<p className="mt-1 text-xs text-amber-200">{t('valuation.original')}</p>}
  <dl className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-3">{item('crypto_cap',compact(data.marketCap))}{item('crypto_fdv',compact(data.fdv))}{item('crypto_volume',compact(data.volume24h))}{item('crypto_supply',`${compact(data.circulating)} / ${data.maxSupply===null?t('crypto_unknown_supply'):compact(data.maxSupply)}`)}{item('crypto_turnover',data.volumeToCap===null?'—':`${fmt(data.volumeToCap)}%`)}{item('crypto_dilution',data.fdvToCap===null?'—':`${fmt(data.fdvToCap)}×`)}</dl>
  {data.fdvMethod&&<p className="mt-2 text-xs leading-relaxed text-slate-400">{t('crypto_fdv_formula')}</p>}
  <h4 className="mt-4 text-sm font-semibold">{t('crypto_changes')}</h4><p className="mt-2 grid grid-cols-4 gap-2 text-sm tabular-nums">{Object.entries(data.changes).map(([key,value])=><span key={key} className={value===null?'text-slate-400':value<0?'text-rose-300':'text-emerald-300'}>{value===null?'—':`${value>0?'+':''}${fmt(value)}%`}</span>)}</p>
  <aside className="mt-4 space-y-2 rounded-lg border border-slate-600 bg-slate-950/30 p-3 text-sm leading-relaxed"><h4 className="font-semibold">{t('crypto_reading')}</h4><p>{data.fdvToCap===null?t('crypto_missing'):t(data.fdvToCap>=2?'crypto_dilution_high':'crypto_dilution_normal',{ratio:fmt(data.fdvToCap)})}</p>{data.volumeToCap!==null&&<p>{t('crypto_liquidity',{ratio:fmt(data.volumeToCap)})}</p>}<p className="text-slate-400">{t('crypto_limits')}</p></aside>
  <p className="mt-3 text-xs leading-relaxed text-slate-400">{t('crypto_asof',{source:data.source,date:when(data.dataAsOf),retrieved:when(data.retrievedAt)})}</p>
  <div className="mt-3 flex flex-wrap gap-4 text-sm text-sky-300 underline"><a href={data.sourceUrl} target="_blank" rel="noopener noreferrer">{data.source} ↗</a>{data.website&&<a href={data.website} target="_blank" rel="noopener noreferrer">{t('crypto_sources')}</a>}{data.whitepaper&&<a href={data.whitepaper} target="_blank" rel="noopener noreferrer">Whitepaper ↗</a>}</div>
  </>}
 </section>;
}
