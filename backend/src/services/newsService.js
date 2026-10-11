import axios from 'axios';
import Parser from 'rss-parser';

const rssParser = new Parser({ timeout: 10000 });

// ─── Feeds ────────────────────────────────────────────────────────────────────

const CRYPTO_FEEDS = [
  { name: 'CoinDesk',      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
  { name: 'Yahoo Finance', url: 'https://finance.yahoo.com/rss/topstories' },
];

const TRADITIONAL_FEEDS = [
  { name: 'Yahoo Finance',  url: 'https://finance.yahoo.com/rss/topstories' },
  { name: 'Reuters Markets',url: 'https://feeds.reuters.com/reuters/businessNews' },
  { name: 'CNBC',           url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { name: 'MarketWatch',    url: 'https://feeds.marketwatch.com/marketwatch/topstories/' },
  { name: 'Investing.com',  url: 'https://www.investing.com/rss/news.rss' },
];

// ─── Palabras clave por activo ────────────────────────────────────────────────

const ASSET_KEYWORDS = {
  bitcoin:  ['bitcoin', 'btc'],
  ethereum: ['ethereum', 'eth', 'ether'],
  solana:   ['solana', 'sol'],
  'gc=f':   ['gold', 'oro', 'xau'],
  'si=f':   ['silver', 'plata', 'xag'],
  spy:      ['s&p 500', 'sp500', 'spy', 's&p500', 'stock market'],
  urth:     ['world market', 'global equity', 'urth', 'msci world'],
  eem:      ['emerging market', 'eem', 'mercados emergentes'],
};

// ─── Cache  (30 min) ──────────────────────────────────────────────────────────

const cache = new Map();
const feedCache = new Map();
const CACHE_TTL = 30 * 60 * 1000;

// ─── RSS fetch ────────────────────────────────────────────────────────────────

async function fetchFeed(feed) {
  try {
    const parsed = await rssParser.parseURL(feed.url);
    return parsed.items.map(item => {
      const publishedAt = Date.parse(item.pubDate ?? '');
      return {
        title:    (item.title ?? '').trim(),
        link:     item.link ?? '',
        source:   feed.name,
        pubDate:  Number.isFinite(publishedAt) ? new Date(publishedAt).toISOString() : null,
        // RSS descriptions are public source material. Keep a bounded excerpt for
        // the explainable fundamentals analysis instead of only the headline.
        snippet:  (item.contentSnippet ?? item.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 1800),
      };
    });
  } catch (err) {
    console.warn(`[news] feed "${feed.name}" failed: ${err.message}`);
    return [];
  }
}

async function fetchFeedCached(feed) {
  const cached = feedCache.get(feed.url);
  if (cached && cached.expiresAt > Date.now()) return cached.data;
  const data = await fetchFeed(feed);
  feedCache.set(feed.url, { data, expiresAt: Date.now() + CACHE_TTL });
  return data;
}

// ─── Filtro por activo ────────────────────────────────────────────────────────

function filterByAsset(articles, assetId, aliases = []) {
  const configured = ASSET_KEYWORDS[assetId.toLowerCase()] ?? [assetId.toLowerCase()];
  const keywords = [...new Set([...configured, ...aliases])]
    .map(value => String(value ?? '').trim())
    .filter(value => value.length >= 3);

  return articles.flatMap(article => {
    const text = normalizeSearchText(`${article.title} ${article.snippet}`);
    const matchedTerms = keywords.filter(keyword => {
      const normalizedKeyword = normalizeSearchText(keyword);
      const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalizedKeyword)}([^a-z0-9]|$)`);
      return pattern.test(text);
    });
    return matchedTerms.length ? [{ ...article, matchedTerms }] : [];
  });
}

function normalizeSearchText(value) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ─── Sentimiento con Gemini + fallback a Groq ────────────────────────────────

const GEMINI_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const SENTIMENT_PROMPT = (article) =>
  `You are a financial news analyst. Analyze this news article and respond ONLY with a valid JSON object (no markdown, no extra text) with these fields:
- "sentiment": "positive", "negative", or "neutral"
- "impact": "high", "medium", or "low" (market relevance)
- "aiSummary": one-line summary in Spanish, max 100 characters

Title: ${article.title}
Description: ${article.snippet}`;

function parseAIJson(raw) {
  const clean = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

async function analyzeOne(article, apiKey) {
  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    { contents: [{ parts: [{ text: SENTIMENT_PROMPT(article) }] }] },
    { timeout: 15000 }
  );
  const raw = res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return parseAIJson(raw);
}

async function analyzeOneGroq(article) {
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('No GROQ_API_KEY');

  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: SENTIMENT_PROMPT(article) }],
      max_tokens: 150,
      temperature: 0.3,
    },
    {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`,
      },
    }
  );
  const raw = res.data?.choices?.[0]?.message?.content ?? '{}';
  return parseAIJson(raw);
}

// Cuota diaria agotada — no tiene sentido reintentar hasta mañana
let geminiQuotaExhausted = false;
let geminiQuotaResetAt   = 0;

async function analyzeWithFallback(article, geminiKey, index, total) {
  const label = `[${index + 1}/${total}] "${article.title.slice(0, 45)}..."`;

  // Si Gemini tiene cuota, intentar primero con Gemini
  if (!geminiQuotaExhausted || Date.now() >= geminiQuotaResetAt) {
    try {
      const parsed = await analyzeOne(article, geminiKey);
      geminiQuotaExhausted = false; // reset si vuelve a funcionar
      console.log(`[news] Gemini ${label} → ${parsed.sentiment} / ${parsed.impact}`);
      return parsed;
    } catch (err) {
      const status   = err.response?.status;
      const errData  = err.response?.data;

      // Detectar cuota diaria agotada
      if (status === 429) {
        const violations = errData?.error?.details?.find(d => d['@type']?.includes('QuotaFailure'))?.violations ?? [];
        const dailyGone  = violations.some(v => v.quotaId?.includes('PerDay'));
        if (dailyGone) {
          geminiQuotaExhausted = true;
          const tomorrow = new Date();
          tomorrow.setUTCHours(24, 5, 0, 0);
          geminiQuotaResetAt = tomorrow.getTime();
          console.warn(`[news] Gemini daily quota exhausted — switching to Groq fallback`);
        } else {
          console.warn(`[news] Gemini ${label} 429 (rate limit) — trying Groq`);
        }
      } else {
        console.warn(`[news] Gemini ${label} failed (${status ?? err.message?.slice(0, 40)}) — trying Groq`);
      }
    }
  }

  // Fallback: Groq
  try {
    const parsed = await analyzeOneGroq(article);
    console.log(`[news] Groq   ${label} → ${parsed.sentiment} / ${parsed.impact}`);
    return parsed;
  } catch (groqErr) {
    console.warn(`[news] Groq   ${label} failed: ${groqErr.message?.slice(0, 60)}`);
    return { sentiment: 'neutral', impact: 'low', aiSummary: '' };
  }
}

async function analyzeSentiment(articles) {
  if (articles.length === 0) return [];

  const geminiKey = process.env.GEMINI_API_KEY;
  const groqKey   = process.env.GROQ_API_KEY;

  if (!geminiKey && !groqKey) {
    console.warn('[news] No AI keys configured — skipping sentiment analysis');
    return articles.map(a => ({ ...a, sentiment: 'neutral', impact: 'low', aiSummary: '' }));
  }

  // Si no hay Gemini, usar Groq directamente sin delay
  if (!geminiKey) {
    console.warn('[news] No GEMINI_API_KEY — using Groq directly');
    const results = [];
    for (let i = 0; i < articles.length; i++) {
      try {
        const parsed = await analyzeOneGroq(articles[i]);
        console.log(`[news] Groq [${i + 1}/${articles.length}] → ${parsed.sentiment}`);
        results.push({ ...articles[i], ...parsed });
      } catch {
        results.push({ ...articles[i], sentiment: 'neutral', impact: 'low', aiSummary: '' });
      }
    }
    return results;
  }

  const results = [];
  for (let i = 0; i < articles.length; i++) {
    if (i > 0) await sleep(GEMINI_DELAY_MS);
    const parsed = await analyzeWithFallback(articles[i], geminiKey, i, articles.length);
    results.push({
      ...articles[i],
      sentiment: parsed.sentiment ?? 'neutral',
      impact:    parsed.impact    ?? 'low',
      aiSummary: parsed.aiSummary ?? '',
    });
  }
  return results;
}

// ─── Exportación principal ────────────────────────────────────────────────────

export async function getRawNewsForAsset(assetId, type = 'crypto', aliases = []) {
  const safeAliases = aliases
    .map(value => String(value ?? '').trim().slice(0, 80))
    .filter(Boolean);
  const cacheKey = `raw:${assetId}:${type}:${safeAliases.join('|')}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const feeds = type === 'crypto' ? CRYPTO_FEEDS : TRADITIONAL_FEEDS;
  const allArticles = (await Promise.all(feeds.map(fetchFeedCached))).flat();
  const seenTitles = new Set();
  const filtered = filterByAsset(allArticles, assetId, safeAliases)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .filter(article => {
      const titleKey = String(article.title ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
      if (!titleKey || seenTitles.has(titleKey)) return false;
      seenTitles.add(titleKey);
      return true;
    })
    .slice(0, 10);

  cache.set(cacheKey, { data: filtered, expiresAt: Date.now() + CACHE_TTL });
  return filtered;
}

export async function getNewsForAsset(assetId, type = 'crypto') {
  const cacheKey = `${assetId}:${type}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const filtered = await getRawNewsForAsset(assetId, type);

  // Enriquecer con sentimiento
  const enriched = await analyzeSentiment(filtered);

  cache.set(cacheKey, { data: enriched, expiresAt: Date.now() + CACHE_TTL });
  return enriched;
}
