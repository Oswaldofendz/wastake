const normalize = value => (value ?? '').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim().replace(/\s+/g,' ');
const priceQuestion = /^(?:a cuanto (?:esta|cotiza)|cuanto (?:vale|cuesta)|(?:cual es )?el precio de|precio de|what(?: is|'s) the price of|price of|how much is|a quanto (?:esta|cotiza)|quanto (?:vale|custa)|qual (?:e )?o preco de|preco de)\s+/;
const readingQuestion = /^(?:(?:y|entonces|ahora)\s+)?(?:como (?:esta a (?:correr|andar)|ves|valoras|evaluas|esta|va|anda|se ve|ve|estas a ver)|que (?:opinas|piensas) (?:de|sobre)|que (?:tal|te parece)|(?:dame|hazme) un analisis (?:de|sobre)|(?:me puedes |puedes )?analizar|analiza|analisa|(?:can you )?(?:analyse|analyze)|how(?: is|'s)|how do you see|what do you think (?:of|about)|what(?: is|'s) your take on|o que (?:achas|acha|pensas|pensa) (?:de|do|da|sobre))\s+/;

export function marketQuestion(text, catalogue) {
  const raw = text.trim().replace(/^[¿¡]+|[?.!]+$/g,'').trim();
  const query = normalize(raw);
  const prefix = query.match(priceQuestion) ?? query.match(readingQuestion);
  const subject = (prefix ? query.slice(prefix[0].length) : query)
    .replace(/^(?:a|el|la|o|the)\s+/,'')
    .replace(/\s+(?:ahora mismo|ahora|hoy|right now|now|today|agora|hoje)$/,'')
    .replace(/\s+doing$/,'')
    .replace(/^\$/,'');
  // Resolve a common Spanish rendering of NVIDIA only in a market question.
  const target = prefix && subject === 'envidia' ? 'nvda' : subject;
  if (prefix && /^(?:lo|la|eso|esto|that|it|isso|isto)$/.test(target)) return null;
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

export function mentionedMarkets(text, catalogue) {
  const words = new Set(text.match(/[A-Za-z0-9]+(?:[=._-][A-Za-z0-9]+)*/g) ?? []);
  const phrase = ` ${normalize(text).replace(/[^a-z0-9]+/g,' ')} `;
  const candidates = new Map();
  for (const asset of catalogue) {
    const name = normalize(asset.name).replace(/[^a-z0-9]+/g,' ').trim();
    const symbol = asset.symbol;
    const byName = name.length>=5 && name!==normalize(symbol) && phrase.includes(` ${name} `);
    const bySymbol = symbol?.length>=3 && words.has(symbol.toUpperCase());
    if (byName || bySymbol) candidates.set(`${asset.type}:${asset.id}`,{asset,byName});
  }
  const matches = [...candidates.values()];
  return matches.filter(({asset,byName})=>byName || matches.filter(row=>row.asset.symbol===asset.symbol).length===1)
    .map(({asset})=>asset).slice(0,2);
}
