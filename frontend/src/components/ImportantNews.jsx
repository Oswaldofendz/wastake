import {useEffect,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {fetchFundamentalsNews,translateText} from '../services/api.js';
import {getAnalysisType} from '../data/assetCatalog.js';
import {importantArticles,contextualArticle} from '../utils/discoveryHighlights.js';

export function ImportantNews({asset}) {
  const {t,i18n}=useTranslation(),lang=i18n.language.split('-')[0];
  const [articles,setArticles]=useState([]),[loading,setLoading]=useState(true),[analyzing,setAnalyzing]=useState(false),[error,setError]=useState(false),[attempt,setAttempt]=useState(0),[titles,setTitles]=useState({});
  useEffect(()=>{
    let cancelled=false;
    setArticles([]);setLoading(true);setError(false);setAnalyzing(false);setTitles({});
    (async()=>{
      try{
        const first=await fetchFundamentalsNews(asset,getAnalysisType(asset),lang,'headlines');
        if(cancelled)return;
        setArticles(first.news??[]);setLoading(false);
        if(!first.news?.length)return;
        setAnalyzing(true);
        try{const full=await fetchFundamentalsNews(asset,getAnalysisType(asset),lang);if(!cancelled)setArticles(full.news?.length?full.news:first.news);}catch{/* Keep usable public headlines. */}
      }catch{if(!cancelled)setError(true);}finally{if(!cancelled){setLoading(false);setAnalyzing(false);}}
    })();return()=>{cancelled=true;};
  },[asset.id,asset.type,asset.name,asset.symbol,lang,attempt]);
  useEffect(()=>{
    let cancelled=false;if(lang==='en')return;
    const pending=importantArticles(articles).filter(a=>!a.localizedTitle||a.localizedTitle===a.title);
    (async()=>{for(const a of pending){try{const r=await translateText(a.title,lang,'en',[asset.name,asset.symbol]);if(!cancelled&&r.translated&&r.translatedText)setTitles(v=>({...v,[a.link]:r.translatedText}));}catch{/* Show a labelled original. */}}})();
    return()=>{cancelled=true;};
  },[articles,lang]);
  const selected=importantArticles(articles);
  return <section aria-labelledby="important-news-title" className="mt-4 rounded-xl border border-slate-700 bg-slate-900/30 p-4">
    <div className="flex items-center justify-between gap-3"><h3 id="important-news-title" className="font-semibold">{t('important_news')}</h3><button type="button" onClick={()=>setAttempt(v=>v+1)} disabled={loading||analyzing} className="min-h-10 text-xs text-sky-300 underline">{t('important_news_refresh')}</button></div>
    <p className="mb-3 text-xs leading-5 text-slate-400">{t('important_news_scope')}</p>
    {loading?<p role="status">{t('loading')}</p>:error?<p role="alert" className="text-sm text-amber-300">{t('news_error')}</p>:!selected.length?<p className="text-sm text-slate-400">{t('important_news_empty')}</p>:<div className="grid gap-3 md:grid-cols-2">{selected.map(a=>{
      const contextual=contextualArticle(a),title=(a.localizedTitle!==a.title&&a.localizedTitle)||titles[a.link]||a.title;
      return <article key={a.link} className="min-w-0 rounded-lg border border-slate-700/60 p-3"><p className="text-xs text-slate-400"><span translate="no">{a.source}</span> · <time dateTime={a.pubDate}>{new Date(a.pubDate).toLocaleString(i18n.language,{dateStyle:'short',timeStyle:'short'})}</time></p><a href={a.link} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm font-semibold leading-relaxed text-sky-200 hover:underline">{title} ↗</a>{lang!=='en'&&title===a.title&&<p className="mt-1 text-xs text-amber-300">{t('news_original')}</p>}<p className="mt-2 text-xs text-slate-400">{contextual?t('important_news_relevance',{score:Math.round(a.relevance)}):t('important_news_pending')}</p>{contextual&&<><p className="mt-2 text-sm leading-relaxed">{a.summary}</p><p className="mt-2 text-xs leading-5 text-slate-400"><strong>{t('important_news_why')} </strong>{a.mechanism}</p></>}</article>;
    })}</div>}
    {analyzing&&<p role="status" className="mt-3 text-xs text-amber-300">{t('audit_news_analyzing')}</p>}
  </section>;
}
