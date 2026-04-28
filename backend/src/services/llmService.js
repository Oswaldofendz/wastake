/**
 * LLM service — Groq primary, Gemini fallback.
 *
 * Strategy: try Groq first (fast, llama-3.1-8b-instant), and on:
 *   • daily token quota exhaustion (TPD)  → flip a sticky flag, skip Groq until UTC 00:05
 *   • any other failure                   → one-off fallback to Gemini for this call only
 *
 * Combined daily budget: ~500K Groq + ~1M Gemini tokens on free tiers.
 * Mirrors the pattern already used in newsService.js (which goes Gemini → Groq).
 *
 * Both providers are coerced to return JSON when jsonMode=true:
 *   • Groq:   response_format: { type: 'json_object' }
 *   • Gemini: generationConfig.response_mime_type: 'application/json'
 *
 * The caller receives a plain text string; if jsonMode, JSON.parse it yourself.
 */
import axios from 'axios';

// ─── Sticky daily-quota state ────────────────────────────────────────────────

let groqQuotaExhausted   = false;
let groqQuotaResetAt     = 0;
let geminiQuotaExhausted = false;
let geminiQuotaResetAt   = 0;

function tomorrowUtc05() {
  // Reset target: 00:05 UTC tomorrow. Same window newsService.js uses.
  const t = new Date();
  t.setUTCHours(24, 5, 0, 0);
  return t.getTime();
}

function isGroqDailyQuota(err) {
  // Groq message when TPD cap hit:
  //   "Rate limit reached for model `llama-3.1-8b-instant` ...
  //    on tokens per day (TPD): Limit 500000, Used 499820, Requested 200."
  if (err.response?.status !== 429) return false;
  const msg = err.response?.data?.error?.message ?? '';
  return /tokens per day|TPD/i.test(msg);
}

function isGeminiDailyQuota(err) {
  if (err.response?.status !== 429) return false;
  const violations =
    err.response?.data?.error?.details?.find(d =>
      (d['@type'] ?? '').includes('QuotaFailure')
    )?.violations ?? [];
  return violations.some(v => (v.quotaId ?? '').includes('PerDay'));
}

// ─── Provider calls ──────────────────────────────────────────────────────────

async function callGroq(prompt, { jsonMode, maxTokens, temperature }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('No GROQ_API_KEY');

  const body = {
    model: 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  const res = await axios.post(
    'https://api.groq.com/openai/v1/chat/completions',
    body,
    {
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    }
  );

  const text = res.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Empty Groq response');
  return text;
}

async function callGemini(prompt, { jsonMode, maxTokens, temperature }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('No GEMINI_API_KEY');

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };
  if (jsonMode) body.generationConfig.response_mime_type = 'application/json';

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${apiKey}`,
    body,
    { timeout: 20000 }
  );

  const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Try Groq first, fallback to Gemini.
 * Returns { text, provider }. Caller does any JSON.parse needed.
 *
 * @param {string} prompt
 * @param {object} opts
 * @param {boolean} [opts.jsonMode=false]    request structured JSON output
 * @param {number}  [opts.maxTokens=600]     response length cap
 * @param {number}  [opts.temperature=0.6]
 * @param {string}  [opts.tag='[llm]']       log prefix
 */
export async function callLLM(prompt, opts = {}) {
  const {
    jsonMode    = false,
    maxTokens   = 600,
    temperature = 0.6,
    tag         = '[llm]',
  } = opts;
  const callOpts = { jsonMode, maxTokens, temperature };

  const groqOnCooldown   = groqQuotaExhausted   && Date.now() < groqQuotaResetAt;
  const geminiOnCooldown = geminiQuotaExhausted && Date.now() < geminiQuotaResetAt;

  // ── Primary: Groq ─────────────────────────────────────────────────────────
  if (!groqOnCooldown) {
    try {
      const text = await callGroq(prompt, callOpts);
      if (groqQuotaExhausted) {
        // The cooldown window passed and Groq is responding again.
        groqQuotaExhausted = false;
        console.log(`${tag} Groq recovered — back as primary`);
      }
      console.log(`${tag} via Groq`);
      return { text, provider: 'groq' };
    } catch (err) {
      if (isGroqDailyQuota(err)) {
        groqQuotaExhausted = true;
        groqQuotaResetAt   = tomorrowUtc05();
        console.warn(`${tag} Groq daily TPD quota exhausted — switching to Gemini until UTC 00:05`);
      } else {
        const where = err.response?.status ?? (err.message?.slice(0, 60));
        console.warn(`${tag} Groq failed (${where}) — trying Gemini`);
      }
    }
  } else {
    console.log(`${tag} Groq on cooldown — going straight to Gemini`);
  }

  // ── Fallback: Gemini ──────────────────────────────────────────────────────
  if (!geminiOnCooldown) {
    try {
      const text = await callGemini(prompt, callOpts);
      if (geminiQuotaExhausted) {
        geminiQuotaExhausted = false;
        console.log(`${tag} Gemini recovered`);
      }
      console.log(`${tag} via Gemini (fallback)`);
      return { text, provider: 'gemini' };
    } catch (err) {
      if (isGeminiDailyQuota(err)) {
        geminiQuotaExhausted = true;
        geminiQuotaResetAt   = tomorrowUtc05();
        console.error(`${tag} Gemini daily quota ALSO exhausted — both providers down until UTC 00:05`);
      } else {
        const where = err.response?.status ?? (err.message?.slice(0, 60));
        console.error(`${tag} Gemini fallback failed (${where})`);
      }
      throw new Error(`Both providers failed for ${tag}: ${err.message}`);
    }
  }

  throw new Error(`Both Groq and Gemini are on quota cooldown until UTC 00:05`);
}
