import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeNews, commonCloseComparison, formatQuote } from '../../frontend/src/utils/panoramaAnalysis.js';
import { createSingleFlight } from '../src/services/singleFlight.js';

test('news relevance cannot invert sentiment', () => {
  const positive = Array.from({length:3}, () => ({sentiment:'positive', impact:'high'}));
  assert.equal(summarizeNews(positive).tone, 'positive');
  assert.equal(summarizeNews(positive.map(a=>({...a, impact:'low'}))).tone, 'positive');
  assert.equal(summarizeNews([{sentiment:'negative',impact:'low'}]).tone,'negative');
});
test('unknown news tone is not counted as neutral and opposing tones remain mixed', () => {
  assert.equal(summarizeNews([{sentiment:'neutral',impact:'low',analysisStatus:'unavailable'}]).classified,0);
  assert.equal(summarizeNews([{impact:'high'}]).tone,'unavailable');
  const result=summarizeNews([{sentiment:'positive'}, {sentiment:'negative'}, {sentiment:'invalid'}]);
  assert.equal(result.tone,'mixed');
  assert.equal(result.classified,2);
  assert.equal(result.counts.neutral,0);
});

const bar = (day,close) => ({time:day*86400,open:close,high:close,low:close,close});
test('external asset comparison uses shared closes without any catalog lookup',()=>{
  const asset=[bar(10,100),bar(11,120),bar(12,90),bar(13,150)];
  const ref=[bar(10,200),bar(12,210),bar(13,999)];
  const result=commonCloseComparison(asset,ref,13*86_400_000);
  assert.equal(result.from,10*86400);assert.equal(result.to,12*86400);
  assert.ok(Math.abs(result.assetReturn+10)<1e-8);
  assert.ok(Math.abs(result.referenceReturn-5)<1e-8);
  assert.ok(Math.abs(result.difference+15)<1e-8);
});
test('unavailable history is pending while a genuine zero return stays zero',()=>{
  assert.equal(commonCloseComparison(null, null),null);
  assert.equal(commonCloseComparison([], [bar(10,100)],20*86_400_000),null);
  assert.equal(commonCloseComparison([bar(10,100)], [bar(10,200)],20*86_400_000),null);
  const flat=[bar(10,100),bar(11,100)];
  assert.equal(commonCloseComparison(flat,flat,20*86_400_000).assetReturn,0);
});

test('external prices preserve EUR and subunits instead of assuming dollars',()=>{
  assert.ok(formatQuote(100,'EUR','en').includes('€'));
  assert.ok(!formatQuote(100,'EUR','en').includes('$'));
  assert.equal(formatQuote(100,'GBp','en'),'100 GBp');
  assert.equal(formatQuote(null,'USD','en'),'—');
});

test('concurrent news requests share enrichment and a failed request can be retried',async()=>{
  const run=createSingleFlight();
  let calls=0;
  const task=async()=>{calls++;return ['headlines'];};
  const values=await Promise.all([run('BTC',task),run('BTC',task),run('BTC',task)]);
  assert.equal(calls,1);assert.deepEqual(values,[['headlines'],['headlines'],['headlines']]);
  await assert.rejects(run('failure',async()=>{throw new Error('quota');}));
  assert.equal(await run('failure',async()=>42),42);
});
