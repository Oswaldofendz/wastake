import {rememberPublicNews} from '../utils/publicNewsCache.js';
import { ANALYSIS_DAYS } from '../utils/marketConventions.js';
export const fetchOpportunities=()=>get('/api/market/opportunities',45000);
export const fetchMarketImpactAlerts=signal=>get('/api/market/impact-alerts',65000,signal);
const BASE = import.meta.env.VITE_API_URL ?? '';
export const fetchSourceReference=id=>get(id?`/api/market/exchange-reference/${encodeURIComponent(id)}`:'/api/market/reference-rates',25_000);
export const fetchChartSnapshot=(asset,type,interval,venue='auto')=>get(`/api/chart-agent/${encodeURIComponent(asset.id)}?${new URLSearchParams({type,interval,venue})}`,45_000);
export async function askChartAgent(body,signal){
  const controller=new AbortController(),cancel=()=>controller.abort();
  if(signal?.aborted)controller.abort();else signal?.addEventListener('abort',cancel,{once:true});
  const timeout=setTimeout(cancel,50_000);
  try{const r=await fetch(`${BASE}/api/chart-agent/ask`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});if(!r.ok)throw new Error('Chart request unavailable');return await r.json();}
  finally{clearTimeout(timeout);signal?.removeEventListener('abort',cancel);}
}

function timeoutMessage() {
  let language = 'en';
  try {
    language = (localStorage.getItem('i18nextLng') || navigator.language || 'en').split('-')[0];
  } catch { /* use English if browser language storage is unavailable */ }
  if (language === 'es') return 'La solicitud tardó demasiado. Inténtalo de nuevo.';
  if (language === 'pt') return 'A solicitação demorou demasiado. Tente novamente.';
  return 'The request timed out. Please try again.';
}

async function get(path, timeoutMs = 20_000, signal) {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, { signal: controller.signal });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err) {
    if (signal?.aborted) throw new DOMException('Request cancelled', 'AbortError');
    if (controller.signal.aborted) throw new Error(timeoutMessage());
    throw err;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', cancel);
  }
}

// Todos los precios de una vez (crypto + traditional)
export const fetchAllPrices = () => get('/api/prices/all',60_000);

// Velas OHLCV para el gráfico
export const fetchOHLCV = (id, type = 'crypto', params = {}, options = {}) => {
  const qs = new URLSearchParams({ type, ...params }).toString();
  return get(`/api/prices/ohlcv/${encodeURIComponent(id)}?${qs}`, 20_000, options.signal);
};

// Catálogo de activos
export const fetchAssets = () => get('/api/assets');

// Búsqueda de activos
export const searchAssets = (q) => get(`/api/assets/search?q=${encodeURIComponent(q)}`);
export const fetchAssetQuote = (asset, options = {}) => get(`/api/assets/quote/${encodeURIComponent(asset.id)}?type=${asset.analysisType ?? (asset.type === 'crypto' ? 'crypto' : 'stock')}`, 20_000, options.signal);
export const fetchRankings = () => get('/api/assets/rankings', 35_000);

// Análisis técnico (RSI, MACD, EMA, Bollinger, ATR)
export const fetchAnalysis = (id, type = 'crypto', days = ANALYSIS_DAYS, options = {}) => {
  const qs = new URLSearchParams({ type, days }).toString();
  return get(`/api/analysis/${encodeURIComponent(id)}?${qs}`, 20_000, options.signal);
};

// Narrative AI analysis (Gemini)
export const fetchNarrative = (id, type = 'crypto', lang = 'es', options = {}) => {
  const qs = new URLSearchParams({ type, lang }).toString();
  return get(`/api/analysis/${encodeURIComponent(id)}/narrative?${qs}`, 60_000, options.signal);
};

// Noticias con sentimiento (Gemini)
export const fetchNews = (id, type = 'crypto', options = {}) => {
  const qs = new URLSearchParams({ type, ...(options.stage === 'headlines' ? {stage:'headlines'} : {}) }).toString();
  return get(`/api/news/${encodeURIComponent(id)}?${qs}`, options.stage === 'headlines' ? 20_000 : 60_000, options.signal);
};

// Public news enriched by the backend with localized, evidence-linked AI analysis.
export const fetchFundamentalsNews = async(asset,type='crypto',lang='es',stage='analysis')=>{
 const qs=new URLSearchParams({type,name:asset.name??'',symbol:asset.symbol??'',lang,stage});
 const read=async()=>{const result=await get(`/api/fundamentals/${encodeURIComponent(asset.id)}?${qs}`,65000);rememberPublicNews(asset,type,lang,result);return result;};
 let result=await read();
 if(stage==='analysis'){const deadline=Date.now()+55000;while(result.revalidating&&Date.now()<deadline){await new Promise(resolve=>setTimeout(resolve,5000));result=await read();}}
 return result;
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
export const translateText = (q, to, from = 'en', identities = []) => {
  const qs = new URLSearchParams({ q, to, from, ...(identities.length?{identities:JSON.stringify(identities)}:{}) }).toString();
  return get(`/api/market/translate?${qs}`);
};

export const fetchAssetResearch = (asset) => get(`/api/assets/research/${encodeURIComponent(asset.id)}?type=${encodeURIComponent(asset.type||'stock')}`,30_000);
