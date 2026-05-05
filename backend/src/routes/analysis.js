import { Router } from 'express';
import crypto from 'crypto';
import { getCryptoOHLCV, getTraditionalOHLCV } from '../services/priceService.js';
import { computeIndicators } from '../services/technicalAnalysisService.js';
import { callLLM } from '../services/llmService.js';

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

    let narrative = null;
    let provider  = null;
    try {
      const out = await callLLM(prompt, {
        jsonMode:    false,
        maxTokens:   200,
        temperature: 0.7,
        tag:         '[narrative]',
      });
      narrative = (out.text ?? '').trim() || null;
      provider  = out.provider;
    } catch (err) {
      console.error('[narrative] both providers failed:', err.message);
      return res.status(502).json({ error: err.message });
    }

    const result = { id, lang, narrative, provider };
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

  const prompt = `You write for WaCapital, a finance account on Twitter, Instagram and TikTok. Style reference: WatcherGuru, Unusual Whales, Stock Talk. Stop-the-scroll energy. Twitter-native, NOT Bloomberg, NOT a press release.

Article:
- Title: ${title}
- Summary: ${summary || '(none)'}
- ${tickersLine}

Tone playbook:
- Punchy openings. Short sentences. Numbers and percentages up front.
- Use contrast, surprise, mystery, questions when it fits — but never invent facts.
- Casual but credible. Drop "BREAKING:" / "JUST IN:" / "ATTENTION:" for high-impact news.
- Emoji are OK in tweets if they amplify (📉 📈 🚨 💥 ⚠️ 🔥), max 1-2 per tweet.
- Avoid corporate jargon ("strategic positioning", "value proposition", "synergies").
- Headlines should be the kind you'd click in a feed at midnight.
- Each piece in ${langName}.

CRITICAL — strength rating must be BRUTALLY HONEST. Most news is FILLER (1-2).
Real-world calibration with concrete examples:
  1 = Form 13F/144 filings, insider sells, micro-cap moves, EBIT growth on no-name companies
  2 = Routine analyst reprices ("Goldman raises Apple PT by $5"), boring quarterly beats from mid-caps
  3 = Notable but expected company news, mid-cap M&A, mainstream macro update
  4 = Surprising move from a major company (Tesla, Apple, big banks), >5% stock moves with clear catalyst, OR a celebrity finance figure
  5 = ABSOLUTE TOP TIER — major political figure (Trump, Powell), $1B+ moves, regulatory shock, breaking crypto crash/surge, world-impact economic news. Maybe 1-3 per day.

Examples to anchor your scale:
- "SanDisk Q3 earnings beat estimates by 5%" → 2 (boring beat)
- "Tesla cuts 14000 jobs after disappointing Q1" → 4 (major company + dramatic action)
- "Trump signs executive order banning CBDC" → 5 (top political figure + regulatory shock)
- "Bitcoin crashes 15% after SEC rejects spot ETF" → 5 (major crypto event)
- "Boeing reports Q2 loss of $1.4B" → 4 (major company + big number)
- "Form 144 filing for John Smith at MidcapCorp" → 1 (filler)
- "MARA accelerates AI shift with $1.5B Ohio deal" → 3 (notable but niche audience)

If you're tempted to give 4, ask: "Would a normal person stop scrolling and care about this?" If no, it's a 3 or lower.

Return STRICT JSON with this exact shape (no prose around it):
{
  "angle": "1-2 sentence editorial angle in ${langName} (the story worth telling, what makes it post-worthy)",
  "hook": "one stop-the-scroll opener in ${langName}, max 15 words, no hashtags. Should make a reader pause.",
  "headlines": ["3 short clickbait-worthy headline variants in ${langName}, each max 70 chars"],
  "tweets": ["2 tweet variants in ${langName}, each max 260 chars. Lead with the most shocking or counterintuitive element — big number, famous name, dramatic outcome, or paradox. First 5 words are the hook: make it impossible to ignore. Use contrast ('expected X, got Y'), open loops ('and nobody is talking about it'), or direct stakes ('this affects your portfolio'). At most 1 hashtag, 1-2 emoji max. No press-release language."],
  "instagram_caption": "caption in ${langName}, 2-4 lines, hook-first, up to 3 relevant hashtags at end",
  "strength": 1-5 integer rating per the calibration above. WHEN IN DOUBT, RATE LOWER. We aggressively filter low scores.,
  "reasoning": "1 sentence in ${langName}: what SPECIFICALLY makes this story stop-the-scroll or not — name the exact element (surprise factor, famous name, size of the number, dramatic reversal, or why it directly affects the reader's money). Do NOT describe the event. Explain the virality mechanic."
}

Rules:
- Do NOT invent facts not in the article. If the article is dry, the strength MUST be 1-2.
- A 5 means EXTRAORDINARY. If it doesn't shock you, it's not a 5.
- No markdown, no code fences, no trailing commentary — JSON only.`;

  let raw, provider;
  try {
    const out = await callLLM(prompt, {
      jsonMode:    true,
      maxTokens:   700,
      temperature: 0.72,
      tag:         '[news-angle]',
    });
    raw      = (out.text ?? '').trim();
    provider = out.provider;
  } catch (err) {
    console.error('[news-angle] both providers failed:', err.message);
    return res.status(502).json({ error: err.message });
  }

  if (!raw) {
    return res.status(502).json({ error: 'Empty response from LLM' });
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error('[news-angle] JSON parse failed:', err.message, 'raw=', raw.slice(0, 300));
    return res.status(502).json({ error: 'Invalid JSON from LLM', raw });
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
    provider,
    cached: false,
  };

  setAngleCache(cacheKey, result);
  res.json(result);
});
