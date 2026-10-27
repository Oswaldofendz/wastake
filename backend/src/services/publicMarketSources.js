import axios from 'axios';
import {createSingleFlight} from './singleFlight.js';
const cache=new Map(),once=createSingleFlight();
// Explicit project identities: never resolve a coin by a possibly shared ticker.
const PAIRS={bitcoin:['XBTUSD','BTC-USD'],ethereum:['ETHUSD','ETH-USD'],solana:['SOLUSD','SOL-USD'],ripple:['XRPUSD','XRP-USD'],cardano:['ADAUSD','ADA-USD'],dogecoin:['XDGUSD','DOGE-USD'],litecoin:['LTCUSD','LTC-USD'],'bitcoin-cash':['BCHUSD','BCH-USD'],chainlink:['LINKUSD','LINK-USD'],polkadot:['DOTUSD','DOT-USD'],'avalanche-2':['AVAXUSD','AVAX-USD'],stellar:['XLMUSD','XLM-USD'],uniswap:['UNIUSD','UNI-USD'],near:['NEARUSD','NEAR-USD']};
const ALIASES=Object.fromEntries(Object.entries(PAIRS).map(([id,pairs])=>[pairs[1],id]));
export const exchangeIdentity=id=>PAIRS[ALIASES[id]??id]??null;
const SECONDS={'15m':900,'4h':14400,'1d':86400};
export function validBars(input=[],now=Date.now()){
 return [...new Map(input.filter(c=>[c.time,c.open,c.high,c.low,c.close].every(Number.isFinite)&&c.time<=now/1000&&c.time>0&&c.low>0&&c.high>=Math.max(c.open,c.close)&&c.low<=Math.min(c.open,c.close)).map(c=>[c.time,c])).values()].sort((a,b)=>a.time-b.time);
}
export function aggregateHours(bars,seconds=14400,now=Date.now()){
 const groups=new Map();for(const c of validBars(bars,now)){const key=Math.floor(c.time/seconds)*seconds;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}
 return [...groups].flatMap(([time,rows])=>{
  // Missing exchange hours are gaps, not fabricated candles. An ongoing bucket
  // may be partial, but must start at the actual UTC bucket boundary.
  const expected=Math.min(seconds/3600,Math.floor((now/1000-time)/3600)+1);
  if(rows.length!==expected||rows.some((r,i)=>r.time!==time+i*3600))return [];
  return [{time,open:rows[0].open,high:Math.max(...rows.map(r=>r.high)),low:Math.min(...rows.map(r=>r.low)),close:rows.at(-1).close,volume:rows.every(r=>Number.isFinite(r.volume))?rows.reduce((n,r)=>n+r.volume,0):undefined}];
 });
}
export function parseExchangeBars(data,provider,now=Date.now()){
 const rows=provider==='Kraken'?Object.entries(data?.result??{}).find(([key,value])=>key!=='last'&&Array.isArray(value))?.[1]:data;
 if(provider==='Kraken'&&data?.error?.length)throw new Error('Kraken rejected the pair');
 if(!Array.isArray(rows))return [];
 return validBars(rows.map(r=>provider==='Kraken'?{time:Number(r[0]),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:r[6]==null?undefined:Number(r[6])}:{time:Number(r[0]),low:Number(r[1]),high:Number(r[2]),open:Number(r[3]),close:Number(r[4]),volume:r[5]==null?undefined:Number(r[5])}),now);
}
export async function getExchangeCandles(id,interval='1d',preferred='auto'){
 if(!SECONDS[interval])throw new Error('Unsupported exchange interval');
 if(!['auto','Kraken','Coinbase'].includes(preferred))throw new Error('Unsupported exchange source');
 const pair=exchangeIdentity(id);if(!pair)throw new Error('No verified exchange identity');
 const key=id+':'+interval+':'+preferred,hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit.data;
 return once(key,async()=>{
  for(const provider of preferred==='auto'?['Kraken','Coinbase']:[preferred]){
   try{
    const kraken=provider==='Kraken',seconds=SECONDS[interval];
    const {data}=await axios.get(kraken?'https://api.kraken.com/0/public/OHLC':`https://api.exchange.coinbase.com/products/${pair[1]}/candles`,{params:kraken?{pair:pair[0],interval:seconds/60}:{granularity:interval==='4h'?3600:seconds},timeout:7000,headers:{'User-Agent':'WaStake/1.0'}});
    let candles=parseExchangeBars(data,provider);
    if(!kraken&&interval==='4h')candles=aggregateHours(candles.slice(-300));
    candles=candles.slice(-(kraken?(interval==='1d'?365:720):300));
    if(candles.length<2||Date.now()/1000-candles.at(-1).time>seconds*4)continue;
    const result={candles,source:provider,currency:'USD',pair:kraken?pair[0]:pair[1],interval,intervalSeconds:seconds,retrievedAt:new Date().toISOString(),sourceUrl:kraken?'https://www.kraken.com/prices':'https://www.coinbase.com/explore'};
    cache.set(key,{data:result,expires:Date.now()+(interval==='1d'?15*60000:60000)});return result;
   }catch{/* Try the independent public exchange; no invented or stale series. */}
  }
  throw new Error('Public exchange candles unavailable');
 });
}
export function parseReferenceRates(data,now=Date.now()){
 const today=new Date(now).toISOString().slice(0,10);
 return (Array.isArray(data)?data:[]).filter(r=>r.base==='EUR'&&['USD','GBP','JPY','CHF'].includes(r.quote)&&/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&r.date<=today&&Number.isFinite(r.rate)&&r.rate>0).map(r=>({base:r.base,quote:r.quote,rate:r.rate,date:r.date}));
}
export async function getReferenceRates(){
 const key='fx-reference',hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit.data;
 return once(key,async()=>{
  const {data}=await axios.get('https://api.frankfurter.dev/v2/rates',{params:{base:'EUR',quotes:'USD,GBP,JPY,CHF',providers:'ECB'},timeout:8000});
  const rates=parseReferenceRates(data);if(!rates.length)throw new Error('Reference FX unavailable');
  const result={rates,source:'Frankfurter · ECB',sourceUrl:'https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html',retrievedAt:new Date().toISOString()};
  cache.set(key,{data:result,expires:Date.now()+3600000});return result;
 });
}
