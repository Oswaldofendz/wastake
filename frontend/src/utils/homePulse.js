import {cleanCandles} from './chartLevels.js';

export function homeChart(candles, now = Date.now()) {
  const today = Math.floor(now / 86400000) * 86400;
  const closes = cleanCandles(candles).filter(candle => candle.time < today).slice(-30);
  if (closes.length < 2) return null;

  const prices = closes.map(candle => candle.close);
  const min = Math.min(...prices), max = Math.max(...prices);
  const points = prices.map((price, index) => [
    2 + index * 156 / (prices.length - 1),
    max === min ? 24 : 41 - (price - min) * 34 / (max - min)
  ]);
  return {
    points,
    close: prices.at(-1),
    date: closes.at(-1).time * 1000,
    count: closes.length,
    change: (prices.at(-1) / prices[0] - 1) * 100
  };
}

export function homeSentiment(current, now = Date.now()) {
  if (current?.value == null || String(current.value).trim() === '' || !current.timestamp) return null;
  const score = Number(current.value), at = Number(current.timestamp) * 1000;
  if (!Number.isInteger(score) || score < 0 || score > 100 || !Number.isFinite(at) || at <= 0 || at > now) return null;
  return {score, at};
}

export function homeCryptoSnapshot(assets, now = Date.now()) {
  const unique = new Map();
  for (const asset of assets) {
    const date = Date.parse(asset.quoteAsOf);
    if (asset.type !== 'crypto' || asset.currency !== 'USD' || !asset.id || !asset.source ||
      !Number.isFinite(date) || date > now || now - date > 86400000) continue;
    if (!unique.has(asset.id) || date > Date.parse(unique.get(asset.id).quoteAsOf)) unique.set(asset.id,asset);
  }

  const rows = [...unique.values()];
  const valid = value => Number.isFinite(value) && value > 0;
  const caps = rows.filter(asset => valid(asset.marketCap));
  const volumes = rows.filter(asset => valid(asset.volume24h));
  const cap = caps.reduce((total,asset) => total + asset.marketCap,0);
  const btc = caps.find(asset => asset.id === 'bitcoin');
  return {
    cap, capCount:caps.length,
    volume:volumes.reduce((total,asset) => total + asset.volume24h,0),
    volumeCount:volumes.length,
    share:btc && caps.length > 1 ? 100 * btc.marketCap / cap : null
  };
}
