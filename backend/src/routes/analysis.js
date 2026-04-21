import { Router } from 'express';
import crypto from 'crypto';
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

// 1-hour cache for news-angle (content no cambia, prompts son caros)
const newsAngleCache = new Map();
const NEWS_ANGLE_TTL = 60 * 60 * 1000;

function getAngleCache(key) {
  const entry = newsAngleCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > NEWS_ANGLE_TTL) { newsAngleCache.delete(key); return null; }
  return entry.data;
}
function setAngleCache(key, data) { newsAngleCache.set(key, { data, ts: Date.now() }); }

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

// POST /api/analysis/news-angle
// body: { title, summary?, link?, tickers?, lang? }
// returns: { angle, hook, headlines[], tweets[], instagram_caption, strength, reasoning }
//
// Objetivo: dado un artículo de noticia, producir un ángulo editorial reusable
// por WaPulse (Twitter/IG) y por el pipeline de posts automatizados.
analysisRouter.post('/news-angle', async (req, res) => {
  const { title, summary = '', link = '', tickers = [], lang = 'es' } = req.body ?? {};

  if (!title || typeof title !== 'string' || title.trim().length < 5) {
    return res.status(400).json({ error: 'Field "title" is required (min 5 chars)' });
  }

  // Cache key: hash estable de title+summary+lang (link puede variar por tracking params)
  const hash = crypto
    .createHash('sha1')
    .update(`${title}||${summary}||${lang}`)
    .digest('hex')
    .slice(0, 16);
  const cacheKey = `angle_${hash}`;

  const cached = getAngleCache(cacheKey);
  if (cached) return res.json({ ...cached, cached: true });

  const langNames = { es: 'Spanish', pt: 'Portuguese', en: 'English' };
  const langName  = langNames[lang] || 'Spanish';

  const tickersLine = Array.isArray(tickers) && tickers.length
    ? `Tickers/assets involved: ${tickers.join(', ')}`
    : 'Tickers/assets involved: (none identified)';

  const prompt = `You are the senior editor of WaPulse, a financial news account. Your job: extract the sharpest editorial angle from a news item so our team can post fast and well.

Article:
- Title: ${title}
- Summary: ${summary || '(none)'}
- ${tickersLine}

Return STRICT JSON with this exact shape (no prose around it):
{
  "angle": "1-2 sentence editorial angle in ${langName} (what's the story worth telling)",
  "hook": "one punchy opener in ${langName}, max 15 words, no hashtags",
  "headlines": ["3 short headline variants in ${langName}, each max 70 chars"],
  "tweets": ["2 tweet variants in ${langName}, each max 260 chars, at most 1 hashtag"],
  "instagram_caption": "caption in ${langName}, 2-4 lines, up to 3 relevant hashtags at end",
  "strength": 1-5 integer rating of editorial strength (1 = filler, 5 = must-post),
  "reasoning": "1 sentence in ${langName} explaining the strength rating"
}

Rules:
- Do not invent facts not in the article. If summary is empty, stay close to the title.
- No markdown, no code fences, no trailing commentary — JSON only.`;

  const controller  = new AbortController();
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
          response_format: { type: 'json_object' },
          max_tokens: 600,
          temperature: 0.6,
        }),
      }
    );
    groqData = await groqRes.json();
    console.log('[news-angle] groq status:', groqRes.status);
  } catch (err) {
    clearTimeout(groqTimeout);
    console.error('[news-angle] groq error:', err.message);
    return res.status(502).json({ error: `Groq request failed: ${err.message}` });
  } finally {
    clearTimeout(groqTimeout);
  }

  const raw = groqData?.choices?.[0]?.message?.content?.trim();
  if (!raw) {
    return res.status(502).json({ error: 'Empty response from Groq', groq: groqData });
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error('[news-angle] JSON parse failed:', err.message, 'raw=', raw.slice(0, 300));
    return res.status(502).json({ error: 'Invalid JSON from Groq', raw });
  }

  // Normalización defensiva — el modelo a veces devuelve strings en vez de arrays
  const asArray = (v) => Array.isArray(v) ? v : (typeof v === 'string' && v.trim() ? [v] : []);
  const strength = Number.isFinite(parsed.strength) ? Math.min(5, Math.max(1, Math.round(parsed.strength))) : 3;

  const result = {
    lang,
    source: { title, link, tickers },
    angle:             typeof parsed.angle === 'string' ? parsed.angle.trim() : '',
    hook:              typeof parsed.hook  === 'string' ? parsed.hook.trim()  : '',
    headlines:         asArray(parsed.headlines).slice(0, 3).map(String),
    tweets:            asArray(parsed.tweets).slice(0, 2).map(String),
    instagram_caption: typeof parsed.instagram_caption === 'string' ? parsed.instagram_caption.trim() : '',
    strength,
    reasoning:         typeof parsed.reasoning === 'string' ? parsed.reasoning.trim() : '',
    cached: false,
  };

  setAngleCache(cacheKey, result);
  res.json(result);
});
