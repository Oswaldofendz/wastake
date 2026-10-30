import {useMemo, useState} from 'react';
import {useTranslation} from 'react-i18next';
import {NEWS_MARKETS, newsPulse} from '../utils/newsSentiment.js';
import {newsPulseCopy} from '../i18n/newsPulseCopy.js';

const icons = {stocks:'🏢', crypto:'₿', forex:'💱', commodities:'🛢️', bonds:'🏛️', indices:'📊', etfs:'🧺', asset:'🧭'};
const colors = ['#f43f5e','#fb923c','#eab308','#84cc16','#14b8a6'];
const point = (v, r = 78) => [100 - r * Math.cos(Math.PI * v), 98 - r * Math.sin(Math.PI * v)];
const status = (pulse, copy) => pulse.value == null ? copy.empty : pulse.value <= 4 ? copy.adverse : pulse.value >= 6 ? copy.favorable : copy.mixed;

function Dial({pulse, label, copy, format}) {
  const value = pulse.value, tone = value == null ? '#64748b' : value <= 4 ? '#fb7185' : value >= 6 ? '#2dd4bf' : '#facc15';
  const tip = point((value ?? 5) / 10, 58);
  return <div>
    <div role={value == null ? undefined : 'meter'} aria-label={label} aria-valuemin={0} aria-valuemax={10} aria-valuenow={value == null ? undefined : Number(value.toFixed(1))} aria-valuetext={value == null ? undefined : `${format(value,1)} / 10 · ${status(pulse,copy)}`}>
      <svg viewBox="0 0 200 125" aria-hidden="true" className="mx-auto w-full max-w-[190px] overflow-visible">
        {colors.map((color,i)=>{const a=point(i/5+.012),b=point((i+1)/5-.012);return <path key={color} d={`M ${a[0]} ${a[1]} A 78 78 0 0 1 ${b[0]} ${b[1]}`} fill="none" stroke={value==null?'#334155':color} strokeWidth="12" strokeLinecap="round"/>;})}
        {[0,2,4,6,8,10].map(n=>{const a=point(n/10,63),b=point(n/10,68);return <line key={n} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#94a3b8" strokeWidth="1"/>;})}
        {value!=null&&<><line x1="100" y1="98" x2={tip[0]} y2={tip[1]} stroke="#f8fafc" strokeWidth="3" strokeLinecap="round"/><circle cx="100" cy="98" r="5" fill={tone}/></>}
        <text x="17" y="120" textAnchor="middle" fill="#94a3b8" fontSize="10">0</text><text x="100" y="10" textAnchor="middle" fill="#94a3b8" fontSize="10">5</text><text x="183" y="120" textAnchor="middle" fill="#94a3b8" fontSize="10">10</text>
      </svg>
      <p className="-mt-2 text-center text-3xl font-semibold tabular-nums" style={{color:tone}}>{value == null ? '—' : format(value,1)}{value!=null&&<small className="ml-1 text-xs font-normal text-slate-400">/ 10</small>}</p>
    </div>
    <div className="mt-1 flex justify-between text-[10px] text-slate-400"><span>{copy.negative}</span><span>{copy.positive}</span></div>
  </div>;
}

export function NewsPulse({articles = [], asset = false, windowHours = 24, checkedAt, stale = false, titleFor}) {
  const {i18n} = useTranslation(), lang = i18n.language.split('-')[0], copy = newsPulseCopy(lang);
  const [selected, setSelected] = useState('stocks');
  // Clock advances with each source refresh, never the user's unrelated UI filters.
  const now = Date.now();
  const markets = asset ? ['asset'] : NEWS_MARKETS;
  const pulses = useMemo(()=>Object.fromEntries(markets.map(market=>[market,newsPulse(articles,{market,asset,now,windowHours})])),[articles,asset,windowHours,checkedAt]);
  const current = asset ? 'asset' : selected, pulse = pulses[current];
  const format = (n,d=0)=>new Intl.NumberFormat(i18n.language,{minimumFractionDigits:d,maximumFractionDigits:d}).format(n);
  const percent = n => `${format(n*100,1)}%`;
  const rowTitle = row => titleFor?.(row.article) ?? row.article.localizedTitle ?? row.article.title;
  return <section className="my-5 min-w-0 overflow-hidden rounded-2xl border border-teal-800/60 bg-gradient-to-br from-slate-900/70 via-slate-950/70 to-teal-950/35 p-4 sm:p-5" aria-label={asset?copy.asset:copy.title}>
    <header><p className="text-[10px] font-semibold uppercase tracking-widest text-teal-300">🧭 NEWS PULSE · {asset?`WaStake · ${windowHours/24} d`:copy.window}</p><h2 className="mt-2 text-xl font-semibold">{asset?copy.asset:copy.title}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{copy.intro}</p></header>
    <div className={`mt-4 grid gap-3 ${asset?'max-w-sm':'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'}`}>
      {markets.map(market=>{const p=pulses[market], active=market===current;return <button type="button" key={market} aria-pressed={active} onClick={()=>setSelected(market)} className={`min-w-0 rounded-xl border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-400 ${active?'border-teal-600 bg-teal-950/35':'border-slate-700/70 bg-slate-900/40 hover:border-slate-500'}`}>
        <h3 className="truncate text-sm font-semibold text-slate-200">{icons[market]} {copy[market]}</h3><Dial pulse={p} label={copy[market]} copy={copy} format={format}/>
        <p className={`mt-2 text-center text-[11px] leading-4 ${p.value==null?'text-slate-500':'text-slate-300'}`}>{p.value==null?copy.empty:`${p.events} ${copy.events}`}</p>
        {p.value!=null&&p.limited&&<p className="mt-1 text-center text-[10px] text-amber-300">◐ {copy.limited}</p>}
      </button>;})}
    </div>
    <div className="mt-4 rounded-xl border border-slate-700/60 bg-slate-950/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-teal-200">{icons[current]} {copy[current]} · {status(pulse,copy)}</h3><span className="text-xs text-slate-400">{pulse.assessed} / {pulse.available} {copy.evaluated}</span></div>
      {!pulse.rows.length?<p className="mt-3 text-sm leading-6 text-slate-400">{pulse.available?copy.emptyHelp:copy.noNews}</p>:<>
        <div className="mt-3 flex gap-1 overflow-hidden rounded-full bg-slate-800" aria-hidden="true"><span className="h-1.5 bg-rose-500" style={{width:`${100*pulse.negativeWeight/pulse.totalWeight}%`}}/><span className="h-1.5 bg-teal-400" style={{width:`${100*pulse.positiveWeight/pulse.totalWeight}%`}}/></div>
        {pulse.dominance>.65&&<p className="mt-3 text-xs leading-5 text-amber-200">◐ {copy.concentrated}</p>}
        <h4 className="mt-4 text-xs font-semibold text-slate-300">{copy.why}</h4>
        <ol className="mt-2 divide-y divide-slate-800">{pulse.rows.slice(0,3).map(row=><li key={row.article.link} className="py-3"><div className="flex items-start justify-between gap-3"><a href={row.article.link} target="_blank" rel="noopener noreferrer" className="min-w-0 text-sm leading-6 text-sky-100 hover:underline">{row.direction>0?'↗':row.direction<0?'↘':'↔'} {rowTitle(row)} ↗</a><span className="shrink-0 text-right"><strong className="block text-sm tabular-nums text-slate-200">{percent(row.share)}</strong><small className="block text-[10px] text-slate-500">{copy.weight}</small></span></div><p className="mt-1 text-xs leading-5 text-slate-400">{row.reason}</p></li>)}</ol>
      </>}
      <p className="mt-3 text-[11px] leading-5 text-slate-500">{copy.noMarket}</p>
    </div>
    <p className="mt-3 text-xs leading-6 text-slate-400">{copy.partial} {copy.qualification}</p>
    {checkedAt&&Number.isFinite(Date.parse(checkedAt))&&<p className={`mt-2 text-[11px] ${stale?'text-amber-200':'text-slate-500'}`}>{stale?copy.cached:copy.updated} · {new Date(checkedAt).toLocaleString(i18n.language)}</p>}
    <details className="mt-4 border-t border-slate-700/70 pt-3 text-xs leading-6 text-slate-400"><summary className="min-h-10 cursor-pointer font-semibold text-sky-200">📐 {copy.method}</summary><p className="my-3 rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-slate-200">{copy.formula}</p><p>{copy.variables}</p><p className="mt-2">{copy.relevance}</p><p className="mt-3 rounded-lg border border-amber-900/50 bg-amber-950/15 p-3 text-amber-100">{copy.example}</p><p className="mt-2">{copy.explanation}</p><p className="mt-2">{copy.count} {copy.limits}</p><p className="mt-3">{copy.source}: <a className="text-sky-200 underline" href="https://www.rba.gov.au/publications/rdp/2020/2020-08/how-do-we-measure-news-sentiment.html" target="_blank" rel="noopener noreferrer">RBA · News sentiment</a> · <a className="text-sky-200 underline" href="https://www.frbsf.org/research-and-insights/publications/economic-letter/2017/04/measuring-economic-sentiment-in-news/" target="_blank" rel="noopener noreferrer">SF Fed · News sentiment</a></p>
    {pulse.rows.length>0&&<details className="mt-4"><summary className="min-h-10 cursor-pointer font-semibold text-sky-200">🔎 {copy.details} · {pulse.events}</summary><div className="space-y-3">{pulse.rows.map(row=><article key={row.article.link} className="rounded-lg border border-slate-700 p-3"><a href={row.article.link} target="_blank" rel="noopener noreferrer" className="font-semibold text-sky-100 underline">{rowTitle(row)} ↗</a><p>{row.reason}</p><p className="mt-2 font-mono text-[11px] text-slate-300">{copy.tone}: {format(row.direction/100,2)} · {copy.relevanceLabel}: {row.relevance}/100 · {copy.confidence}: {percent(row.confidence)} · {copy.evidence}: {percent(row.quality)} · {copy.linkage}: {row.marketLink}/100 · {copy.freshness}: {format(row.recency,3)}</p><p className="font-mono text-teal-200">w = {format(row.weight,6)} · {copy.weight}: {percent(row.share)} · Δ = {row.contribution>0?'+':''}{format(row.contribution,3)}</p><blockquote translate="no" className="mt-2 border-l-2 border-teal-800 pl-3">{row.evidenceQuote}</blockquote><p className="text-[10px] text-slate-500"><span translate="no">{row.article.source} · {row.article.analysisProvider}</span> · {new Date(row.article.pubDate).toLocaleString(i18n.language)}</p></article>)}</div></details>}
    </details>
  </section>;
}
