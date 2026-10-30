import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { plannedContributions, portfolioMetrics } from '../utils/portfolioMetrics.js';

export function PortfolioOverview({ positions, onAdd, onDca, onExplore }) {
  const {t,i18n}=useTranslation();
  const [amount,setAmount]=useState('');
  const [frequency,setFrequency]=useState('monthly');
  const [months,setMonths]=useState('12');
  const metrics=portfolioMetrics(positions);
  const planned=amount.trim()?plannedContributions(Number(amount),frequency,Number(months)):null;
  const empty=!positions.length;
  return <section className="mb-5 rounded-xl border border-slate-700/50 bg-[var(--bg-card)] p-4">
    <h2 className="text-lg font-semibold">{t(empty?'portfolio_start':'portfolio_health')}</h2>
    {empty?<><p className="mt-1 text-sm leading-6 text-slate-400">{t('portfolio_intro')}</p><div className="mt-4 grid gap-3 sm:grid-cols-3">
      {[['portfolio_position','portfolio_position_help',onAdd],['portfolio_dca','portfolio_dca_help',onDca],['portfolio_review','portfolio_review_help',onExplore]].map(([title,help,action])=><button key={title} onClick={action} className="min-h-36 rounded-xl border border-slate-600 p-3 text-left transition hover:border-sky-400"><strong className="text-sm text-sky-300">{t(title)}</strong><p className="mt-2 text-xs leading-5 text-slate-400">{t(help)}</p><span className="mt-2 block text-sky-300" aria-hidden="true">→</span></button>)}
    </div></>:<><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{[
      ['portfolio_assets',metrics.assets],['portfolio_concentration',metrics.concentration==null?'—':`${metrics.concentration.toFixed(1)}%`],['portfolio_coverage',`${metrics.quoted} / ${metrics.count}`],
    ].map(([label,value])=><div key={label} className="rounded-lg border border-slate-700/50 p-3"><p className="text-xs text-slate-400">{t(label)}</p><p className="mt-1 font-mono text-xl">{value}</p></div>)}</div>
    {metrics.quoted<metrics.count&&<p role="status" className="mt-3 text-sm text-amber-300">{t('portfolio_missing')}</p>}
    {!metrics.costComplete&&<p role="status" className="mt-3 text-sm text-amber-300">{t('quant_missing_cost')}</p>}
    <p className="mt-3 text-xs leading-5 text-slate-400">{t('portfolio_method')}</p></>}
    <details className="mt-4 border-t border-slate-700/50 pt-3" open={empty?true:undefined}>
      <summary className="cursor-pointer text-sm font-semibold">{t('portfolio_plan')}</summary>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-slate-400">{t('portfolio_amount')}<input type="number" min="0" max="1000000000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-slate-600 bg-slate-800 px-3 text-white"/></label>
        <label className="text-xs text-slate-400">{t('portfolio_frequency')}<select value={frequency} onChange={e=>setFrequency(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-slate-600 bg-slate-800 px-3 text-white"><option value="monthly">{t('portfolio_monthly')}</option><option value="weekly">{t('portfolio_weekly')}</option></select></label>
        <label className="text-xs text-slate-400">{t('portfolio_months')}<input type="number" min="1" max="600" step="1" value={months} onChange={e=>setMonths(e.target.value)} className="mt-1 min-h-11 w-full rounded border border-slate-600 bg-slate-800 px-3 text-white"/></label>
      </div>
      <p className="mt-3 text-sm">{t('portfolio_projection')}: <strong className="font-mono text-sky-300">{planned==null?'—':planned.toLocaleString(i18n.language,{style:'currency',currency:'USD'})}</strong></p>
      <p className="mt-2 text-xs leading-5 text-slate-400">{t('portfolio_plan_help')}</p>
    </details>
  </section>;
}
