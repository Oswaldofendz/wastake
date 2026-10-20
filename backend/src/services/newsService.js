import axios from 'axios';
import Parser from 'rss-parser';
import { callLLM } from './llmService.js';

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

// ─── Sentimiento con rotación de proveedores gratuitos ────────────────────────

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

async function analyzeSentiment(articles) {
  if (articles.length === 0) return [];

  const hasGeminiKey = Object.keys(process.env).some(
    name => /^GEMINI_API_KEY(_\d+)?$/.test(name) && process.env[name]?.trim()
  );
  if (!process.env.GROQ_API_KEY?.trim() && !hasGeminiKey) {
    console.warn('[news] No AI keys configured — skipping sentiment analysis');
    return articles.map(a => ({ ...a, sentiment: 'neutral', impact: 'low', aiSummary: '' }));
  }

  const results = [];
  for (let i = 0; i < articles.length; i++) {
    if (i > 0) await sleep(GEMINI_DELAY_MS);
    let parsed = { sentiment: 'neutral', impact: 'low', aiSummary: '' };
    try {
      const result = await callLLM(SENTIMENT_PROMPT(articles[i]), {
        jsonMode: true,
        maxTokens: 150,
        temperature: 0.3,
        tag: '[news-sentiment]',
      });
      parsed = parseAIJson(result.text);
      console.log(`[news] ${result.provider} [${i + 1}/${articles.length}] → ${parsed.sentiment} / ${parsed.impact}`);
    } catch {
      console.warn(`[news] AI analysis unavailable [${i + 1}/${articles.length}]`);
    }
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
