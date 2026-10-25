import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_ASSETS, getAnalysisType } from '../data/assetCatalog.js';
import { fetchFundamentalsNews, fetchOHLCV, translateText } from '../services/api.js';
import { assetLabel } from '../utils/assetLabel.js';

const WINDOWS = [
  { id: 'day', label: { es: '24 h', pt: '24 h', en: '24h' }, days: 1 },
  { id: 'week', label: { es: '7 días', pt: '7 dias', en: '7 days' }, days: 7 },
  { id: 'month', label: { es: '30 días', pt: '30 dias', en: '30 days' }, days: 30 },
];

const SENTIMENT_SIGN = { positive: 1, neutral: 0, negative: -1 };
const IMPACT_WEIGHT = { low: 1, medium: 2, high: 3 };

const COPY = {
  es: { eyebrow: 'WaStake · análisis de eventos', title: 'Fundamentales', subtitle: 'Qué puede mover el mercado, por qué importa y qué señales conviene confirmar.', update: 'Actualizar', updating: 'Actualizando…', asset: 'Activo', period: 'Periodo de análisis', bias: 'Sesgo informativo', biasHelp: 'Tono detectado en los titulares', intensity: 'Relevancia media', newsCount: 'titulares en', reaction: 'Reacción media observada', reactionHelp: 'Movimiento posterior; no prueba que la noticia lo causara', guide: 'Cómo leer esta pantalla', guideText: 'La IA analiza el contexto del texto disponible y estima la relevancia; si no responde, mostramos una estimación preliminar basada solo en palabras del titular, claramente identificada. El medidor no predice si el precio subirá o bajará. El tono y la reacción posterior tampoco prueban causalidad.', list: 'Noticias ordenadas por relevancia', available: 'disponibles', loading: 'Cargando titulares e histórico de precios…', empty: 'No hay titulares disponibles para este activo en el periodo seleccionado.', translation: 'Traducción automática', translationUnavailable: 'Traducción no disponible; se muestra el titular original.', impact: 'Relevancia estimada', low: 'Limitada', medium: 'Moderada', high: 'Alta', news: '1. ¿Qué pasó?', why: '2. ¿Por qué podría afectar?', projection: '3. ¿Qué conviene observar?', positive: 'Positivo', negative: 'Negativo', neutral: 'Mixto o sin dirección clara', highExplanation: 'El titular menciona un evento que suele atraer atención del mercado, como regulación, resultados, tasas o un incidente de seguridad.', mediumExplanation: 'El titular menciona un cambio o anuncio que podría influir en expectativas, adopción o actividad.', lowExplanation: 'Con las palabras detectadas, no aparece un catalizador claro de impacto. El contexto completo puede cambiar esta lectura.', projectionPositive: 'Si el mercado confirma esta lectura, el ánimo podría mejorar; comprueba volumen y reacción del precio.', projectionNegative: 'Si el mercado confirma esta lectura, podría aumentar la presión vendedora; comprueba volumen y reacción del precio.', projectionNeutral: 'La dirección no está clara. Espera más información y observa cómo responde el precio.', matched: 'Palabras que activaron la regla', score: 'Puntaje de tono', observed: 'Cambio posterior observado', after: 'cierre diario, al menos 24 h', noTranslation: 'No se pudo traducir; se muestra el titular original.', disclaimer: 'Lectura educativa y experimental, no una predicción ni asesoramiento financiero. Los movimientos posteriores no demuestran causalidad.', method: 'Método y límites', methodDetails: 'La relevancia se ordena por categoría de palabras clave; el tono usa el balance entre términos positivos y negativos. El cambio posterior compara el último cierre previo con el primer cierre al menos 24 horas después. Las reglas pueden pasar por alto contexto, negaciones y sarcasmo. Las noticias proceden de RSS públicos y hay hasta 10 titulares recientes por activo; el rango de 30 días no implica un archivo completo.' },
  en: { eyebrow: 'WaStake · event analysis', title: 'Fundamentals', subtitle: 'What could move markets, why it matters, and which signals to confirm.', update: 'Refresh', updating: 'Refreshing…', asset: 'Asset', period: 'Analysis period', bias: 'News tone', biasHelp: 'Tone detected in headlines', intensity: 'Average relevance', newsCount: 'headlines in', reaction: 'Average observed reaction', reactionHelp: 'Later price move; it does not prove the news caused it', guide: 'How to read this page', guideText: 'AI reviews the available text and estimates relevance. If it is unavailable, we clearly label a preliminary estimate based only on headline words. The meter does not predict whether price will rise or fall. Tone and later price moves do not prove causation.', list: 'News ranked by relevance', available: 'available', loading: 'Loading headlines and price history…', empty: 'No headlines are available for this asset in the selected period.', translation: 'Automatic translation', translationUnavailable: 'Translation unavailable; showing the original headline.', impact: 'Estimated relevance', low: 'Limited', medium: 'Moderate', high: 'High', news: '1. What happened?', why: '2. Why might it matter?', projection: '3. What should I watch?', positive: 'Positive', negative: 'Negative', neutral: 'Mixed or unclear', highExplanation: 'The headline mentions an event that often attracts market attention, such as regulation, earnings, rates, or a security incident.', mediumExplanation: 'The headline mentions a change or announcement that could influence expectations, adoption, or activity.', lowExplanation: 'The detected words do not show a clear catalyst. Full context may change this reading.', projectionPositive: 'If the market confirms this reading, sentiment could improve; check volume and price reaction.', projectionNegative: 'If the market confirms this reading, selling pressure could rise; check volume and price reaction.', projectionNeutral: 'Direction is unclear. Wait for more information and watch the price response.', matched: 'Words that triggered the rule', score: 'Tone score', observed: 'Observed later change', after: 'daily close, at least 24h', noTranslation: 'Could not translate; showing the original headline.', disclaimer: 'Educational and experimental reading, not a forecast or financial advice. Later price moves do not prove causation.', method: 'Method and limitations', methodDetails: 'Relevance is ranked by keyword category; tone uses the balance of positive and negative terms. Later change compares the last close before publication with the first close at least 24 hours later. Rules can miss context, negation, and sarcasm. News comes from public RSS feeds, with up to 10 recent headlines per asset; a 30-day filter is not a complete archive.' },
  pt: { eyebrow: 'WaStake · análise de eventos', title: 'Fundamentos', subtitle: 'O que pode mover o mercado, por que importa e que sinais convém confirmar.', update: 'Atualizar', updating: 'Atualizando…', asset: 'Ativo', period: 'Período de análise', bias: 'Tom das notícias', biasHelp: 'Tom detetado nos títulos', intensity: 'Relevância média', newsCount: 'títulos em', reaction: 'Reação média observada', reactionHelp: 'Movimento posterior; não prova que a notícia o causou', guide: 'Como ler esta página', guideText: 'A IA analisa o contexto do texto disponível e estima a relevância. Se não responder, mostramos uma estimativa preliminar baseada apenas nas palavras do título, claramente identificada. O indicador não prevê se o preço vai subir ou descer. O tom e a reação posterior não provam causalidade.', list: 'Notícias ordenadas por relevância', available: 'disponíveis', loading: 'A carregar títulos e histórico de preços…', empty: 'Não há títulos disponíveis para este ativo no período selecionado.', translation: 'Tradução automática', translationUnavailable: 'Tradução indisponível; a mostrar o título original.', impact: 'Relevância estimada', low: 'Limitada', medium: 'Moderada', high: 'Alta', news: '1. O que aconteceu?', why: '2. Porque pode afetar?', projection: '3. O que observar?', positive: 'Positivo', negative: 'Negativo', neutral: 'Misto ou sem direção clara', highExplanation: 'O título menciona um evento que costuma atrair atenção do mercado, como regulação, resultados, taxas ou segurança.', mediumExplanation: 'O título menciona uma mudança ou anúncio que pode influenciar expectativas, adoção ou atividade.', lowExplanation: 'As palavras detetadas não mostram um catalisador claro. O contexto completo pode alterar esta leitura.', projectionPositive: 'Se o mercado confirmar esta leitura, o sentimento pode melhorar; verifique o volume e a reação do preço.', projectionNegative: 'Se o mercado confirmar esta leitura, a pressão de venda pode aumentar; verifique o volume e a reação do preço.', projectionNeutral: 'A direção não está clara. Aguarde mais informações e observe a resposta do preço.', matched: 'Palavras que ativaram a regra', score: 'Pontuação do tom', observed: 'Variação posterior observada', after: 'fecho diário, pelo menos 24 h', noTranslation: 'Não foi possível traduzir; a mostrar o título original.', disclaimer: 'Leitura educativa e experimental, não é previsão nem aconselhamento financeiro. Movimentos posteriores não provam causalidade.', method: 'Método e limitações', methodDetails: 'A relevância é ordenada por categoria de palavras-chave; o tom usa o equilíbrio entre termos positivos e negativos. A variação posterior compara o último fecho anterior com o primeiro fecho pelo menos 24 horas depois. As regras podem ignorar contexto, negações e sarcasmo. As notícias vêm de feeds RSS públicos, com até 10 títulos recentes por ativo; o filtro de 30 dias não é um arquivo completo.' },
};

