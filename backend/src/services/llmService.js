/**
 * LLM service — Groq primary, Gemini fallback.
 *
 * Strategy: try Groq first (openai/gpt-oss-20b by default), and on:
 *   • daily token quota exhaustion (TPD)  → flip a sticky flag, skip Groq until UTC 00:05
 *   • any other failure                   → one-off fallback to Gemini for this call only
 *
 * Provider limits and pricing are determined by each provider account; this
 * code does not switch accounts or upgrade a provider plan.
 * Mirrors the pattern already used in newsService.js (which goes Gemini → Groq).
 *
 * Both providers are coerced to return JSON when jsonMode=true:
 *   • Groq:   response_format: { type: 'json_object' }
 *   • Gemini: generationConfig.response_mime_type: 'application/json'
 *
 * The caller receives a plain text string; if jsonMode, JSON.parse it yourself.
 */
import axios from 'axios';

// Keep the model configurable in Render so a provider migration does not
// require changing source code again. This replacement supports JSON mode.
export const GROQ_DEFAULT_MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';

// ─── Sticky daily-quota state ────────────────────────────────────────────────

let groqQuotaExhausted   = false;
let groqQuotaResetAt     = 0;

// Per-Gemini-variable cooldown state. Map variable name → epoch when usable again.
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
  // Groq reports daily token exhaustion as a 429 mentioning TPD.
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
    model: model || GROQ_DEFAULT_MODEL,
    messages: [{ role: 'user', content: prompt }],
    max_tokens: maxTokens,
    temperature,
  };
  if (jsonMode) body.response_format = { type: 'json_object' };

  // Retry transient 429s (RPM/TPM hits on free tier) before letting the
  // caller fall back to Gemini. Daily-quota 429s and non-429 errors are
  // re-thrown immediately so the Gemini fallback still works as before.
  const RETRY_DELAYS_MS = [0, 1000, 2500];
  let lastErr = null;
  for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt++) {
    if (RETRY_DELAYS_MS[attempt] > 0) {
      await new Promise(r => setTimeout(r, RETRY_DELAYS_MS[attempt]));
    }
    try {
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
    } catch (err) {
      lastErr = err;
      // Daily TPD → don't retry, let caller fall back to Gemini.
      if (isGroqDailyQuota(err)) throw err;
      // Non-429 (network, 5xx, etc.) → no retry either.
      if (err.response?.status !== 429) throw err;
      // Transient 429 (RPM/TPM): retry if we have attempts left.
      if (attempt < RETRY_DELAYS_MS.length - 1) {
        const nextMs = RETRY_DELAYS_MS[attempt + 1];
        console.warn(
          `[groq] 429 transient — retry ${attempt + 1}/${RETRY_DELAYS_MS.length - 1} in ${nextMs}ms`
        );
      }
    }
  }
  throw lastErr;
}

// Auto-discover all GEMINI_API_KEY{,_<N>} env vars at call time.
// Order: GEMINI_API_KEY (default) first, then GEMINI_API_KEY_<N> sorted
// numerically. Quota is per Google account/key, so adding more numbered
// keys in Render env extend free-tier quota capacity without touching code.
function geminiKeys() {
  const named = Object.keys(process.env)
    .filter(k => /^GEMINI_API_KEY(_\d+)?$/.test(k))
    .sort((a, b) => {
      const na = a === 'GEMINI_API_KEY' ? 0 : parseInt(a.split('_').pop(), 10);
      const nb = b === 'GEMINI_API_KEY' ? 0 : parseInt(b.split('_').pop(), 10);
      return na - nb;
    });
  return named
    .map(name => ({ name, value: (process.env[name] ?? '').trim() }))
    .filter(entry => entry.value);
}

function isKeyOnCooldown(name) {
  const until = geminiKeyCooldowns.get(name) ?? 0;
  return Date.now() < until;
}

function markKeyExhausted(name) {
  geminiKeyCooldowns.set(name, tomorrowUtc05());
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
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${key}`,
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
  for (const { name, value } of keys) {
    if (isKeyOnCooldown(name)) {
      console.log(`[gemini] skipping ${name} (on cooldown)`);
      continue;
    }
    try {
      const text = await callGeminiSingleKey(prompt, value, opts);
      console.log(`[gemini] OK via ${name}`);
      return text;
    } catch (err) {
      lastErr = err;
      if (isGeminiDailyQuota(err)) {
        markKeyExhausted(name);
        console.warn(`[gemini] ${name} daily quota exhausted → next key`);
        continue;
      }
      const status = err.response?.status ?? '?';
      console.warn(`[gemini] ${name} failed (${status}) → next key`);
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
 * @param {string}  [opts.model]             override Groq model (default: GROQ_MODEL or openai/gpt-oss-20b)
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
      console.log(`${tag} via Groq (${model || GROQ_DEFAULT_MODEL})`);
      return { text, provider: 'groq' };
    } catch (err) {
      if (isGroqDailyQuota(err)) {
        groqQuotaExhausted = true;
        groqQuotaResetAt   = tomorrowUtc05();
        console.warn(`${tag} Groq daily TPD quota exhausted — switching to Gemini until UTC 00:05`);
      } else {
        const where = err.response?.status ?? err.code ?? 'network error';
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
    const where = err.response?.status ?? err.code ?? 'network error';
    console.error(`${tag} Gemini fallback failed (${where})`);
    throw new Error(`Both AI providers are unavailable for ${tag}`);
  }
}
