import { Router } from 'express';
import axios from 'axios';

export const wapulseRouter = Router();

// ============================================================================
// WaPulse · Snapshot endpoint
// ----------------------------------------------------------------------------
// Agrega en un solo JSON todo el contexto de mercado que el pipeline de
// WaPulse necesita por ciclo. Las fuentes ya tienen su propio caché
// (F&G 5min, VIX/DXY 5min, calendar 2h, whales 1min, global 3min), así
// que un caché de 2 min aquí evita cascadas de llamadas duplicadas
// cuando dos clientes piden snapshot casi a la vez.
// ============================================================================

const cache = new Map();
const SNAPSHOT_TTL = 2 * 60 * 1000;

function getCache(key) {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.ts > SNAPSHOT_TTL) { cache.delete(key); return null; }
  return e.data;
}
function setCache(key, data) { cache.set(key, { data, ts: Date.now() }); }

// El snapshot llama a los demás endpoints internamente. En Railway el
// servicio se expone en localhost dentro del propio container, así que
// usamos http://localhost:PORT salvo que se sobreescriba con env.
const BASE_URL = process.env.INTERNAL_API_URL || `http://localhost:${process.env.PORT || 3001}`;

async function safeGet(path, fallback = null) {
  try {
    const { data } = await axios.get(`${BASE_URL}${path}`, { timeout: 10000 });
    return data;
  } catch (err) {
    console.warn(`[wapulse/snapshot] ${path} failed: ${err.message}`);
    return fallback;
  }
}

// Activos prioritarios — el "termómetro global" en cada snapshot.
// Estos son los que WaPulse usa para componer el semáforo agregado.
const TOP_ASSETS = [
  { id: 'bitcoin',  type: 'crypto', label: 'BTC' },
  { id: 'ethereum', type: 'crypto', label: 'ETH' },
  { id: 'solana',   type: 'crypto', label: 'SOL' },
  { id: 'spy',      type: 'stock',  label: 'SPY' },
  { id: 'gc=f',     type: 'stock',  label: 'Oro' },
];

// Mapeo score → semáforo.
// El analysisService usa una escala -100..+100 con thresholds:
//   overall === 'buy'  → score > 15
//   overall === 'sell' → score < -15
//   overall === 'neutral' → resto
// Mapeamos al concepto WaPulse:
//   🟢 verde    → buy
//   🔴 rojo     → sell
//   🟡 amarillo → neutral o sin datos confiables
function mapToSemaforo(overall) {
  if (overall === 'buy')  return 'verde';
  if (overall === 'sell') return 'rojo';
  return 'amarillo';
}

