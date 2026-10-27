import { useTranslation } from 'react-i18next';
import { entrySummary } from '../utils/entrySummary.js';
import { companyRatios } from '../utils/companyValuation.js';
import { quoteView } from '../utils/marketConventions.js';
import { formatQuote } from '../utils/panoramaAnalysis.js';

const styles={favorable:'border-emerald-500/50 bg-emerald-950/25 text-emerald-300',mixed:'border-amber-500/50 bg-amber-950/20 text-amber-200',wait:'border-rose-500/50 bg-rose-950/20 text-rose-200',caution:'border-orange-500/50 bg-orange-950/20 text-orange-200',valuationCaution:'border-orange-500/50 bg-orange-950/20 text-orange-200'};
const symbols={favorable:'↗',mixed:'↔',wait:'↘',caution:'!',valuationCaution:'!',pending:'…',unavailable:'—',incomplete:'◐',specialist:'◐'};
export function AssetQuickSummary({asset,data,technical,scenario}) {
  const {t,i18n}=useTranslation();
  const tr=(key,options)=>t(`valuation.${key}`,options);
  const analysis=technical?.analysis;
  const score=analysis?.summary?.score10;
  const available=Number.isFinite(score)&&score>=0&&score<=10;
  const status=entrySummary({analysis,loading:!technical||technical.loading,error:!!technical?.error,company:data,isStock:asset.type==='stock',scenario});
  const q=data?.quote;
  const view=quoteView(asset,data,analysis);
  const {currency,price}=view;
  const metrics=data?companyRatios(data):{};
  const fmt=(v,n=2)=>Number.isFinite(v)?v.toLocaleString(i18n.language,{maximumFractionDigits:n}):'—';
  const money=f=>Number.isFinite(f?.value)?`${fmt(f.value/1e6)} M ${f.currency??''}`:'—';
  const date=v=>v&&Number.isFinite(new Date(v).getTime())?new Date(v).toLocaleDateString(i18n.language,{timeZone:'UTC'}):'—';
  const quoteDate=view.asOf;
  const technicalPrice=analysis?.meta?.lastPrice;
  const rows=asset.type==='stock'?
    [['price',`${fmt(price)} ${currency}`,date(quoteDate)],['revenue',money(data?.flows?.revenue),data?.yearEnd??'—'],['per',Number.isFinite(metrics.pe)?`${fmt(metrics.pe)}×`:'—',data?.yearEnd??'—'],['quickFcf',Number.isFinite(metrics.fcf)?`${fmt(metrics.fcf/1e6)} M ${data.flows.operatingCashFlow.currency}`:'—',data?.yearEnd??'—']]:
    [['referenceQuote',formatQuote(price,currency,i18n.language),date(quoteDate)],['quickRsi',fmt(analysis?.indicators?.rsi?.current),null],['quickVolume',Number.isFinite(analysis?.indicators?.volume?.ratio)?`${fmt(analysis.indicators.volume.ratio)}×`:'—',null],['quickAtr',technicalPrice>0&&Number.isFinite(analysis?.indicators?.atr?.current)?`${fmt(analysis.indicators.atr.current/technicalPrice*100)}%`:'—',null]];
  const hasScenario=scenario&&!scenario.error;
  return <section aria-label={tr('quickTitle')} className={`mb-4 rounded-xl border p-4 sm:p-5 ${styles[status]??'border-slate-600 bg-slate-900/70 text-slate-200'}`}>
    <p className="mb-3 text-xs font-semibold uppercase tracking-widest">{tr('quickTitle')}</p>
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-start gap-3"><span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-current text-2xl font-bold">{symbols[status]}</span><div className="min-w-0"><h3 className="text-xl font-semibold leading-snug">{tr(`quick_${status}`)}</h3><p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-200">{tr(`quick_${status}_why`)}</p></div></div>
      <div className="shrink-0 sm:text-right"><p className="text-xs text-slate-300">{t('technical_score_title')}</p><p className="text-3xl font-semibold tabular-nums text-white">{available?fmt(score,1):'—'}<span className="text-base text-slate-400"> / 10</span></p></div>
    </div>
    <div className="relative mt-4 h-2 rounded-full bg-gradient-to-r from-rose-600 via-amber-400 to-emerald-500" role="img" aria-label={available?`${t('technical_score_title')}: ${fmt(score,1)} / 10`:tr('quick_unavailable')}>{available&&<span className="absolute -top-1 h-4 w-1 rounded border border-white bg-slate-950" style={{left:`calc(${score*10}% - 2px)`}}/>}</div>
    <div className="mt-2 flex justify-between gap-2 text-[11px] text-slate-300"><span>0 · {t('technical_score_negative')}</span><span>5 · {t('technical_score_middle')}</span><span>10 · {t('technical_score_positive')}</span></div>
    <dl className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">{rows.map(([key,value,period])=><div key={key} className="min-w-0 rounded-lg border border-white/10 bg-slate-950/50 p-3"><dt className="text-xs leading-relaxed text-slate-300">{key==='referenceQuote'?t(key):tr(key)}</dt><dd className="mt-1 break-words text-base font-semibold tabular-nums text-white">{value}</dd>{period&&<p className="mt-1 text-[11px] text-slate-400">{period}</p>}</div>)}</dl>
    {asset.type==='stock'&&<p className="mt-2 text-[11px] text-slate-300">{tr('quickUnits')}</p>}
    <div className="mt-3 rounded-lg border border-white/10 bg-slate-950/30 p-3 text-sm leading-relaxed text-slate-200"><p><span className="font-semibold">{tr('quickValue')}: </span>{asset.type!=='stock'?tr('quickValueNonCompany'):hasScenario?tr(scenario.status):tr('quickValuePending')}</p>{hasScenario&&Number.isFinite(scenario.fairValue)&&<p className="mt-1 tabular-nums">{tr('fair')}: {fmt(scenario.fairValue)} {scenario.currency} · {tr('threshold')}: {fmt(scenario.threshold)} {scenario.currency}</p>}</div>
    <p className="mt-3 text-xs leading-relaxed text-slate-300">{asset.type==='stock'?tr('quickLimits'):t('crypto_quick_limits')}</p>
    <details className="mt-3 text-xs leading-relaxed text-slate-300"><summary className="min-h-8 cursor-pointer font-semibold">{tr('quickRules')}</summary><p>{tr('quickRulesText')}</p><p className="mt-2">{tr('quickHistory',{date:date(analysis?.meta?.to?analysis.meta.to*1000:null),coverage:analysis?.summary?.coverage??0,source:analysis?.meta?.source??'—'})}</p></details>
  </section>;
}
