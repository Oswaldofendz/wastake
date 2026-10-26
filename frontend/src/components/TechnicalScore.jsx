export function ScoreGauge({ score, bias, t }) {
  const available = Number.isFinite(score);
  const pct = available ? Math.max(0, Math.min(100, score * 10)) : 0;
  return (
    <div className="w-full">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
        <p className="whitespace-nowrap text-4xl font-bold font-mono leading-none text-white" aria-label={available ? `${t('technical_score_title')}: ${score} ${t('technical_score_out_of_10')}` : t('technical_score_unavailable')}>
          {available ? Number(score).toFixed(1) : '—'}<span className="text-lg text-slate-500"> / 10</span>
        </p>
        <p className={`text-sm font-semibold ${bias === 'bullish' ? 'text-green-400' : bias === 'bearish' ? 'text-red-400' : 'text-amber-300'}`}>
          {t(available ? `technical_score_${bias}` : 'technical_score_unavailable')}
        </p>
      </div>
      <div className="relative mt-4 h-3 rounded-full bg-gradient-to-r from-red-600 via-amber-400 to-green-500" role="img" aria-label={available ? `${t('technical_score_scale')}: ${score} / 10` : t('technical_score_unavailable')}>
        {available && <span className="absolute -top-1.5 h-6 w-1 rounded-full border border-white bg-slate-950 shadow" style={{ left: `calc(${pct}% - 2px)` }} />}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-slate-400">
        <span>0 · {t('technical_score_negative')}</span>
        <span>5 · {t('technical_score_middle')}</span>
        <span>10 · {t('technical_score_positive')}</span>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-400">{t(available ? 'technical_score_explainer' : 'technical_score_missing_data')}</p>
    </div>
  );
}

export function ComponentScore({ name, item, t }) {
  const score = item?.score ?? null;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score * 10));
  const barColor = score == null ? 'bg-slate-600' : score <= 4 ? 'bg-red-500' : score >= 6 ? 'bg-green-500' : 'bg-amber-400';
  return (
    <div className="rounded-lg border border-slate-700/40 bg-slate-950/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-300">{t(`technical_component_${name}`)}</span>
        <span className="text-xs font-mono text-white">{score == null ? '—' : `${score.toFixed(1)} / 10`}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-slate-700">
        {score != null && <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />}
      </div>
      <p className="mt-1.5 text-[11px] text-slate-500">
        {item ? `${t('technical_component_weight')}: ${item.weight}%` : t('technical_component_unavailable')}
      </p>
    </div>
  );
}
