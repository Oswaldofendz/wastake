import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchOHLCV } from '../services/api.js';
import { commonCloseComparison } from '../utils/panoramaAnalysis.js';

export function MarketComparison({ asset, candles }) {
  const { t, i18n } = useTranslation();
  const [reference, setReference] = useState(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const referenceId = asset.id === 'bitcoin' ? 'SPY' : asset.type === 'crypto' ? 'bitcoin' : 'SPY';
  const referenceLabel = referenceId === 'bitcoin' ? 'BTC' : 'SPY';
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setReference(null);
    fetchOHLCV(referenceId, referenceId === 'bitcoin' ? 'crypto' : 'stock', {days:90})
      .then(data => { if (!cancelled) setReference(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [referenceId, attempt]);
  const comparison = commonCloseComparison(candles, reference?.candles);
  const fmt = n => Number.isFinite(n) ? `${n>=0?'+':''}${n.toLocaleString(i18n.language,{minimumFractionDigits:2,maximumFractionDigits:2})}%` : '—';
  const color = n => !Number.isFinite(n) ? 'text-slate-400' : n<0 ? 'text-red-400' : n>0 ? 'text-green-400' : 'text-slate-300';
  const date = n => new Date(n*1000).toLocaleDateString(i18n.language,{timeZone:'UTC'});
  return <section className="rounded-xl border border-slate-700/50 bg-[var(--bg-card)] p-4" aria-label={t('pan_comparison')}>
    <h2 className="text-sm font-semibold">{t('pan_comparison')} · <span translate="no">{referenceLabel}</span></h2>
    <p className="mt-1 text-xs leading-5 text-slate-400">{t('pan_comparison_method')}</p>
    {loading ? <p role="status" className="mt-4 text-sm text-slate-400">{t('pan_loading_comparison')}</p> : !comparison ? <div className="mt-4 text-sm text-slate-400" role="status"><p>{t('pan_comparison_missing')}</p><button type="button" onClick={()=>setAttempt(n=>n+1)} className="mt-3 min-h-10 rounded border border-slate-600 px-3">{t('retry')}</button></div> : <>
      <p className="mt-3 text-xs text-slate-400">{date(comparison.from)} → {date(comparison.to)} · UTC</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {[[asset.symbol,comparison.assetReturn],[referenceLabel,comparison.referenceReturn]].map(([symbol,value],i)=><div key={i} className="rounded-lg border border-slate-700/40 p-3"><p translate="no" className="text-xs text-slate-400">{symbol}</p><p className={`mt-1 font-mono text-xl ${color(value)}`}>{fmt(value)}</p></div>)}
      </div>
      <p className="mt-3 text-sm">{t('pan_difference')}: <strong className={color(comparison.difference)}>{comparison.difference.toLocaleString(i18n.language,{minimumFractionDigits:2,maximumFractionDigits:2})} {t('pan_percentage_points')}</strong></p>
    </>}
  </section>;
}
