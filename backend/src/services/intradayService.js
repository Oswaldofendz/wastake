import axios from 'axios';
import {getExchangeCandles,validBars,aggregateHours} from './publicMarketSources.js';
import {resolveYahooCrypto} from './cryptoIdentityService.js';
import {createSingleFlight} from './singleFlight.js';
const cache=new Map(),once=createSingleFlight();
export function yahooTimedBars(input,seconds,session=false,now=Date.now()){
 const anchors=new Map();
 return validBars(input,now).filter(c=>{
  // Yahoo appends a zero-volume single-price tick with the quote's timestamp.
  // It is not an extra 15-minute/hourly candle and cannot confirm chart levels.
  if(c.volume===0&&c.open===c.high&&c.high===c.low&&c.low===c.close)return false;
  const day=Math.floor(c.time/86400);if(!anchors.has(day))anchors.set(day,session?c.time:day*86400);
  return (c.time-anchors.get(day))%seconds===0;
 });
}
export function sessionFourHours(input,now=Date.now()){
 const days=new Map();for(const c of validBars(input,now)){const day=Math.floor(c.time/86400);if(!days.has(day))days.set(day,[]);days.get(day).push(c);}
 // Equity sessions start at their observed opening bar (including DST), not UTC midnight.
 return [...days.values()].flatMap(rows=>{const groups=new Map(),start=rows[0].time;for(const c of rows){const key=start+Math.floor((c.time-start)/14400)*14400;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);}return [...groups].flatMap(([time,bars])=>{
  if(bars.some((b,i)=>b.time!==time+i*3600))return [];
  return [{time,open:bars[0].open,high:Math.max(...bars.map(c=>c.high)),low:Math.min(...bars.map(c=>c.low)),close:bars.at(-1).close,volume:bars.every(c=>Number.isFinite(c.volume))?bars.reduce((n,c)=>n+c.volume,0):undefined}];
 });});
}
export async function getIntradayCandles(id,type,interval){
 if(!['15m','4h'].includes(interval))throw new Error('Unsupported interval');
 const key=`${type}:${id}:${interval}`,hit=cache.get(key);if(hit&&hit.expires>Date.now())return hit.data;
 return once(key,async()=>{
  let result;
  if(type==='crypto'){try{result=await getExchangeCandles(id,interval);}catch{/* An exact Yahoo identity can cover assets not listed at these exchanges. */}}
  if(!result){
   const symbol=type==='crypto'?await resolveYahooCrypto(id):id;if(!symbol)throw new Error('No verified intraday identity');
   const {data}=await axios.get(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`,{params:{interval:interval==='4h'?'60m':'15m',range:interval==='4h'?'3mo':'5d',includePrePost:false},headers:{'User-Agent':'Mozilla/5.0 (WaStake)'},timeout:12000});
   const r=data.chart?.result?.[0],q=r?.indicators?.quote?.[0];if(!q)throw new Error('Intraday source unavailable');
   const session=['EQUITY','ETF','MUTUALFUND','INDEX'].includes(r.meta?.instrumentType);
   let candles=yahooTimedBars((r.timestamp??[]).map((time,i)=>({time,open:q.open?.[i],high:q.high?.[i],low:q.low?.[i],close:q.close?.[i],volume:q.volume?.[i]})),interval==='4h'?3600:900,session);
   if(interval==='4h')candles=session?sessionFourHours(candles):aggregateHours(candles);
   if(candles.length<2)throw new Error('Insufficient observed intraday candles');
   result={candles,source:'Yahoo Finance',currency:r.meta?.currency??null,interval,intervalSeconds:interval==='4h'?14400:900,retrievedAt:new Date().toISOString()};
  }
  cache.set(key,{data:result,expires:Date.now()+60000});return result;
 });
}
