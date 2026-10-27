import test from 'node:test';
import assert from 'node:assert/strict';
import {MACD} from 'technicalindicators';
import {requestedTools,validateToolPlan,executeTools,fitTrend} from '../src/services/chartAgentTools.js';
import {snapshotFromCandles} from '../src/services/chartAgentService.js';
import {initialWorkspace,applyChartActions,macdPoints} from '../../frontend/src/utils/chartWorkspace.js';
import {validDrawing,drawingWithPoint,sharedPerformance} from '../../frontend/src/utils/chartDrawings.js';
import {marketLeaders} from '../../frontend/src/utils/discoveryHighlights.js';
import axios from 'axios';
import {getExchangeCandles} from '../src/services/publicMarketSources.js';

const candles=Array.from({length:100},(_,i)=>{const close=100+i/5+Math.sin(i/4)*4;return {time:1700000100+i*900,open:close-.5,high:close+2,low:close-2,close,volume:10+i};});
const snapshot=snapshotFromCandles(candles,{id:'observed-fixture',type:'crypto',interval:'15m'},(candles.at(-1).time+450)*1000);
test('a chart tool plan has no executable or arbitrary-coordinate operations',()=>{
 const context={drawings:[{id:'existing'}]};
 assert.deepEqual(validateToolPlan([{name:'eval',code:'fetch(secrets)'},{name:'remove',id:'not-existing'},{name:'indicator',indicator:'ema',period:500,enabled:true},{name:'compare',query:'https://example.com'},{name:'draw',drawing:'forecast'},{name:'draw',drawing:'trend',points:[{price:999999}]},{name:'remove',id:'existing'}],context),[{name:'draw',drawing:'trend'},{name:'remove',id:'existing'}]);
 assert.deepEqual(requestedTools('No dibujes Fibonacci'),[]);
 assert.deepEqual(requestedTools('Añade SMA 50'),[{name:'indicator',indicator:'sma',period:50,enabled:true}]);
 assert.deepEqual(requestedTools('Superpone Coinbase'),[{name:'compare',venue:'Coinbase'}]);
});
test('trend, channel, range and Fibonacci annotations are computed on completed observed candles',()=>{
 const result=executeTools(snapshot,['trend','channel','range','fib'].map(drawing=>({name:'draw',drawing})),{},'es');
 assert.equal(result.annotations.length,6);
 assert.ok(result.annotations.every(d=>validDrawing(d)&&d.reason.length>40&&d.snapshotId===snapshot.snapshotId&&d.points.every(p=>p.time<=snapshot.asOf)));
 const changed={...snapshot,candles:snapshot.candles.map((c,i)=>i===snapshot.candles.length-1?{...c,close:c.close*2,high:c.high*2}:c)};
 assert.deepEqual(executeTools(changed,[{name:'draw',drawing:'trend'}]).annotations[0].points,result.annotations[0].points);
 const linear=fitTrend(candles.map((c,i)=>({...c,close:50+2*i})));assert.ok(Math.abs(linear.last-(50+2*99))<1e-9);
});
test('manual edits are bounded, price-based and independently removable or undoable',()=>{
 const drawing=executeTools(snapshot,[{name:'draw',drawing:'trend'}]).annotations[0];
 const start=initialWorkspace();assert.equal(start.levels,false);assert.deepEqual(start.drawings,[]);
 const drawn=applyChartActions(start,[{type:'draw',drawings:[drawing,{kind:'eval'}]}]);assert.equal(drawn.drawings.length,1);
 assert.equal(drawingWithPoint(drawing,0,{time:drawing.points[0].time,price:-1}),drawing);
 const edited=drawingWithPoint(drawing,0,{time:drawing.points[0].time,price:110});assert.equal(edited.origin,'manual');assert.notEqual(edited,drawing);
 assert.equal(applyChartActions(drawn,[{type:'removeDrawing',id:drawing.id}]).drawings.length,0);
 assert.equal(drawn.drawings.length,1);
});
test('overlays normalize only simultaneous observed closes and keep real zero returns',()=>{
 const left=[{time:1,close:10},{time:2,close:15},{time:3,close:20}],right=[{time:2,close:30},{time:3,close:30},{time:4,close:60}];
 const pair=sharedPerformance(left,right);assert.equal(pair.from,2);assert.equal(pair.count,2);assert.equal(pair.left[0].value,0);assert.equal(pair.right[1].value,0);assert.ok(Math.abs(pair.left[1].value-100/3)<1e-9);
 assert.equal(sharedPerformance(left,[{time:8,close:50}]),null);
});
test('drawn MACD agrees with the indicator library rather than a second approximation',()=>{
 const expected=MACD.calculate({values:candles.map(c=>c.close),fastPeriod:12,slowPeriod:26,signalPeriod:9,SimpleMAOscillator:false,SimpleMASignal:false}).at(-1);
 const actual=macdPoints(candles);assert.ok(Math.abs(actual.line.at(-1).value-expected.MACD)<1e-9);assert.ok(Math.abs(actual.histogram.at(-1).value-expected.histogram)<1e-9);
});
test('all leader cards have five eligible rows when five observed assets exist',()=>{
 const rows=Array.from({length:8},(_,i)=>({id:String(i),type:'crypto',currency:'USD',marketCap:100-i,price:1,change24h:i+1}));
 const groups=marketLeaders(rows);assert.equal(groups.cryptoCap.length,5);assert.equal(groups.cryptoGainers.length,5);assert.equal(groups.stockCap.length,0);
});
test('an explicitly selected exchange never silently borrows candles from a different exchange',async()=>{
 const original=axios.get,calls=[];axios.get=async url=>{calls.push(url);throw new Error('Fixture: source unavailable');};
 try{await assert.rejects(()=>getExchangeCandles('bitcoin','15m','Coinbase'));assert.equal(calls.length,1);assert.ok(calls[0].includes('api.exchange.coinbase.com'));await assert.rejects(()=>getExchangeCandles('bitcoin','15m','unknown'));}
 finally{axios.get=original;}
});
