import axios from 'axios';

const cache = new Map();
const CACHE_TTL = { price: 5 * 60 * 1000, ohlcv: 5 * 60 * 1000 };

function fromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { cache.delete(key); return null; }
  return entry.data;
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

export async function getCryptoOHLCV(id, days = 7) {
  const key = `ohlcv_${id}_${days}`;
  const cached = fromCache(key);
  if (cached) return cached;

  const { data } = await axios.get(
    `${process.env.COINGECKO_BASE}/coins/${id}/ohlc`,
    { params: { vs_currency: 'usd', days }, timeout: 10000 }
  );

  const candles = data.map(([time, open, high, low, close]) => ({
    time: Math.floor(time / 1000), open, high, low, close,
  }));
  toCache(key, candles, CACHE_TTL.ohlcv);
  return candles;
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

export async function getTraditionalPrices() {
  const key = 'traditional_prices';
  const cached = fromCache(key);
  if (cached) return cached;

  let goldPrice = 3100, silverPrice = 34;
  try {
    const { data } = await axios.get(
      `${process.env.COINGECKO_BASE}/simple/price`,
      { params: { ids: 'pax-gold,silver', vs_currencies: 'usd', include_24hr_change: true }, timeout: 6000 }
    );
    if (data['pax-gold']?.usd) goldPrice = data['pax-gold'].usd;
    if (data['silver']?.usd)   silverPrice = data['silver'].usd;
  } catch { /* usar default */ }

  const etfData = await fetchStooqPrices(['SPY', 'URTH', 'EEM']);

  const result = {
    SPY:    { id: 'SPY',  symbol: 'SPY',  name: 'S&P 500 (SPY)',       type: 'etf',       price: etfData.SPY?.price  ?? 560, change24h: etfData.SPY?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    URTH:   { id: 'URTH', symbol: 'URTH', name: 'MSCI World (URTH)',   type: 'etf',       price: etfData.URTH?.price ?? 98,  change24h: etfData.URTH?.change ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    EEM:    { id: 'EEM',  symbol: 'EEM',  name: 'Mercados Emergentes', type: 'etf',       price: etfData.EEM?.price  ?? 42,  change24h: etfData.EEM?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'GC=F': { id: 'GC=F', symbol: 'XAU',  name: 'Oro (Gold)',          type: 'commodity', price: goldPrice,                   change24h: 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'SI=F': { id: 'SI=F', symbol: 'XAG',  name: 'Plata (Silver)',      type: 'commodity', price: silverPrice,                 change24h: 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
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