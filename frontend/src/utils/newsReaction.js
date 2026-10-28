// Daily bars use UTC opening timestamps. Only complete bars may enter this comparison.
export function reactionAfterArticle(article, candles, now = Date.now()) {
  const publishedAt = Date.parse(article.pubDate);
  if (!Number.isFinite(publishedAt) || publishedAt > now || !candles?.length) return null;
  const publishedSeconds = publishedAt / 1000;
  const complete = candles.filter(c => Number.isFinite(c.time) && c.time + 86400 <= now / 1000 && Number.isFinite(c.close) && c.close > 0).sort((a,b)=>a.time-b.time);
  const before = [...complete].reverse().find(c => c.time + 86400 <= publishedSeconds);
  const after = complete.find(c => c.time + 86400 >= publishedSeconds + 86400);
  if (!before || !after) return null;
  return ((after.close / before.close) - 1) * 100;
}
