import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchNews, translateText } from '../services/api.js';
import { getAnalysisType } from '../data/assetCatalog.js';

// ─── Keyword-based impact detection ──────────────────────────
const HIGH_KEYWORDS = [
  'crash', 'ban', 'hack', 'hacked', 'crisis', 'collapse', 'sec', 'regulation',
  'scam', 'fraud', 'lawsuit', 'arrest', 'seized', 'criminal', 'bankrupt',
  'exploit', 'stolen', 'breach', 'emergency', 'shutdown', 'suspend',
];
const MEDIUM_KEYWORDS = [
  'warning', 'risk', 'decline', 'drop', 'concern', 'worry', 'sell', 'fall',
  'tumble', 'slump', 'weak', 'volatile', 'uncertainty', 'caution', 'fear',
  'investigation', 'probe', 'delay', 'miss', 'disappoint',
];

function detectImpact(text = '', existingImpact) {
  const lower = text.toLowerCase();
  if (HIGH_KEYWORDS.some(kw => lower.includes(kw)))   return 'high';
  if (MEDIUM_KEYWORDS.some(kw => lower.includes(kw))) return 'medium';
  return existingImpact ?? 'low';
}

const IMPACT_BORDER = {
  high:   'border-red-700/60 bg-red-950/20',
  medium: 'border-amber-700/50 bg-amber-950/10',
  low:    'border-slate-700/40 bg-slate-800/40',
};
const IMPACT_DOT = {
  high:   'bg-red-500',
  medium: 'bg-amber-500',
  low:    'bg-slate-600',
};
const IMPACT_LABELS = {
  high:   '● Alto impacto',
  medium: '◐ Impacto medio',
  low:    '○ Bajo impacto',
};
const IMPACT_TEXT = {
  high:   'text-red-400',
  medium: 'text-amber-400',
  low:    'text-slate-500',
};

// ─── Helpers ──────────────────────────────────────────────────
const SENTIMENT_STYLES = {
  positive: 'bg-green-900/60 text-green-300 border border-green-700/50',
  negative: 'bg-red-900/60   text-red-300   border border-red-700/50',
  neutral:  'bg-slate-700/60 text-slate-400  border border-slate-600/50',
};
const SENTIMENT_LABELS = { positive: 'Positivo', negative: 'Negativo', neutral: 'Neutral' };

function timeAgo(isoDate) {
  const diff  = Date.now() - new Date(isoDate).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 60) return `hace ${mins}m`;
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${days}d`;
}

// ─── Translation hook ─────────────────────────────────────────
function useTranslations(articles, lang) {
  const [titles, setTitles] = useState({});
  const prevLang = useRef(lang);
  const prevLen  = useRef(0);

  useEffect(() => {
    if (!articles?.length) return;
    if (lang === 'en') { setTitles({}); return; }
    if (lang === prevLang.current && articles.length === prevLen.current) return;

    prevLang.current = lang;
    prevLen.current  = articles.length;

    // Translate in batches to avoid MyMemory's 500-char limit per call
    const shortLang = lang.split('-')[0]; // 'es-ES' → 'es'

    async function translateAll() {
      const newTitles = {};
      await Promise.allSettled(
        articles.map(async (a, i) => {
          try {
            const { translatedText } = await translateText(a.title, shortLang);
            newTitles[i] = translatedText;
          } catch {
            newTitles[i] = a.title;
          }
        })
      );
      setTitles(newTitles);
    }

    translateAll();
  }, [articles, lang]);

  return titles;
}

// ─── News hook ────────────────────────────────────────────────
function useNews(asset) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  useEffect(() => {
    if (!asset) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setData(null);
      setError(null);
      try {
        const type   = getAnalysisType(asset);
        const result = await fetchNews(asset.id, type);
        if (!cancelled) setData(result.news);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [asset?.id]);

  return { data, loading, error };
}

// ─── Sub-components ───────────────────────────────────────────
function SentimentBadge({ sentiment }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SENTIMENT_STYLES[sentiment] ?? SENTIMENT_STYLES.neutral}`}>
      {SENTIMENT_LABELS[sentiment] ?? sentiment}
    </span>
  );
}

