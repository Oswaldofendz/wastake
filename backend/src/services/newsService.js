import axios from 'axios';
import {getMarketImpactAlerts} from './marketImpactService.js';
import {TRADITIONAL_ASSETS,CRYPTO_ASSETS} from './priceService.js';
import Parser from 'rss-parser';
import {createPublicFeedCache} from './publicFeedCache.js';
import { callLLM } from './llmService.js';
import { createSingleFlight } from './singleFlight.js';

const enrichOnce = createSingleFlight();

const rssParser = new Parser({ timeout: 3500 });

// ─── Feeds ────────────────────────────────────────────────────────────────────

const CRYPTO_FEEDS = [
  { name: 'CoinDesk',      url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'CoinTelegraph', url: 'https://cointelegraph.com/rss' },
];

const TRADITIONAL_FEEDS = [
  { name: 'CNBC',           url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html' },
  { name: 'MarketWatch',    url: 'https://feeds.marketwatch.com/marketwatch/topstories/' },
  { name: 'Investing.com',  url: 'https://www.investing.com/rss/news.rss' },
];

// ─── Palabras clave por activo ────────────────────────────────────────────────

const ASSET_KEYWORDS = {
  bitcoin:  ['bitcoin', 'btc'],
  googl: ['alphabet','google','googl'],
  goog: ['alphabet','google','goog'],
  amzn: ['amazon','aws','amzn'],
  binancecoin: ['binance','bnb','bnb chain'],
  ripple: ['ripple','xrp'],
  ethereum: ['ethereum', 'eth', 'ether'],
  solana:   ['solana', 'sol'],
  'gc=f':   ['gold', 'oro', 'xau'],
  'si=f':   ['silver', 'plata', 'xag'],
  spy:      ['s&p 500', 'sp500', 'spy', 's&p500', 'stock market'],
  urth:     ['world market', 'global equity', 'urth', 'msci world'],
  eem:      ['emerging market', 'eem', 'mercados emergentes'],
};

// ─── Cache  (2 min) ──────────────────────────────────────────────────────────

const cache = new Map();
const CACHE_TTL = 2 * 60 * 1000;

// ─── RSS fetch ────────────────────────────────────────────────────────────────

export function normalizeFeedArticle(item,source,now=Date.now()){
 const title=typeof item?.title==='string'?item.title.trim():'';
 const publishedAt=Date.parse(item?.pubDate??item?.isoDate??'');
 if(!title||!Number.isFinite(publishedAt)||publishedAt>now)return null;
 let link;try{link=new URL(item.link);if(!['https:','http:'].includes(link.protocol)||link.username||link.password)return null;}catch{return null;}
 return {title,link:link.href,source,pubDate:new Date(publishedAt).toISOString(),snippet:String(item.contentSnippet??item.content??'').replace(/\s+/g,' ').trim().slice(0,1800)};
}

async function fetchFeed(feed) {
  try {
    const parsed = await rssParser.parseURL(feed.url);
    return (parsed.items??[]).map(item=>normalizeFeedArticle(item,feed.name)).filter(Boolean);
  } catch (err) {
    console.warn(`[news] feed "${feed.name}" failed: ${err.message}`);
    throw err;
  }
}

const fetchFeedCached=createPublicFeedCache(fetchFeed);
// Warm public feeds only: no model calls, no periodic keep-alive or paid infrastructure.
export const warmNewsFeeds=()=>Promise.allSettled([...new Map([...CRYPTO_FEEDS,...TRADITIONAL_FEEDS].map(f=>[f.url,f])).values()].map(fetchFeedCached));

// ─── Filtro por activo ────────────────────────────────────────────────────────

function filterByAsset(articles, assetId, aliases = []) {
  const configured = Object.hasOwn(ASSET_KEYWORDS,assetId.toLowerCase())?ASSET_KEYWORDS[assetId.toLowerCase()]:[assetId.toLowerCase()];
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
    return articles.map(a => ({ ...a, sentiment: 'neutral', impact: 'low', aiSummary: '', analysisStatus: 'unavailable' }));
  }

  const budget=AbortSignal.timeout(45000);
  const results = [];
  for (let i = 0; i < articles.length; i++) {
    if(budget.aborted){results.push(...articles.slice(i).map(a=>({...a,sentiment:null,impact:null,aiSummary:'',analysisStatus:'unavailable'})));break;}
    if (i > 0) await sleep(GEMINI_DELAY_MS);
    let parsed = { sentiment: 'neutral', impact: 'low', aiSummary: '' };
    let analysisStatus = 'unavailable';
    try {
      const result = await callLLM(SENTIMENT_PROMPT(articles[i]), {
        jsonMode: true,
        maxTokens: 150,
        temperature: 0.3,
        tag: '[news-sentiment]',
        signal:budget,
      });
      parsed = parseAIJson(result.text);
      if (['positive','neutral','negative'].includes(parsed.sentiment)) analysisStatus = 'assessed';
      console.log(`[news] ${result.provider} [${i + 1}/${articles.length}] → ${parsed.sentiment} / ${parsed.impact}`);
    } catch {
      console.warn(`[news] AI analysis unavailable [${i + 1}/${articles.length}]`);
    }
    results.push({
      ...articles[i],
      sentiment: parsed.sentiment ?? 'neutral',
      impact:    parsed.impact    ?? 'low',
      aiSummary: parsed.aiSummary ?? '',
      analysisStatus,
    });
  }
  return results;
}

