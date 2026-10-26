import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeNews } from '../../frontend/src/utils/panoramaAnalysis.js';

test('news relevance cannot invert sentiment', () => {
  const positive = Array.from({length:3}, () => ({sentiment:'positive', impact:'high'}));
  assert.equal(summarizeNews(positive).tone, 'positive');
  assert.equal(summarizeNews(positive.map(a=>({...a, impact:'low'}))).tone, 'positive');
  assert.equal(summarizeNews([{sentiment:'negative',impact:'low'}]).tone,'negative');
});
test('unknown news tone is not counted as neutral and opposing tones remain mixed', () => {
  assert.equal(summarizeNews([{impact:'high'}]).tone,'unavailable');
  const result=summarizeNews([{sentiment:'positive'}, {sentiment:'negative'}, {sentiment:'invalid'}]);
  assert.equal(result.tone,'mixed');
  assert.equal(result.classified,2);
  assert.equal(result.counts.neutral,0);
});
