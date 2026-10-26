// Relevance describes magnitude/attention, never direction. Missing tone is not neutral.
export function newsAssessment(article={}) {
  const evaluated=article.analysisStatus!=='unavailable';
  return {sentiment:evaluated&&['positive','negative','neutral'].includes(article.sentiment)?article.sentiment:null,
    impact:evaluated&&['high','medium','low'].includes(article.impact)?article.impact:null};
}
export function summarizeNews(news = []) {
  const counts = { positive: 0, negative: 0, neutral: 0 };
  let highImpact = 0;
  for (const article of news) {
    const assessed=newsAssessment(article??{});
    if (assessed.sentiment) counts[assessed.sentiment]++;
    if (assessed.impact==='high') highImpact++;
  }
  const classified = counts.positive + counts.negative + counts.neutral;
  let tone = 'unavailable';
  if (classified) {
    if (counts.positive > counts.negative && counts.positive > counts.neutral) tone = 'positive';
    else if (counts.negative > counts.positive && counts.negative > counts.neutral) tone = 'negative';
    else if (counts.positive && counts.negative) tone = 'mixed';
    else tone = 'neutral';
  }
  return { tone, counts, classified, highImpact, total: news.length };
}
import { cleanCandles } from './chartLevels.js';


// Nominal price returns over the same two completed UTC sessions. No missing=zero fallback.
export function commonCloseComparison(assetCandles = [], referenceCandles = [], now = Date.now()) {
  const today = Math.floor(now / 86_400_000) * 86400;
  const asset = new Map(cleanCandles(Array.isArray(assetCandles)?assetCandles:[]).filter(c=>c.time<today).map(c=>[c.time,c.close]));
  const reference = new Map(cleanCandles(Array.isArray(referenceCandles)?referenceCandles:[]).filter(c=>c.time<today).map(c=>[c.time,c.close]));
  const dates = [...asset.keys()].filter(time=>reference.has(time)).sort((a,b)=>a-b);
  if (dates.length < 2) return null;
  const [from,to] = dates.slice(-2);
  const assetReturn = (asset.get(to)/asset.get(from)-1)*100;
  const referenceReturn = (reference.get(to)/reference.get(from)-1)*100;
  return {from,to,assetReturn,referenceReturn,difference:assetReturn-referenceReturn};
}

export function formatQuote(value, currency, language = 'es', precision = null) {
  if (!Number.isFinite(value)) return '—';
  const digits=Number.isInteger(precision)&&precision>=0&&precision<=20?precision:Math.abs(value)>0&&Math.abs(value)<1?Math.min(20,Math.max(6,-Math.floor(Math.log10(Math.abs(value)))+3)):2;
  if (/^[A-Z]{3}$/.test(currency ?? '')) {
    try { return new Intl.NumberFormat(language,{style:'currency',currency,maximumFractionDigits:digits}).format(value); }
    catch { /* Preserve the source unit if Intl does not recognize it. */ }
  }
  return `${value.toLocaleString(language,{maximumFractionDigits:digits})}${currency?` ${currency}`:''}`;
}
