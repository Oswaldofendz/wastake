/** WaStake News Pulse v1. Editorial heuristic, not a price/return forecast. */
export const NEWS_PULSE_VERSION = 'news-pulse-v1';
export const NEWS_MARKETS = ['stocks', 'crypto', 'forex', 'commodities', 'bonds', 'indices', 'etfs'];
const finite = value => typeof value === 'number' && Number.isFinite(value);
const valid = (value, min, max) => finite(value) && value >= min && value <= max;
const normalizedTitle = value => String(value ?? '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
function sourceKey(value) {
  try { const url = new URL(value); return url.protocol === 'https:' ? `${url.hostname}${url.pathname.replace(/\/$/, '')}` : null; }
  catch { return null; }
}

export function newsPulse(news, {market = 'stocks', asset = false, now = Date.now(), windowHours = 24} = {}) {
  const windowMs = Math.min(720, Math.max(1, windowHours)) * 3600000;
  const relevant = [], seenUrls = new Set(), seenTitles = new Set();
  let available = 0, excluded = 0;
  for (const article of news ?? []) {
    const date = Date.parse(article.pubDate), url = sourceKey(article.link), title = normalizedTitle(article.title);
    if (!url || !title || !Number.isFinite(date) || date > now || now - date >= windowMs) continue;
    if (seenUrls.has(url) || seenTitles.has(title)) continue;
    seenUrls.add(url); seenTitles.add(title); available++;
    const assessment = asset ? {
      direction: article.score, relevance: article.relevance, confidence: article.confidence,
      marketLink: article.factors?.assetLink, evidenceQuote: article.evidenceQuote, reason: article.mechanism,
    } : article.marketAssessments?.[market];
    const evidence = article.factors?.evidence;
    // A headline rule or a missing assessment is unknown, never a neutral vote.
    if (!article.analysisProvider || !['article', 'rss'].includes(article.analysisDepth) || !assessment
      || !valid(assessment.direction, -100, 100) || !valid(assessment.relevance, 0, 100)
      || !valid(assessment.confidence, 1, 100) || !valid(assessment.marketLink, 30, 100)
      || !valid(evidence, 20, 100) || typeof assessment.reason !== 'string' || !assessment.reason.trim()
      || String(assessment.evidenceQuote ?? '').trim().length < 24) { excluded++; continue; }
    const ageHours = (now - date) / 3600000;
    const recency = 2 ** (-ageHours / 12);
    const confidence = Math.min(assessment.confidence, article.analysisDepth === 'article' ? 85 : 60) / 100;
    const quality = Math.min(evidence, article.analysisDepth === 'article' ? 100 : 60) / 100;
    const weight = (assessment.relevance / 100) ** 3 * confidence * quality * (assessment.marketLink / 100) * recency;
    if (!(weight > 0)) { excluded++; continue; }
    relevant.push({article, ...assessment, weight, recency, quality, confidence, signedWeight: weight * assessment.direction / 100});
  }
  // Matching event keys from contextual review prevent multiple reports from
  // multiplying one event's weight. Keep the best-supported representative.
  const events = new Map();
  for (const row of relevant) {
    const key = /^[a-z0-9][a-z0-9-]{7,119}$/.test(row.article.eventKey ?? '') ? row.article.eventKey : sourceKey(row.article.link);
    const previous = events.get(key);
    if (!previous || row.weight > previous.weight || (row.weight === previous.weight && Date.parse(row.article.pubDate) > Date.parse(previous.article.pubDate))) events.set(key, row);
  }
  const rows = [...events.values()], totalWeight = rows.reduce((n, r) => n + r.weight, 0);
  const net = totalWeight ? Math.max(-1, Math.min(1, rows.reduce((n, r) => n + r.signedWeight, 0) / totalWeight)) : null;
  const positiveWeight = rows.reduce((n, r) => n + Math.max(0, r.signedWeight), 0);
  const negativeWeight = rows.reduce((n, r) => n + Math.max(0, -r.signedWeight), 0);
  const effectiveCount = totalWeight ? totalWeight ** 2 / rows.reduce((n, r) => n + r.weight ** 2, 0) : 0;
  return {version: NEWS_PULSE_VERSION, market, available, excluded, assessed: relevant.length, events: rows.length,
    grouped: relevant.length - rows.length, value: net == null ? null : 5 * (1 + net), net,
    positiveWeight, negativeWeight, totalWeight, effectiveCount,
    dominance: totalWeight ? Math.max(...rows.map(r => r.weight)) / totalWeight : null,
    mixed: positiveWeight > 0 && negativeWeight > 0,
    limited: rows.length < 3 || effectiveCount < 2,
    rows: rows.map(row => ({...row, share: row.weight / totalWeight, contribution: 5 * row.signedWeight / totalWeight})).sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution) || b.weight - a.weight),
  };
}
