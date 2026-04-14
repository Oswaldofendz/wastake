import { Router } from 'express';
import axios from 'axios';

export const marketRouter = Router();

const cache = new Map();
function fromCache(key, ttlMs) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > ttlMs) { cache.delete(key); return null; }
  return e.data;
}
function toCache(key, data) { cache.set(key, { data, ts: Date.now() }); }

// ── Fear & Greed ───────────────────────────────────────────────
// Proxy para evitar CORS. alternative.me es gratuita, sin key.
marketRouter.get('/fear-greed', async (_req, res) => {
  const TTL = 5 * 60 * 1000; // 5 min
  const cached = fromCache('fear_greed', TTL);
  if (cached) return res.json(cached);

  try {
    const { data } = await axios.get('https://api.alternative.me/fng/?limit=7', { timeout: 8000 });
    const result = {
      current: data.data[0],
      history: data.data,
    };
    toCache('fear_greed', result);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'Fear & Greed API unavailable', detail: err.message });
  }
});

// ── BTC Dominance + Global Market ─────────────────────────────
// CoinGecko /global es gratis sin API key.
marketRouter.get('/global', async (_req, res) => {
  const TTL = 3 * 60 * 1000; // 3 min
  const cached = fromCache('global', TTL);
  if (cached) return res.json(cached);

  try {
    const { data } = await axios.get('https://api.coingecko.com/api/v3/global', { timeout: 8000 });
    const g = data.data;
    // CoinGecko usa claves cortas: 'btc', 'eth' (no 'bitcoin'/'ethereum')
    const btc = g.market_cap_percentage?.btc ?? 0;
    const eth = g.market_cap_percentage?.eth ?? 0;
    const result = {
      btcDominance:       parseFloat(btc.toFixed(2)),
      ethDominance:       parseFloat(eth.toFixed(2)),
      totalMarketCap:     g.total_market_cap?.usd ?? 0,
      totalVolume:        g.total_volume?.usd ?? 0,
      marketCapChange24h: parseFloat((g.market_cap_change_percentage_24h_usd ?? 0).toFixed(2)),
      activeCurrencies:   g.active_cryptocurrencies ?? 0,
    };
    toCache('global', result);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: 'CoinGecko global API unavailable', detail: err.message });
  }
});

