import { useTranslation } from 'react-i18next';

export function PortfolioChart({ positions }) {
  const {t,i18n}=useTranslation();
  const entries=positions.filter(p=>!p.is_simulation && Number.isFinite(p.costBasis) && p.created_at).sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,8);
  const max=Math.max(...entries.map(p=>p.costBasis),1);
  return <div>
    <p className="mb-3 text-xs leading-5 text-slate-400">{t('portfolio_history_help')}</p>
    <ol className="space-y-3">{entries.map(p=><li key={p.id}>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs"><span className="min-w-0"><span translate="no" className="font-semibold">{p.asset_name}</span> · {new Date(p.created_at).toLocaleDateString(i18n.language)}</span><span className="font-mono">{p.costBasis.toLocaleString(i18n.language,{style:'currency',currency:'USD'})}</span></div>
      <div className="h-1.5 rounded bg-slate-700"><div className="h-full rounded bg-sky-400" style={{width:`${p.costBasis/max*100}%`}}/></div>
    </li>)}</ol>
  </div>;
}