function NewsCard({ article, translatedTitle, impact }) {
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer" className="block group">
      <div className={`p-3 rounded-lg border transition-colors duration-150 hover:brightness-110 ${IMPACT_BORDER[impact]}`}>
        {/* Source + time */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${IMPACT_DOT[impact]}`} />
            <span className="text-xs font-medium text-slate-400">{article.source}</span>
          </div>
          <span className="text-xs text-slate-500 flex-shrink-0">{timeAgo(article.pubDate)}</span>
        </div>

        {/* Title (translated if available) */}
        <p className="text-sm text-white leading-snug group-hover:text-brand-300 transition-colors line-clamp-2 mb-2">
          {translatedTitle ?? article.title}
        </p>

        {/* AI summary */}
        {article.aiSummary && (
          <p className="text-xs text-slate-400 italic mb-2 line-clamp-1">{article.aiSummary}</p>
        )}

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <SentimentBadge sentiment={article.sentiment} />
          <span className={`text-xs font-medium ${IMPACT_TEXT[impact]}`}>
            {IMPACT_LABELS[impact]}
          </span>
        </div>
      </div>
    </a>
  );
}

function Skeleton() {
  return (
    <div className="animate-pulse space-y-2 p-4">
      <div className="h-3 bg-slate-700 rounded w-1/4 mb-3" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="p-3 rounded-lg border border-slate-700/40 space-y-2">
          <div className="flex justify-between">
            <div className="h-2.5 bg-slate-700 rounded w-20" />
            <div className="h-2.5 bg-slate-700 rounded w-10" />
          </div>
          <div className="h-3 bg-slate-700/60 rounded w-full" />
          <div className="h-3 bg-slate-700/60 rounded w-3/4" />
          <div className="flex gap-2 pt-1">
            <div className="h-4 bg-slate-700/40 rounded-full w-16" />
            <div className="h-4 bg-slate-700/40 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────
export function NewsPanel({ asset }) {
  const { data, loading, error } = useNews(asset);
  const { i18n } = useTranslation();
  const translatedTitles = useTranslations(data, i18n.language);

  if (loading) return (
    <div className="mt-3 bg-slate-800/50 border border-slate-700/30 rounded-xl overflow-hidden">
      <Skeleton />
    </div>
  );

  if (error) return (
    <div className="mt-3 bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
      <p className="text-xs text-red-400 text-center">No se pudieron cargar las noticias.</p>
    </div>
  );

  if (!data || data.length === 0) return (
    <div className="mt-3 bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
      <p className="text-xs text-slate-500 text-center">Sin noticias recientes para este activo.</p>
    </div>
  );

  // Enriquecer artículos con impacto por keywords e índice original para traducciones
  const enriched = data.map((a, i) => ({
    ...a,
    _origIdx: i,
    computedImpact: detectImpact(a.title, a.impact),
  }));

  return (
    <div className="mt-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Noticias</h3>
        <span className="text-xs text-slate-500">
          {data.length} artículos · {asset.name}
          {i18n.language !== 'en' && <span className="ml-1 text-brand-400">· traducidas</span>}
        </span>
      </div>

      {/* 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* HIGH */}
        <div className="bg-red-950/20 border border-red-700/40 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-red-700/30">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Alto impacto</span>
            <span className="ml-auto text-xs text-red-500/70 font-mono">{enriched.filter(a => a.computedImpact === 'high').length}</span>
          </div>
          <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
            {enriched.filter(a => a.computedImpact === 'high').length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Sin noticias de alto impacto</p>
            ) : enriched.filter(a => a.computedImpact === 'high').map((article, i) => (
              <NewsCard key={article.link || i} article={article} translatedTitle={translatedTitles[article._origIdx]} impact="high" />
            ))}
          </div>
        </div>

        {/* MEDIUM */}
        <div className="bg-amber-950/10 border border-amber-700/40 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-700/30">
            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Impacto medio</span>
            <span className="ml-auto text-xs text-amber-500/70 font-mono">{enriched.filter(a => a.computedImpact === 'medium').length}</span>
          </div>
          <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
            {enriched.filter(a => a.computedImpact === 'medium').length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Sin noticias de impacto medio</p>
            ) : enriched.filter(a => a.computedImpact === 'medium').map((article, i) => (
              <NewsCard key={article.link || i} article={article} translatedTitle={translatedTitles[article._origIdx]} impact="medium" />
            ))}
          </div>
        </div>

        {/* LOW */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/30">
            <span className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bajo impacto</span>
            <span className="ml-auto text-xs text-slate-500/70 font-mono">{enriched.filter(a => a.computedImpact === 'low').length}</span>
          </div>
          <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
            {enriched.filter(a => a.computedImpact === 'low').length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">Sin noticias de bajo impacto</p>
            ) : enriched.filter(a => a.computedImpact === 'low').map((article, i) => (
              <NewsCard key={article.link || i} article={article} translatedTitle={translatedTitles[article._origIdx]} impact="low" />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
