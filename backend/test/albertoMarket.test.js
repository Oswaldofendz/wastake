import test from 'node:test';
import assert from 'node:assert/strict';
import {ALL_ASSETS} from '../../frontend/src/data/assetCatalog.js';
import {marketQuestion,marketReply} from '../../frontend/src/utils/albertoMarket.js';
import {homeCopy} from '../../frontend/src/i18n/homeCopy.js';

const ask = text => marketQuestion(text,ALL_ASSETS);
const bitcoin = ALL_ASSETS.find(asset=>asset.id==='bitcoin');
const t = (key,params = {}) => (homeCopy.es[key] ?? key).replace(/{{(\w+)}}/g,(_,name)=>params[name]);
const now = Date.UTC(2026,10,10,16);
const meta = {lastPrice:75000,currency:'USD',source:'Yahoo Finance',to:Date.UTC(2026,10,9)/1000};

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

test('Alberto uses source, date and computed indicators from the same daily close',()=>{
  const indicators={ema20:{current:76000},ema50:{current:78000},rsi:{current:43.5}};
  const reply=marketReply(bitcoin,{meta,indicators},null,'es',t,{now});
  assert.match(reply,/Bitcoin \(BTC\).*cierre diario.*75/);
  assert.match(reply,/Yahoo Finance.*9 nov.*UTC/);
  assert.match(reply,/por debajo de las medias/);
  assert.match(reply,/RSI \(14\) de 43,5/);
});

test('Alberto omits open candles, undated quotes and unavailable indicators',()=>{
  const analysis={meta:{...meta,to:Date.UTC(2026,10,10)/1000},indicators:{rsi:{current:70}}};
  const quote={price:76000,source:'CoinGecko',currency:'USD'};
  const missing=marketReply(bitcoin,analysis,quote,'es',t,{now});
  assert.match(missing,/no pude verificar/);
  assert.doesNotMatch(missing,/76|RSI/);
  const dated={...quote,quoteAsOf:new Date(now-60_000).toISOString()};
  const last=marketReply(bitcoin,analysis,dated,'es',t,{now,priceOnly:true});
  assert.match(last,/cotización disponible.*76/);
  assert.match(last,/CoinGecko/);
  assert.doesNotMatch(last,/RSI|no pude verificar/);
});
