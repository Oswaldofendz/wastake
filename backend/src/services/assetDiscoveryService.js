import axios from 'axios';
import { CRYPTO_ASSETS, TRADITIONAL_ASSETS, getCryptoPrices } from './priceService.js';

const headers = { 'User-Agent': 'Mozilla/5.0 (compatible; WaStake/1.0)', Accept: 'application/json' };
const cache = new Map();
const pending = new Map();
async function cached(key, ttl, load) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttl) return hit.value;
  if (pending.has(key)) return pending.get(key);
  const request = load().then(value => {
    if (cache.size >= 300) cache.delete(cache.keys().next().value);
    cache.set(key, { ts: Date.now(), value });
    return value;
  }).finally(() => pending.delete(key));
  pending.set(key, request);
  return request;
}

const TYPES = { EQUITY: 'stock', ETF: 'etf', INDEX: 'index', FUTURE: 'commodity', CURRENCY: 'forex', CRYPTOCURRENCY: 'crypto' };
export function normalizeYahooAsset(quote) {
  const type = TYPES[quote.quoteType];
  if (!type || !/^[A-Za-z0-9^=._-]{1,35}$/.test(quote.symbol ?? '')) return null;
  return { id: quote.symbol, symbol: quote.symbol, name: quote.longname || quote.shortname || quote.symbol,
    type, analysisType: 'stock', source: 'Yahoo Finance', exchange: quote.exchDisp || quote.exchange,
    external: true, currency: null };
}

export async function discoverAssets(query) {
  const q = query.trim().toLowerCase();
  return cached(`search:${q}`, 5 * 60_000, async () => {
    const local = [
      ...Object.entries(CRYPTO_ASSETS).map(([id, m]) => ({ id, ...m, type: 'crypto', analysisType: 'crypto' })),
      ...Object.entries(TRADITIONAL_ASSETS).map(([id, m]) => ({ id, symbol: id, ...m, analysisType: 'stock' })),
    ].filter(a => [a.id, a.symbol, a.name].some(s => s?.toLowerCase().includes(q)))
      .sort((a, b) => Number(b.symbol?.toLowerCase() === q) - Number(a.symbol?.toLowerCase() === q));
    const [yahoo, cg] = await Promise.allSettled([
      axios.get('https://query1.finance.yahoo.com/v1/finance/search', { params: { q, quotesCount: 10, newsCount: 0 }, headers, timeout: 6500 }),
      axios.get('https://api.coingecko.com/api/v3/search', { params: { query: q }, headers, timeout: 6500 }),
    ]);
    const quotes = yahoo.status === 'fulfilled' ? (yahoo.value.data.quotes ?? []).map(normalizeYahooAsset).filter(Boolean) : [];
    const coins = cg.status === 'fulfilled' ? (cg.value.data.coins ?? []).slice(0, 8).map(c => ({
      id: c.id, name: c.name, symbol: c.symbol.toUpperCase(), image: c.thumb,
      type: 'crypto', analysisType: 'crypto', source: 'CoinGecko', exchange: 'CoinGecko', external: true,
    })).filter(c => /^[a-z0-9-]{1,100}$/.test(c.id)) : [];
    const seen = new Set();
    const results = [...local, ...coins, ...quotes].filter(a => {
      const key = `${a.analysisType}:${a.id}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 22);
    return { results, partial: yahoo.status === 'rejected' || cg.status === 'rejected', sources: ['WaStake', 'Yahoo Finance', 'CoinGecko'] };
  });
}

export function normalizeNasdaqRows(rows) {
  return rows.map(r => ({ id: r.symbol, symbol: r.symbol, name: r.name, type: 'stock', analysisType: 'stock',
    price: Number(String(r.lastsale).replace(/[$,]/g, '')), change24h: parseFloat(r.pctchange),
    marketCap: Number(String(r.marketCap).replace(/,/g, '')), currency: 'USD', sector: r.sector,
    source: 'Nasdaq screener', external: true,
  })).filter(a => /^[A-Z0-9.-]{1,20}$/.test(a.id) && Number.isFinite(a.marketCap) && a.marketCap > 0 && a.price > 0);
}

export async function getCapitalizationUniverse() {
  return cached('caps', 30 * 60_000, async () => {
    const [nasdaq, cg] = await Promise.allSettled([
      axios.get('https://api.nasdaq.com/api/screener/stocks', { params: { tableonly: true, download: true, limit: 10000 }, headers, timeout: 12000, maxContentLength: 8_000_000 }),
      axios.get('https://api.coingecko.com/api/v3/coins/markets', { params: { vs_currency: 'usd', order: 'market_cap_desc', per_page: 100, page: 1, sparkline: false }, headers, timeout: 9000 }),
    ]);
    const stocks = nasdaq.status === 'fulfilled' ? normalizeNasdaqRows(nasdaq.value.data.data?.rows ?? []) : [];
    let crypto = cg.status === 'fulfilled' && Array.isArray(cg.value.data) ? cg.value.data.map(c => ({
      id: c.id, symbol: c.symbol.toUpperCase(), name: c.name, type: 'crypto', analysisType: 'crypto',
      marketCap: c.market_cap, price: c.current_price, change24h: c.price_change_percentage_24h,
      currency: 'USD', source: 'CoinGecko', updatedAt: c.last_updated, external: true,
    })).filter(a => a.marketCap > 0 && a.price > 0) : [];
    const fullCryptoCoverage = crypto.length > 0;
    if (!fullCryptoCoverage) {
      try {
        const fallback = await getCryptoPrices();
        crypto = Object.values(fallback).filter(a => a?.type === 'crypto' && a.marketCap > 0 && a.price > 0)
          .map(a => ({ ...a, analysisType: 'crypto', currency: 'USD', source: a.source || 'CoinGecko' }));
      } catch { /* Explicit partial coverage, without fixed values. */ }
    }
    // Keep coverage explicit: these are securities returned by Nasdaq, not a global company census.
    const stockTop = [...stocks].sort((a,b) => b.marketCap-a.marketCap).slice(0, 200);
    const ids = new Set(stockTop.map(a => a.id));
    return { stocks: [...stockTop, ...stocks.filter(a => TRADITIONAL_ASSETS[a.id] && !ids.has(a.id))], crypto,
      fetchedAt: new Date().toISOString(), stockCoverage: stocks.length, cryptoCoverage: fullCryptoCoverage ? 'market_top_100' : 'catalog_fallback', partial: !stocks.length || !fullCryptoCoverage };
  });
}
