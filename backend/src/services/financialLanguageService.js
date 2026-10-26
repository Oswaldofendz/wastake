// Protect financial identities before sending text to a general translator.
// Placeholders are validated before restoration; failed protection is never displayed.
const NAMES = [
  'Apple', 'Amazon', 'Alphabet', 'Microsoft', 'NVIDIA', 'Tesla', 'Meta', 'Netflix',
  'JPMorgan', 'Visa', 'Adobe', 'Salesforce', 'Shopify', 'Oracle', 'Intel', 'AMD',
  'Bitcoin', 'Ethereum', 'Solana', 'Cardano', 'Dogecoin', 'Polkadot', 'Avalanche',
  'Chainlink', 'Shiba Inu', 'Litecoin', 'Cosmos', 'Uniswap', 'NEAR Protocol',
  'BlackRock', 'Berkshire Hathaway', 'Goldman Sachs', 'Morgan Stanley', 'Boeing', 'Airbus',
  'Robinhood', 'Strategy', 'Strive', 'Coinbase', 'Binance', 'CoinDesk', 'CoinTelegraph',
];
const TICKERS = ['AAPL', 'AMZN', 'MSFT', 'NVDA', 'TSLA', 'GOOGL', 'META', 'NFLX', 'JPM',
  'BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'ADA', 'DOGE', 'DOT', 'AVAX', 'LINK', 'SHIB', 'LTC',
  'ATOM', 'UNI', 'NEAR', 'SPY', 'QQQ', 'DIA', 'IWM', 'URTH', 'EEM', 'VTI', 'ARKK',
  'XLK', 'XLF', 'XLE', 'TLT', 'IEF', 'SHY', 'HYG', 'LQD', 'GLD', 'XAU', 'XAG'];
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const namePattern = new RegExp(`\\b(?:${[...NAMES].sort((a, b) => b.length - a.length).map(escape).join('|')})\\b`, 'gi');
const tickerPattern = new RegExp(`\\b(?:${TICKERS.join('|')})\\b`, 'g');

export function protectFinancialNames(text, extraIdentities = []) {
  const identities = [];
  const replace = value => {
    const token = `WSTKENTITY${String(identities.length).padStart(4, '0')}TOKEN`;
    identities.push({ token, value });
    return token;
  };
  const extra=extraIdentities.filter(v=>typeof v==='string'&&v.trim()).slice(0,5).map(v=>v.slice(0,100)).sort((a,b)=>b.length-a.length);
  const dynamic=extra.length?new RegExp(`(?<![\\p{L}\\p{N}_])(?:${extra.map(escape).join('|')})(?![\\p{L}\\p{N}_])`,'giu'):null;
  const prepared=dynamic?String(text).replace(dynamic,replace):String(text);
  const protectedText = prepared.replace(namePattern, replace).replace(tickerPattern, replace);
  return { text: protectedText, identities };
}

export function restoreFinancialNames(text, identities) {
  let result = String(text ?? '');
  for (const { token, value } of identities) {
    if (result.split(token).length !== 2) return null;
    result = result.replace(token, value);
  }
  return /WSTKENTITY\d+TOKEN/i.test(result) ? null : result;
}

export function preservesFinancialNames(original, translated) {
  return protectFinancialNames(original).identities.every(({ value }) =>
    new RegExp(`\\b${escape(value)}\\b`, 'i').test(String(translated)));
}

export function preservesFinancialNumbers(original, translated) {
  const tokens = value => (String(value).match(/\d+(?:[.,]\d+)*/g) ?? []).sort().join('|');
  return tokens(original) === tokens(translated);
}

// Conservative rejection of clearly foreign prose. Short labels and ambiguous
// financial terminology are accepted; they do not provide enough language evidence.
const WORDS = {
  en: 'the and with from this that these those their its which will would could may should despite amid without between because beyond into remains higher lower while under supply stock',
  es: 'el la los las del una unos unas que por para con sin como pero más podría puede mientras entre hacia sus este esta estos estas mercado información debería',
  pt: 'o os do da dos das uma umas que por para com sem como mas mais poderá pode enquanto entre seus suas este esta estes estas mercado informação deve não são',
};
const sets = Object.fromEntries(Object.entries(WORDS).map(([key, value]) => [key, new Set(value.split(' '))]));
export function isLikelyLanguage(text, language) {
  const tokens = String(text ?? '').toLowerCase().match(/\p{L}+/gu) ?? [];
  const scores = Object.fromEntries(Object.entries(sets).map(([key, words]) =>
    [key, tokens.reduce((sum, token) => sum + Number(words.has(token)), 0)]));
  const strongestOther = Math.max(...Object.entries(scores).filter(([key]) => key !== language).map(([, score]) => score));
  return strongestOther < 3 || strongestOther <= (scores[language] ?? 0) + 1;
}

export function localizedHorizon(value, language) {
  const normalized = String(value ?? '').toLowerCase();
  const index = /near|short|corto|curto|cerca/.test(normalized) ? 0
    : /medium|medio|médio|mediano/.test(normalized) ? 1
      : /long|largo|longo/.test(normalized) ? 2 : -1;
  const labels = { es: ['Corto plazo', 'Medio plazo', 'Largo plazo'],
    pt: ['Curto prazo', 'Médio prazo', 'Longo prazo'], en: ['Near term', 'Medium term', 'Long term'] };
  return index < 0 ? '' : labels[language][index];
}
