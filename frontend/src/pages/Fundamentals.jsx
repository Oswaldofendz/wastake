import { useEffect, useMemo, useState } from 'react';
import { ALL_ASSETS, getAnalysisType } from '../data/assetCatalog.js';
import { fetchFundamentalsNews, fetchOHLCV } from '../services/api.js';

const WINDOWS = [
  { id: 'day', label: '24 h', days: 1 },
  { id: 'week', label: '7 días', days: 7 },
  { id: 'month', label: '30 días', days: 30 },
];

const SENTIMENT_SIGN = { positive: 1, neutral: 0, negative: -1 };
const IMPACT_WEIGHT = { low: 1, medium: 2, high: 3 };
const IMPACT_LABEL = { low: 'Bajo', medium: 'Medio', high: 'Alto' };

function scoreArticles(articles) {
  if (!articles.length) return { direction: null, intensity: null };

  let signedWeight = 0;
  let totalWeight = 0;
  for (const article of articles) {
    const weight = IMPACT_WEIGHT[article.impact] ?? IMPACT_WEIGHT.low;
    signedWeight += (SENTIMENT_SIGN[article.sentiment] ?? 0) * weight;
    totalWeight += weight;
  }

  return {
    direction: Math.round((signedWeight / totalWeight) * 100),
    intensity: Math.round((totalWeight / (articles.length * 3)) * 100),
  };
}

function reactionAfterArticle(article, candles) {
  const publishedAt = Date.parse(article.pubDate);
  if (!Number.isFinite(publishedAt) || !candles?.length) return null;
  const publishedSeconds = publishedAt / 1000;
  const before = [...candles].reverse().find(candle => candle.time < publishedSeconds);
  const after = candles.find(candle => candle.time >= publishedSeconds + 86_400);
  if (!before || !after || !(before.close > 0) || !Number.isFinite(after.close)) return null;
  return ((after.close / before.close) - 1) * 100;
}

function formatPercent(value) {
  if (value == null || !Number.isFinite(value)) return 'Pendiente';
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Fecha desconocida';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function scoreTone(value) {
  if (value == null || value === 0) return 'text-slate-300';
  return value > 0 ? 'text-green-400' : 'text-red-400';
}

