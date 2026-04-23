import axios from 'axios';

const cache = new Map();
const CG_HEADERS = process.env.COINGECKO_API_KEY
  ? { 'x-cg-demo-api-key': process.env.COINGECKO_API_KEY }
  : {};
const CACHE_TTL = { price: 5 * 60 * 1000, ohlcv: 60 * 60 * 1000 };

// ── CryptoCompare fallback (sin auth, sin geo-block, dominio estable) ────────
// CoinCap (api.coincap.io) fue adquirida por Kraken y apagada en 2024
// Binance devuelve 451 desde los servidores de Railway (bloqueo legal por región)
const CC_SYMBOL_MAP = {
  bitcoin:             'BTC',
  ethereum:            'ETH',
  solana:              'SOL',
  ripple:              'XRP',
  binancecoin:         'BNB',
  cardano:             'ADA',
  dogecoin:            'DOGE',
  'avalanche-2':       'AVAX',
  chainlink:           'LINK',
  polkadot:            'DOT',
  'shiba-inu':         'SHIB',
  litecoin:            'LTC',
  uniswap:             'UNI',
  cosmos:              'ATOM',
  near:                'NEAR',
  'bitcoin-cash':      'BCH',
  stellar:             'XLM',
  'internet-computer': 'ICP',
};

async function fetchCryptoComparePrices(ids) {
  try {
    const fsyms = ids.map(id => CC_SYMBOL_MAP[id]).filter(Boolean).join(',');
    const { data } = await axios.get('https://min-api.cryptocompare.com/data/pricemultifull', {
      params: { fsyms, tsyms: 'USD' },
      timeout: 8000,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WaStake/1.0)' },
    });

    const raw = data.RAW ?? {};
    const result = {};
    for (const id of ids) {
      const sym  = CC_SYMBOL_MAP[id];
      const meta = CRYPTO_ASSETS[id];
      const d    = sym ? raw[sym]?.USD : null;
      if (!d) continue;
      const price = d.PRICE;
      if (!price || isNaN(price)) continue;
      result[id] = {
        id,
        name:      meta?.name   ?? id,
        symbol:    meta?.symbol ?? sym,
        image:     meta?.image  ?? null,
        price,
        change24h: d.CHANGEPCT24HOUR  ?? 0,
        volume24h: d.VOLUME24HOURTO   ?? 0,
        marketCap: d.MKTCAP           ?? 0,
        type:      'crypto',
        updatedAt: Date.now(),
        source:    'cryptocompare',
      };
    }
    return result;
  } catch (err) {
    console.warn('[PriceService] CryptoCompare fallback failed:', err.message?.slice(0, 80));
    return null;
  }
}

// Returns fresh data if within TTL, null otherwise
function fromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > entry.ttl) { cache.delete(key); return null; }
  return entry.data;
}
// Returns stale data regardless of TTL (used as API failure fallback)
function fromCacheStale(key) {
  return cache.get(key)?.data ?? null;
}
function toCache(key, data, ttl) { cache.set(key, { data, ts: Date.now(), ttl }); }

// ─── Crypto asset catalog ─────────────────────────────────────────────────────

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

// ─── Traditional asset catalog — usada para construir el resultado dinámicamente ─

