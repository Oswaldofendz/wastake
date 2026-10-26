import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanCandles,significantLevels } from '../../frontend/src/utils/chartLevels.js';
import { dailyCandles } from '../src/services/dailyCandles.js';
import { currentSelection,marketStats,ANALYSIS_DAYS } from '../../frontend/src/utils/marketConventions.js';
import { newsAssessment,formatQuote } from '../../frontend/src/utils/panoramaAnalysis.js';

// Synthetic fixtures only. No fixture is a production quote or market forecast.
const bar=(i,close,low=close-1,high=close+1)=>({time:(i+1)*86400,open:close,close,high,low});
const waves=(n=100)=>Array.from({length:n},(_,i)=>bar(i,100+Math.sin(i*Math.PI/10)*8));
test('quote formatting preserves small nonzero prices and forex precision without inventing USD',()=>{
  assert.equal(formatQuote(1.123456,'USD','en',5),'$1.12346');
  assert.ok(formatQuote(.0000000123,'USD','en').includes('0.0000000123'));
  assert.equal(formatQuote(12.3,null,'en'),'12.3');
});
test('news presentation preserves an assessed low impact even if a headline says crash, and missing is not neutral',()=>{
  assert.deepEqual(newsAssessment({title:'A crash was avoided',impact:'low',sentiment:'positive',analysisStatus:'contextual'}),{impact:'low',sentiment:'positive'});
  assert.deepEqual(newsAssessment({impact:'high',sentiment:'neutral',analysisStatus:'unavailable'}),{impact:null,sentiment:null});
  assert.deepEqual(newsAssessment({}),{impact:null,sentiment:null});
});
test('a broken support does not reactivate merely because price recovers',()=>{
  const input=[...waves(),bar(100,75),...Array.from({length:8},(_,j)=>bar(101+j,100))];
  assert.ok(!significantLevels(input).some(l=>l.kind==='support'&&Math.abs(l.price-91)<1));
});
test('a broken resistance is retired while an unclosed wick alone does not invalidate support',()=>{
  const broken=[...waves(),bar(100,130),...Array.from({length:8},(_,j)=>bar(101+j,100))];
  assert.ok(!significantLevels(broken).some(l=>l.kind==='resistance'&&Math.abs(l.price-109)<1));
  const wick=[...waves(),bar(100,100,70,101),...Array.from({length:8},(_,j)=>bar(101+j,100))];
  assert.ok(significantLevels(wick).some(l=>l.kind==='support'&&Math.abs(l.price-91)<1));
});
test('a former support area can become resistance only after a new confirmed rejection',()=>{
  const input=[...waves(),...[75,77,80,84,87,89,87,85,83,81,80].map((p,j)=>bar(100+j,p))];
  const resistance=significantLevels(input).find(l=>l.kind==='resistance');
  assert.ok(resistance);assert.equal(resistance.price,90);assert.equal(resistance.confirmedAt,input.at(-1).time);
  assert.ok(!significantLevels(input).some(l=>l.kind==='support'&&Math.abs(l.price-91)<1));
});
test('equal-high plateaus count once per independent swing instead of disappearing or double counting',()=>{
  const shape=[100,102,104,106,108,108,106,104,102,100,98,98,100,102];
  const input=Array.from({length:80},(_,i)=>bar(i,shape[i%shape.length]));
  const level=significantLevels(input,2).find(l=>l.kind==='resistance');
  assert.ok(level);assert.equal(level.price,109);assert.ok(level.touches>=2&&level.touches<=6);
});
test('today cannot supply the fifth confirmation bar and future bars cannot influence levels',()=>{
  const input=waves(21),now=input.at(-1).time*1000+12*3600000;
  assert.ok(!significantLevels(input,5,now).some(l=>l.kind==='support'&&Math.abs(l.price-91)<1));
  assert.ok(significantLevels(input,5,now+86400000).some(l=>l.kind==='support'&&Math.abs(l.price-91)<1));
  assert.deepEqual(significantLevels([...input,bar(22,1000)],5,now),significantLevels(input,5,now));
});
test('daily normalization preserves observed OHLC and a bad duplicate cannot erase a good bar',()=>{
  const input=[bar(1,10,8,12),{time:180000,open:11,high:15,low:9,close:13,volume:4},{...bar(1,10),high:1},null];
  assert.deepEqual(cleanCandles(input),dailyCandles(input));
  assert.equal(cleanCandles(input).length,1);assert.equal(cleanCandles(input)[0].open,10);assert.equal(cleanCandles(input)[0].high,15);assert.equal(cleanCandles(input)[0].close,13);
});
test('empty or unknown market changes never become a zero average and statistics use their provided scope',()=>{
  assert.equal(marketStats([]).avgChange,null);
  const a={id:'A',price:10,change24h:4},b={id:'B',price:20,change24h:null},c={id:'C',price:30,change24h:0};
  assert.deepEqual(marketStats([a,b,c]),{total:3,known:2,missing:1,gainers:1,losers:0,unchanged:1,avgChange:2});
  assert.equal(marketStats([a]).avgChange,4);assert.equal(marketStats([b]).avgChange,null);
});
test('selected catalog quotes refresh without crossing asset classes; all technical views share a horizon',()=>{
  const selected={id:'ABC',type:'stock',price:10},latest={...selected,price:12};
  assert.equal(currentSelection(selected,[latest]).price,12);
  assert.equal(currentSelection(selected,[{...latest,type:'crypto'}]),selected);
  assert.equal(ANALYSIS_DAYS,365);
});
