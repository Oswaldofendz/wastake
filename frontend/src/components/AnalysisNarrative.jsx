import {useEffect,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {fetchNarrative} from '../services/api.js';
import {getAnalysisType} from '../data/assetCatalog.js';

export function AnalysisNarrative({asset}) {
  const {t,i18n}=useTranslation();
  const lang=(i18n.resolvedLanguage||i18n.language).split('-')[0];
  const [attempt,setAttempt]=useState(0),[result,setResult]=useState({});
  const type=getAnalysisType(asset),key=`${type}:${asset.id}:${lang}:${attempt}`;
  useEffect(()=>{
    const controller=new AbortController();setResult({key,loading:true});
    fetchNarrative(asset.id,type,lang,{signal:controller.signal}).then(data=>{
      if(!controller.signal.aborted)setResult({key,data,loading:false});
    }).catch(()=>{if(!controller.signal.aborted)setResult({key,loading:false});});
    return()=>controller.abort();
  },[key,asset.id,type,lang]);
  const state=result.key===key?result:{loading:true},provider=state.data?.provider;
  return <section className="mt-4 rounded-xl border border-sky-800/60 bg-[var(--bg-card)] p-4" aria-label={t('pan_ai_title')}>
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{t('pan_ai_title')} · <span translate="no">{asset.name}</span></h3>{['gemini','groq'].includes(provider)&&<span className="rounded border border-slate-600 px-2 py-1 text-xs text-sky-200">{provider==='gemini'?'Gemini':'Groq'}</span>}</div>
    {state.loading?<p role="status" className="mt-3 text-sm text-slate-400">{t('pan_ai_loading')}</p>:state.data?.narrative?<p className="mt-3 text-sm leading-7 text-slate-200">{state.data.narrative}</p>:<div role="status" className="mt-3 text-sm text-slate-400"><p>{t('pan_ai_missing')}</p><button type="button" onClick={()=>setAttempt(n=>n+1)} className="mt-2 min-h-10 text-sky-200 underline">{t('retry')}</button></div>}
    <p className="mt-3 text-xs leading-5 text-slate-400">{t('pan_ai_note')}</p>
  </section>;
}
