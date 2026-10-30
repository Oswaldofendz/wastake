import {useId,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {usePanoramaData} from '../hooks/usePanoramaData.js';
import {PANORAMA_TABS} from '../utils/navigation.js';
import {formatQuote} from '../utils/panoramaAnalysis.js';
import {AnalysisPanel} from './AnalysisPanel.jsx';
import {AnalysisNarrative} from './AnalysisNarrative.jsx';
import {AssetValuationCard} from './AssetValuationCard.jsx';
import {CandleChart} from './PriceChart.jsx';
import {ImportantNews} from './ImportantNews.jsx';
import {MarketComparison} from './MarketComparison.jsx';
import {OpportunityPanel} from './OpportunityPanel.jsx';

function Semaphore({summary}) {
  const {t}=useTranslation(),ready=Number.isFinite(summary?.score10)&&summary.coverage===100;
  const active=ready?(summary.score10<=4?'bearish':summary.score10>=6?'bullish':'mixed'):'unavailable';
  return <div role="img" aria-label={t('ui_semaphore')+': '+t('technical_score_'+active)} className="flex max-w-full items-center gap-2 rounded-full border border-slate-700 px-3 py-2 text-xs">
    <span aria-hidden="true" className="flex shrink-0 gap-1.5">{[['bearish','bg-rose-500'],['mixed','bg-amber-400'],['bullish','bg-emerald-400']].map(([key,color])=><span key={key} className={'h-2.5 w-2.5 rounded-full '+(active===key?color:'bg-slate-700')}/>)}</span>
    <span className="text-slate-300">{t('technical_score_'+active)}</span>
  </div>;
}

// One snapshot supplies the quote, technical summary, valuation context and
// benchmark. Optional panels mount on first use and stay mounted to retain work.
export function UnifiedAssetView({asset,tab='summary',onTabChange}) {
  const {t,i18n}=useTranslation(),prefix=useId();
  const [attempt,setAttempt]=useState(0),[visited,setVisited]=useState(()=>new Set([tab]));
  const [compareReady,setCompareReady]=useState(false);
  const [timeframe,setTimeframe]=useState('3M'),[interval,setInterval]=useState('1d');
  const state=usePanoramaData(asset,attempt,false),analysis=state.analysis.data?.analysis??null,quote=state.quote.data;
  const hasQuote=Number.isFinite(quote?.price)&&quote.price>0;
  const price=hasQuote?quote.price:analysis?.meta?.lastPrice;
  const currency=hasQuote?quote.currency:analysis?.meta?.currency??asset.currency??(asset.type==='crypto'?'USD':null);
  const stamp=hasQuote?quote.quoteAsOf:analysis?.meta?.to?analysis.meta.to*1000:null;
  const source=hasQuote?quote.source:analysis?.meta?.source;
  const date=value=>value!=null&&Number.isFinite(new Date(value).getTime())?new Date(value).toLocaleString(i18n.language):'—';
  const provided={data:analysis,loading:state.analysis.loading,error:state.analysis.error};
  const technical={id:asset.id,type:asset.type,analysis,loading:state.analysis.loading,error:state.analysis.error};
  const changeTab=next=>{if(!PANORAMA_TABS.includes(next))return;setVisited(previous=>new Set([...previous,next]));onTabChange(next);};
  const keyTab=(event,index)=>{
    const keys={ArrowRight:(index+1)%4,ArrowLeft:(index+3)%4,Home:0,End:3},next=keys[event.key];
    if(next===undefined)return;event.preventDefault();changeTab(PANORAMA_TABS[next]);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next]?.focus();
  };
  const graphLink=window.location.pathname+window.location.search+'#chart-ai';
  return <div className="min-w-0">
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-700/60 bg-[var(--bg-card)] p-4">
      <div className="min-w-0"><p className="text-xs text-slate-400">{t(hasQuote?'pan_quote':'pan_close')}</p><p className="mt-1 break-words text-2xl font-bold tabular-nums">{formatQuote(price,currency,i18n.language)}</p>
        <p className="mt-1 text-[11px] text-slate-400">{source??'—'} · {date(stamp)}</p>
        {price==null&&<p role="status" className="mt-1 text-xs text-slate-400">{t(state.quote.loading?'loading':'uni_quote_missing')}</p>}
      </div><Semaphore summary={analysis?.summary}/>
      <button type="button" onClick={()=>setAttempt(n=>n+1)} disabled={state.analysis.loading} className="min-h-10 rounded-lg border border-slate-600 px-3 text-xs text-sky-200 disabled:opacity-50">↻ {t('uni_refresh')}</button>
    </div>
    <div role="tablist" aria-label={t('uni_sections')} className="mb-4 grid grid-cols-4 gap-1 rounded-xl border border-slate-700/60 bg-slate-900/40 p-1">
      {PANORAMA_TABS.map((name,index)=><button key={name} type="button" role="tab" id={prefix+'-tab-'+name} aria-controls={prefix+'-panel-'+name} aria-selected={tab===name} tabIndex={tab===name?0:-1} onClick={()=>changeTab(name)} onKeyDown={event=>keyTab(event,index)} className={'min-h-11 min-w-0 rounded-lg px-1 text-xs font-semibold transition-colors sm:text-sm '+(tab===name?'bg-sky-900/80 text-sky-100':'text-slate-400 hover:bg-slate-800 hover:text-white')}>{t('uni_'+name)}</button>)}
    </div>
    {PANORAMA_TABS.map(name=><section key={name} id={prefix+'-panel-'+name} role="tabpanel" aria-labelledby={prefix+'-tab-'+name} hidden={tab!==name} tabIndex={0} className="min-w-0 outline-none">
      {(visited.has(name)||tab===name)&&<>
        <p className="mb-3 text-xs leading-6 text-slate-400">{t('uni_'+name+'_help')}</p>
        {name==='summary'&&<>
          {new URLSearchParams(window.location.search).get('from')==='entry'&&<OpportunityPanel asset={asset}/>}
          <AnalysisPanel asset={asset} provided={provided} historyResult={state.history.data??{candles:[]}} historyLoading={state.history.loading}/>
          <AnalysisNarrative key={attempt} asset={asset}/>
          <details className="mt-4 rounded-xl border border-slate-700 p-4" onToggle={event=>{if(event.currentTarget.open)setCompareReady(true);}}><summary className="min-h-9 cursor-pointer text-sm font-semibold text-sky-200">{t('uni_compare')}</summary>{compareReady&&<div className="mt-3"><MarketComparison asset={asset} candles={state.history.data?.candles??[]} revision={attempt}/></div>}</details>
        </>}
        {name==='chart'&&<>
          <div role="group" aria-label={t('uni_time')} className="mb-3 flex flex-wrap gap-2">{[['15m','15 min'],['4h','4 h']].map(([id,label])=><button key={id} type="button" aria-pressed={interval===id} onClick={()=>setInterval(id)} className={'min-h-10 rounded-lg border px-3 text-xs '+(interval===id?'border-sky-400 text-sky-200':'border-slate-700 text-slate-400')}>{label}</button>)}
            {['1D','1S','1M','3M','6M','1A'].map(range=><button key={range} type="button" aria-pressed={interval==='1d'&&timeframe===range} onClick={()=>{setInterval('1d');setTimeframe(range);}} className={'min-h-10 rounded-lg border px-3 text-xs '+(interval==='1d'&&timeframe===range?'border-sky-400 text-sky-200':'border-slate-700 text-slate-400')}>{range}</button>)}
          </div><CandleChart asset={asset} timeframe={timeframe} interval={interval}/><a href={graphLink} className="mt-4 inline-flex min-h-10 items-center text-sm text-sky-200 underline">✦ {t('uni_ai_chart')} ↗</a>
        </>}
        {name==='valuation'&&<AssetValuationCard asset={asset} technical={technical}/>}
        {name==='news'&&<ImportantNews asset={asset}/>}
      </>}
    </section>)}
  </div>;
}
