import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeFutures,parseFuturesCandles,futuresInstruments} from '../../frontend/src/utils/futuresAnalysis.js';
import {displayPriceUnit} from '../../frontend/src/utils/panoramaAnalysis.js';
import {reviewHomeAssistantReply} from '../src/services/homeAssistantAnswer.js';
import {helpTopic} from '../../frontend/src/utils/albertoHelp.js';

const hour=3600, start=1760000400;
const bars=Array.from({length:75},(_,i)=>{
  const wave=6*Math.sin(i*Math.PI/5);
  return {time:start+i*hour,open:100+wave,close:100+wave,low:99+wave,high:101+wave,volume:100};
});
const now=(start+75*hour)*1000;
const instrument=futuresInstruments[0];

test('Kraken parser accepts decimal strings and preserves unknown and zero volume distinctly',()=>{
  const row={time:start*1000,open:'100',close:'101',low:'99',high:'103'};
  const parsed=parseFuturesCandles({candles:[row,{...row,time:row.time+hour*1000,volume:'0'},{...row,time:row.time+hour*2000,volume:'12.2'},{...row,time:row.time+hour*3000,open:''}]});
  assert.deepEqual(parsed.map(({volume})=>volume),[null,0,12.2]);
  assert.equal(parsed[0].time,start);
});

test('futures excludes open candles, requires two touches, and measures volume against preceding 20 candles',()=>{
  const history=[...bars.slice(0,-1),{...bars.at(-1),volume:160},{time:now/1000,open:200,close:205,low:195,high:207,volume:100000}];
  const result=analyzeFutures(history,instrument,'1h',now);
  assert.equal(result.close,bars.at(-1).close);
  assert.equal(result.volumeRatio,1.6);
  assert.ok(result.scenarios.length>0);
  assert.ok(result.scenarios.every(zone=>zone.touches>=2&&zone.low<zone.high&&zone.status==='watch'));
});

test('futures treats missing data, gaps and stale signals conservatively',()=>{
  assert.equal(analyzeFutures(bars.slice(0,49),instrument,'1h',now),null);
  assert.equal(analyzeFutures(bars,futuresInstruments.at(-1),'4h',now),null);
  const missing=bars.map((bar,i)=>i===70?{...bar,volume:null}:bar);
  assert.equal(analyzeFutures(missing,instrument,'1h',now).volumeRatio,null);
  const gap=analyzeFutures(bars.filter((_,i)=>i!==65),instrument,'1h',now);
  assert.equal(gap.hasGap,true);
  assert.ok(gap.scenarios.every(zone=>zone.status==='unavailable'));
  assert.equal(analyzeFutures(bars,instrument,'1h',now+4*hour*1000).stale,true);
});

test('Alberto recognizes natural-language questions and preserves index versus ETF units',()=>{
  assert.equal(helpTopic('¿Qué es una media móvil?'),'trend');
  assert.equal(helpTopic('O que significa volatilidade?'),'atr');
  assert.equal(helpTopic('How does funding work?'),'futures');
  assert.equal(helpTopic('¿Qué diferencia hay entre una orden de mercado y una orden limitada?'),'orders');
  assert.equal(helpTopic('¿Puedes mostrarme otro ejemplo?'),null);
  assert.equal(displayPriceUnit({type:'index'},'USD'),'pts');
  assert.equal(displayPriceUnit({type:'etf'},'USD'),'USD');
});

test('Alberto blocks invented execution features and keeps generic education',()=>{
  const falseClaim='En WaStake, una **orden de mercado** se ejecuta de inmediato. Ambas se gestionan desde la sección de Trading.';
  assert.match(reviewHomeAssistantReply(falseClaim,'es'),/órdenes se gestionan en el bróker/);
  assert.equal(reviewHomeAssistantReply('Un **RSI** mide impulso.','es'),'Un RSI mide impulso.');
  assert.equal(reviewHomeAssistantReply('A limit order sets a price limit.','en'),'A limit order sets a price limit.');
});