export const TRADITIONAL_ASSETS = {
  // ── ETFs ─────────────────────────────────────────────────────────────────────
  'SPY':  { name: 'S&P 500 (SPY)',           symbol: 'SPY',  type: 'etf',       image: null },
  'QQQ':  { name: 'NASDAQ-100 (QQQ)',        symbol: 'QQQ',  type: 'etf',       image: null },
  'DIA':  { name: 'Dow Jones (DIA)',          symbol: 'DIA',  type: 'etf',       image: null },
  'IWM':  { name: 'Russell 2000 (IWM)',       symbol: 'IWM',  type: 'etf',       image: null },
  'URTH': { name: 'MSCI World (URTH)',        symbol: 'URTH', type: 'etf',       image: null },
  'EEM':  { name: 'Emergentes (EEM)',         symbol: 'EEM',  type: 'etf',       image: null },
  'VTI':  { name: 'US Total Market (VTI)',   symbol: 'VTI',  type: 'etf',       image: null },
  'ARKK': { name: 'ARK Innovation (ARKK)',   symbol: 'ARKK', type: 'etf',       image: null },
  'XLK':  { name: 'Tech Sector (XLK)',       symbol: 'XLK',  type: 'etf',       image: null },
  'XLF':  { name: 'Finanzas (XLF)',          symbol: 'XLF',  type: 'etf',       image: null },
  'XLE':  { name: 'Energía (XLE)',           symbol: 'XLE',  type: 'etf',       image: null },

  // ── Acciones ─────────────────────────────────────────────────────────────────
  'AAPL':  { name: 'Apple',              symbol: 'AAPL',  type: 'stock', image: 'https://logo.clearbit.com/apple.com'          },
  'MSFT':  { name: 'Microsoft',          symbol: 'MSFT',  type: 'stock', image: 'https://logo.clearbit.com/microsoft.com'      },
  'NVDA':  { name: 'NVIDIA',             symbol: 'NVDA',  type: 'stock', image: 'https://logo.clearbit.com/nvidia.com'         },
  'TSLA':  { name: 'Tesla',              symbol: 'TSLA',  type: 'stock', image: 'https://logo.clearbit.com/tesla.com'          },
  'AMZN':  { name: 'Amazon',             symbol: 'AMZN',  type: 'stock', image: 'https://logo.clearbit.com/amazon.com'         },
  'GOOGL': { name: 'Alphabet',           symbol: 'GOOGL', type: 'stock', image: 'https://logo.clearbit.com/google.com'         },
  'META':  { name: 'Meta',               symbol: 'META',  type: 'stock', image: 'https://logo.clearbit.com/meta.com'           },
  'NFLX':  { name: 'Netflix',            symbol: 'NFLX',  type: 'stock', image: 'https://logo.clearbit.com/netflix.com'        },
  'JPM':   { name: 'JPMorgan',           symbol: 'JPM',   type: 'stock', image: 'https://logo.clearbit.com/jpmorganchase.com'  },
  'V':     { name: 'Visa',               symbol: 'V',     type: 'stock', image: 'https://logo.clearbit.com/visa.com'           },
  'AMD':   { name: 'AMD',                symbol: 'AMD',   type: 'stock', image: null },
  'INTC':  { name: 'Intel',              symbol: 'INTC',  type: 'stock', image: null },
  'ORCL':  { name: 'Oracle',             symbol: 'ORCL',  type: 'stock', image: null },
  'CRM':   { name: 'Salesforce',         symbol: 'CRM',   type: 'stock', image: null },
  'ADBE':  { name: 'Adobe',              symbol: 'ADBE',  type: 'stock', image: null },
  'PYPL':  { name: 'PayPal',             symbol: 'PYPL',  type: 'stock', image: null },
  'UBER':  { name: 'Uber',               symbol: 'UBER',  type: 'stock', image: null },
  'SHOP':  { name: 'Shopify',            symbol: 'SHOP',  type: 'stock', image: null },
  'DIS':   { name: 'Disney',             symbol: 'DIS',   type: 'stock', image: null },
  'BA':    { name: 'Boeing',             symbol: 'BA',    type: 'stock', image: null },
  'GS':    { name: 'Goldman Sachs',      symbol: 'GS',    type: 'stock', image: null },
  'MS':    { name: 'Morgan Stanley',     symbol: 'MS',    type: 'stock', image: null },
  'WMT':   { name: 'Walmart',            symbol: 'WMT',   type: 'stock', image: null },
  'KO':    { name: 'Coca-Cola',          symbol: 'KO',    type: 'stock', image: null },
  'PEP':   { name: 'PepsiCo',            symbol: 'PEP',   type: 'stock', image: null },
  'MCD':   { name: "McDonald's",         symbol: 'MCD',   type: 'stock', image: null },
  'NKE':   { name: 'Nike',               symbol: 'NKE',   type: 'stock', image: null },
  'PFE':   { name: 'Pfizer',             symbol: 'PFE',   type: 'stock', image: null },
  'JNJ':   { name: 'Johnson & Johnson',  symbol: 'JNJ',   type: 'stock', image: null },
  'XOM':   { name: 'ExxonMobil',         symbol: 'XOM',   type: 'stock', image: null },

  // ── Forex ─────────────────────────────────────────────────────────────────────
  'EURUSD=X': { name: 'EUR / USD', symbol: 'EUR/USD', type: 'forex', image: null },
  'GBPUSD=X': { name: 'GBP / USD', symbol: 'GBP/USD', type: 'forex', image: null },
  'USDJPY=X': { name: 'USD / JPY', symbol: 'USD/JPY', type: 'forex', image: null },
  'USDMXN=X': { name: 'USD / MXN', symbol: 'USD/MXN', type: 'forex', image: null },
  'USDBRL=X': { name: 'USD / BRL', symbol: 'USD/BRL', type: 'forex', image: null },

  // ── Índices ──────────────────────────────────────────────────────────────────
  '^GSPC':  { name: 'S&P 500',    symbol: 'SPX', type: 'index', image: null },
  '^NDX':   { name: 'NASDAQ 100', symbol: 'NDX', type: 'index', image: null },
  '^DJI':   { name: 'Dow Jones',  symbol: 'DJI', type: 'index', image: null },
  '^FTSE':  { name: 'FTSE 100',   symbol: 'UKX', type: 'index', image: null },
  '^N225':  { name: 'Nikkei 225', symbol: 'NKY', type: 'index', image: null },
  '^GDAXI': { name: 'DAX 40',     symbol: 'DAX', type: 'index', image: null },

  // ── Materias Primas ──────────────────────────────────────────────────────────
  'GC=F': { name: 'Oro (Gold)',       symbol: 'XAU', type: 'commodity', image: null },
  'SI=F': { name: 'Plata (Silver)',   symbol: 'XAG', type: 'commodity', image: null },
  'CL=F': { name: 'Petróleo WTI',    symbol: 'WTI', type: 'commodity', image: null },
  'NG=F': { name: 'Gas Natural',      symbol: 'NG',  type: 'commodity', image: null },
  'HG=F': { name: 'Cobre (Copper)',   symbol: 'HG',  type: 'commodity', image: null },
  'GLD':  { name: 'Oro ETF (GLD)',    symbol: 'GLD', type: 'etf',       image: null },

  // ── Bonos ETFs ───────────────────────────────────────────────────────────────
  'TLT': { name: 'Bonos T 20+',   symbol: 'TLT', type: 'bond', image: null },
  'IEF': { name: 'Bonos T 7-10',  symbol: 'IEF', type: 'bond', image: null },
  'SHY': { name: 'Bonos T 1-3',   symbol: 'SHY', type: 'bond', image: null },
  'HYG': { name: 'High Yield',    symbol: 'HYG', type: 'bond', image: null },
  'LQD': { name: 'Corp IG',       symbol: 'LQD', type: 'bond', image: null },
};

