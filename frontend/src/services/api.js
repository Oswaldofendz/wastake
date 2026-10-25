const BASE = import.meta.env.VITE_API_URL ?? '';

function timeoutMessage() {
  let language = 'en';
  try {
    language = (localStorage.getItem('i18nextLng') || navigator.language || 'en').split('-')[0];
  } catch { /* use English if browser language storage is unavailable */ }
  if (language === 'es') return 'La solicitud tardó demasiado. Inténtalo de nuevo.';
  if (language === 'pt') return 'A solicitação demorou demasiado. Tente novamente.';
  return 'The request timed out. Please try again.';
}

async function get(path, timeoutMs = 20_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (controller.signal.aborted) throw new Error(timeoutMessage());
    throw err;
  } finally {
    clearTimeout(timeout);
  }
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

// Narrative AI analysis (Gemini)
export const fetchNarrative = (id, type = 'crypto', lang = 'es') => {
  const qs = new URLSearchParams({ type, lang }).toString();
  return get(`/api/analysis/${encodeURIComponent(id)}/narrative?${qs}`, 60_000);
};

// Noticias con sentimiento (Gemini)
export const fetchNews = (id, type = 'crypto') => {
  const qs = new URLSearchParams({ type }).toString();
  return get(`/api/news/${encodeURIComponent(id)}?${qs}`, 60_000);
};

// Public news enriched by the backend with localized, evidence-linked AI analysis.
export const fetchFundamentalsNews = (asset, type = 'crypto', lang = 'es', stage = 'analysis') => {
  const qs = new URLSearchParams({ type, name: asset.name ?? '', symbol: asset.symbol ?? '', lang, stage });
  // The backend may read and analyze several public articles; bound the wait
  // so transient provider delays cannot leave the Fundamentals view loading forever.
  return get(`/api/fundamentals/${encodeURIComponent(asset.id)}?${qs}`, stage === 'headlines' ? 20_000 : 60_000);
};

// Fear & Greed Index (alternative.me)
export const fetchFearGreed = () => get('/api/market/fear-greed');

// Global market data (BTC dominance, total cap, etc.)
export const fetchGlobalMarket = () => get('/api/market/global');

// Whale alerts (mempool.space BTC large txs)
export const fetchWhaleAlerts = () => get('/api/market/whale-alerts');

// ForexFactory economic calendar (this week)
export const fetchCalendar = () => get('/api/market/calendar');

// VIX & DXY market indices
export const fetchVIX = () => get('/api/market/vix');
export const fetchDXY = () => get('/api/market/dxy');

// MyMemory translation proxy
export const translateText = (q, to, from = 'en') => {
  const qs = new URLSearchParams({ q, to, from }).toString();
  return get(`/api/market/translate?${qs}`);
};
