import { Router } from 'express';
import { getCryptoOHLCV, getTraditionalOHLCV } from '../services/priceService.js';
import { computeIndicators } from '../services/technicalAnalysisService.js';

export const analysisRouter = Router();

// 15-minute cache for computed analysis results
const analysisCache = new Map();
const ANALYSIS_TTL  = 15 * 60 * 1000;

function getCache(key) {
  const entry = analysisCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > ANALYSIS_TTL) { analysisCache.delete(key); return null; }
  return entry.data;
}
function setCache(key, data) { analysisCache.set(key, { data, ts: Date.now() }); }

// GET /api/analysis/:id?type=crypto&days=90
// GET /api/analysis/:id?type=stock
analysisRouter.get('/:id', async (req, res) => {
  const { id } = req.params;
  const { type = 'crypto', days = '90' } = req.query;

  const cacheKey = `${id}_${type}_${days}`;
  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    let candles;

    if (type === 'crypto') {
      candles = await getCryptoOHLCV(id, parseInt(days));
    } else {
      candles = await getTraditionalOHLCV(id);
    }

    if (!candles || candles.length === 0) {
      return res.status(404).json({ error: `No se encontraron datos OHLCV para "${id}"` });
    }

    const analysis = computeIndicators(candles);
    const result   = { id, type, analysis };
    setCache(cacheKey, result);
    res.json(result);

  } catch (err) {
    const status = err.message.startsWith('Se necesitan') ? 422 : 502;
    res.status(status).json({ error: err.message });
  }
});

// GET /api/analysis/:id/narrative?type=crypto&lang=es
analysisRouter.get('/:id/narrative', async (req, res) => {
  const { id } = req.params;
  const { type = 'crypto', lang = 'es' } = req.query;
  const cacheKey = `narrative_${id}_${lang}`;

  const cached = getCache(cacheKey);
  if (cached) return res.json(cached);

  try {
    let candles;
    if (type === 'crypto') {
      candles = await getCryptoOHLCV(id, 90);
    } else {
      candles = await getTraditionalOHLCV(id);
    }

    if (!candles || candles.length < 10) {
      return res.status(404).json({ error: 'Insufficient data for narrative' });
    }

    const analysis = computeIndicators(candles);
    const { indicators, signals, summary } = analysis;
    const lastPrice = analysis.meta.lastPrice;

    const langNames = { es: 'Spanish', pt: 'Portuguese', en: 'English' };
    const langName = langNames[lang] || 'Spanish';

    const prompt = `You are a professional financial analyst. Write a concise market analysis paragraph in ${langName} (2-3 sentences, max 120 words) for ${id.toUpperCase()} based on these indicators:
- Price: $${lastPrice}
- RSI: ${indicators.rsi.current} (${signals.rsi.signal})
- MACD histogram: ${indicators.macd.current?.histogram} (${signals.macd.signal})
- EMA20: ${indicators.ema20.current}, EMA50: ${indicators.ema50.current} (${signals.ema.signal})
- Bollinger: ${signals.bb.signal}
- Overall score: ${summary.score}/100 (${summary.overall})

Write only the analysis paragraph, no titles, no bullet points, no markdown.`;

    // Timeout de 15s para no dejar la request colgada si Groq está lento
    const controller = new AbortController();
    const groqTimeout = setTimeout(() => controller.abort(), 15_000);

    let groqData;
    try {
      const groqRes = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.1-8b-instant',
            messages: [{ role: 'user', content: prompt }],
            max_tokens: 200,
            temperature: 0.7,
          }),
        }
      );
      groqData = await groqRes.json();
      console.log('[narrative] groq status:', groqRes.status);
      console.log('[narrative] groq response:', JSON.stringify(groqData).slice(0, 300));
    } finally {
      clearTimeout(groqTimeout);
    }

    const narrative = groqData?.choices?.[0]?.message?.content?.trim() ?? null;
    const result = { id, lang, narrative };
    if (narrative) setCache(cacheKey, result);
    res.json(result);

  } catch (err) {
    console.error('[narrative] error:', err.message);
    res.status(502).json({ error: err.message });
  }
});
