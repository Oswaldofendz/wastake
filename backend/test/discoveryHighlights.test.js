import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {marketLeaders,importantArticles} from '../../frontend/src/utils/discoveryHighlights.js';
import {significantLevels} from '../../frontend/src/utils/chartLevels.js';

test('catalogue leaders exclude missing caps, non-USD company caps, yield indices and negative movers',()=>{
  const rows=[{id:'A',type:'stock',currency:'USD',marketCap:200,price:5,change24h:3},{id:'B',type:'stock',currency:'EUR',marketCap:900,price:4,change24h:-1},{id:'C',type:'crypto',marketCap:100,price:1,change24h:5},{id:'D',type:'crypto',marketCap:null,price:2,change24h:null},{id:'Y',type:'index',price:4,change24h:20}];
  const result=marketLeaders([...rows,rows[0]]);
  assert.deepEqual(result.stockCap.map(a=>a.id),['A']);
  assert.deepEqual(result.cryptoCap.map(a=>a.id),['C']);
  assert.deepEqual(result.gainers.map(a=>a.id),['C','A']);
  assert.deepEqual(result.cryptoGainers.map(a=>a.id),['C']);
  assert.deepEqual(marketLeaders([]).gainers,[]);
});
test('news ranking uses contextual evidence, never title rules as verified relevance; excludes future, old and duplicate stories',()=>{
  const now=Date.parse('2026-10-27T18:00:00Z');
  const article=(title,days,extra={})=>({title,pubDate:new Date(now-days*86400000).toISOString(),link:'https://example.test/'+title,...extra});
  const contextual={relevance:70,analysisProvider:'test',summary:'Summary',mechanism:'Reason',watch:'Watch'};
  const data=[article('recent',0),article('context',1,contextual),article('keyword',2,{relevance:100}),article('future',-1,contextual),article('old',31,contextual),article('recent',0),article('bad',0,{link:'javascript:alert(1)'})];
  assert.deepEqual(importantArticles(data,now).map(a=>a.title),['context','recent','keyword']);
});
test('NVDA public-candle regression detects the nearer confirmed rejection and plots the centre inside its observed zone',()=>{
  const {candles}=JSON.parse(fs.readFileSync(new URL('./fixtures/nvda-levels-2026-10-27.json',import.meta.url)));
  const cutoff=Date.parse('2026-10-27T18:00:00Z');
  const levels=significantLevels(candles,null,cutoff);
  const resistance=levels.find(l=>l.kind==='resistance');
  assert.ok(Math.abs(resistance.price-222.19)<.01);
  assert.equal(resistance.confirmedAt,Date.parse('2026-10-23T00:00:00Z')/1000);
  assert.ok(levels.every(l=>l.low<=l.price&&l.price<=l.high&&l.confirmedAt<Math.floor(cutoff/86400000)*86400));
  const unchanged=candles.map((c,i)=>i===candles.length-1?{...c,high:c.high+10}:c);
  assert.deepEqual(significantLevels(unchanged,null,cutoff),levels);
});
