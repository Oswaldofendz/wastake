const POSITIVE_TERMS = [
  'beat expectations', 'beats estimates', 'record revenue', 'record profit',
  'strong earnings', 'profit rises', 'revenue growth', 'raises guidance',
  'upgrade', 'approved', 'approval', 'inflows', 'adoption', 'partnership',
  'surge', 'rally', 'bullish', 'outperforms', 'wins', 'supera', 'supero',
  'record', 'crecimiento', 'ganancias', 'beneficios', 'aprueba', 'alcista',
  'sube', 'aumenta', 'adopcion', 'alianza',
];

const NEGATIVE_TERMS = [
  'miss expectations', 'misses estimates', 'cuts guidance', 'profit falls',
  'revenue declines', 'lawsuit', 'fraud', 'bankruptcy', 'bankrupt', 'hack',
  'hacked', 'exploit', 'breach', 'outage', 'ban', 'crash', 'selloff',
  'downgrade', 'outflows', 'bearish', 'layoffs', 'fine', 'default',
  'demanda', 'fraude', 'quiebra', 'bancarrota', 'hackeo', 'caida',
  'prohibicion', 'recorte', 'despidos', 'multa', 'incumplimiento',
  'perdidas', 'baja', 'cae', 'declive',
];

const HIGH_IMPACT_TERMS = [
  'earnings', 'quarterly results', 'guidance', 'sec', 'cftc', 'doj', 'regulator',
  'regulation', 'lawsuit', 'court', 'bankruptcy', 'bankrupt', 'hack', 'exploit',
  'breach', 'merger', 'acquisition', 'takeover', 'approval', 'interest rate',
  'rate decision', 'fomc', 'cpi', 'inflation', 'jobs report', 'default',
  'debt ceiling', 'sanction', 'war', 'fraud', 'demanda', 'tribunal', 'quiebra',
  'hackeo', 'tasas de interes', 'inflacion', 'bancarrota', 'sancion',
  'aprobacion', 'fraude',
];

const MEDIUM_IMPACT_TERMS = [
  'launch', 'partnership', 'upgrade', 'downgrade', 'adoption', 'funding',
  'investment', 'listing', 'delisting', 'token unlock', 'buyback', 'dividend',
  'forecast', 'product', 'alianza', 'lanzamiento', 'adopcion', 'inversion',
  'cotizacion', 'dividendo', 'prevision', 'financiacion',
];

function normalize(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findTerms(text, terms) {
  return terms.filter(term => {
    const pattern = new RegExp(`(^|[^a-z0-9])${escapeRegExp(normalize(term))}([^a-z0-9]|$)`);
    return pattern.test(text);
  });
}

/** Transparent lexical baseline; matched terms are returned for user review. */
export function scoreHeadline(article) {
  const text = normalize(`${article.title ?? ''} ${article.snippet ?? ''}`);
  const positive = findTerms(text, POSITIVE_TERMS);
  const negative = findTerms(text, NEGATIVE_TERMS);
  const highImpact = findTerms(text, HIGH_IMPACT_TERMS);
  const mediumImpact = findTerms(text, MEDIUM_IMPACT_TERMS);
  const direction = positive.length - negative.length;
  const evidenceCount = positive.length + negative.length;

  return {
    ...article,
    sentiment: direction > 0 ? 'positive' : direction < 0 ? 'negative' : 'neutral',
    impact: highImpact.length ? 'high' : mediumImpact.length ? 'medium' : 'low',
    score: evidenceCount ? Math.round((direction / evidenceCount) * 100) : 0,
    matchedTerms: { positive, negative, highImpact, mediumImpact },
    scoringVersion: 'keyword-rules-v1',
  };
}
