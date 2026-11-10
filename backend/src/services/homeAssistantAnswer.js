import {getChartSnapshot} from './chartAgentService.js';
import {getSingleQuote} from './priceService.js';

const kinds = new Set(['stock','crypto','etf','bond','index','forex','commodity']);
const executionClaim = /\b(?:en wastake (?:puedes|podras) (?:comprar|vender|ejecutar|colocar|enviar)|na wastake (?:podes|pode) (?:comprar|vender|executar|colocar|enviar)|(?:on|in) wastake you can (?:buy|sell|place|execute|submit)|se ejecuta en wastake|desde la seccion de trading)\b/;

export function reviewHomeAssistantReply(raw) {
  if (typeof raw !== 'string') return '';
  const reply = raw.trim().replace(/\*\*|[\x60]/g,'').slice(0,2200);
  const plain = reply.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  return executionClaim.test(plain) ? '' : reply;
}

export function requestedMarkets(input) {
  if (!Array.isArray(input)) return [];
  return input.slice(0,2).filter(asset=>asset && typeof asset.id === 'string'
    && /^[A-Za-z0-9^=._-]{1,100}$/.test(asset.id) && kinds.has(asset.type)
    && (asset.type!=='crypto' || /^[a-z0-9-]+$/.test(asset.id) || /-[A-Z]{3}$/.test(asset.id)))
    .map(({id,type})=>({id,type,analysisType:type==='crypto'&&!/-[A-Z]{3}$/.test(id)?'crypto':'stock'}));
}

async function marketFacts(asset, wantQuote) {
  const {id,type,analysisType} = asset;
  const currency = value => type==='index' ? 'pts' : value;
  if (wantQuote) {
    const quote = await getSingleQuote(id,analysisType).catch(()=>null);
    const time = Date.parse(quote?.quoteAsOf);
    if (quote?.price>0 && Number.isFinite(quote.price) && quote.source && Number.isFinite(time) && time<=Date.now()) {
      return {id,type,source:quote.source,asOf:new Date(time).toISOString(),currency:currency(quote.currency),kind:'quote',price:quote.price};
    }
  }
  const data = await getChartSnapshot(id,analysisType,'1d').catch(()=>null);
  if (!data?.source || !Number.isFinite(data.asOf) || !Number.isFinite(data.facts?.close)) return {id,type};
  const {close,rsi,ema20,ema50,macd,atrPercent,volumeRatio,score,support,resistance} = data.facts;
  return {id,type,source:data.source,asOf:new Date(data.asOf*1000).toISOString().slice(0,10),
    currency:currency(data.currency),kind:'close',price:close,rsi,ema20,ema50,macd,atrPercent,volumeRatio,
    technicalIndex:data.coverage===100?score:null,support,resistance};
}

export async function assistantMarketFacts(assets, wantQuote) {
  return Promise.all(assets.map(asset=>{
    let timer;
    return Promise.race([
      marketFacts(asset,wantQuote),
      new Promise(resolve=>{timer=setTimeout(()=>resolve({id:asset.id,type:asset.type}),8000);})
    ]).finally(()=>clearTimeout(timer));
  }));
}
