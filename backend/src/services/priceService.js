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
  bitcoin:             { name: 'Bitcoin',          symbol: 'BTC',  image: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png' },
  ethereum:            { name: 'Ethereum',         symbol: 'ETH',  image: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png' },
  solana:              { name: 'Solana',            symbol: 'SOL',  image: 'https://assets.coingecko.com/coins/images/4128/thumb/solana.png' },
  ripple:              { name: 'XRP',               symbol: 'XRP',  image: 'https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png' },
  binancecoin:         { name: 'BNB',               symbol: 'BNB',  image: 'https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png' },
  cardano:             { name: 'Cardano',           symbol: 'ADA',  image: 'https://assets.coingecko.com/coins/images/975/thumb/cardano.png' },
  dogecoin:            { name: 'Dogecoin',          symbol: 'DOGE', image: 'https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png' },
  'avalanche-2':       { name: 'Avalanche',         symbol: 'AVAX', image: 'https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png' },
  chainlink:           { name: 'Chainlink',         symbol: 'LINK', image: 'https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png' },
  polkadot:            { name: 'Polkadot',          symbol: 'DOT',  image: 'https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png' },
  'shiba-inu':         { name: 'Shiba Inu',         symbol: 'SHIB', image: 'https://assets.coingecko.com/coins/images/11939/thumb/shiba.png' },
  litecoin:            { name: 'Litecoin',          symbol: 'LTC',  image: 'https://assets.coingecko.com/coins/images/2/thumb/litecoin.png' },
  uniswap:             { name: 'Uniswap',           symbol: 'UNI',  image: 'https://assets.coingecko.com/coins/images/12504/thumb/uni.jpg' },
  'bitcoin-cash':      { name: 'Bitcoin Cash',      symbol: 'BCH',  image: 'https://assets.coingecko.com/coins/images/780/thumb/bitcoin-cash-circle.png' },
  stellar:             { name: 'Stellar',           symbol: 'XLM',  image: 'https://assets.coingecko.com/coins/images/100/thumb/Stellar_symbol_black_RGB.png' },
  cosmos:              { name: 'Cosmos',            symbol: 'ATOM', image: 'https://assets.coingecko.com/coins/images/1481/thumb/cosmos_hub.png' },
  near:                { name: 'NEAR Protocol',     symbol: 'NEAR', image: 'https://assets.coingecko.com/coins/images/14877/thumb/NEAR.png' },
  'internet-computer': { name: 'Internet Computer', symbol: 'ICP',  image: 'https://assets.coingecko.com/coins/images/14495/thumb/Internet_Computer_logo.png' },
};

export const TRADITIONAL_ASSETS = {
  SPY:    { name: 'S&P 500 (SPY)',       type: 'etf' },
  URTH:   { name: 'MSCI World (URTH)',   type: 'etf' },
  EEM:    { name: 'Mercados Emergentes', type: 'etf' },
  'GC=F': { name: 'Oro (Gold)',          type: 'commodity' },
  'SI=F': { name: 'Plata (Silver)',      type: 'commodity' },
  'AAPL':  { name: 'Apple',              symbol: 'AAPL',  type: 'stock' },
  'MSFT':  { name: 'Microsoft',          symbol: 'MSFT',  type: 'stock' },
  'NVDA':  { name: 'NVIDIA',             symbol: 'NVDA',  type: 'stock' },
  'TSLA':  { name: 'Tesla',              symbol: 'TSLA',  type: 'stock' },
  'AMZN':  { name: 'Amazon',             symbol: 'AMZN',  type: 'stock' },
  'GOOGL': { name: 'Alphabet',           symbol: 'GOOGL', type: 'stock' },
  'META':  { name: 'Meta',               symbol: 'META',  type: 'stock' },
  'NFLX':  { name: 'Netflix',            symbol: 'NFLX',  type: 'stock' },
  'JPM':   { name: 'JPMorgan',           symbol: 'JPM',   type: 'stock' },
  'V':     { name: 'Visa',               symbol: 'V',     type: 'stock' },
  'AMD':   { name: 'AMD',                symbol: 'AMD',   type: 'stock' },
  'INTC':  { name: 'Intel',              symbol: 'INTC',  type: 'stock' },
  'ORCL':  { name: 'Oracle',             symbol: 'ORCL',  type: 'stock' },
  'CRM':   { name: 'Salesforce',         symbol: 'CRM',   type: 'stock' },
  'ADBE':  { name: 'Adobe',              symbol: 'ADBE',  type: 'stock' },
  'PYPL':  { name: 'PayPal',             symbol: 'PYPL',  type: 'stock' },
  'UBER':  { name: 'Uber',               symbol: 'UBER',  type: 'stock' },
  'SHOP':  { name: 'Shopify',            symbol: 'SHOP',  type: 'stock' },
  'DIS':   { name: 'Disney',             symbol: 'DIS',   type: 'stock' },
  'BA':    { name: 'Boeing',             symbol: 'BA',    type: 'stock' },
  'GS':    { name: 'Goldman Sachs',      symbol: 'GS',    type: 'stock' },
  'MS':    { name: 'Morgan Stanley',     symbol: 'MS',    type: 'stock' },
  'WMT':   { name: 'Walmart',            symbol: 'WMT',   type: 'stock' },
  'KO':    { name: 'Coca-Cola',          symbol: 'KO',    type: 'stock' },
  'PEP':   { name: 'PepsiCo',            symbol: 'PEP',   type: 'stock' },
  'MCD':   { name: "McDonald's",         symbol: 'MCD',   type: 'stock' },
  'NKE':   { name: 'Nike',               symbol: 'NKE',   type: 'stock' },
  'PFE':   { name: 'Pfizer',             symbol: 'PFE',   type: 'stock' },
  'JNJ':   { name: 'Johnson & Johnson',  symbol: 'JNJ',   type: 'stock' },
  'XOM':   { name: 'ExxonMobil',         symbol: 'XOM',   type: 'stock' },
};

export async function getCryptoPrices(ids = Object.keys(CRYPTO_ASSETS)) {
  const key = `crypto_prices_${ids.join(',')}`;
  const cached = fromCache(key);
  if (cached) return cached;

  try {
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
  } catch (err) {
    const status = err.response?.status;
    console.warn(`[PriceService] CoinGecko ${status ?? 'network error'} — trying stale cache`);
    const stale = fromCacheStale(key);
    if (stale) {
      const staleEntry = cache.get(key);
      const ageMin = staleEntry ? Math.round((Date.now() - staleEntry.ts) / 60000) : '?';
      console.warn(`[PriceService] Returning stale crypto prices (${ageMin}min old)`);
      // _isStale and _staleTs are internal markers stripped by the route handler
      return { ...stale, _isStale: true, _staleTs: staleEntry?.ts ?? Date.now() };
    }
    throw err;
  }
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
    fetchYahooPrices([
      'AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN', 'GOOGL', 'META', 'NFLX', 'JPM', 'V',
      'AMD', 'INTC', 'ORCL', 'CRM', 'ADBE', 'PYPL', 'UBER', 'SHOP', 'DIS', 'BA',
      'GS', 'MS', 'WMT', 'KO', 'PEP', 'MCD', 'NKE', 'PFE', 'JNJ', 'XOM',
    ]),
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
    'AMD':  { id: 'AMD',  symbol: 'AMD',  name: 'AMD',                 type: 'stock', price: stockData.AMD?.price  ?? null, change24h: stockData.AMD?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'INTC': { id: 'INTC', symbol: 'INTC', name: 'Intel',               type: 'stock', price: stockData.INTC?.price ?? null, change24h: stockData.INTC?.change ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'ORCL': { id: 'ORCL', symbol: 'ORCL', name: 'Oracle',              type: 'stock', price: stockData.ORCL?.price ?? null, change24h: stockData.ORCL?.change ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'CRM':  { id: 'CRM',  symbol: 'CRM',  name: 'Salesforce',          type: 'stock', price: stockData.CRM?.price  ?? null, change24h: stockData.CRM?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'ADBE': { id: 'ADBE', symbol: 'ADBE', name: 'Adobe',               type: 'stock', price: stockData.ADBE?.price ?? null, change24h: stockData.ADBE?.change ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'PYPL': { id: 'PYPL', symbol: 'PYPL', name: 'PayPal',              type: 'stock', price: stockData.PYPL?.price ?? null, change24h: stockData.PYPL?.change ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'UBER': { id: 'UBER', symbol: 'UBER', name: 'Uber',                type: 'stock', price: stockData.UBER?.price ?? null, change24h: stockData.UBER?.change ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'SHOP': { id: 'SHOP', symbol: 'SHOP', name: 'Shopify',             type: 'stock', price: stockData.SHOP?.price ?? null, change24h: stockData.SHOP?.change ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'DIS':  { id: 'DIS',  symbol: 'DIS',  name: 'Disney',              type: 'stock', price: stockData.DIS?.price  ?? null, change24h: stockData.DIS?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'BA':   { id: 'BA',   symbol: 'BA',   name: 'Boeing',              type: 'stock', price: stockData.BA?.price   ?? null, change24h: stockData.BA?.change   ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'GS':   { id: 'GS',   symbol: 'GS',   name: 'Goldman Sachs',       type: 'stock', price: stockData.GS?.price   ?? null, change24h: stockData.GS?.change   ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'MS':   { id: 'MS',   symbol: 'MS',   name: 'Morgan Stanley',      type: 'stock', price: stockData.MS?.price   ?? null, change24h: stockData.MS?.change   ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'WMT':  { id: 'WMT',  symbol: 'WMT',  name: 'Walmart',             type: 'stock', price: stockData.WMT?.price  ?? null, change24h: stockData.WMT?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'KO':   { id: 'KO',   symbol: 'KO',   name: 'Coca-Cola',           type: 'stock', price: stockData.KO?.price   ?? null, change24h: stockData.KO?.change   ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'PEP':  { id: 'PEP',  symbol: 'PEP',  name: 'PepsiCo',             type: 'stock', price: stockData.PEP?.price  ?? null, change24h: stockData.PEP?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'MCD':  { id: 'MCD',  symbol: 'MCD',  name: "McDonald's",          type: 'stock', price: stockData.MCD?.price  ?? null, change24h: stockData.MCD?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'NKE':  { id: 'NKE',  symbol: 'NKE',  name: 'Nike',                type: 'stock', price: stockData.NKE?.price  ?? null, change24h: stockData.NKE?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'PFE':  { id: 'PFE',  symbol: 'PFE',  name: 'Pfizer',              type: 'stock', price: stockData.PFE?.price  ?? null, change24h: stockData.PFE?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'JNJ':  { id: 'JNJ',  symbol: 'JNJ',  name: 'Johnson & Johnson',   type: 'stock', price: stockData.JNJ?.price  ?? null, change24h: stockData.JNJ?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
    'XOM':  { id: 'XOM',  symbol: 'XOM',  name: 'ExxonMobil',          type: 'stock', price: stockData.XOM?.price  ?? null, change24h: stockData.XOM?.change  ?? 0, volume24h: 0, marketCap: 0, updatedAt: Date.now() },
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