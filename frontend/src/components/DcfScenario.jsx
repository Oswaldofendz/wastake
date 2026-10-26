import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { evaluateDcf, dcfSensitivity } from '../utils/companyValuation.js';

const adjustments=['cash','debt','preferred','minority','nonOperatingAssets','otherClaims'];
export function DcfScenario({data,onResult}) {
  const {t,i18n}=useTranslation();
  const tr=(key,options)=>t(`valuation.${key}`,options);
  const [fields,setFields]=useState({});
  const currency=data.flows?.revenue?.currency;
  const number=key=>fields[key]?.trim()?Number(fields[key]):NaN;
  const q=data.quote;
  const quoteCurrency=q?.currency==='GBp'?'GBP':q?.currency;
  const price=quoteCurrency===currency&&Number.isFinite(q?.price)?q.price/(q.currency==='GBp'?100:1):null;
  const input={cashFlows:[1,2,3,4,5].map(n=>number(`fcff${n}`)),wacc:number('wacc')/100,g:number('g')/100,shares:number('diluted'),margin:number('margin')/100,price,...Object.fromEntries(adjustments.map(key=>[key,number(key)]))};
  const result=useMemo(()=>evaluateDcf(input),[fields,data]);
  useEffect(()=>{onResult?.({...result,currency});},[result,currency,onResult]);
  const fmt=(v,digits=2)=>Number.isFinite(v)?v.toLocaleString(i18n.language,{maximumFractionDigits:digits}):'—';
  const field=(key,label)=> <label key={key} className="block min-w-0 text-xs text-slate-300"><span className="mb-1 block">{label}</span><input type="number" step="any" value={fields[key]??''} onChange={e=>setFields(current=>({...current,[key]:e.target.value}))} className="min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 text-base text-white"/></label>;
  const prefill=()=>setFields(current=>({...current,...Object.fromEntries(['cash','debt','preferred','minority'].flatMap(key=>{
    const f=data.snapshot?.[key];return Number.isFinite(f?.value)&&f.currency===currency&&f.date===data.balanceDate?[[key,String(f.value/1e6)]]:[];
  }))}));
  if(/financ|bank|insurance/i.test(data.company?.sector??''))return <p className="mt-4 rounded-lg border border-amber-700/50 p-4 text-sm text-amber-200">{tr('banking')}</p>;
  return <details className="mt-4 rounded-xl border border-slate-700 p-4">
    <summary className="min-h-8 cursor-pointer font-semibold text-sky-200">{tr('scenario')}</summary>
    <div className="mt-4 space-y-4 text-sm leading-relaxed text-slate-300">
      <p>{tr('model')}</p><p>{tr('method')}</p><p>{tr('assumptionsGuide')}</p><p>{tr('bridge')}</p>
      {!currency?<p role="status">{tr('noCurrency')}</p>:<>
        <>
          <p className="font-semibold text-sky-200">{tr('units',{currency})}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3,4,5].map(n=>field(`fcff${n}`,tr('year',{n})))}{field('wacc',tr('wacc'))}{field('g',tr('g'))}</div>
          <button type="button" onClick={prefill} className="min-h-11 rounded-lg border border-sky-700 px-3 text-sky-200">{tr('prefill')}</button>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{adjustments.map(key=>field(key,tr(key)))}{field('diluted',tr('diluted'))}{field('margin',tr('margin'))}</div>
          <p className="text-xs text-slate-400">{tr('assumptions')}</p>
          {result.error?<p role="status" className="rounded-lg bg-slate-800 p-3">{tr(result.error)}</p>:<section aria-label={tr('results')} className="space-y-4 rounded-xl border border-sky-700/60 bg-slate-950/60 p-4">
            <p className="font-semibold text-sky-200">{tr(result.status)}</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{[['fair',result.fairValue],['threshold',result.threshold],['upside',result.upside],['safety',result.marginAtPrice]].map(([key,value])=><div key={key}><p className="text-xs text-slate-400">{tr(key)}</p><p className="text-xl font-semibold tabular-nums">{fmt(value)} {['fair','threshold'].includes(key)?currency:'%'}</p></div>)}</div>
            <dl className="space-y-2">{[['pv',result.pvFlows.reduce((a,b)=>a+b,0)],['terminalPv',result.pvTerminal],['ev',result.enterpriseValue],['equity',result.equityValue]].map(([key,value])=><div key={key} className="flex flex-wrap justify-between gap-2"><dt>{tr(key)}</dt><dd className="tabular-nums">{fmt(value)} M {currency}</dd></div>)}</dl>
            <p>{tr('dependence',{value:fmt(result.terminalWeight,1)})}</p>
            <div className="overflow-x-auto"><table className="w-full text-right text-xs"><caption className="mb-2 text-left text-slate-300">{tr('sensitivity')}</caption><thead><tr><th className="p-2">WACC / g</th>{dcfSensitivity(input)[0].map(cell=><th className="p-2" key={cell.g}>{fmt(cell.g*100)}%</th>)}</tr></thead><tbody>{dcfSensitivity(input).map((row,i)=><tr key={i}><th className="p-2">{fmt(row[0].wacc*100)}%</th>{row.map((cell,j)=><td className="border border-slate-700 p-2 tabular-nums" key={j}>{fmt(cell.value)}</td>)}</tr>)}</tbody></table></div>
            <p className="text-xs text-amber-200">{tr('caution')}</p>
          </section>}
        </>
      </>}
      <a className="inline-block text-sky-300 underline" href="https://pages.stern.nyu.edu/~adamodar/New_Home_Page/background/valintro.htm" target="_blank" rel="noopener noreferrer">{tr('learn')}</a>
    </div>
  </details>;
}
