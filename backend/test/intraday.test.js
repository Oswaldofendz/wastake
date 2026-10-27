import test from 'node:test';import assert from 'node:assert/strict';
import {timedCandles} from '../../frontend/src/utils/timedCandles.js';
import {significantLevels} from '../../frontend/src/utils/chartLevels.js';
import {sessionFourHours,yahooTimedBars} from '../src/services/intradayService.js';
import {getExchangeCandles} from '../src/services/publicMarketSources.js';
import axios from 'axios';
test('intraday normalization keeps all observed candles in a day instead of silently turning them into daily data',()=>{
 const candles=Array.from({length:50},(_,i)=>({time:1700000100+i*900,open:100,high:102,low:99,close:101}));
 assert.equal(timedCandles(candles).length,50);assert.equal(timedCandles([...candles,{...candles[0],low:-1}]).length,50);
});
test('Yahoo appended quote ticks cannot masquerade as extra intraday candles',()=>{
 const start=Date.parse('2026-10-27T13:30Z')/1000;
 const rows=[{time:start,open:10,high:12,low:9,close:11,volume:50},{time:start+900,open:11,high:13,low:10,close:12,volume:30},{time:start+1010,open:12,high:12,low:12,close:12,volume:0}];
 const data=yahooTimedBars(rows,900,true,Date.parse('2026-10-27T18:00Z'));
 assert.equal(data.length,2);assert.equal(data[1].time-data[0].time,900);
});
test('intraday levels cannot use an unfinished or future bar to confirm a swing',()=>{
 const start=1700000100,candles=Array.from({length:60},(_,i)=>{const p=100+Math.sin(i*Math.PI/10)*8;return {time:start+i*900,open:p,close:p,high:p+1,low:p-1};});
 const now=(candles.at(-1).time+450)*1000;
 const levels=significantLevels(candles,null,now,900);
 assert.ok(levels.length>0);assert.ok(levels.every(l=>l.confirmedAt+900<=now/1000));
 assert.deepEqual(significantLevels([...candles,{time:start+61*900,open:1000,close:1000,low:999,high:1001}],null,now,900),levels);
});
test('four-hour equity bars align with the observed session opening and preserve a shorter final session candle',()=>{
 const start=Date.parse('2026-10-26T13:30Z')/1000,rows=Array.from({length:7},(_,i)=>({time:start+i*3600,open:10+i,close:11+i,high:12+i,low:9+i,volume:2}));
 const bars=sessionFourHours(rows,Date.parse('2026-10-27T00:00Z'));
 assert.equal(bars.length,2);assert.equal(bars[0].time,start);assert.equal(bars[1].time,start+14400);assert.equal(bars[0].volume,8);assert.equal(bars[1].volume,6);assert.equal(bars[1].close,17);
 assert.equal(sessionFourHours(rows.filter((_,i)=>i!==1),Date.parse('2026-10-27T00:00Z')).length,1);
});
test('Kraken failure uses actual Coinbase OHLC without changing the requested interval',async()=>{
 const original=axios.get,now=Math.floor(Date.now()/900000)*900;
 axios.get=async url=>{if(url.includes('kraken'))throw new Error('simulated unavailable');return {data:[[now-900,8,15,10,12,4],[now,9,16,11,13,5]]};};
 try{const r=await getExchangeCandles('ethereum','15m');assert.equal(r.source,'Coinbase');assert.equal(r.interval,'15m');assert.equal(r.candles.length,2);assert.equal(r.candles[1].close,13);}finally{axios.get=original;}
});