// GET /api/wapulse/snapshot
// Estado agregado del mercado en el momento de la llamada.
wapulseRouter.get('/snapshot', async (_req, res) => {
  const cached = getCache('snapshot');
  if (cached) return res.json({ ...cached, cached: true });

  try {
    // Paralelizamos todas las llamadas — cada una con su propio timeout
    // y fallback. Si una fuente falla, el snapshot sigue con las demás.
    const [
      fearGreed,
      global,
      vix,
      dxy,
      whaleData,
      calendarData,
      ...assetAnalyses
    ] = await Promise.all([
      safeGet('/api/market/fear-greed', null),
      safeGet('/api/market/global',     null),
      safeGet('/api/market/vix',        null),
      safeGet('/api/market/dxy',        null),
      safeGet('/api/market/whale-alerts', { whales: [], btcPrice: null }),
      safeGet('/api/market/calendar',     { events: [], source: 'unavailable' }),
      ...TOP_ASSETS.map(a => safeGet(`/api/analysis/${a.id}?type=${a.type}`, null)),
    ]);

    // Resumen de semáforos por activo top
    const semaforos = TOP_ASSETS.map((a, i) => {
      const analysis = assetAnalyses[i];
      const summary  = analysis?.analysis?.summary;
      const meta     = analysis?.analysis?.meta;
      const indicators = analysis?.analysis?.indicators;
      if (!summary) {
        return {
          id:       a.id,
          label:    a.label,
          type:     a.type,
          price:    null,
          score:    null,
          overall:  'unknown',
          semaforo: 'amarillo',
          rsi:      null,
          macd:     null,
        };
      }
      return {
        id:       a.id,
        label:    a.label,
        type:     a.type,
        price:    meta?.lastPrice ?? null,
        score:    summary.score ?? null,
        overall:  summary.overall ?? 'neutral',
        semaforo: mapToSemaforo(summary.overall),
        rsi:      indicators?.rsi?.current ?? null,
        macd:     indicators?.macd?.current?.histogram ?? null,
      };
    });

    // Próximos 3 eventos macro (filtra por fecha futura)
    const nowMs = Date.now();
    const upcomingEvents = (calendarData?.events || [])
      .filter(e => {
        const t = new Date(`${e.date}T${e.time || '00:00'}:00Z`).getTime();
        return !isNaN(t) && t > nowMs;
      })
      .sort((a, b) => {
        const ta = new Date(`${a.date}T${a.time || '00:00'}:00Z`).getTime();
        const tb = new Date(`${b.date}T${b.time || '00:00'}:00Z`).getTime();
        return ta - tb;
      })
      .slice(0, 3);

    // Top 5 ballenas (ya vienen ordenadas por btc DESC del endpoint)
    const topWhales = (whaleData?.whales || []).slice(0, 5).map(w => ({
      btc:  w.btc,
      usd:  w.usd,
      txid: w.txid,
      time: w.time,
      url:  w.url,
    }));

    // Snapshot final
    const snapshot = {
      timestamp: new Date().toISOString(),
      market: {
        fearGreed: fearGreed?.current ? {
          value: parseInt(fearGreed.current.value, 10),
          classification: fearGreed.current.value_classification,
          timestamp: fearGreed.current.timestamp,
        } : null,
        global: global ? {
          btcDominance: global.btcDominance,
          ethDominance: global.ethDominance,
          totalMarketCap: global.totalMarketCap,
          marketCapChange24h: global.marketCapChange24h,
        } : null,
        vix: vix ? {
          value: vix.value,
          change: vix.change,
          level: vix.level,
          label: vix.label,
        } : null,
        dxy: dxy ? {
          value: dxy.value,
          change: dxy.change,
          trend: dxy.trend,
          label: dxy.label,
        } : null,
        btcPrice: whaleData?.btcPrice ?? null,
      },
      semaforos,
      whales: topWhales,
      upcomingEvents,
      calendarSource: calendarData?.source ?? 'unavailable',
      // Flags útiles para que el PulseEngine decida sin re-procesar el JSON
      flags: {
        marketStressed: vix?.level === 'high' || vix?.level === 'extreme',
        feargreedExtreme: fearGreed?.current
          ? (parseInt(fearGreed.current.value, 10) < 25 || parseInt(fearGreed.current.value, 10) > 75)
          : false,
        // Umbral 50 BTC = "big". El endpoint base filtra desde 5 BTC,
        // pero contenido viral arranca a partir de ~50 BTC ($4M+).
        bigWhaleActivity: (whaleData?.whales || []).some(w => (w.btc ?? 0) >= 50),
        macroEventSoon: upcomingEvents.some(e => {
          const t = new Date(`${e.date}T${e.time || '00:00'}:00Z`).getTime();
          return !isNaN(t) && (t - nowMs) < 24 * 60 * 60 * 1000;
        }),
        // Cuántas señales fuertes hay ahora mismo (semáforos rojos o verdes confluentes)
        strongSignalsCount: semaforos.filter(s => s.semaforo === 'verde' || s.semaforo === 'rojo').length,
      },
    };

    setCache('snapshot', snapshot);
    res.json(snapshot);

  } catch (err) {
    console.error('[wapulse/snapshot] fatal:', err);
    res.status(500).json({ error: 'Snapshot generation failed', detail: err.message });
  }
});
