import axios from 'axios';

const cache = new Map();
const CG_HEADERS = process.env.COINGECKO_API_KEY
  ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
  : {};
const CACHE_TTL = { price: 2 * 60 * 1000, ohlcv: 60 * 60 * 1000 };

// Returns fresh data if within TTL, null otherwise
function fromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { cache.delete(key); return null; }
  return entry.data;
}
// Returns stale data regardless of TTL (used as 429 fallback)
function fromCacheStale(key) {
  return cache.get(key)?.data ?? null;
}
function toCache(key, data, ttl) { cache.set(key, { data, ts: Date.now(), ttl }); }

export const CRYPTO_ASSETS = {
  bitcoin:  { name: 'Bitcoin',  symbol: 'BTC', image: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png' },
  ethereum: { name: 'Ethereum', symbol: 'ETH', image: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png' },
  solana:   { name: 'Solana',   symbol: 'SOL', image: 'https://assets.coingecko.com/coins/images/4128/thumb/solana.png' },
};

export const TRADITIONAL_ASSETS = {
  SPY:    { name: 'S&P 500 (SPY)',       type: 'etf' },
  URTH:   { name: 'MSCI World (URTH)',   type: 'etf' },
  EEM:    { name: 'Mercados Emergentes', type: 'etf' },
  'GC=F': { name: 'Oro (Gold)',          type: 'commodity' },
  'SI=F': { name: 'Plata (Silver)',      type: 'commodity' },
  'AAPL':  { name: 'Apple',     symbol: 'AAPL',  type: 'stock' },
  'MSFT':  { name: 'Microsoft', symbol: 'MSFT',  type: 'stock' },
  'NVDA':  { name: 'NVIDIA',    symbol: 'NVDA',  type: 'stock' },
  'TSLA':  { name: 'Tesla',     symbol: 'TSLA',  type: 'stock' },
  'AMZN':  { name: 'Amazon',    symbol: 'AMZN',  type: 'stock' },
  'GOOGL': { name: 'Alphabet',  symbol: 'GOOGL', type: 'stock' },
  'META':  { name: 'Meta',      symbol: 'META',  type: 'stock' },
  'NFLX':  { name: 'Netflix',   symbol: 'NFLX',  type: 'stock' },
  'JPM':   { name: 'JPMorgan',  symbol: 'JPM',   type: 'stock' },
  'V':     { name: 'Visa',      symbol: 'V',     type: 'stock' },
};

export async function getCryptoPrices(ids = Object.keys(CRYPTO_ASSETS)) {
  const key = `crypto_prices_${ids.join(',')}`;
  const cached = fromCache(key);
  if (cached) return cached;

  const { data } = await axios.get(
    `${process.env.COINGECKO_BASE}/simple/price`,
    {
      params: {
        ids: ids.join(','),
        vs_currencies: 'usd',
        include_24hr_change: true,
        include_24hr_vol: true,
        include_market_cap: true,
      },
      headers: CG_HEADERS,
      timeout: 8000,
    }
  );

  const result = {};
  for (const [id, raw] of Object.entries(data)) {
    result[id] = {
      id,
      name:      CRYPTO_ASSETS[id]?.name  ?? id,
      symbol:    CRYPTO_ASSETS[id]?.symbol ?? id.toUpperCase(),
      image:     CRYPTO_ASSETS[id]?.image  ?? null,
      price:     raw.usd,
      change24h: raw.usd_24h_change ?? 0,
      volume24h: raw.usd_24h_vol    ?? 0,
      marketCap: raw.usd_market_cap ?? 0,
      type:      'crypto',
      updatedAt: Date.now(),
    };
  }
  toCache(key, result, CACHE_TTL.price);
  return result;
}

export async function getCryptoOHLCV(id, days = 90) {
  const key = `ohlcv_${id}_${days}`;
  const cached = fromCache(key);
  if (cached) return cached;

  try {
    // Try /market_chart first - more reliable on free tier, returns daily OHLCV
    const { data } = await axios.get(
      `${process.env.COINGECKO_BASE}/coins/${id}/market_chart`,
      {
        params: { vs_currency: 'usd', days, interval: 'daily' },
        headers: CG_HEADERS,
        timeout: 10000,
      }
    );

    const prices  = data.prices  ?? [];
    const volumes = data.total_volumes ?? [];

    if (prices.length < 2) throw new Error('Insufficient data from market_chart');

    // Build synthetic OHLCV candles from daily close prices
    const candles = prices.map(([time, close], i) => {
      const prev  = i > 0 ? prices[i - 1][1] : close;
      const high  = Math.max(close, prev);
      const low   = Math.min(close, prev);
      return {
        time:   Math.floor(time / 1000),
        open:   prev,
        high,
        low,
        close,
        volume: volumes[i]?.[1] ?? 0,
      };
    });

    toCache(key, candles, CACHE_TTL.ohlcv);
    return candles;
  } catch (err) {
    // Fallback to /ohlc endpoint
    try {
      const safeDays = Math.min(days, 30);
      const { data } = await axios.get(
        `${process.env.COINGECKO_BASE}/coins/${id}/ohlc`,
        { params: { vs_currency: 'usd', days: safeDays }, headers: CG_HEADERS, timeout: 10000 }
      );
      const candles = data.map(([time, open, high, low, close]) => ({
        time: Math.floor(time / 1000), open, high, low, close,
      }));
      toCache(key, candles, CACHE_TTL.ohlcv);
      return candles;
    } catch (fallbackErr) {
      const status = fallbackErr.response?.status;
      if (status === 429) {
        const stale = fromCacheStale(key);
        if (stale) return stale;
      }
      throw fallbackErr;
    }
  }
}

async function fetchStooqPrices(symbols) {
  const result = {};
  await Promise.all(symbols.map(async (sym) => {
    try {
      const { data } = await axios.get(
        `https://stooq.com/q/l/?s=${sym.toLowerCase()}.us&f=sd2t2ohlcvn&e=csv`,
        { timeout: 6000 }
      );
      const lines = data.trim().split('\n');
      if (lines.length >= 2) {
        const cols = lines[1].split(',');
        const close = parseFloat(cols[6]);
        const open  = parseFloat(cols[4]);
        if (!isNaN(close) && close > 0) {
          result[sym] = {
            price:  close,
            change: open > 0 ? ((close - open) / open) * 100 : 0,
            volume: parseFloat(cols[7]) || 0,
          };
        }
      }
    } catch { /* usar default */ }
  }));
  return result;
}

async function fetchYahooPrices(symbols) {
  const result = {};
  await Promise.all(symbols.map(async (sym) => {
    try {
      const { data } = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`,
        { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WaStake/1.0)' }, timeout: 8000 }
      );
      const meta = data.chart?.result?.[0]?.meta;
      if (!meta) return;
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose;
      if (!price) return;
      result[sym] = {
        price,
        change: prev > 0 ? ((price - prev) / prev) * 100 : 0,
        volume: meta.regularMarketVolume ?? 0,
      };
    } catch { /* skip */ }
  }));
  return result;
}

export async function getTraditionalPrices() {
  const key = 'traditional_prices';
  const cached = fromCache(key);
  if (cached) return cached;

  let goldPrice = 3100, silverPrice = 34;
  try {
    const { data } = await axios.get(
      `${process.env.COINGECKO_BASE}/simple/price`,
      { params: { ids: 'pax-gold,silver', vs_currencies: 'usd', include_24hr_change: true }, headers: CG_HEADERS, timeout: 6000 }
    );
    if (data['pax-gold']?.usd) goldPrice = data['pax-gold'].usd;
    if (data['silver']?.usd)   silverPrice = data['silver'].usd;
  } catch { /* usar default */ }

  const [etfData, stockData] = await Promise.all([
    fetchStooqPrices(['SPY', 'URTH', 'EEM']),
    fetchYahooPrices(['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NFLX', 'JPM', 'V']),
  ]);

  const result = {
    SPY:    { id: 'SPY',  symbol: 'SPY',  name: 'S&P 500 (SPY)',       type: 'etf',       price: etfData.SPY?.price  ?? 560, change24h: etfData.SPY?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    URTH:   { id: 'URTH', symbol: 'URTH', name: 'MSCI World (URTH)',   type: 'etf',       price: etfData.URTH?.price ?? 98,  change24h: etfData.URTH?.change ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    EEM:    { id: 'EEM',  symbol: 'EEM',  name: 'Mercados Emergentes', type: 'etf',       price: etfData.EEM?.price  ?? 42,  change24h: etfData.EEM?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'GC=F': { id: 'GC=F', symbol: 'XAU',  name: 'Oro (Gold)',          type: 'commodity', price: goldPrice,                   change24h: 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'SI=F': { id: 'SI=F', symbol: 'XAG',  name: 'Plata (Silver)',      type: 'commodity', price: silverPrice,                 change24h: 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'AAPL':  { id: 'AAPL',  symbol: 'AAPL',  name: 'Apple',     type: 'stock', price: stockData.AAPL?.price  ?? null, change24h: stockData.AAPL?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now(), image: 'https://logo.clearbit.com/apple.com'     },
    'MSFT':  { id: 'MSFT',  symbol: 'MSFT',  name: 'Microsoft', type: 'stock', price: stockData.MSFT?.price  ?? null, change24h: stockData.MSFT?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now(), image: 'https://logo.clearbit.com/microsoft.com' },
    'NVDA':  { id: 'NVDA',  symbol: 'NVDA',  name: 'NVIDIA',    type: 'stock', price: stockData.NVDA?.price  ?? null, change24h: stockData.NVDA?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now(), image: 'https://logo.clearbit.com/nvidia.com'    },
    'TSLA':  { id: 'TSLA',  symbol: 'TSLA',  name: 'Tesla',     type: 'stock', price: stockData.TSLA?.price  ?? null, change24h: stockData.TSLA?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now(), image: 'https://logo.clearbit.com/tesla.com'     },
    'AMZN':  { id: 'AMZN',  symbol: 'AMZN',  name: 'Amazon',    type: 'stock', price: stockData.AMZN?.price  ?? null, change24h: stockData.AMZN?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now(), image: 'https://logo.clearbit.com/amazon.com'    },
    'GOOGL': { id: 'GOOGL', symbol: 'GOOGL', name: 'Alphabet',  type: 'stock', price: stockData.GOOGL?.price ?? null, change24h: stockData.GOOGL?.change ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now(), image: 'https://logo.clearbit.com/google.com'    },
    'META':  { id: 'META',  symbol: 'META',  name: 'Meta',      type: 'stock', price: stockData.META?.price  ?? null, change24h: stockData.META?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now(), image: 'https://logo.clearbit.com/meta.com'      },
    'NFLX':  { id: 'NFLX',  symbol: 'NFLX',  name: 'Netflix',   type: 'stock', price: stockData.NFLX?.price  ?? null, change24h: stockData.NFLX?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now(), image: 'https://logo.clearbit.com/netflix.com'   },
    'JPM':   { id: 'JPM',   symbol: 'JPM',   name: 'JPMorgan',  type: 'stock', price: stockData.JPM?.price   ?? null, change24h: stockData.JPM?.change   ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now(), image: 'https://logo.clearbit.com/jpmorganchase.com' },
    'V':     { id: 'V',     symbol: 'V',     name: 'Visa',      type: 'stock', price: stockData.V?.price     ?? null, change24h: stockData.V?.change     ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now(), image: 'https://logo.clearbit.com/visa.com'      },
  };

  toCache(key, result, CACHE_TTL.price);
  return result;
}

export async function getTraditionalOHLCV(symbol) {
  const key = `trad_ohlcv_${symbol}`;
  const cached = fromCache(key);
  if (cached) return cached;

  // Yahoo Finance v8 chart API — funciona sin API key server-side
  // Acepta los mismos símbolos: SPY, URTH, EEM, GC=F, SI=F
  try {
    const { data } = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
      {
        params: { interval: '1d', range: '1y' },
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WaStake/1.0)' },
        timeout: 12000,
      }
    );

    const result = data.chart?.result?.[0];
    if (!result) return [];

    const timestamps = result.timestamp ?? [];
    const q = result.indicators?.quote?.[0] ?? {};

    const candles = timestamps
      .map((ts, i) => ({
        time:  ts,
        open:  q.open?.[i],
        high:  q.high?.[i],
        low:   q.low?.[i],
        close: q.close?.[i],
      }))
      .filter(c => c.open != null && c.close != null && !isNaN(c.open) && c.open > 0)
      .slice(-365);

    toCache(key, candles, CACHE_TTL.ohlcv);
    return candles;
  } catch {
    // Fallback a Stooq si Yahoo falla
    try {
      const stooqSym = symbol.replace('=F', '.f').replace('=', '').toLowerCase();
      const suffix = /^\w+\.f$/.test(stooqSym) ? '' : '.us';
      // Stooq: d1 y d2 para rango de 1 año exacto
      const now  = new Date();
      const past = new Date(now); past.setFullYear(past.getFullYear() - 1);
      const fmt  = d => d.toISOString().slice(0, 10).replace(/-/g, '');
      const { data } = await axios.get(
        `https://stooq.com/q/d/l/?s=${stooqSym}${suffix}&d1=${fmt(past)}&d2=${fmt(now)}&i=d`,
        { timeout: 10000, headers: { 'User-Agent': 'Mozilla/5.0' } }
      );
      const lines = data.trim().split('\n').slice(1);
      const candles = lines
        .map(line => {
          const [date, open, high, low, close] = line.split(',');
          return {
            time:  Math.floor(new Date(date).getTime() / 1000),
            open:  parseFloat(open),
            high:  parseFloat(high),
            low:   parseFloat(low),
            close: parseFloat(close),
          };
        })
        .filter(c => !isNaN(c.open) && c.open > 0)
        .slice(-365);
      toCache(key, candles, CACHE_TTL.ohlcv);
      return candles;
    } catch {
      return [];
    }
  }
}