// ─── Exportación principal ────────────────────────────────────────────────────

export function newsAliases(assetId,type,aliases=[]){
 const catalogue=type==='crypto'?CRYPTO_ASSETS:TRADITIONAL_ASSETS,identity=Object.hasOwn(catalogue,assetId)?catalogue[assetId]:null;
 const related=Object.hasOwn(ASSET_KEYWORDS,assetId.toLowerCase())?ASSET_KEYWORDS[assetId.toLowerCase()]:[];
 return [...new Set([...aliases,identity?.name,identity?.symbol,...related].map(value=>String(value??'').trim().slice(0,80)).filter(Boolean))];
}

export async function getRawNewsForAsset(assetId, type = 'crypto', aliases = []) {
  const safeAliases=newsAliases(assetId,type,aliases);
  const cacheKey = `raw:${assetId}:${type}:${safeAliases.join('|')}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const feeds = type === 'crypto' ? CRYPTO_FEEDS : [...TRADITIONAL_FEEDS, {name:'Yahoo Finance', url:`https://feeds.finance.yahoo.com/rss/2.0/headline?s=${encodeURIComponent(assetId)}&region=US&lang=en-US`}];
  const snapshots=await Promise.all(feeds.map(fetchFeedCached));
  const global=await getMarketImpactAlerts().catch(()=>null);
  const additional=(global?.alerts??[]).map(a=>({title:a.title,link:a.url,pubDate:a.publishedAt,snippet:a.snippet,source:a.source,sourceFetchedAt:a.sourceCheckedAt,sourceStale:a.feedStale,topic:a.topic,category:a.category,priority:a.priority,assets:a.assets}));
  const allArticles=[...snapshots.flatMap(result=>result.articles),...additional];
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

  const statuses=[...snapshots.map(r=>r.status),global?.status??'unavailable'];
  const sourceStatus=statuses.every(s=>s==='ok')?'ok':statuses.every(s=>s==='unavailable')?'unavailable':statuses.some(s=>s==='ok'||s==='partial')?'partial':allArticles.length?'stale':'unavailable';
  Object.assign(filtered,{sourceStatus,sourceCheckedAt:new Date().toISOString(),dataAsOf:snapshots.map(r=>r.dataAsOf).filter(Boolean).sort()[0]??null,stale:filtered.some(a=>a.sourceStale)||sourceStatus==='unavailable'||sourceStatus==='stale',refreshing:snapshots.some(r=>r.refreshing)});
  if(cache.size>=300)cache.delete(cache.keys().next().value);
  cache.set(cacheKey, { data: filtered, expiresAt: Date.now() + (filtered.refreshing?5000:sourceStatus==='ok'?CACHE_TTL:15000) });
  return filtered;
}

export async function getNewsForAsset(assetId, type = 'crypto') {
  const cacheKey = `${assetId}:${type}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  return enrichOnce(cacheKey, async () => {
    const filtered = await getRawNewsForAsset(assetId, type);
    const enriched = Object.assign(await analyzeSentiment(filtered),{sourceStatus:filtered.sourceStatus,sourceCheckedAt:filtered.sourceCheckedAt,stale:filtered.stale});
    cache.set(cacheKey, { data: enriched, expiresAt: Date.now() + CACHE_TTL });
    return enriched;
  });
}