export function Fundamentals() {
  const assets = useMemo(() => ALL_ASSETS.filter(asset => asset.analysisType), []);
  const [assetId, setAssetId] = useState('bitcoin');
  const [periodId, setPeriodId] = useState('day');
  const [refreshKey, setRefreshKey] = useState(0);
  const [articles, setArticles] = useState([]);
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newsError, setNewsError] = useState('');
  const [priceError, setPriceError] = useState('');

  const asset = assets.find(item => item.id === assetId) ?? assets[0];
  const selectedWindow = WINDOWS.find(window => window.id === periodId) ?? WINDOWS[0];

  useEffect(() => {
    if (!asset) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setNewsError('');
      setPriceError('');
      const type = getAnalysisType(asset);
      const [newsResult, candleResult] = await Promise.allSettled([
        fetchFundamentalsNews(asset, type),
        fetchOHLCV(asset.id, type, { days: 90, interval: '1d', range: '3mo' }),
      ]);

      if (cancelled) return;
      if (newsResult.status === 'fulfilled') {
        setArticles(Array.isArray(newsResult.value?.news) ? newsResult.value.news : []);
      } else {
        setArticles([]);
        setNewsError('No se pudieron cargar las noticias de este activo.');
      }
      if (candleResult.status === 'fulfilled') {
        setCandles(Array.isArray(candleResult.value?.candles) ? candleResult.value.candles : []);
      } else {
        setCandles([]);
        setPriceError('No se pudo consultar el histórico de precios.');
      }
      setLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [asset?.id, refreshKey]);

  const periodArticles = useMemo(() => {
    const cutoff = Date.now() - selectedWindow.days * 86_400_000;
    return articles
      .filter(article => Number.isFinite(Date.parse(article.pubDate)) && Date.parse(article.pubDate) >= cutoff)
      .sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate));
  }, [articles, selectedWindow.days]);

  const score = useMemo(() => scoreArticles(periodArticles), [periodArticles]);
  const reactions = useMemo(
    () => periodArticles.map(article => reactionAfterArticle(article, candles)).filter(value => value != null),
    [periodArticles, candles],
  );
  const meanReaction = reactions.length
    ? reactions.reduce((sum, value) => sum + value, 0) / reactions.length
    : null;

  const assetGroups = useMemo(() => {
    const groups = new Map();
    for (const item of assets) {
      const category = item.categoryLabel ?? 'Otros';
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(item);
    }
    return [...groups.entries()];
  }, [assets]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 text-white">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">WaStake · análisis de eventos</p>
          <h1 className="text-2xl font-bold">Fundamentales</h1>
          <p className="mt-1 text-sm text-slate-400">Noticias asociadas al activo y reacción diaria observada en el precio.</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey(value => value + 1)}
          disabled={loading}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      <section className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
        <label className="text-sm text-slate-400" htmlFor="fundamentals-asset">Activo</label>
        <select
          id="fundamentals-asset"
          value={assetId}
          onChange={event => setAssetId(event.target.value)}
          className="min-w-56 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        >
          {assetGroups.map(([category, groupAssets]) => (
            <optgroup key={category} label={category}>
              {groupAssets.map(item => <option key={item.id} value={item.id}>{item.name} ({item.symbol})</option>)}
            </optgroup>
          ))}
        </select>
        <div className="ml-auto flex gap-1 rounded-lg border border-slate-700 bg-slate-950/60 p-1" aria-label="Periodo de análisis">
          {WINDOWS.map(window => (
            <button
              key={window.id}
              type="button"
              onClick={() => setPeriodId(window.id)}
              aria-pressed={periodId === window.id}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${periodId === window.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {window.label}
            </button>
          ))}
        </div>
      </section>

      {(newsError || priceError) && (
        <div className="mb-5 rounded-lg border border-amber-700/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-300">
          {[newsError, priceError].filter(Boolean).join(' ')}
        </div>
      )}

      <section className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <article className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Sesgo informativo ponderado</p>
          <p className={`mt-2 font-mono text-3xl font-bold ${scoreTone(score.direction)}`}>
            {score.direction == null ? '—' : `${score.direction > 0 ? '+' : ''}${score.direction}`}
            {score.direction != null && <span className="ml-1 text-sm font-normal text-slate-500">/ 100</span>}
          </p>
          <p className="mt-1 text-xs text-slate-500">Negativo ← tono de titulares → positivo</p>
        </article>
        <article className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Intensidad informativa</p>
          <p className="mt-2 font-mono text-3xl font-bold text-white">
            {score.intensity == null ? '—' : `${score.intensity}`}<span className="ml-1 text-sm font-normal text-slate-500">/ 100</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">{periodArticles.length} titulares en {selectedWindow.label}</p>
        </article>
        <article className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">Reacción media observada</p>
          <p className={`mt-2 font-mono text-3xl font-bold ${scoreTone(meanReaction)}`}>{formatPercent(meanReaction)}</p>
          <p className="mt-1 text-xs text-slate-500">Media simple de {reactions.length} eventos con una vela diaria posterior completa</p>
        </article>
      </section>

      <details className="mb-5 rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-200">Cómo se calculan estos valores y qué significan</summary>
        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
          <p><strong className="text-slate-200">Sesgo (-100 a +100):</strong> promedio del tono detectado por reglas léxicas, ponderado por impacto (bajo = 1, medio = 2, alto = 3). Cada titular muestra debajo las palabras que activaron la regla. No es una probabilidad ni una recomendación.</p>
          <p><strong className="text-slate-200">Intensidad (0 a 100):</strong> promedio del nivel de impacto (bajo = 33, medio = 67, alto = 100) de los titulares disponibles.</p>
          <p><strong className="text-slate-200">Reacción observada:</strong> media simple del cambio entre el último cierre diario previo a cada titular y el primer cierre disponible al menos 24 horas después. La ventana puede ser mayor en fines de semana y no demuestra causalidad.</p>
          <p><strong className="text-amber-300">Límites:</strong> los titulares se asocian por palabras clave; una regla puede pasar por alto negaciones, ironía o contexto. Las fuentes RSS entregan un conjunto limitado, el backend conserva la respuesta en caché hasta 30 minutos y esta versión aún no archiva eventos en Supabase: 30 días no equivale a un historial completo.</p>
        </div>
      </details>

      <section className="rounded-xl border border-slate-700/60 bg-slate-900/50">
        <div className="flex items-center justify-between gap-3 border-b border-slate-700/50 px-4 py-3">
          <h2 className="font-semibold">Noticias y respuesta del precio · {asset?.name ?? 'Activo'}</h2>
          <span className="text-xs text-slate-500">{periodArticles.length} de {articles.length} disponibles</span>
        </div>
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">Cargando titulares e histórico de precios…</div>
        ) : periodArticles.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400">No hay titulares disponibles para este activo en el periodo seleccionado.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {periodArticles.map((article, index) => {
              const articleScore = Number.isFinite(article.score) ? article.score : 0;
              const reaction = reactionAfterArticle(article, candles);
              return (
                <article key={article.link || `${article.pubDate}-${index}`} className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-300">{article.source || 'Fuente RSS'}</span>
                      <span>·</span>
                      <time dateTime={article.pubDate}>{formatDate(article.pubDate)}</time>
                    </div>
                    {article.link ? (
                      <a href={article.link} target="_blank" rel="noopener noreferrer" className="font-medium leading-6 text-white hover:text-brand-300">
                        {article.title}
                      </a>
                    ) : (
                      <p className="font-medium leading-6 text-white">{article.title}</p>
                    )}
                    {article.matchedTerms && (
                      <p className="mt-2 text-xs text-slate-500">
                        Términos detectados: {[...article.matchedTerms.positive, ...article.matchedTerms.negative, ...article.matchedTerms.highImpact, ...article.matchedTerms.mediumImpact].join(', ') || 'ninguno'}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm md:min-w-52">
                    <div>
                      <p className="text-xs text-slate-500">Puntaje del titular</p>
                      <p className={`font-mono font-semibold ${scoreTone(articleScore)}`}>{articleScore > 0 ? '+' : ''}{articleScore}</p>
                      <p className="text-xs capitalize text-slate-500">{article.sentiment ?? 'sin clasificar'} · impacto {IMPACT_LABEL[article.impact] ?? 'Bajo'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Cambio posterior</p>
                      <p className={`font-mono font-semibold ${scoreTone(reaction)}`}>{formatPercent(reaction)}</p>
                      <p className="text-xs text-slate-500">cierre diario, ≥24 h</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-5 text-center text-xs text-slate-600">Herramienta informativa experimental. La respuesta posterior describe movimientos de mercado y no atribuye causalidad a una noticia.</p>
    </main>
  );
}
