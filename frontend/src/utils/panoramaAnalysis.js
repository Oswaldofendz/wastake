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
