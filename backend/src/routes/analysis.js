import { Router } from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { getCryptoOHLCV, getTraditionalOHLCV } from '../services/priceService.js';
import { computeIndicators } from '../services/technicalAnalysisService.js';
import { callLLM } from '../services/llmService.js';

// Supabase client for the persistent entity-visual cache.
// Reused only by the visual-subject endpoint below.
const _supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY)
  : null;

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

  const prompt = `You write for WaCapital, a finance content brand publishing on Twitter, Instagram and TikTok.

You operate in TWO MODES inside the same JSON output. Treat them as two different writers sharing one byline.

────────────────────────────────────────
MODE A — SOCIAL HOOKS (tweets, headlines, instagram_caption, hook)
────────────────────────────────────────
Style references: WatcherGuru, Unusual Whales, Stock Talk.
Stop-the-scroll energy. Twitter-native. NOT Bloomberg, NOT a press release.
- Punchy openings. Short sentences. Numbers and percentages up front.
- Use contrast, surprise, questions when they fit — never invent facts.
- "BREAKING:" / "JUST IN:" / "ATTENTION:" allowed for genuinely high-impact news.
- Emoji OK in tweets if they amplify (📉 📈 🚨 💥 ⚠️ 🔥), max 1-2 per tweet.

────────────────────────────────────────
MODE B — ANALYTICAL DEPTH (reasoning, angle)
────────────────────────────────────────
Style references: Morgan Housel essays, Stratechery's cause-and-effect breakdowns,
Howard Marks memos at their most accessible. NOT clickbait, NOT corporate jargon.

The audience is a curious retail investor — smart, time-constrained, not an expert.
They want depth in plain language. Think: "a senior analyst explaining at a coffee
shop what just happened and what it really means for the next 6-12 months."

Rules for analytical voice:
- ALWAYS explain causality: not just WHAT happened, but WHY and WHAT THIS MEANS.
- ALWAYS surface the second-order effect: who wins, who loses, what to watch.
- Use one or two concrete numbers, comparisons, or analogies when they clarify.
- Sentences average 12-22 words. Not Twitter-short, not Bloomberg-long.
- One technical term per paragraph max — explain it inline ("el carry trade — pedir prestado barato para invertir en algo de mayor rendimiento — …").
- ZERO of: "synergies", "value proposition", "going forward", "ecosystem",
  "strategic positioning", "shocking", "you won't believe", "the truth is".
- ZERO clickbait phrasing in MODE B. The reader already opened — earn their time
  by being substantive, not by hyping.

────────────────────────────────────────
Article:
- Title: ${title}
- Summary: ${summary || '(none)'}
- ${tickersLine}

────────────────────────────────────────
STRENGTH RATING — keep it brutally honest. Most news is filler (1-2).
  1 = Form 13F/144 filings, insider sells, micro-cap moves, EBIT growth on no-name companies
  2 = Routine analyst reprices ("Goldman raises Apple PT by $5"), boring quarterly beats from mid-caps
  3 = Notable but expected company news, mid-cap M&A, mainstream macro update
  4 = Surprising move from a major company (Tesla, Apple, big banks), >5% stock moves with clear catalyst, OR a celebrity finance figure
  5 = ABSOLUTE TOP TIER — major political figure (Trump, Powell), $1B+ moves, regulatory shock, breaking crypto crash/surge, world-impact economic news. Maybe 1-3 per day.

Anchor examples:
- "SanDisk Q3 earnings beat estimates by 5%" → 2
- "Tesla cuts 14000 jobs after disappointing Q1" → 4
- "Trump signs executive order banning CBDC" → 5
- "Bitcoin crashes 15% after SEC rejects spot ETF" → 5
- "Form 144 filing for John Smith at MidcapCorp" → 1
- "MARA accelerates AI shift with $1.5B Ohio deal" → 3
If you're tempted to give 4, ask "would a normal person stop scrolling and care?" — if no, it's 3 or lower.

────────────────────────────────────────
Return STRICT JSON with this exact shape (no prose around it). All copy in ${langName}:

{
  "angle": "ONE sentence in ${langName} stating the core editorial framing — what this story is REALLY about, beneath the surface event. MODE B voice.",

  "hook": "ONE stop-the-scroll opener in ${langName}, max 15 words, no hashtags. MODE A voice.",

  "headlines": ["3 short clickbait-worthy headline variants in ${langName}, each max 70 chars. MODE A voice."],

  "tweets": ["2 tweet variants in ${langName}, each max 260 chars. Lead with the most shocking or counterintuitive element. First 5 words must be impossible to ignore. Use contrast ('expected X, got Y'), open loops, or direct stakes. Max 1 hashtag, 1-2 emoji. MODE A voice."],

  "instagram_caption": "caption in ${langName}, 2-4 lines, hook-first, up to 3 relevant hashtags at the end. MODE A voice.",

  "strength": 1-5 integer per the calibration above. WHEN IN DOUBT, RATE LOWER.,

  "reasoning": "3-4 sentences in ${langName}, MODE B voice. This is the analytical body — it will be shown to the reader as the explanation of the story. Structure it as: (1) one sentence on the IMMEDIATE effect (what actually changed and the size of the change); (2) one sentence on the SECOND-ORDER effect (who benefits, who's exposed, what mechanism connects this event to portfolios); (3) one sentence on WHAT TO WATCH next (specific upcoming data point, decision, or threshold that will confirm or invalidate the read); (4) optional fourth sentence with a concrete analogy, historical parallel, or risk to keep in mind. NO virality talk. NO 'shocking'. NO hype. Substantive prose only."
}

Hard rules:
- Do NOT invent facts not in the article. If the article is dry, strength MUST be 1-2.
- A 5 means EXTRAORDINARY. If it doesn't genuinely shock you, it isn't a 5.
- Reasoning must be analytical prose, NOT a list of bullet markers. Just sentences.
- No markdown, no code fences, no trailing commentary — JSON only.`;

  let raw, provider;
  try {
    const out = await callLLM(prompt, {
      jsonMode:    true,
      maxTokens:   900,
      temperature: 0.78,
      // 70B for editorial quality — follows hook/tone instructions far better
      // than 8b-instant. TPD on free tier: 100K/day; editorial uses ~1.2K/post
      // so 3-5 posts/day = well under limit. Falls back to Gemini if exhausted.
      model:       'llama-3.3-70b-versatile',
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


// POST /api/analysis/visual-subject
// body: { name, lang? }
// returns: { name, display, description: {industry, category, visual_description, color_palette}, cached, provider }
//
// Purpose: when the pipeline's catalog (_SUBJECTS in ai_image_generator.py)
// doesn't match anything in a headline, it asks the LLM here how to visualize
// the unknown entity (e.g. "Concentrix", "Dawn Labs"). Results are cached in
// the persistent table `pulse_entity_visuals` so each entity only costs one
// LLM call across the lifetime of the system.
analysisRouter.post('/visual-subject', async (req, res) => {
  const { name } = req.body ?? {};

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    return res.status(400).json({ error: 'Field "name" is required (min 2 chars)' });
  }

  const display    = name.trim();
  const normalized = display.toLowerCase();

  // 1. Cache lookup (persistent in Supabase).
  if (_supabase) {
    try {
      const { data, error } = await _supabase
        .from('pulse_entity_visuals')
        .select('display, description')
        .eq('name', normalized)
        .limit(1)
        .maybeSingle();
      if (!error && data) {
        // Increment hit counter (best-effort, ignore failures).
        _supabase
          .from('pulse_entity_visuals')
          .update({ hits: undefined, updated_at: new Date().toISOString() })
          .eq('name', normalized)
          .then(() => {}, () => {});
        return res.json({
          name:        normalized,
          display:     data.display || display,
          description: data.description,
          cached:      true,
          provider:    'cache',
        });
      }
    } catch (e) {
      console.warn('[visual-subject] cache lookup failed:', e.message);
    }
  }

  // 2. Cache miss → ask the LLM.
  const prompt = `You are a visual director for an editorial finance publication. Describe how to photograph the following entity for a hero image. The entity may be a company, a cryptocurrency, a person, a place, a commodity, or a market concept.

Entity name: ${display}

Return STRICT JSON with this exact shape (no prose around it, JSON only):

{
  "industry":           "what sector/industry this entity belongs to (1-3 words, e.g. 'BPO services', 'EV manufacturer', 'crypto exchange'). If unknown, use 'unknown'.",
  "category":           "one of: company | crypto | person | place | commodity | market | unknown",
  "visual_description": "ONE clause in English describing how to visualize the entity in a cinematic editorial photograph, ~120 chars max. Concrete, photographable. Examples: 'modern open-plan customer service center, headsets and screens, soft blue light' (for Concentrix) or 'sleek venture studio loft, exposed brick, MacBooks open, late evening' (for Dawn Labs). NO TEXT, NO LOGOS WITH TEXT, NO WATERMARKS.",
  "color_palette":      "dominant brand colors or visual mood (1 short line, e.g. 'deep blue and silver', 'amber and forest green'). If unknown, suggest a fitting one."
}

If you do not recognize the entity, do NOT make up specific facts. Choose category="unknown" and produce a tasteful generic editorial visual that fits a finance headline.

NO markdown. NO code fences. NO trailing commentary. JSON only.`;

  let raw, provider;
  try {
    const out = await callLLM(prompt, {
      jsonMode:    true,
      maxTokens:   300,
      temperature: 0.5,
      tag:         '[visual-subject]',
      // Use the same model as news-angle for consistency; small prompt so cheap.
      model:       'llama-3.3-70b-versatile',
    });
    raw      = (out.text ?? '').trim();
    provider = out.provider;
  } catch (err) {
    console.error('[visual-subject] both providers failed:', err.message);
    return res.status(502).json({ error: err.message });
  }

  if (!raw) {
    return res.status(502).json({ error: 'Empty response from LLM' });
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error('[visual-subject] JSON parse failed:', err.message, 'raw=', raw.slice(0, 200));
    return res.status(502).json({ error: 'Invalid JSON from LLM' });
  }

  // Defensive normalization.
  const description = {
    industry:           typeof parsed.industry === 'string' ? parsed.industry.trim() : 'unknown',
    category:           ['company','crypto','person','place','commodity','market','unknown']
                           .includes(parsed.category) ? parsed.category : 'unknown',
    visual_description: typeof parsed.visual_description === 'string'
                           ? parsed.visual_description.trim().slice(0, 240)
                           : '',
    color_palette:      typeof parsed.color_palette === 'string' ? parsed.color_palette.trim().slice(0, 80) : '',
  };

  // 3. Write to cache (best-effort).
  if (_supabase) {
    try {
      await _supabase
        .from('pulse_entity_visuals')
        .upsert({
          name:        normalized,
          display,
          description,
          hits:        1,
          updated_at:  new Date().toISOString(),
        }, { onConflict: 'name' });
    } catch (e) {
      console.warn('[visual-subject] cache write failed:', e.message);
    }
  }

  res.json({
    name:        normalized,
    display,
    description,
    cached:      false,
    provider,
  });
});
