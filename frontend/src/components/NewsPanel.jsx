import { useState, useEffect } from 'react';
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
  if (HIGH_KEYWORDS.some(kw => new RegExp('\\b' + kw + '\\b').test(lower)))   return 'high';
  if (MEDIUM_KEYWORDS.some(kw => new RegExp('\\b' + kw + '\\b').test(lower))) return 'medium';
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

function timeAgo(isoDate, language) {
  const time = Date.parse(isoDate);
  if (!Number.isFinite(time)) return '—';
  const minutes = Math.max(0, Math.floor((Date.now() - time) / 60_000));
  const formatter = new Intl.RelativeTimeFormat(language, { numeric: 'auto' });
  return minutes < 60 ? formatter.format(-minutes, 'minute') : minutes < 1440 ? formatter.format(-Math.floor(minutes / 60), 'hour') : formatter.format(-Math.floor(minutes / 1440), 'day');
}

// ─── Translation hook ─────────────────────────────────────────
const newsKey = article => (article.link ?? '') + '|' + article.title;
function useTranslations(articles, lang) {
  const [titles, setTitles] = useState({});
  useEffect(() => {
    const shortLang = lang.split('-')[0];
    if (!articles?.length || shortLang === 'en') return;
    let cancelled = false;
    async function translateAll() {
      const results = {};
      for (let start = 0; start < articles.length; start += 3) {
        await Promise.allSettled(articles.slice(start, start + 3).map(async article => {
          try {
            const result = await translateText(article.title, shortLang);
            if (result.translated && result.translatedText) results[shortLang + ':' + newsKey(article)] = result.translatedText;
          } catch { /* the original remains explicitly identified */ }
        }));
        if (cancelled) return;
        setTitles(current => ({ ...current, ...results }));
      }
    }
    translateAll();
    return () => { cancelled = true; };
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
  const { t } = useTranslation();
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${SENTIMENT_STYLES[sentiment] ?? SENTIMENT_STYLES.neutral}`}>
      {t('news_' + (sentiment || 'neutral'))}
    </span>
  );
}

function NewsCard({ article, translatedTitle, impact }) {
  const { t, i18n } = useTranslation();
  return (
    <a href={article.link} target="_blank" rel="noopener noreferrer" className="block group">
      <div className={`p-3 rounded-lg border transition-colors duration-150 hover:brightness-110 ${IMPACT_BORDER[impact]}`}>
        {/* Source + time */}
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${IMPACT_DOT[impact]}`} />
            <span className="text-xs font-medium text-slate-400">{article.source}</span>
          </div>
          <span className="text-xs text-slate-500 flex-shrink-0">{timeAgo(article.pubDate, i18n.language)}</span>
        </div>

        {/* Title (translated if available) */}
        <p className="text-sm text-white leading-snug group-hover:text-brand-300 transition-colors line-clamp-2 mb-2">
          {translatedTitle ?? article.title}
        </p>

        {/* AI summary */}
        {!translatedTitle && !i18n.language.startsWith('en') && <p className="mb-2 text-xs text-amber-300">{t('news_original')}</p>}

        {/* Badges */}
        <div className="flex items-center gap-2 flex-wrap">
          <SentimentBadge sentiment={article.sentiment} />
          <span className={`text-xs font-medium ${IMPACT_TEXT[impact]}`}>
            {t('news_' + impact)}
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
  const { t, i18n } = useTranslation();
  const translatedTitles = useTranslations(data, i18n.language);
  const shortLang = i18n.language.split('-')[0];
  const titleFor = article => shortLang === 'en' ? undefined : translatedTitles[shortLang + ':' + newsKey(article)];

  if (loading) return (
    <div className="mt-3 bg-slate-800/50 border border-slate-700/30 rounded-xl overflow-hidden">
      <Skeleton />
    </div>
  );

  if (error) return (
    <div className="mt-3 bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
      <p className="text-xs text-red-400 text-center">{t('news_error')}</p>
    </div>
  );

  if (!data || data.length === 0) return (
    <div className="mt-3 bg-slate-800/50 border border-slate-700/30 rounded-xl p-4">
      <p className="text-xs text-slate-500 text-center">{t('news_empty')}</p>
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
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('news_title')}</h3>
        <span className="text-xs text-slate-500">
          {data.length} {t('news_articles')} · <span translate="no">{asset.name}</span>
          {shortLang !== 'en' && <span className="ml-1 text-brand-400">· {t('news_translation_count', { count: data.filter(article => titleFor(article)).length, total: data.length })}</span>}
        </span>
      </div>

      {/* 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

        {/* HIGH */}
        <div className="bg-red-950/20 border border-red-700/40 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-red-700/30">
            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">{t('news_high')}</span>
            <span className="ml-auto text-xs text-red-500/70 font-mono">{enriched.filter(a => a.computedImpact === 'high').length}</span>
          </div>
          <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
            {enriched.filter(a => a.computedImpact === 'high').length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">{t('news_none')}</p>
            ) : enriched.filter(a => a.computedImpact === 'high').map((article, i) => (
              <NewsCard key={article.link || i} article={article} translatedTitle={titleFor(article)} impact="high" />
            ))}
          </div>
        </div>

        {/* MEDIUM */}
        <div className="bg-amber-950/10 border border-amber-700/40 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-amber-700/30">
            <span className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">{t('news_medium')}</span>
            <span className="ml-auto text-xs text-amber-500/70 font-mono">{enriched.filter(a => a.computedImpact === 'medium').length}</span>
          </div>
          <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
            {enriched.filter(a => a.computedImpact === 'medium').length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">{t('news_none')}</p>
            ) : enriched.filter(a => a.computedImpact === 'medium').map((article, i) => (
              <NewsCard key={article.link || i} article={article} translatedTitle={titleFor(article)} impact="medium" />
            ))}
          </div>
        </div>

        {/* LOW */}
        <div className="bg-slate-800/40 border border-slate-700/40 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-700/30">
            <span className="w-2 h-2 rounded-full bg-slate-500 flex-shrink-0" />
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{t('news_low')}</span>
            <span className="ml-auto text-xs text-slate-500/70 font-mono">{enriched.filter(a => a.computedImpact === 'low').length}</span>
          </div>
          <div className="p-2 space-y-2 max-h-96 overflow-y-auto">
            {enriched.filter(a => a.computedImpact === 'low').length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">{t('news_none')}</p>
            ) : enriched.filter(a => a.computedImpact === 'low').map((article, i) => (
              <NewsCard key={article.link || i} article={article} translatedTitle={titleFor(article)} impact="low" />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