const ANALYSIS_LABELS = {
  es: { aiReady: 'Análisis contextual con IA', aiPartial: 'Análisis contextual: {{analyzed}} de {{total}} noticias; el resto usa reglas preliminares', aiMissing: 'IA no configurada en el backend', aiUnavailable: 'IA temporalmente no disponible; se muestran reglas base', original: 'Titular original', category: 'Tema', confidence: 'Confianza del análisis', horizon: 'Horizonte', scenario: 'Escenarios posibles · condicionales, no pronósticos', bull: 'Si aparecen señales favorables', base: 'Escenario central', bear: 'Si aparecen señales adversas', evidence: 'Evidencia textual', limitation: 'Límites y dudas', depthArticle: 'Base: texto del artículo · IA contextual', depthRss: 'Base: extracto RSS · IA contextual', depthTitle: 'Base: solo el titular · IA contextual', rulesOnly: 'Lectura preliminar: reglas del titular; no es análisis contextual', provider: 'Proveedor', relevanceMeter: 'Indicador de relevancia estimada', factors: 'Componentes de la relevancia', severity: 'Gravedad 25%', assetLink: 'Relación con el activo 25%', surprise: 'Sorpresa 20%', persistence: 'Persistencia 15%', evidenceFactor: 'Evidencia 15%', translationMissing: 'La IA no pudo traducir este titular' },
  pt: { aiReady: 'Análise contextual com IA', aiPartial: 'Análise contextual: {{analyzed}} de {{total}} notícias; as restantes usam regras preliminares', aiMissing: 'IA não configurada no backend', aiUnavailable: 'IA temporariamente indisponível; a mostrar regras base', original: 'Título original', category: 'Tema', confidence: 'Confiança da análise', horizon: 'Horizonte', scenario: 'Cenários possíveis · condicionais, não previsões', bull: 'Se surgirem sinais favoráveis', base: 'Cenário central', bear: 'Se surgirem sinais adversos', evidence: 'Evidência textual', limitation: 'Limites e dúvidas', depthArticle: 'Base: texto do artigo · IA contextual', depthRss: 'Base: excerto RSS · IA contextual', depthTitle: 'Base: apenas o título · IA contextual', rulesOnly: 'Leitura preliminar: regras do título; não é análise contextual', provider: 'Fornecedor', relevanceMeter: 'Indicador de relevância estimada', factors: 'Componentes da relevância', severity: 'Gravidade 25%', assetLink: 'Relação com o ativo 25%', surprise: 'Surpresa 20%', persistence: 'Persistência 15%', evidenceFactor: 'Evidência 15%', translationMissing: 'A IA não conseguiu traduzir este título' },
  en: { aiReady: 'Contextual AI analysis', aiPartial: 'Contextual analysis: {{analyzed}} of {{total}} stories; the rest use preliminary rules', aiMissing: 'AI is not configured on the backend', aiUnavailable: 'AI is temporarily unavailable; showing baseline rules', original: 'Original headline', category: 'Topic', confidence: 'Analysis confidence', horizon: 'Horizon', scenario: 'Possible scenarios · conditional, not forecasts', bull: 'If favorable signals emerge', base: 'Central scenario', bear: 'If adverse signals emerge', evidence: 'Text evidence', limitation: 'Limits and uncertainty', depthArticle: 'Basis: article text · contextual AI', depthRss: 'Basis: RSS excerpt · contextual AI', depthTitle: 'Basis: headline only · contextual AI', rulesOnly: 'Preliminary reading: headline rules; not contextual analysis', provider: 'Provider', relevanceMeter: 'Estimated relevance meter', factors: 'Relevance components', severity: 'Severity 25%', assetLink: 'Asset link 25%', surprise: 'Surprise 20%', persistence: 'Persistence 15%', evidenceFactor: 'Evidence 15%', translationMissing: 'AI could not translate this headline' },
};

