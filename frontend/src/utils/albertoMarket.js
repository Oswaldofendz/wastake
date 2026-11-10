import {displayPriceUnit,formatQuote} from './panoramaAnalysis.js';

const normalize = value => (value ?? '').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim().replace(/\s+/g,' ');
const priceQuestion = /^(?:a cuanto (?:esta|cotiza)|cuanto (?:vale|cuesta)|(?:cual es )?el precio de|precio de|what(?: is|'s) the price of|price of|how much is|a quanto (?:esta|cotiza)|quanto (?:vale|custa)|qual (?:e )?o preco de|preco de)\s+/;
const readingQuestion = /^(?:como (?:esta a (?:correr|andar)|ves|esta|va|anda|se ve|ve|estas a ver)|que (?:opinas|piensas) (?:de|sobre)|que (?:tal|te parece)|(?:dame|hazme) un analisis (?:de|sobre)|(?:me puedes |puedes )?analizar|analiza|analisa|(?:can you )?(?:analyse|analyze)|how(?: is|'s)|how do you see|what do you think (?:of|about)|what(?: is|'s) your take on|o que (?:achas|acha|pensas|pensa) (?:de|do|da|sobre))\s+/;

export function marketQuestion(text, catalogue) {
  const raw = text.trim().replace(/^[¿¡]+|[?.!]+$/g,'').trim();
  const query = normalize(raw);
  const prefix = query.match(priceQuestion) ?? query.match(readingQuestion);
  const target = (prefix ? query.slice(prefix[0].length) : query)
    .replace(/^(?:a|el|la|o|the)\s+/,'')
    .replace(/\s+(?:ahora mismo|ahora|hoy|right now|now|today|agora|hoje)$/,'')
    .replace(/\s+doing$/,'')
    .replace(/^\$/,'');
  if (!target || target.length > 80 || /^(?:mercados?|wastake|markets?)$/.test(target)) return null;
  if (!prefix && /^[a-z]{1,2}$/.test(target) && raw !== raw.toUpperCase()) return null;
  const matches = exactMarketMatches(target,catalogue);
  return prefix || matches.length ? {target, price:priceQuestion.test(query), matches} : null;
}

export function exactMarketMatches(target, assets = []) {
  const matches = new Map();
  for (const asset of assets) {
    const aliases = [asset.id,asset.symbol,asset.name].map(normalize);
    if (asset.type === 'crypto' && asset.symbol) aliases.push(normalize(`${asset.symbol}-USD`));
    if (aliases.includes(target)) {
      const key = `${asset.type}:${asset.id}`;
      if (!matches.has(key)) matches.set(key,asset);
    }
  }
  return [...matches.values()];
}

export function verifiedQuote(quote, now = Date.now()) {
  const at = Date.parse(quote?.quoteAsOf);
  return Number.isFinite(quote?.price) && quote.price > 0 && !!quote.source && Number.isFinite(at) && at <= now;
}

export function verifiedClose(meta, now = Date.now()) {
  const today = Math.floor(now/86_400_000)*86_400;
  return Number.isFinite(meta?.lastPrice) && meta.lastPrice > 0 && !!meta.source
    && Number.isFinite(meta.to) && meta.to > 0 && meta.to < today;
}

export function marketReply(asset, analysis, quote, lang, t, {priceOnly = false,now = Date.now()} = {}) {
  const {meta,indicators,summary} = analysis ?? {};
  const identity = asset.symbol && asset.symbol !== asset.name ? `${asset.name} (${asset.symbol})` : asset.name || asset.id;
  const number = (n, options) => n.toLocaleString(lang,options);
  const format = (n, currency) => formatQuote(n,displayPriceUnit(asset,currency),lang);
  const lines = [];
  if (verifiedQuote(quote,now)) {
    const date = new Date(quote.quoteAsOf).toLocaleString(lang,{dateStyle:'medium',timeStyle:'short'});
    lines.push(t('alberto_market_quote',{identity,price:format(quote.price,quote.currency),date,source:quote.source}));
    if (priceOnly) return lines[0];
  }
  if (!verifiedClose(meta,now)) {
    return [...lines,t('alberto_market_no_reading',{identity})].join('\n\n');
  }

  const date = new Date(meta.to*1000).toLocaleDateString(lang,{dateStyle:'medium',timeZone:'UTC'});
  lines.push(t('alberto_market_close',{identity,price:format(meta.lastPrice,meta.currency),date,source:meta.source}));
  if (summary?.coverage === 100 && Number.isFinite(summary.score10)) {
    lines.push(`${t('technical_score_'+summary.bias)} · ${number(summary.score10,{maximumFractionDigits:1})}/10`);
  }
  const ema20 = indicators?.ema20?.current, ema50 = indicators?.ema50?.current;
  if (Number.isFinite(ema20) && Number.isFinite(ema50)) {
    const position = meta.lastPrice > Math.max(ema20,ema50) ? 'above'
      : meta.lastPrice < Math.min(ema20,ema50) ? 'below' : 'between';
    lines.push(t('alberto_market_'+position));
  }
  const rsi = indicators?.rsi?.current;
  if (Number.isFinite(rsi)) {
    const level = rsi >= 70 ? 'high' : rsi <= 30 ? 'low' : 'mid';
    lines.push(t('alberto_market_rsi_'+level,{value:number(rsi,{maximumFractionDigits:1})}));
  }
  return lines.join('\n');
}
