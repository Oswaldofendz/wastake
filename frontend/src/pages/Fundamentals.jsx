import {GlobalNews} from '../components/GlobalNews.jsx';
import {NewsPulse} from '../components/NewsPulse.jsx';
import {useAssetRoute} from '../hooks/useAssetRoute.js';
import {cachedPublicNews} from '../utils/publicNewsCache.js';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ALL_ASSETS, getAnalysisType } from '../data/assetCatalog.js';
import { fetchFundamentalsNews, fetchOHLCV, translateText } from '../services/api.js';
import { assetLabel } from '../utils/assetLabel.js';
import { reactionAfterArticle } from '../utils/newsReaction.js';

const WINDOWS = [
  { id: 'day', label: { es: '24 h', pt: '24 h', en: '24h' }, days: 1 },
  { id: 'week', label: { es: '7 días', pt: '7 dias', en: '7 days' }, days: 7 },
  { id: 'month', label: { es: '30 días', pt: '30 dias', en: '30 days' }, days: 30 },
];


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

function AssetFundamentals({initialAsset=null}) {
  const { i18n, t: translate } = useTranslation();
  const lang = languageCode(i18n.resolvedLanguage || i18n.language);
  const t = {...COPY[lang],after:translate('quant_daily_reaction'),methodDetails:translate('quant_daily_reaction_method')};
  const analysisLabels = { ...ANALYSIS_LABELS[lang], ...FALLBACK_LABELS[lang] };
  const baseAssets = useMemo(() => {const list=ALL_ASSETS.filter(asset=>asset.analysisType);return initialAsset&&!list.some(a=>a.id===initialAsset.id)?[initialAsset,...list]:list;}, [initialAsset]);
  const [selectedAsset,selectAsset]=useAssetRoute(initialAsset??baseAssets[0],baseAssets);
  const assets=selectedAsset&&!baseAssets.some(a=>a.id===selectedAsset.id)?[selectedAsset,...baseAssets]:baseAssets;
  const [periodId, setPeriodId] = useState('day');
  const [refreshKey, setRefreshKey] = useState(0);
  const [articles, setArticles] = useState([]);
  const [translatedTitles, setTranslatedTitles] = useState({});
  const [candles, setCandles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [newsError, setNewsError] = useState('');
  const [priceError, setPriceError] = useState('');
  const [newsAsOf,setNewsAsOf]=useState(null),[cachedView,setCachedView]=useState(false);

  const asset = selectedAsset??assets[0];
  const assetId=asset.id;
  const setAssetId=id=>selectAsset(assets.find(a=>a.id===id));
  const selectedWindow = WINDOWS.find(window => window.id === periodId) ?? WINDOWS[0];
  const selectedPeriodLabel = selectedWindow.label[lang];

  useEffect(() => {
    if (!asset) return undefined;
    let cancelled = false;

    let timer,running=false;
    async function load() {
      const type=getAnalysisType(asset),cached=cachedPublicNews(asset,type,lang);
      setLoading(!cached);setAnalyzing(true);setArticles(cached?.news??[]);setCachedView(Boolean(cached));setNewsAsOf(cached?.checkedAt??null);setCandles([]);setNewsError('');setPriceError('');
      fetchOHLCV(asset.id,type,{days:90,interval:'1d',range:'3mo'}).then(result=>{if(!cancelled)setCandles(result?.candles??[]);}).catch(()=>{if(!cancelled)setPriceError(translate('fundamentals_price_error'));});
      const read=async()=>{
        if(cancelled||running)return;
        if(document.visibilityState==='hidden'){timer=setTimeout(read,60000);return;}
        running=true;
        try{const result=await fetchFundamentalsNews(asset,type,lang,'snapshot');if(cancelled)return;
          setArticles(current=>JSON.stringify(current)===JSON.stringify(result.news)?current:result.news??[]);setNewsAsOf(result.checkedAt);setCachedView(result.stale);setLoading(false);setAnalyzing(result.revalidating);
          setNewsError(result.sourceStatus==='unavailable'?translate('cycle_news_stale'):['partial','stale'].includes(result.sourceStatus)?translate('audit_news_partial'):'');
          timer=setTimeout(read,result.revalidating?5000:60000);
        }catch{if(!cancelled){setLoading(false);setAnalyzing(false);setNewsError(translate('fundamentals_news_error'));timer=setTimeout(read,60000);}}finally{running=false;}
      };
      await read();
    }

    load();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [asset?.id,asset?.type,asset?.analysisType, refreshKey, lang]);

  useEffect(() => {
    const pending = articles.filter(article => article.title && !translatedTitles[`${lang}:${articleKey(article)}`] && lang !== 'en'
      && (!article.localizedTitle || article.localizedTitle.trim() === article.title.trim()));
    if (!pending.length) return undefined;
    let cancelled = false;
    (async () => {
      const translated = {};
      for (let start = 0; start < pending.length; start += 3) {
        const batch = pending.slice(start, start + 3);
        const results = await Promise.allSettled(batch.map(article => translateText(article.title, lang, 'en',[asset?.name,asset?.symbol].filter(Boolean))));
        results.forEach((result, index) => {
          const value = result.status === 'fulfilled' ? (result.value?.translatedText || result.value?.translation || '') : '';
          if (value && value.trim() && value.trim() !== batch[index].title.trim()) translated[articleKey(batch[index])] = value.trim();
        });
      }
      if (!cancelled) {
        setTranslatedTitles(current => ({ ...current, ...Object.fromEntries(Object.entries(translated).map(([key, value]) => [`${lang}:${key}`, value])) }));
      }
    })();
    return () => { cancelled = true; };
  }, [articles, lang]);

  const periodArticles = useMemo(() => {
    const now=Date.now(),cutoff = now - selectedWindow.days * 86_400_000;
    return articles
      .filter(article => Number.isFinite(Date.parse(article.pubDate)) && Date.parse(article.pubDate) >= cutoff&&Date.parse(article.pubDate)<=now)
      .sort((a, b) => relevanceValue(b) - relevanceValue(a)
        || Date.parse(b.pubDate) - Date.parse(a.pubDate));
  }, [articles, selectedWindow.days]);

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

  const assessed=periodArticles.filter(hasContextualAnalysis);
  const preliminary=periodArticles.filter(article=>!hasContextualAnalysis(article));
  const important=assessed.filter(article=>article.relevance>=70&&article.factors?.assetLink>=60&&article.factors?.evidence>=50);
  const headline=(article)=>article.localizedTitle?.trim()&&article.localizedTitle.trim()!==article.title?.trim()?article.localizedTitle:translatedTitles[`${lang}:${articleKey(article)}`]||article.title;
  const tone=article=>article.sentiment==='positive'?t.positive:article.sentiment==='negative'?t.negative:t.neutral;
  const toneStyle=article=>article.sentiment==='positive'?'border-emerald-800 bg-emerald-950/30 text-emerald-300':article.sentiment==='negative'?'border-rose-800 bg-rose-950/30 text-rose-300':'border-slate-600 bg-slate-800/50 text-slate-300';
  return <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-5 text-white">
    <header className="mb-5 rounded-2xl border border-sky-800/50 bg-gradient-to-br from-sky-950/50 via-slate-900/40 to-teal-950/20 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-sky-300">🗞️ {t.eyebrow}</p><h1 className="mt-2 text-2xl font-bold sm:text-3xl">{t.title}</h1><p className="mt-2 text-sm text-slate-300">{translate('ui_fund_intro')}</p></div><button type="button" onClick={()=>setRefreshKey(n=>n+1)} disabled={loading||analyzing} className="min-h-11 rounded-xl border border-sky-700 bg-sky-950/40 px-4 text-sm text-sky-200 disabled:opacity-40">↻ {loading||analyzing?t.updating:t.update}</button></div>
      <p className="mt-4 text-xs leading-6 text-sky-200">{translate('ui_fund_steps')}</p>
    </header>
    <section aria-label={t.asset} className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/40 p-3"><label htmlFor="fundamentals-asset" className="text-xs text-slate-400">🔎 {t.asset}</label><select id="fundamentals-asset" value={assetId} onChange={e=>setAssetId(e.target.value)} className="min-h-11 min-w-0 flex-[1_1_12rem] rounded-lg border border-slate-600 bg-slate-800 px-3 text-sm">{assetGroups.map(([category,items])=><optgroup key={category} label={category}>{items.map(item=><option translate="no" key={item.id} value={item.id}>{assetLabel(item)}</option>)}</optgroup>)}</select><div role="group" aria-label={t.period} className="flex rounded-xl border border-slate-700 p-1">{WINDOWS.map(window=><button type="button" key={window.id} onClick={()=>setPeriodId(window.id)} aria-pressed={window.id===periodId} className={`min-h-10 rounded-lg px-3 text-xs ${window.id===periodId?'bg-sky-900 text-sky-100':'text-slate-400'}`}>{window.label[lang]}</button>)}</div></section>
    {newsAsOf&&<p className="mb-3 text-xs text-slate-400">{translate(cachedView?'cycle_cached_news':'cycle_news_asof')}: {formatDate(newsAsOf,lang)}{analyzing?` · ${translate('cycle_background')}`:''}</p>}
    {(newsError||priceError)&&<p role="status" className="mb-4 rounded-xl border border-amber-800 p-3 text-sm text-amber-200">{[newsError,priceError].filter(Boolean).join(' ')}</p>}
    <NewsPulse articles={periodArticles} asset windowHours={selectedWindow.days*24} checkedAt={newsAsOf} stale={Boolean(cachedView||newsError)} titleFor={headline}/>
    <section className="mb-5 grid gap-3 sm:grid-cols-3" aria-label={translate('ui_fund_reviewed')}>
      <div className="rounded-xl border border-teal-800/50 bg-teal-950/15 p-4"><p className="text-xs text-teal-200">🧠 {translate('ui_fund_reviewed')}</p><p className="mt-2 text-2xl font-semibold">{assessed.length}<span className="text-sm font-normal text-slate-400"> / {periodArticles.length}</span></p><p className="mt-1 text-xs leading-5 text-slate-400">{translate('ui_fund_coverage',{assessed:assessed.length,total:periodArticles.length})}</p></div>
      <div className="rounded-xl border border-amber-800/50 bg-amber-950/15 p-4"><p className="text-xs text-amber-200">⚡ {translate('ui_fund_priority')}</p><p className="mt-2 text-2xl font-semibold">{important.length}<span className="ml-2 text-xs font-normal text-slate-400">{translate('ui_fund_high')}</span></p><p className="mt-1 text-xs leading-5 text-slate-400">{t.impact} ≥70/100 · {translate('ui_fund_context_only')}</p></div>
      <div className="rounded-xl border border-sky-800/50 bg-sky-950/15 p-4"><p className="text-xs text-sky-200">👀 {translate('ui_fund_watch')}</p><p className="mt-2 text-sm leading-6 text-slate-200">{(important[0]||assessed[0])?.watch||translate('ui_fund_no_priority')}</p></div>
    </section>
    {analyzing&&<p role="status" className="mb-4 rounded-xl border border-sky-900 p-3 text-sm text-sky-200">🧠 {translate('fundamentals_analyzing')}</p>}
    {loading?<p role="status" className="py-8 text-center text-slate-400">{t.loading}</p>:!periodArticles.length?<div className="rounded-xl border border-slate-700 p-6 text-center text-sm text-slate-400"><p>{t.empty}</p><p className="mt-2">{translate('fundamentals_empty_help')}</p></div>:<>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><h2 className="text-lg font-semibold">🧭 {t.list} · <span translate="no">{asset?.name}</span></h2><span className="text-xs text-slate-400">{selectedPeriodLabel} · {assessed.length} {translate('ui_fund_reviewed').toLowerCase()}</span></div>
      {!assessed.length&&!analyzing&&<p role="status" className="mb-4 rounded-xl border border-slate-700 p-4 text-sm leading-6 text-slate-400">{translate('ui_fund_unavailable')}</p>}
      <div className="space-y-4">{assessed.map(article=>{const relevance=relevanceValue(article),title=headline(article),reaction=reactionAfterArticle(article,candles),isHigh=important.includes(article);return <article key={articleKey(article)} className={`overflow-hidden rounded-2xl border bg-slate-900/35 ${isHigh?'border-amber-700/60':'border-slate-700/70'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/40 px-4 py-3"><p className="text-xs text-slate-400"><span translate="no">{article.source}</span> · <time dateTime={article.pubDate}>{formatDate(article.pubDate,lang)}</time></p><span className={`rounded-full border px-2 py-1 text-[11px] ${isHigh?'border-amber-800 text-amber-200':'border-slate-600 text-slate-300'}`}>{isHigh?'⚡':'📰'} {translate(isHigh?'ui_fund_high':relevance>=40?'ui_fund_moderate':'ui_fund_low')} · {relevance}/100</span></div>
        <div className="p-4 sm:p-5"><a href={/^https?:\/\//i.test(article.link??'')?article.link:undefined} target="_blank" rel="noopener noreferrer" className="text-base font-semibold leading-7 text-sky-100 hover:underline sm:text-lg">{title} ↗</a><div className="mt-3 flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[11px] ${toneStyle(article)}`}>{article.sentiment==='positive'?'↗':article.sentiment==='negative'?'↘':'↔'} {tone(article)}</span><span className="text-xs text-slate-500">{article.category} · {article.analysisDepth==='article'?analysisLabels.depthArticle:analysisLabels.depthRss}</span></div>
          <div className="mt-4 grid gap-3 lg:grid-cols-3">{[['📰',t.news,article.summary],['🌐',t.why,article.mechanism],['👀',t.projection,article.watch]].map(([emoji,label,text])=><div key={label} className="rounded-xl border border-slate-700/40 bg-slate-950/30 p-3"><h3 className="text-xs font-semibold text-sky-200">{emoji} {label}</h3><p className="mt-2 text-sm leading-6 text-slate-300">{text}</p></div>)}</div>
          <details className="mt-4 border-t border-slate-700/40 pt-3 text-xs leading-6 text-slate-400"><summary className="min-h-9 cursor-pointer font-semibold text-sky-200">🔎 {translate('ui_fund_read')}</summary><p className="mt-2">{analysisLabels.original}: <span translate="no">{article.title}</span></p>{article.evidenceQuote&&<blockquote translate="no" className="my-3 border-l-2 border-teal-700 pl-3">“{article.evidenceQuote}”</blockquote>}{article.factors&&<dl className="grid gap-2 sm:grid-cols-5">{Object.entries(article.factors).map(([key,value])=><div key={key}><dt>{analysisLabels[key==='evidence'?'evidenceFactor':key]}</dt><dd className="font-mono text-slate-200">{value}/100</dd></div>)}</dl>}{article.scenarios&&<div className="mt-3"><h4 className="font-semibold">{analysisLabels.scenario}</h4>{[['bull','positive'],['base','base'],['bear','negative']].map(([label,key])=><p key={key} className="mt-2"><strong>{analysisLabels[label]}: </strong>{article.scenarios[key]}</p>)}</div>}{article.limitations&&<p className="mt-3 text-amber-200">{article.limitations}</p>}<p className="mt-3">{t.observed}: <span className={scoreTone(reaction)}>{formatPercent(reaction,translate('fundamentals_pending'))}</span> · {t.after}. {t.reactionHelp}</p><p>{analysisLabels.confidence}: {article.confidence??'—'}% · {article.analysisProvider}</p><a href={/^https?:\/\//i.test(article.link??'')?article.link:undefined} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sky-200 underline">{translate('ui_fund_source')} ↗</a></details>
        </div></article>;})}</div>
      {preliminary.length>0&&<details className="mt-5 rounded-2xl border border-slate-700 p-4"><summary className="min-h-10 cursor-pointer text-sm font-semibold text-slate-300">🗂️ {translate('ui_fund_preliminary')} · {preliminary.length}</summary><p className="my-3 text-xs leading-6 text-amber-200">{analysisLabels.preliminarySummary}</p><div className="divide-y divide-slate-800">{preliminary.map(article=><article key={articleKey(article)} className="py-3"><p className="text-xs text-slate-500">{article.source} · {formatDate(article.pubDate,lang)}</p><a href={/^https?:\/\//i.test(article.link??'')?article.link:undefined} target="_blank" rel="noopener noreferrer" className="mt-1 block text-sm leading-6 text-sky-200">{headline(article)} ↗</a>{lang!=='en'&&headline(article)===article.title&&<p className="text-xs text-amber-200">{t.noTranslation}</p>}</article>)}</div></details>}
    </>}
    <details className="mt-5 rounded-xl border border-slate-700 p-4 text-xs leading-6 text-slate-400"><summary className="min-h-9 cursor-pointer font-semibold text-slate-200">📐 {translate('ui_fund_history')}</summary><p className="mt-2">{translate('ui_fund_method')}</p><p className="mt-2">{t.reaction}: {formatPercent(meanReaction,translate('fundamentals_pending'))} · {reactions.length} {t.available}. {t.reactionHelp}</p></details>
    <p className="mt-5 text-[11px] leading-6 text-slate-500">{t.disclaimer}</p>
  </main>;
}

export function Fundamentals({initialAsset=null}){
 const {t}=useTranslation(),[scope,setScope]=useState(()=>initialAsset?'asset':'global');
 return <><nav aria-label={t('world_all')} className="mx-auto flex w-full max-w-6xl flex-wrap gap-2 px-4 py-4">{['global','asset'].map(key=><button type="button" key={key} onClick={()=>setScope(key)} aria-pressed={scope===key} className={`min-h-11 rounded-xl border px-4 text-sm ${scope===key?'border-teal-600 bg-teal-950/40 text-teal-100':'border-slate-700 text-slate-300'}`}>{t(key==='global'?'world_tab':'world_asset_tab')}</button>)}</nav>{scope==='global'?<GlobalNews/>:<AssetFundamentals initialAsset={initialAsset}/>}</>;
}