const FALLBACK_LABELS = {
  es: { navLabel: 'Navegación principal', translationLoading: 'Traduciendo el titular; se muestra el original mientras tanto.', translationMissing: 'No hay traducción disponible; se muestra el titular original.', preliminary: 'Relevancia preliminar · solo reglas del titular', preliminaryImpact: 'Puntuación preliminar', preliminarySummary: 'La IA contextual no está disponible. Esta lectura se basa solo en palabras clave del titular.', preliminaryWhy: 'Las reglas detectan términos asociados a eventos de mercado, pero no verifican el contexto ni la relación directa con este activo.', preliminaryWatch: 'Consulta la fuente y confirma los hechos y su relevancia antes de sacar conclusiones.', preliminaryIntensity: 'Relevancia media · estimación preliminar', partialIntensity: 'Relevancia media · análisis parcial', preliminaryTone: 'Tono preliminar del titular' },
  pt: { navLabel: 'Navegação principal', translationLoading: 'A traduzir o título; o original é mostrado entretanto.', translationMissing: 'Tradução indisponível; a mostrar o título original.', preliminary: 'Relevância preliminar · apenas regras do título', preliminaryImpact: 'Pontuação preliminar', preliminarySummary: 'A IA contextual não está disponível. Esta leitura baseia-se apenas em palavras-chave do título.', preliminaryWhy: 'As regras detetam termos associados a eventos de mercado, mas não verificam o contexto nem a relação direta com este ativo.', preliminaryWatch: 'Consulte a fonte e confirme os factos e a relevância antes de tirar conclusões.', preliminaryIntensity: 'Relevância média · estimativa preliminar', partialIntensity: 'Relevância média · análise parcial', preliminaryTone: 'Tom preliminar do título' },
  en: { navLabel: 'Main navigation', translationLoading: 'Translating headline; showing the original in the meantime.', translationMissing: 'Translation unavailable; showing the original headline.', preliminary: 'Preliminary relevance · headline rules only', preliminaryImpact: 'Preliminary score', preliminarySummary: 'Contextual AI is unavailable. This reading uses headline keywords only.', preliminaryWhy: 'Rules detect terms associated with market events, but do not verify context or a direct link to this asset.', preliminaryWatch: 'Open the source and confirm the facts and relevance before drawing conclusions.', preliminaryIntensity: 'Average relevance · preliminary estimate', partialIntensity: 'Average relevance · partial analysis', preliminaryTone: 'Preliminary headline tone' },
};

