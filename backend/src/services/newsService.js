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
const CACHE_TTL = 30 * 60 * 1000;

// ─── RSS fetch ────────────────────────────────────────────────────────────────

async function fetchFeed(feed) {
  try {
    const parsed = await rssParser.parseURL(feed.url);
    return parsed.items.map(item => ({
      title:    (item.title ?? '').trim(),
      link:     item.link ?? '',
      source:   feed.name,
      pubDate:  item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      snippet:  (item.contentSnippet ?? item.content ?? '').slice(0, 300),
    }));
  } catch (err) {
    console.warn(`[news] feed "${feed.name}" failed: ${err.message}`);
    return [];
  }
}

// ─── Filtro por activo ────────────────────────────────────────────────────────

function filterByAsset(articles, assetId) {
  const keywords = ASSET_KEYWORDS[assetId.toLowerCase()] ?? [assetId.toLowerCase()];
  return articles.filter(a => {
    const text = `${a.title} ${a.snippet}`.toLowerCase();
    return keywords.some(kw => text.includes(kw));
  });
}

// ─── Sentimiento con Gemini (una noticia a la vez, 2s entre llamadas) ─────────

const GEMINI_DELAY_MS = 2000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function analyzeOne(article, apiKey) {
  const prompt = `You are a financial news analyst. Analyze this news article and respond ONLY with a valid JSON object (no markdown, no extra text) with these fields:
- "sentiment": "positive", "negative", or "neutral"
- "impact": "high", "medium", or "low" (market relevance)
- "aiSummary": one-line summary in Spanish, max 100 characters

Title: ${article.title}
Description: ${article.snippet}`;

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    { contents: [{ parts: [{ text: prompt }] }] },
    { timeout: 15000 }
  );

  const raw   = res.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  const clean = raw.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
}

// Cuota diaria agotada — no tiene sentido reintentar hasta mañana
let geminiQuotaExhausted = false;
let geminiQuotaResetAt   = 0;

async function analyzeSentiment(articles) {
  if (articles.length === 0) return [];

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[news] GEMINI_API_KEY not set — skipping sentiment analysis');
    return articles.map(a => ({ ...a, sentiment: 'neutral', impact: 'low', aiSummary: '' }));
  }

  // Si la cuota diaria está agotada, esperar hasta el reset (medianoche UTC aprox)
  if (geminiQuotaExhausted && Date.now() < geminiQuotaResetAt) {
    const minLeft = Math.ceil((geminiQuotaResetAt - Date.now()) / 60000);
    console.warn(`[news] Gemini daily quota exhausted — skipping (resets in ~${minLeft}min)`);
    return articles.map(a => ({ ...a, sentiment: 'neutral', impact: 'low', aiSummary: '' }));
  }

  const results = [];
  for (let i = 0; i < articles.length; i++) {
    if (i > 0) await sleep(GEMINI_DELAY_MS);
    try {
      const parsed = await analyzeOne(articles[i], apiKey);
      results.push({
        ...articles[i],
        sentiment: parsed.sentiment ?? 'neutral',
        impact:    parsed.impact    ?? 'low',
        aiSummary: parsed.aiSummary ?? '',
      });
      // Reset flag si vuelve a funcionar
      geminiQuotaExhausted = false;
      console.log(`[news] Gemini [${i + 1}/${articles.length}] "${articles[i].title.slice(0, 50)}..." → ${parsed.sentiment} / ${parsed.impact}`);
    } catch (err) {
      const status = err.response?.status;
      const errData = err.response?.data;

      // 429 con cuota diaria en 0 → abortar todo el batch hasta mañana
      if (status === 429) {
        const violations = errData?.error?.details?.find(d => d['@type']?.includes('QuotaFailure'))?.violations ?? [];
        const dailyExhausted = violations.some(v => v.quotaId?.includes('PerDay') || v.quotaId?.includes('PerDayPer'));
        if (dailyExhausted) {
          geminiQuotaExhausted = true;
          // Reset a las 00:05 UTC del día siguiente
          const tomorrow = new Date();
          tomorrow.setUTCHours(24, 5, 0, 0);
          geminiQuotaResetAt = tomorrow.getTime();
          console.warn(`[news] Gemini daily quota exhausted — aborting batch, will retry after ${tomorrow.toUTCString()}`);
          // Rellenar el resto como neutral y salir
          for (let j = i; j < articles.length; j++) {
            results.push({ ...articles[j], sentiment: 'neutral', impact: 'low', aiSummary: '' });
          }
          return results;
        }
      }

      const body = errData ? JSON.stringify(errData).slice(0, 120) : '';
      console.warn(`[news] Gemini [${i + 1}/${articles.length}] failed: ${err.message}${body ? ` — ${body}` : ''}`);
      results.push({ ...articles[i], sentiment: 'neutral', impact: 'low', aiSummary: '' });
    }
  }
  return results;
}

// ─── Exportación principal ────────────────────────────────────────────────────

export async function getNewsForAsset(assetId, type = 'crypto') {
  const cacheKey = `${assetId}:${type}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  // Use crypto feeds for crypto, financial feeds for traditional assets
  const feeds = type === 'crypto' ? CRYPTO_FEEDS : TRADITIONAL_FEEDS;

  // Fetch todos los feeds en paralelo
  const allArticles = (await Promise.all(feeds.map(fetchFeed))).flat();

  // Filtrar por activo y tomar las 10 más recientes
  const filtered = filterByAsset(allArticles, assetId)
    .sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate))
    .slice(0, 10);

  // Enriquecer con sentimiento
  const enriched = await analyzeSentiment(filtered);

  cache.set(cacheKey, { data: enriched, expiresAt: Date.now() + CACHE_TTL });
  return enriched;
}
