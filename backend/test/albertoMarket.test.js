import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_ASSETS} from '../../frontend/src/data/assetCatalog.js';
import {marketQuestion,mentionedMarkets} from '../../frontend/src/utils/albertoMarket.js';
import {requestedMarkets} from '../src/services/homeAssistantAnswer.js';

const ask = text => marketQuestion(text,ALL_ASSETS);

test('Alberto sends the reported question and equivalents to the right instrument',()=>{
  for (const question of ['como ves a bitcoin?','¿Cómo está BTC hoy?','How is Bitcoin doing?','Como vês o Bitcoin?','BTC-USD']) {
    assert.equal(ask(question)?.matches[0]?.id,'bitcoin',question);
  }
  assert.equal(ask('¿A cuánto cotiza AAPL?')?.matches[0]?.id,'AAPL');
  assert.equal(ask('¿A cuánto cotiza AAPL?')?.price,true);
  assert.equal(ask('How is the market?'),null);
  assert.equal(ask('¿Qué es una media móvil?'),null);
  assert.equal(ask('hi'),null);
});

test('Alberto identifies assets inside open questions and comparisons',()=>{
  const compare = mentionedMarkets('Compara el impulso de Bitcoin y ETH con el RSI',ALL_ASSETS);
  assert.deepEqual(compare.map(asset=>asset.id),['bitcoin','ethereum']);
  assert.deepEqual(mentionedMarkets('¿Qué mide el RSI y cómo uso una orden limitada?',ALL_ASSETS),[]);
});

test('Alberto derives the data adapter and discards client-supplied prices',()=>{
  const markets=requestedMarkets([
    {id:'bitcoin',type:'crypto',price:1,analysisType:'stock'},
    {id:'BTC-USD',type:'crypto'},
    {id:'AAPL',type:'stock'}
  ]);
  assert.deepEqual(markets,[
    {id:'bitcoin',type:'crypto',analysisType:'crypto'},
    {id:'BTC-USD',type:'crypto',analysisType:'stock'}
  ]);
  assert.deepEqual(requestedMarkets([{id:'../health',type:'stock'}]),[]);
});