// ─── Yahoo Finance — precio actual (soporta stocks, ETFs, forex, índices, bonos y commodities) ──

async function fetchYahooPrices(symbols) {
  const result = {};
  // Procesar en lotes de 20 para evitar saturar Yahoo Finance con demasiadas requests concurrentes
  const BATCH = 20;
  for (let i = 0; i < symbols.length; i += BATCH) {
    const batch = symbols.slice(i, i + BATCH);
    await Promise.all(batch.map(async (sym) => {
      try {
        const { data } = await axios.get(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}`,
          {
            params: { interval: '1d', range: '5d' },
            headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WaStake/1.0)' },
            timeout: 8000,
          }
        );
        const meta = data.chart?.result?.[0]?.meta;
        if (!meta) return;
        const price = meta.regularMarketPrice;
        const prev  = meta.chartPreviousClose;
        if (!price || isNaN(price)) return;
        result[sym] = {
          price,
          change:    prev > 0 ? ((price - prev) / prev) * 100 : 0,
          volume:    meta.regularMarketVolume ?? 0,
          marketCap: meta.marketCap ?? 0,
        };
      } catch (err) {
        // Symbol no disponible — se omite silenciosamente
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`[Yahoo] ${sym}: ${err.message?.slice(0, 60)}`);
        }
      }
    }));
  }
  return result;
}

// ─── Crypto prices ────────────────────────────────────────────────────────────

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

    // 1. Caché obsoleta (servidor lleva tiempo corriendo)
    const stale = fromCacheStale(key);
    if (stale) {
      const staleEntry = cache.get(key);
      const ageMin = staleEntry ? Math.round((Date.now() - staleEntry.ts) / 60000) : '?';
      console.warn(`[PriceService] Returning stale crypto prices (${ageMin}min old)`);
      return { ...stale, _isStale: true, _staleTs: staleEntry?.ts ?? Date.now() };
    }

    // 2. Sin caché (reinicio del servidor + 429): usar CryptoCompare
    console.warn('[PriceService] No stale cache — trying CryptoCompare fallback');
    const cc = await fetchCryptoComparePrices(ids);
    if (cc && Object.keys(cc).length > 0) {
      toCache(key, cc, CACHE_TTL.price);
      return { ...cc, _isStale: true, _staleTs: Date.now() };
    }

    throw err;
  }
}

// ─── Crypto OHLCV ─────────────────────────────────────────────────────────────

export async function getCryptoOHLCV(id, days = 90) {
  const key = `ohlcv_${id}_${days}`;
  const cached = fromCache(key);
  if (cached) return cached;

  try {
    // /market_chart — más fiable en el free tier, retorna daily OHLCV
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

    // Velas OHLCV sintéticas a partir de cierres diarios
    const candles = prices.map(([time, close], i) => {
      const prev = i > 0 ? prices[i - 1][1] : close;
      return {
        time:   Math.floor(time / 1000),
        open:   prev,
        high:   Math.max(close, prev),
        low:    Math.min(close, prev),
        close,
        volume: volumes[i]?.[1] ?? 0,
      };
    });

    toCache(key, candles, CACHE_TTL.ohlcv);
    return candles;
  } catch (err) {
    // Fallback al endpoint /ohlc
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

// ─── Traditional prices — construido dinámicamente desde TRADITIONAL_ASSETS ──

export async function getTraditionalPrices() {
  const key = 'traditional_prices';
  const cached = fromCache(key);
  if (cached) return cached;

  const symbols = Object.keys(TRADITIONAL_ASSETS);

  try {
    const yahooPrices = await fetchYahooPrices(symbols);

    const result = {};
    for (const [id, meta] of Object.entries(TRADITIONAL_ASSETS)) {
      const yahoo = yahooPrices[id];
      result[id] = {
        id,
        name:      meta.name,
        symbol:    meta.symbol ?? id,
        type:      meta.type,
        image:     meta.image ?? null,
        price:     yahoo?.price    ?? null,
        change24h: yahoo?.change   ?? 0,
        volume24h: yahoo?.volume   ?? 0,
        marketCap: yahoo?.marketCap ?? 0,
        updatedAt: Date.now(),
      };
    }

    toCache(key, result, CACHE_TTL.price);
    return result;
  } catch (err) {
    // Stale cache fallback — igual que en crypto
    console.warn('[PriceService] Traditional prices fetch failed — trying stale cache');
    const stale = fromCacheStale(key);
    if (stale) {
      const staleEntry = cache.get(key);
      const ageMin = staleEntry ? Math.round((Date.now() - staleEntry.ts) / 60000) : '?';
      console.warn(`[PriceService] Returning stale traditional prices (${ageMin}min old)`);
      return { ...stale, _isStale: true, _staleTs: staleEntry?.ts ?? Date.now() };
    }
    throw err;
  }
}

// ─── Traditional OHLCV — Yahoo Finance + Stooq fallback ──────────────────────

export async function getTraditionalOHLCV(symbol) {
  const key = `trad_ohlcv_${symbol}`;
  const cached = fromCache(key);
  if (cached) return cached;

  // Yahoo Finance v8 chart — acepta stocks, ETFs, forex, índices, bonos y commodities
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
    // Fallback a Stooq (funciona para algunos activos tradicionales)
    try {
      const stooqSym = symbol.replace('=F', '.f').replace(/[^a-zA-Z0-9.]/g, '').toLowerCase();
      const suffix = /^\w+\.f$/.test(stooqSym) ? '' : '.us';
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
