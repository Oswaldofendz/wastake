const BASE = import.meta.env.VITE_API_URL ?? '';

async function get(path) {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

// Todos los precios de una vez (crypto + traditional)
export const fetchAllPrices = () => get('/api/prices/all');

// Velas OHLCV para el gráfico
export const fetchOHLCV = (id, type = 'crypto', params = {}) => {
  const qs = new URLSearchParams({ type, ...params }).toString();
  return get(`/api/prices/ohlcv/${encodeURIComponent(id)}?${qs}`);
};

// Catálogo de activos
export const fetchAssets = () => get('/api/assets');

// Búsqueda de activos
export const searchAssets = (q) => get(`/api/assets/search?q=${encodeURIComponent(q)}`);

// Análisis técnico (RSI, MACD, EMA, Bollinger, ATR)
export const fetchAnalysis = (id, type = 'crypto', days = 90) => {
  const qs = new URLSearchParams({ type, days }).toString();
  return get(`/api/analysis/${encodeURIComponent(id)}?${qs}`);
};

// Noticias con sentimiento (Gemini)
export const fetchNews = (id, type = 'crypto') => {
  const qs = new URLSearchParams({ type }).toString();
  return get(`/api/news/${encodeURIComponent(id)}?${qs}`);
};

// Fear & Greed Index (alternative.me)
export const fetchFearGreed = () => get('/api/market/fear-greed');

// Global market data (BTC dominance, total cap, etc.)
export const fetchGlobalMarket = () => get('/api/market/global');

// Whale alerts (mempool.space BTC large txs)
export const fetchWhaleAlerts = () => get('/api/market/whale-alerts');

// ForexFactory economic calendar (this week)
export const fetchCalendar = () => get('/api/market/calendar');

// MyMemory translation proxy
export const translateText = (q, to) => {
  const qs = new URLSearchParams({ q, to }).toString();
  return get(`/api/market/translate?${qs}`);
};
