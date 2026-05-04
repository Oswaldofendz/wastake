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
// configured via GEMINI_API_KEY{,_2,_3,_4,_5} env vars.
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

// Reads all GEMINI_API_KEY{,_2,_3,_4,_5} env vars in order.
// Returns non-empty in declared order.
function geminiKeys() {
  const out = [];
  for (const v of ['GEMINI_API_KEY', 'GEMINI_API_KEY_2', 'GEMINI_API_KEY_3',
                   'GEMINI_API_KEY_4', 'GEMINI_API_KEY_5']) {
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
 */
export async function callLLM(prompt, opts = {}) {
  const {
    jsonMode    = false,
    maxTokens   = 600,
    temperature = 0.6,
    tag         = '[llm]',
  } = opts;
  const callOpts = { jsonMode, maxTokens, temperature };

  const groqOnCooldown = groqQuotaExhausted && Date.now() < groqQuotaResetAt;

  // ── Primary: Groq ─────────────────────────────────────────────────────────
  if (!groqOnCooldown) {
    try {
      const text = await callGroq(prompt, callOpts);
      if (groqQuotaExhausted) {
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

  // ── Fallback: Gemini (multi-key rotation) ─────────────────────────────────
  // callGemini internally rotates through GEMINI_API_KEY, _2, _3, _4, _5.
  // Each key has its own per-day quota; sticky cooldown marks exhausted keys.
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