// ── ForexFactory Economic Calendar ────────────────────────────
// Fallback curado: eventos macro clave 2026
const FALLBACK_EVENTS = [
  // FOMC 2026
  { date:'2026-01-28', time:'19:00', title:'Fed – Decisión de tasas (FOMC)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-03-18', time:'19:00', title:'Fed – Decisión de tasas (FOMC)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-05-06', time:'19:00', title:'Fed – Decisión de tasas (FOMC)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-06-17', time:'19:00', title:'Fed – Decisión de tasas (FOMC)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-07-29', time:'19:00', title:'Fed – Decisión de tasas (FOMC)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-09-16', time:'19:00', title:'Fed – Decisión de tasas (FOMC)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-11-04', time:'19:00', title:'Fed – Decisión de tasas (FOMC)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-12-16', time:'19:00', title:'Fed – Decisión de tasas (FOMC)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  // CPI EE.UU. 2026
  { date:'2026-01-14', time:'13:30', title:'CPI EE.UU. (Diciembre 2025)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-02-11', time:'13:30', title:'CPI EE.UU. (Enero 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-03-11', time:'13:30', title:'CPI EE.UU. (Febrero 2026)',   currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-04-14', time:'13:30', title:'CPI EE.UU. (Marzo 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-05-13', time:'13:30', title:'CPI EE.UU. (Abril 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-06-10', time:'13:30', title:'CPI EE.UU. (Mayo 2026)',      currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-07-14', time:'13:30', title:'CPI EE.UU. (Junio 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-08-12', time:'13:30', title:'CPI EE.UU. (Julio 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-09-09', time:'13:30', title:'CPI EE.UU. (Agosto 2026)',    currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-10-14', time:'13:30', title:'CPI EE.UU. (Septiembre 2026)',currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-11-12', time:'13:30', title:'CPI EE.UU. (Octubre 2026)',   currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-12-09', time:'13:30', title:'CPI EE.UU. (Noviembre 2026)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  // NFP 2026
  { date:'2026-01-09', time:'13:30', title:'Nóminas no agrícolas (NFP – Diciembre 2025)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-02-06', time:'13:30', title:'Nóminas no agrícolas (NFP – Enero 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-03-06', time:'13:30', title:'Nóminas no agrícolas (NFP – Febrero 2026)',   currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-04-03', time:'13:30', title:'Nóminas no agrícolas (NFP – Marzo 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-05-08', time:'13:30', title:'Nóminas no agrícolas (NFP – Abril 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-06-05', time:'13:30', title:'Nóminas no agrícolas (NFP – Mayo 2026)',      currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-07-10', time:'13:30', title:'Nóminas no agrícolas (NFP – Junio 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-08-07', time:'13:30', title:'Nóminas no agrícolas (NFP – Julio 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-09-04', time:'13:30', title:'Nóminas no agrícolas (NFP – Agosto 2026)',    currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-10-02', time:'13:30', title:'Nóminas no agrícolas (NFP – Septiembre 2026)',currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-11-06', time:'13:30', title:'Nóminas no agrícolas (NFP – Octubre 2026)',   currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-12-04', time:'13:30', title:'Nóminas no agrícolas (NFP – Noviembre 2026)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  // BCE 2026
  { date:'2026-01-22', time:'13:15', title:'BCE – Decisión de tasas', currency:'EUR', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-03-05', time:'13:15', title:'BCE – Decisión de tasas', currency:'EUR', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-04-16', time:'13:15', title:'BCE – Decisión de tasas', currency:'EUR', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-06-04', time:'13:15', title:'BCE – Decisión de tasas', currency:'EUR', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-07-23', time:'13:15', title:'BCE – Decisión de tasas', currency:'EUR', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-09-10', time:'13:15', title:'BCE – Decisión de tasas', currency:'EUR', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-10-22', time:'13:15', title:'BCE – Decisión de tasas', currency:'EUR', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-12-10', time:'13:15', title:'BCE – Decisión de tasas', currency:'EUR', impact:'high', previous:null, forecast:null, actual:null },
  // PCE EE.UU. 2026
  { date:'2026-01-30', time:'13:30', title:'PCE Core (Diciembre 2025)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-02-27', time:'13:30', title:'PCE Core (Enero 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-03-27', time:'13:30', title:'PCE Core (Febrero 2026)',   currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-04-30', time:'13:30', title:'PCE Core (Marzo 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-05-29', time:'13:30', title:'PCE Core (Abril 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-06-26', time:'13:30', title:'PCE Core (Mayo 2026)',      currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-07-31', time:'13:30', title:'PCE Core (Junio 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-08-28', time:'13:30', title:'PCE Core (Julio 2026)',     currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-09-25', time:'13:30', title:'PCE Core (Agosto 2026)',    currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-10-30', time:'13:30', title:'PCE Core (Septiembre 2026)',currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-11-25', time:'13:30', title:'PCE Core (Octubre 2026)',   currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-12-23', time:'13:30', title:'PCE Core (Noviembre 2026)', currency:'USD', impact:'high', previous:null, forecast:null, actual:null },
  // PIB EE.UU. 2026
  { date:'2026-01-29', time:'13:30', title:'PIB EE.UU. Q4 2025 (avance)', currency:'USD', impact:'medium', previous:null, forecast:null, actual:null },
  { date:'2026-04-29', time:'13:30', title:'PIB EE.UU. Q1 2026 (avance)', currency:'USD', impact:'medium', previous:null, forecast:null, actual:null },
  { date:'2026-07-29', time:'13:30', title:'PIB EE.UU. Q2 2026 (avance)', currency:'USD', impact:'medium', previous:null, forecast:null, actual:null },
  { date:'2026-10-29', time:'13:30', title:'PIB EE.UU. Q3 2026 (avance)', currency:'USD', impact:'medium', previous:null, forecast:null, actual:null },
  // BoE 2026
  { date:'2026-02-05', time:'12:00', title:'Banco de Inglaterra – Decisión de tasas', currency:'GBP', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-03-19', time:'12:00', title:'Banco de Inglaterra – Decisión de tasas', currency:'GBP', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-05-07', time:'12:00', title:'Banco de Inglaterra – Decisión de tasas', currency:'GBP', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-06-18', time:'12:00', title:'Banco de Inglaterra – Decisión de tasas', currency:'GBP', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-08-06', time:'12:00', title:'Banco de Inglaterra – Decisión de tasas', currency:'GBP', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-09-17', time:'12:00', title:'Banco de Inglaterra – Decisión de tasas', currency:'GBP', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-11-05', time:'12:00', title:'Banco de Inglaterra – Decisión de tasas', currency:'GBP', impact:'high', previous:null, forecast:null, actual:null },
  { date:'2026-12-17', time:'12:00', title:'Banco de Inglaterra – Decisión de tasas', currency:'GBP', impact:'high', previous:null, forecast:null, actual:null },
];

// Filtra fallback a los próximos 30 días + últimos 7 días
function getFallbackWindow() {
  const now = Date.now();
  const past7  = now - 7  * 86400000;
  const next30 = now + 30 * 86400000;
  return FALLBACK_EVENTS.filter(ev => {
    const t = new Date(ev.date).getTime();
    return t >= past7 && t <= next30;
  }).sort((a, b) => a.date.localeCompare(b.date));
}

const FF_URLS = [
  'https://nfs.faireconomy.media/ff_calendar_thisweek.json',
  'https://cdn-nfs.faireconomy.media/ff_calendar_thisweek.json',
];

marketRouter.get('/calendar', async (_req, res) => {
  const TTL = 2 * 60 * 60 * 1000; // 2 horas
  const cached = fromCache('ff_calendar', TTL);
  if (cached) return res.json(cached);

  for (const url of FF_URLS) {
    try {
      const { data } = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      const events = (Array.isArray(data) ? data : []).map(ev => ({
        date:     ev.date ? ev.date.split('T')[0] : '',
        time:     ev.date ? new Date(ev.date).toISOString().slice(11, 16) : '',
        title:    ev.title ?? '',
        currency: ev.country ?? '',
        impact:   ev.impact?.toLowerCase() === 'high'   ? 'high'   :
                  ev.impact?.toLowerCase() === 'medium' ? 'medium' : 'low',
        forecast: ev.forecast ?? null,
        previous: ev.previous ?? null,
        actual:   ev.actual   ?? null,
      }));

      if (events.length > 0) {
        const payload = { events, source: 'live' };
        toCache('ff_calendar', payload);
        return res.json(payload);
      }
    } catch { /* intenta siguiente URL */ }
  }

  // Fallback curado — siempre tiene datos
  console.warn('[Calendar] ForexFactory unavailable, using fallback events');
  const fallback = getFallbackWindow();
  res.json({ events: fallback, source: 'fallback' });
});

// ── MyMemory Translation proxy ─────────────────────────────────
// Gratuito hasta 5 000 chars/día sin registro
marketRouter.get('/translate', async (req, res) => {
  const { q, to = 'es' } = req.query;
  if (!q) return res.status(400).json({ error: 'Missing q param' });
  if (to === 'en') return res.json({ translatedText: q });

  const cacheKey = `translate_${to}_${q}`;
  const TTL = 24 * 60 * 60 * 1000; // 24 h — traducciones son estables
  const cached = fromCache(cacheKey, TTL);
  if (cached) return res.json(cached);

  try {
    const { data } = await axios.get(
      'https://api.mymemory.translated.net/get',
      {
        params: { q, langpair: `en|${to}`, de: 'wastake@noreply.com' },
        timeout: 6000,
      }
    );
    const result = { translatedText: data.responseData?.translatedText ?? q };
    toCache(cacheKey, result, TTL);
    res.json(result);
  } catch {
    res.json({ translatedText: q }); // devuelve original si falla
  }
});

// ── Whale Alerts (BTC mempool grandes txs) ────────────────────
// Usa mempool.space que es completamente gratuito y sin API key.
marketRouter.get('/whale-alerts', async (_req, res) => {
  const TTL = 60 * 1000; // 1 min
  const cached = fromCache('whale_alerts', TTL);
  if (cached) return res.json(cached);

  try {
    const btcPrice = await axios.get('https://mempool.space/api/v1/prices', { timeout: 5000 })
      .then(r => r.data?.USD ?? 85000)
      .catch(() => 85000); // fallback actualizado — precio aproximado actual

    const BTC_THRESHOLD = 5;
    const SATOSHI = 100_000_000;

    const [recent, blocks] = await Promise.allSettled([
      fetch('https://mempool.space/api/mempool/recent').then(r => r.json()),
      fetch('https://mempool.space/api/v1/blocks').then(r => r.json())
        .then(async blks => {
          if (!blks?.length) return [];
          const txids = await fetch(`https://mempool.space/api/block/${blks[0].id}/txids`).then(r => r.json()).catch(() => []);
          const sample = txids.slice(0, 50);
          const txs = await Promise.all(sample.map(id =>
            fetch(`https://mempool.space/api/tx/${id}`).then(r => r.json()).catch(() => null)
          ));
          return txs.filter(Boolean);
        }),
    ]);

    const allTxs = [
      ...(recent.status === 'fulfilled' ? recent.value : []),
      ...(blocks.status === 'fulfilled' ? blocks.value : []),
    ];

    const whales = allTxs
      .filter(tx => tx && (tx.value ?? tx.vout?.reduce((s, o) => s + (o.value ?? 0), 0) ?? 0) / SATOSHI >= BTC_THRESHOLD)
      .slice(0, 20)
      .map(tx => {
        const valueSat = tx.value ?? tx.vout?.reduce((s, o) => s + (o.value ?? 0), 0) ?? 0;
        const btcAmount = valueSat / SATOSHI;
        return {
          txid:  tx.txid,
          btc:   parseFloat(btcAmount.toFixed(4)),
          usd:   Math.round(btcAmount * btcPrice),
          url:   `https://mempool.space/tx/${tx.txid}`,
          time:  tx.firstSeen ?? tx.status?.block_time ?? Date.now() / 1000,
        };
      })
      .sort((a, b) => b.btc - a.btc);

    const result = { whales, btcPrice, updatedAt: Date.now() };
    if (whales.length) toCache('whale_alerts', result);
    res.json(result);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ── Helper: fetch Yahoo Finance con timeout usando axios ──────────────────────
async function fetchYahooMeta(symbol) {
  const { data } = await axios.get(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,
    {
      params: { interval: '1d', range: '5d' },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; WaStake/1.0)' },
      timeout: 8000,
    }
  );
  return data.chart?.result?.[0]?.meta ?? null;
}

// GET /api/market/vix — CBOE Volatility Index via Yahoo Finance
marketRouter.get('/vix', async (_req, res) => {
  const TTL = 5 * 60 * 1000; // 5 min — VIX cambia rápido en días volátiles
  const cached = fromCache('vix', TTL);
  if (cached) return res.json(cached);

  try {
    const meta = await fetchYahooMeta('^VIX');
    if (!meta) return res.status(404).json({ error: 'No VIX data' });
    const value = parseFloat(meta.regularMarketPrice);
    if (isNaN(value)) return res.status(404).json({ error: 'Invalid VIX data' });

    const prev  = meta.chartPreviousClose;
    const change = prev > 0 ? ((value - prev) / prev) * 100 : 0;
    const level = value < 15 ? 'low' : value < 25 ? 'moderate' : value < 35 ? 'high' : 'extreme';
    const label = value < 15 ? 'Baja volatilidad — mercado tranquilo' :
                  value < 25 ? 'Volatilidad moderada — condiciones normales' :
                  value < 35 ? 'Alta volatilidad — mercado nervioso' :
                               'Volatilidad extrema — pánico en el mercado';

    const result = { value: parseFloat(value.toFixed(2)), change: parseFloat(change.toFixed(2)), level, label };
    toCache('vix', result);
    res.json(result);
  } catch (err) {
    // Devolver caché vencida antes de retornar error
    const stale = cache.get('vix')?.data;
    if (stale) return res.json({ ...stale, stale: true });
    res.status(502).json({ error: err.message });
  }
});

// GET /api/market/dxy — US Dollar Index via Yahoo Finance
marketRouter.get('/dxy', async (_req, res) => {
  const TTL = 5 * 60 * 1000; // 5 min
  const cached = fromCache('dxy', TTL);
  if (cached) return res.json(cached);

  try {
    const meta = await fetchYahooMeta('DX-Y.NYB');
    if (!meta) return res.status(404).json({ error: 'No DXY data' });
    const value = parseFloat(meta.regularMarketPrice);
    if (isNaN(value)) return res.status(404).json({ error: 'Invalid DXY data' });

    const prev  = meta.chartPreviousClose;
    const change = prev > 0 ? ((value - prev) / prev) * 100 : 0;
    const trend = value > 104 ? 'strong' : value > 100 ? 'neutral' : 'weak';
    const label = value > 104 ? 'Dólar fuerte — presión bajista para el oro' :
                  value > 100 ? 'Dólar neutro — sin efecto claro en commodities' :
                                'Dólar débil — favorable para oro y plata';

    const result = { value: parseFloat(value.toFixed(2)), change: parseFloat(change.toFixed(2)), trend, label };
    toCache('dxy', result);
    res.json(result);
  } catch (err) {
    // Devolver caché vencida antes de retornar error
    const stale = cache.get('dxy')?.data;
    if (stale) return res.json({ ...stale, stale: true });
    res.status(502).json({ error: err.message });
  }
});
