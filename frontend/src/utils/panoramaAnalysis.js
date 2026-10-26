// Relevance describes magnitude/attention, never direction. Missing tone is not neutral.
export function summarizeNews(news = []) {
  const counts = { positive: 0, negative: 0, neutral: 0 };
  let highImpact = 0;
  for (const article of news) {
    if (Object.hasOwn(counts, article?.sentiment)) counts[article.sentiment]++;
    if (article?.impact === 'high') highImpact++;
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
  const asset = new Map(cleanCandles(assetCandles).filter(c=>c.time<today).map(c=>[c.time,c.close]));
  const reference = new Map(cleanCandles(referenceCandles).filter(c=>c.time<today).map(c=>[c.time,c.close]));
  const dates = [...asset.keys()].filter(time=>reference.has(time)).sort((a,b)=>a-b);
  if (dates.length < 2) return null;
  const [from,to] = dates.slice(-2);
  const assetReturn = (asset.get(to)/asset.get(from)-1)*100;
  const referenceReturn = (reference.get(to)/reference.get(from)-1)*100;
  return {from,to,assetReturn,referenceReturn,difference:assetReturn-referenceReturn};
}
