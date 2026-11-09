import assert from 'node:assert/strict';
import test from 'node:test';
import {homeChart,homeCryptoSnapshot,homeSentiment} from '../../frontend/src/utils/homePulse.js';
import {advanceBull,jumpBull,newRun,runnerX} from '../../frontend/src/utils/bullRun.js';

const now = Date.UTC(2026,10,9,12);
const day = Math.floor(now/86400000)*86400;
const candle = (offset,close) => ({time:day+offset*86400,open:close,close,low:close,high:close});

test('home sparkline measures chronological closes and excludes the current UTC day',() => {
  const chart = homeChart([candle(0,200),candle(-1,105),candle(-2,100)],now);
  assert.equal(chart.close,105);
  assert.equal(chart.date,(day-86400)*1000);
  assert.equal(chart.count,2);
  assert.ok(Math.abs(chart.change-5)<1e-10);
  assert.ok(chart.points[1][1]<chart.points[0][1]);
  assert.equal(homeChart([candle(-1,105),candle(0,200)],now),null);
  assert.equal(homeChart(Array.from({length:35},(_,i)=>candle(-i-1,100)),now).count,30);
});

test('sentiment preserves valid zero and rejects missing, impossible and future observations',() => {
  assert.deepEqual(homeSentiment({value:'0',timestamp:day},now),{score:0,at:day*1000});
  for (const value of [null,'',-1,101,50.5]) assert.equal(homeSentiment({value,timestamp:day},now),null);
  assert.equal(homeSentiment({value:50,timestamp:day+86400},now),null);
});

test('bull jumps at most twice until landing and can duck a beam',() => {
  let run = newRun();
  run = advanceBull(jumpBull(run),.02);
  run = jumpBull(run);
  assert.equal(jumpBull(run),run);
  for (let i=0;i<70;i++) run = advanceBull(run,.015);
  assert.equal(run.jumps,0);
  const hazard = {...newRun(),items:[{x:runnerX+2,id:0,kind:'beam'}]};
  assert.equal(advanceBull(hazard,.01).result,'over');
  assert.equal(advanceBull({...hazard,duck:true},.01).result,null);
});

test('bull can collect coins and catch the bird, and only levels mode ends at 900 m',() => {
  const coin = {x:runnerX+2,id:0,kind:'coin'};
  const bird = {x:runnerX+2,id:0,kind:'bird'};
  assert.equal(advanceBull({...newRun(),items:[coin]},.01).coins,1);
  assert.equal(advanceBull({...newRun(),height:64,items:[bird]},.01).catches,1);
  assert.equal(advanceBull({...newRun(),meters:899.9},.02).result,'won');
  assert.equal(advanceBull({...newRun('endless'),meters:899.9},.02).result,null);
});

test('catalogue fallback uses fresh USD data, counts coverage, and computes BTC share only within the sample',() => {
  const quote = (id, cap, volume, hours=0) => ({
    id,type:'crypto',currency:'USD',source:'CoinGecko',
    quoteAsOf:new Date(now-hours*3600000).toISOString(),marketCap:cap,volume24h:volume
  });
  const rows = [quote('bitcoin',60,12),quote('bitcoin',40,10,1),quote('ethereum',40,8),quote('old',50,15,25),quote('future',50,15,-1),
    {...quote('alt',20,2),currency:'EUR'},quote('unquoted',null,3)];
  assert.deepEqual(homeCryptoSnapshot(rows,now),{cap:100,capCount:2,volume:23,volumeCount:3,share:60});
  assert.equal(homeCryptoSnapshot([quote('bitcoin',10,5)],now).share,null);
});
