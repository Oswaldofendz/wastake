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

// Per-Gemini-key cooldown state. Map keyLabel → epoch when usable again.
// Each Gemini API key has its own daily quota; we rotate through all keys
// configured via GEMINI_API_KEY{,_<N>} env vars (auto-discovered at call time).
const geminiKeyCooldowns = new Map();

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

async function callGroq(prompt, { jsonMode, maxTokens, temperature, model }) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('No GROQ_API_KEY');

  const body = {
    model: model || 'llama-3.1-8b-instant',
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

// Auto-discover all GEMINI_API_KEY{,_<N>} env vars at call time.
// Order: GEMINI_API_KEY (default) first, then GEMINI_API_KEY_<N> sorted
// numerically. Quota is per Google account/key, so adding more numbered
// keys in Railway env (e.g. _6, _7, _10) extends daily headroom for
// news-angle / narrative endpoints without touching this code.
function geminiKeys() {
  const named = Object.keys(process.env)
    .filter(k => /^GEMINI_API_KEY(_\d+)?$/.test(k))
    .sort((a, b) => {
      const na = a === 'GEMINI_API_KEY' ? 0 : parseInt(a.split('_').pop(), 10);
      const nb = b === 'GEMINI_API_KEY' ? 0 : parseInt(b.split('_').pop(), 10);
      return na - nb;
    });
  const out = [];
  for (const v of named) {
    const k = (process.env[v] ?? '').trim();
    if (k) out.push(k);
  }
  return out;
}

function geminiKeyLabel(key) {
  return key.length > 6 ? `...${key.slice(-6)}` : '?';
}

function isKeyOnCooldown(key) {
  const until = geminiKeyCooldowns.get(geminiKeyLabel(key)) ?? 0;
  return Date.now() < until;
}

function markKeyExhausted(key) {
  geminiKeyCooldowns.set(geminiKeyLabel(key), tomorrowUtc05());
}

async function callGeminiSingleKey(prompt, key, { jsonMode, maxTokens, temperature }) {
  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };
  if (jsonMode) body.generationConfig.response_mime_type = 'application/json';

  const res = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`,
    body,
    { timeout: 20000 }
  );

  const text = res.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Empty Gemini response');
  return text;
}

// Try each Gemini key in order, skipping keys on cooldown. On per-day quota
// (429 with PerDay quotaId), mark that key exhausted and try the next.
// On any other error, log and continue to next key.
async function callGemini(prompt, opts) {
  const keys = geminiKeys();
  if (keys.length === 0) throw new Error('No GEMINI_API_KEY env vars set');

  let lastErr = null;
  for (const key of keys) {
    if (isKeyOnCooldown(key)) {
      console.log(`[gemini] skipping key ${geminiKeyLabel(key)} (on cooldown)`);
      continue;
    }
    try {
      const text = await callGeminiSingleKey(prompt, key, opts);
      console.log(`[gemini] OK via key ${geminiKeyLabel(key)}`);
      return text;
    } catch (err) {
      lastErr = err;
      if (isGeminiDailyQuota(err)) {
        markKeyExhausted(key);
        console.warn(`[gemini] key ${geminiKeyLabel(key)} daily quota exhausted → next key`);
        continue;
      }
      const status = err.response?.status ?? '?';
      console.warn(`[gemini] key ${geminiKeyLabel(key)} failed (${status}) → next key`);
      continue;
    }
  }
  // All keys exhausted or failed
  throw lastErr ?? new Error('All Gemini keys exhausted');
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
 * @param {string}  [opts.model]             override Groq model (default: llama-3.1-8b-instant)
 */
export async function callLLM(prompt, opts = {}) {
  const {
    jsonMode    = false,
    maxTokens   = 600,
    temperature = 0.6,
    tag         = '[llm]',
    model       = null,
  } = opts;
  const callOpts = { jsonMode, maxTokens, temperature, model };

  const groqOnCooldown = groqQuotaExhausted && Date.now() < groqQuotaResetAt;

  // ── Primary: Groq ─────────────────────────────────────────────────────────
  if (!groqOnCooldown) {
    try {
      const text = await callGroq(prompt, callOpts);
      if (groqQuotaExhausted) {
        groqQuotaExhausted = false;
        console.log(`${tag} Groq recovered — back as primary`);
      }
      console.log(`${tag} via Groq (${model || 'llama-3.1-8b-instant'})`);
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

  // ── Fallback: Gemini (multi-key rotation) ─────────────────────────────────
  // callGemini internally rotates through all auto-discovered GEMINI_API_KEY*
  // env vars. Each key has its own per-day quota; sticky cooldown marks
  // exhausted keys until the 00:05 UTC reset.
  try {
    const text = await callGemini(prompt, callOpts);
    console.log(`${tag} via Gemini (fallback)`);
    return { text, provider: 'gemini' };
  } catch (err) {
    const where = err.response?.status ?? (err.message?.slice(0, 80));
    console.error(`${tag} Gemini fallback failed (${where})`);
    throw new Error(`Both providers failed for ${tag}: ${err.message}`);
  }
}