function impactValue(impact) { return ({ low: 25, medium: 60, high: 90 })[impact] ?? 25; }
function languageCode(language) { return language?.toLowerCase().startsWith('pt') ? 'pt' : language?.toLowerCase().startsWith('es') ? 'es' : 'en'; }
function articleKey(article) { return article.link || `${article.pubDate}-${article.title}`; }
function hasContextualAnalysis(article) {
  return Number.isFinite(article.relevance)
    && Boolean(article.analysisProvider)
    && Boolean(article.summary && article.mechanism && article.watch);
}
function relevanceValue(article) {
  const raw = hasContextualAnalysis(article) ? article.relevance : Math.min(55, impactValue(article.impact));
  return Math.max(0, Math.min(100, Math.round(raw)));
}
function scoreArticles(articles) {
  if (!articles.length) return { direction: null, intensity: null };

  let signedWeight = 0;
  let totalWeight = 0;
  for (const article of articles) {
    const weight = hasContextualAnalysis(article)
      ? (IMPACT_WEIGHT[article.impact] ?? IMPACT_WEIGHT.low)
      : 1;
    const direction = Number.isFinite(article.score) ? article.score / 100 : (SENTIMENT_SIGN[article.sentiment] ?? 0);
    signedWeight += direction * weight;
    totalWeight += weight;
  }

  return {
    direction: Math.round((signedWeight / totalWeight) * 100),
    intensity: Math.round(articles.reduce((sum, article) => sum + relevanceValue(article), 0) / articles.length),
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

function formatPercent(value, pending = '—') {
  if (value == null || !Number.isFinite(value)) return pending;
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
}

function formatDate(value, language) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return ({ es: 'Fecha desconocida', pt: 'Data desconhecida', en: 'Unknown date' })[language] ?? '—';
  const locale = language === 'pt' ? 'pt-PT' : language === 'en' ? 'en-GB' : 'es-ES';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function scoreTone(value) {
  if (value == null || value === 0) return 'text-slate-300';
  return value > 0 ? 'text-green-400' : 'text-red-400';
}

export function Fundamentals() {
  const { i18n, t: translate } = useTranslation();
  const lang = languageCode(i18n.resolvedLanguage || i18n.language);
  const t = COPY[lang];
  const analysisLabels = { ...ANALYSIS_LABELS[lang], ...FALLBACK_LABELS[lang] };
  const assets = useMemo(() => ALL_ASSETS.filter(asset => asset.analysisType), []);
  const [assetId, setAssetId] = useState('bitcoin');
  const [periodId, setPeriodId] = useState('day');
  const [refreshKey, setRefreshKey] = useState(0);
  const [articles, setArticles] = useState([]);
  const [translatedTitles, setTranslatedTitles] = useState({});
  const [translating, setTranslating] = useState(false);
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const [aiCoverage, setAiCoverage] = useState({ analyzed: 0, total: 0 });

  const asset = assets.find(item => item.id === assetId) ?? assets[0];
  const selectedWindow = WINDOWS.find(window => window.id === periodId) ?? WINDOWS[0];
  const selectedPeriodLabel = selectedWindow.label[lang];

  useEffect(() => {
    if (!asset) return undefined;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setAnalyzing(false);
      setArticles([]);
      setCandles([]);
      setNewsError('');
      setPriceError('');
      setAiStatus('');
      setAiCoverage({ analyzed: 0, total: 0 });
      const type = getAnalysisType(asset);
      // Price history and headlines render independently; AI never blocks either.
      fetchOHLCV(asset.id, type, { days: 90, interval: '1d', range: '3mo' })
        .then(result => { if (!cancelled) setCandles(Array.isArray(result?.candles) ? result.candles : []); })
        .catch(() => { if (!cancelled) setPriceError(translate('fundamentals_price_error')); });
      let baseline;
      try {
        baseline = await fetchFundamentalsNews(asset, type, lang, 'headlines');
        if (cancelled) return;
        setArticles(Array.isArray(baseline?.news) ? baseline.news : []);
        setAiStatus('pending');
      } catch {
        if (cancelled) return;
        setNewsError(translate('fundamentals_news_error'));
        setLoading(false);
        return;
      }
      setLoading(false);
      if (!baseline?.news?.length) return;
      setAnalyzing(true);
      try {
        const result = await fetchFundamentalsNews(asset, type, lang);
        if (cancelled) return;
        setArticles(Array.isArray(result?.news) ? result.news : baseline.news);
        setAiStatus(result?.aiStatus ?? 'unavailable');
        setAiCoverage({ analyzed: Number(result?.analyzedCount) || 0, total: Number(result?.count) || baseline.news.length });
      } catch {
        if (cancelled) return;
        setAiStatus('unavailable');
      } finally {
        if (!cancelled) setAnalyzing(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [asset?.id, refreshKey, lang]);

  useEffect(() => {
    const pending = articles.filter(article => article.title && lang !== 'en'
      && (!article.localizedTitle || article.localizedTitle.trim() === article.title.trim()));
    if (!pending.length) { setTranslating(false); return undefined; }
    let cancelled = false;
    setTranslating(true);
    (async () => {
      const translated = {};
      for (let start = 0; start < pending.length; start += 3) {
        const batch = pending.slice(start, start + 3);
        const results = await Promise.allSettled(batch.map(article => translateText(article.title, lang, 'en')));
        results.forEach((result, index) => {
          const value = result.status === 'fulfilled' ? (result.value?.translatedText || result.value?.translation || '') : '';
          if (value && value.trim() && value.trim() !== batch[index].title.trim()) translated[articleKey(batch[index])] = value.trim();
        });
      }
      if (!cancelled) {
        setTranslatedTitles(current => ({ ...current, ...Object.fromEntries(Object.entries(translated).map(([key, value]) => [`${lang}:${key}`, value])) }));
        setTranslating(false);
      }
    })();
    return () => { cancelled = true; };
  }, [articles, lang]);

  const periodArticles = useMemo(() => {
    const cutoff = Date.now() - selectedWindow.days * 86_400_000;
    return articles
      .filter(article => Number.isFinite(Date.parse(article.pubDate)) && Date.parse(article.pubDate) >= cutoff)
      .sort((a, b) => relevanceValue(b) - relevanceValue(a)
        || Date.parse(b.pubDate) - Date.parse(a.pubDate));
  }, [articles, selectedWindow.days]);

  const score = useMemo(() => scoreArticles(periodArticles), [periodArticles]);
  const hasPreliminaryItems = periodArticles.some(article => !hasContextualAnalysis(article));
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
      const category = translate(`asset_category_${item.categoryId}`, { defaultValue: item.categoryLabel });
      if (!groups.has(category)) groups.set(category, []);
      groups.get(category).push(item);
    }
    return [...groups.entries()];
  }, [assets, lang, translate]);

  return (
    <main className="mx-auto w-full min-w-0 max-w-7xl px-4 py-6 text-white">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">{t.eyebrow}</p>
          <h1 className="text-2xl font-bold">{t.title}</h1>
          <p className="mt-1 text-sm text-slate-400">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshKey(value => value + 1)}
          disabled={loading}
          className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 transition hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? t.updating : t.update}
        </button>
      </header>

      <section className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
        <label className="text-sm text-slate-400" htmlFor="fundamentals-asset">{t.asset}</label>
        <select
          id="fundamentals-asset"
          value={assetId}
          onChange={event => setAssetId(event.target.value)}
          className="min-w-0 w-full sm:w-auto sm:min-w-56 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-brand-500"
        >
          {assetGroups.map(([category, groupAssets]) => (
            <optgroup key={category} label={category}>
              {groupAssets.map(item => <option translate="no" key={item.id} value={item.id}>{assetLabel(item)}</option>)}
            </optgroup>
          ))}
        </select>
        <div className="ml-auto flex gap-1 rounded-lg border border-slate-700 bg-slate-950/60 p-1" aria-label={t.period}>
          {WINDOWS.map(window => (
            <button
              key={window.id}
              type="button"
              onClick={() => setPeriodId(window.id)}
              aria-pressed={periodId === window.id}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${periodId === window.id ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {window.label[lang]}
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
          <p className="text-xs uppercase tracking-wide text-slate-400">{t.bias}</p>
          <p className={`mt-2 font-mono text-3xl font-bold ${scoreTone(score.direction)}`}>
            {score.direction == null ? '—' : `${score.direction > 0 ? '+' : ''}${score.direction}`}
            {score.direction != null && <span className="ml-1 text-sm font-normal text-slate-500">/ 100</span>}
          </p>
          <p className="mt-1 text-xs text-slate-500">{t.biasHelp}</p>
        </article>
        <article className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{hasPreliminaryItems ? (aiStatus === 'partial' ? analysisLabels.partialIntensity : analysisLabels.preliminaryIntensity) : t.intensity}</p>
          <p className="mt-2 font-mono text-3xl font-bold text-white">
            {score.intensity == null ? '—' : `${score.intensity}`}<span className="ml-1 text-sm font-normal text-slate-500">/ 100</span>
          </p>
          <p className="mt-1 text-xs text-slate-500">{periodArticles.length} {t.newsCount} {selectedPeriodLabel}</p>
        </article>
        <article className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-4">
          <p className="text-xs uppercase tracking-wide text-slate-400">{t.reaction}</p>
          <p className={`mt-2 font-mono text-3xl font-bold ${scoreTone(meanReaction)}`}>{formatPercent(meanReaction, translate('fundamentals_pending'))}</p>
          <p className="mt-1 text-xs text-slate-500">{t.reactionHelp} · {reactions.length}</p>
        </article>
      </section>

      <details className="mb-5 rounded-xl border border-slate-700/60 bg-slate-900/50 px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium text-slate-200">{t.guide}</summary>
        <div className="mt-3 space-y-2 text-sm leading-6 text-slate-400">
          <p>{t.guideText}</p>
          <p><strong className="text-amber-300">{t.method}: </strong>{lang === 'es' ? 'La IA lee texto público del artículo o, si no está disponible, el extracto RSS. Estima cinco factores del 0 al 100: gravedad (25%), relación directa con el activo (25%), sorpresa (20%), persistencia probable (15%) y calidad de evidencia (15%). La relevancia es la suma ponderada; el sesgo direccional se muestra por separado. Las estimaciones pueden equivocarse y no son pronósticos.' : lang === 'pt' ? 'A IA lê o texto público do artigo ou, se não estiver disponível, o excerto RSS. Estima cinco fatores de 0 a 100: gravidade (25%), relação direta com o ativo (25%), surpresa (20%), persistência provável (15%) e qualidade da evidência (15%). A relevância é a soma ponderada; a direção é apresentada separadamente. As estimativas podem falhar e não são previsões.' : 'AI reads public article text or, when unavailable, the RSS excerpt. It estimates five factors from 0 to 100: severity (25%), direct asset link (25%), surprise (20%), likely persistence (15%), and evidence quality (15%). Relevance is their weighted sum; directional bias is separate. These estimates can be wrong and are not forecasts.'}</p>
        </div>
      </details>

      <section className="rounded-xl border border-slate-700/60 bg-slate-900/50">
        <div className="flex items-center justify-between gap-3 border-b border-slate-700/50 px-4 py-3">
          <h2 className="font-semibold">{t.list} · {asset?.name ?? t.asset}</h2>
          <div className="flex flex-wrap items-center justify-end gap-3 text-xs">
            <span className={aiStatus === 'ready' ? 'text-emerald-400' : 'text-amber-400'}>{aiStatus === 'ready' ? analysisLabels.aiReady : aiStatus === 'partial' ? analysisLabels.aiPartial.replace('{{analyzed}}', aiCoverage.analyzed).replace('{{total}}', aiCoverage.total) : aiStatus === 'not_configured' ? analysisLabels.aiMissing : aiStatus === 'unavailable' ? analysisLabels.aiUnavailable : ''}</span>
            <span className="text-slate-400">{periodArticles.length} / {articles.length} {t.available}</span>
          </div>
        </div>
        {analyzing && <p className="border-b border-slate-700/50 px-4 py-3 text-sm text-sky-300" role="status">{translate('fundamentals_analyzing')}</p>}
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-400">{t.loading}</div>
        ) : periodArticles.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-400" role="status"><p>{t.empty}</p><p className="mt-2">{translate('fund_empty_help')}</p>{periodId !== WINDOWS.at(-1).id && <button type="button" onClick={()=>setPeriodId(WINDOWS.at(-1).id)} className="mt-4 min-h-10 rounded-lg border border-sky-600 px-4 text-sky-300">{translate('fund_expand')}</button>}</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {periodArticles.map((article, index) => {
              const articleScore = Number.isFinite(article.score) ? article.score : 0;
              const reaction = reactionAfterArticle(article, candles);
              const contextual = hasContextualAnalysis(article);
              const relevance = relevanceValue(article);
              const fallbackTitle = translatedTitles[`${lang}:${articleKey(article)}`];
              const title = article.localizedTitle || fallbackTitle || article.title;
              const toneLabel = article.sentiment === 'positive' ? t.positive : article.sentiment === 'negative' ? t.negative : t.neutral;
              const impactCopy = contextual ? (article.mechanism || (article.impact === 'high' ? t.highExplanation : article.impact === 'medium' ? t.mediumExplanation : t.lowExplanation)) : analysisLabels.preliminaryWhy;
              const projection = contextual ? (article.watch || (article.sentiment === 'positive' ? t.projectionPositive : article.sentiment === 'negative' ? t.projectionNegative : t.projectionNeutral)) : analysisLabels.preliminaryWatch;
              const relevanceBand = relevance >= 70 ? 'high' : relevance >= 40 ? 'medium' : 'low';
              const analysisBasis = contextual
                ? (article.analysisDepth === 'article' ? analysisLabels.depthArticle : article.analysisDepth === 'rss' ? analysisLabels.depthRss : analysisLabels.depthTitle)
                : analysisLabels.rulesOnly;
              const relevanceLabel = contextual
                ? (relevanceBand === 'high' ? t.high : relevanceBand === 'medium' ? t.medium : t.low)
                : analysisLabels.preliminary;
              return (
                <article key={article.link || `${article.pubDate}-${index}`} className="flex w-full min-w-0 flex-col gap-3 px-4 py-4">
                  <div className="w-full min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-slate-300">{article.source || 'Fuente RSS'}</span>
                      <span>·</span>
                      <time dateTime={article.pubDate}>{formatDate(article.pubDate, lang)}</time>
                    </div>
                    {article.link ? (
                      <a href={article.link} target="_blank" rel="noopener noreferrer" className="font-medium leading-6 text-white hover:text-brand-300">
                        {title}
                      </a>
                    ) : (
                      <p className="font-medium leading-6 text-white">{title}</p>
                    )}
                    {title !== article.title && <p className="mt-1 text-xs text-slate-500">{analysisLabels.original}: {article.title}</p>}
                    {title === article.title && lang !== 'en' && <p className="mt-1 text-xs text-amber-400">{translating ? analysisLabels.translationLoading : analysisLabels.translationMissing}</p>}
                    <div className="mt-4 rounded-lg border border-slate-700/60 bg-slate-950/40 p-3">
                      <p className={`mb-3 text-[11px] ${contextual ? 'text-sky-300' : 'text-amber-300'}`} role="note">{analysisBasis}</p>
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold text-slate-200">{contextual ? t.impact : analysisLabels.preliminaryImpact}: {relevanceLabel}</span>
                        <span className="text-slate-500">{relevance}/100</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800" role="meter" aria-label={analysisLabels.relevanceMeter} aria-valuemin="0" aria-valuemax="100" aria-valuenow={relevance}>
                        <div className={`h-full rounded-full ${relevanceBand === 'high' ? 'bg-rose-500' : relevanceBand === 'medium' ? 'bg-amber-400' : 'bg-sky-500'}`} style={{ width: `${relevance}%` }} />
                      </div>
                      <div className="mt-3 grid gap-2 text-xs leading-5 sm:grid-cols-3">
                        <p><strong className="block text-slate-200">{t.news}</strong><span className="text-slate-400">{contextual ? (article.summary || title) : analysisLabels.preliminarySummary}</span></p>
                        <p><strong className="block text-slate-200">{t.why}</strong><span className="text-slate-400">{impactCopy}</span></p>
                        <p><strong className="block text-slate-200">{t.projection}</strong><span className="text-slate-400">{projection}</span></p>
                      </div>
                      {article.category && contextual && <p className="mt-3 text-xs text-slate-400"><strong className="text-slate-200">{analysisLabels.category}: </strong>{article.category}{article.horizon ? ` · ${article.horizon}` : ''}{article.confidence != null ? ` · ${analysisLabels.confidence}: ${article.confidence}%` : ''}</p>}
                      {article.factors && <details className="mt-3 text-xs text-slate-400"><summary className="cursor-pointer text-slate-300">{analysisLabels.factors} · {relevance}/100</summary><div className="mt-2 grid grid-cols-2 gap-1 sm:grid-cols-5"><span>{analysisLabels.severity}: {article.factors.severity}</span><span>{analysisLabels.assetLink}: {article.factors.assetLink}</span><span>{analysisLabels.surprise}: {article.factors.surprise}</span><span>{analysisLabels.persistence}: {article.factors.persistence}</span><span>{analysisLabels.evidenceFactor}: {article.factors.evidence}</span></div></details>}
                      {article.scenarios && <div className="mt-3 border-t border-slate-800 pt-3"><p className="mb-2 text-xs font-semibold text-slate-200">{analysisLabels.scenario}</p><div className="grid gap-2 text-xs leading-5 sm:grid-cols-3"><p className="text-emerald-300"><strong className="block">{analysisLabels.bull}</strong><span className="text-slate-400">{article.scenarios.positive}</span></p><p className="text-sky-300"><strong className="block">{analysisLabels.base}</strong><span className="text-slate-400">{article.scenarios.base}</span></p><p className="text-rose-300"><strong className="block">{analysisLabels.bear}</strong><span className="text-slate-400">{article.scenarios.negative}</span></p></div></div>}
                      {article.evidenceQuote && <p className="mt-3 text-xs text-slate-400"><strong className="text-slate-200">{analysisLabels.evidence}: </strong>“{article.evidenceQuote}”</p>}
                      {article.limitations && <p className="mt-2 text-xs text-amber-300"><strong>{analysisLabels.limitation}: </strong>{article.limitations}</p>}
                      <p className="mt-2 text-[11px] text-slate-500">{article.analysisDepth === 'article' ? analysisLabels.depthArticle : article.analysisDepth === 'rss' ? analysisLabels.depthRss : analysisLabels.depthTitle}{article.analysisProvider ? ` · ${analysisLabels.provider}: ${article.analysisProvider}` : ` · ${aiStatus === 'not_configured' ? analysisLabels.aiMissing : analysisLabels.aiUnavailable}`}</p>
                    </div>
                    {article.matchedTerms && !contextual && (
                      <p className="mt-2 text-xs text-slate-500">
                        {t.matched}: {[...article.matchedTerms.positive, ...article.matchedTerms.negative, ...article.matchedTerms.highImpact, ...article.matchedTerms.mediumImpact].join(', ') || '—'}
                      </p>
                    )}
                  </div>
                  <div className="grid w-full grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-slate-500">{contextual ? t.score : analysisLabels.preliminaryTone}</p>
                      <p className={`font-mono font-semibold ${scoreTone(articleScore)}`}>{articleScore > 0 ? '+' : ''}{articleScore}</p>
                      <p className="text-xs text-slate-500">{toneLabel}{contextual ? ` · ${t.impact.toLowerCase()} ${relevanceLabel.toLowerCase()}` : ''}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">{t.observed}</p>
                      <p className={`font-mono font-semibold ${scoreTone(reaction)}`}>{formatPercent(reaction, translate('fundamentals_pending'))}</p>
                      <p className="text-xs text-slate-500">{t.after}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <p className="mt-5 text-center text-xs text-slate-600">{t.disclaimer}</p>
    </main>
  );
}
