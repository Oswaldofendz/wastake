import {completedDailyCandles} from '../src/services/dailyCandles.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {ATR,ADX,Stochastic} from 'technicalindicators';
import {atrAdxPoints,stochasticPoints,obvPoints,vwapPoints,fairValueGaps} from '../../frontend/src/utils/advancedChartMath.js';
import {requestedTools,executeTools,validateToolPlan} from '../src/services/chartAgentTools.js';
import {snapshotFromCandles,ruleReading} from '../src/services/chartAgentService.js';
const bars=Array.from({length:100},(_,i)=>{const close=100+i*.1+Math.sin(i/3)*3;return {time:1700000100+i*900,open:close-.5,high:close+2,low:close-2,close,volume:100+i};});
test('ATR, ADX and stochastic agree with the numerical library on observed bars',()=>{
 const input={high:bars.map(b=>b.high),low:bars.map(b=>b.low),close:bars.map(b=>b.close),period:14};
 const data=atrAdxPoints(bars),atr=ATR.calculate(input).at(-1),adx=ADX.calculate(input).at(-1),stoch=Stochastic.calculate({...input,signalPeriod:3}).at(-1),mine=stochasticPoints(bars).at(-1);
 assert.ok(Math.abs(data.atr.at(-1).value-atr)<1e-9);assert.ok(Math.abs(data.adx.at(-1).value-adx.adx)<1e-9);assert.ok(Math.abs(data.adx.at(-1).pdi-adx.pdi)<1e-9);
 assert.ok(Math.abs(mine.value-stoch.k)<1e-9);assert.ok(Math.abs(mine.signal-stoch.d)<1e-9);
 assert.equal(stochasticPoints(bars.map(b=>({...b,open:100,high:100,low:100,close:100}))).length,0);
});
test('volume indicators never substitute missing volume and VWAP resets at the observed UTC day',()=>{
 const day=1700006400,b=[{time:day,high:12,low:9,close:9,volume:2},{time:day+900,high:15,low:9,close:12,volume:3},{time:day+86400,high:30,low:30,close:30,volume:1}];
 assert.deepEqual(vwapPoints(b,900).map(p=>p.value),[10,11.2,30]);assert.deepEqual(obvPoints(b).map(p=>p.value),[0,3,4]);
 assert.deepEqual(obvPoints([{...b[0],volume:undefined},b[1]]),[]);assert.deepEqual(vwapPoints(b,86400),[]);
 assert.equal(vwapPoints([b[0],{...b[1],time:day+2700}],900).length,1);
});
test('FVGs require displacement, preserve only unfilled space and retire at the far-edge wick',()=>{
 const input=Array.from({length:38},(_,i)=>({time:1700000100+i*900,open:100,high:101,low:99,close:100,volume:1}));
 input[36]={...input[36],open:100,close:108,high:109,low:100};input[37]={...input[37],open:108,close:109,high:110,low:107};
 const z=fairValueGaps(input,900).find(z=>z.formedAt===input[37].time);assert.ok(z);assert.equal(z.low,101);assert.equal(z.high,107);
 const partial=[...input,{time:input.at(-1).time+900,open:108,high:110,low:104,close:109,volume:1}];
 assert.equal(fairValueGaps(partial,900).find(z=>z.formedAt===input[37].time)?.high,104);
 const filled=[...partial,{time:partial.at(-1).time+900,open:105,high:106,low:100,close:102,volume:1}];assert.equal(fairValueGaps(filled,900).some(z=>z.formedAt===input[37].time),false);
 const missing=input.map((b,i)=>i===36?{...b,time:b.time-300}:b);assert.equal(fairValueGaps(missing,900).some(z=>z.formedAt===input[37].time),false);
});
test('imbalance requests create auditable FVG tools, while order-book requests cannot fake order flow',()=>{
 assert.deepEqual(requestedTools('imbalance'),[{name:'draw',drawing:'fvg'}]);assert.deepEqual(requestedTools('Quita FVG'),[{name:'removeFvg'}]);assert.deepEqual(requestedTools('No muestres imbalance'),[]);
 assert.deepEqual(requestedTools('order book imbalance'),[]);
 const snap=snapshotFromCandles(bars,{id:'fixture',type:'crypto',interval:'15m',source:'fixture',currency:'USD'},(bars.at(-1).time+900)*1000);
 assert.equal(ruleReading(snap,'imbalance','es').sections[0].title,'FVG · imbalance');assert.ok(ruleReading(snap,'imbalance','es').sections[0].keys.includes('fvgCount'));
 assert.equal(ruleReading(snap,'order book imbalance','es').sections[0].keys.length,0);
 assert.ok(validateToolPlan([{name:'indicator',indicator:'adx',enabled:true}]).length);
 const result=executeTools({...snap,facts:{...snap.facts,vwap:null}},[{name:'indicator',indicator:'vwap',enabled:true}],{},'es');assert.equal(result.actions.length,0);assert.equal(result.partial,true);
});

test('daily technical views exclude the unfinished day while preserving source and currency',()=>{
 const now=Date.parse('2026-10-28T12:00:00Z'),data=[{time:Date.parse('2026-10-27T13:30:00Z')/1000,open:10,high:12,low:9,close:11},{time:Date.parse('2026-10-28T13:30:00Z')/1000,open:11,high:18,low:10,close:17}];data.source='fixture';data.currency='EUR';
 const closed=completedDailyCandles(data,now);assert.equal(closed.length,1);assert.equal(closed[0].close,11);assert.equal(closed.source,'fixture');assert.equal(closed.currency,'EUR');
});


test('news reaction uses completed daily closes and the earliest close at least 24h later',async()=>{
 const {reactionAfterArticle}=await import('../../frontend/src/utils/newsReaction.js');
 const day=Date.UTC(2026,9,1)/1000;
 const candles=[100,110,121,130].map((close,i)=>({time:day+i*86400,close}));
 const article={pubDate:new Date((day+86400+43200)*1000).toISOString()};
 // Published halfway through day two: baseline is day one's close; first eligible close is day three.
 assert.ok(Math.abs(reactionAfterArticle(article,candles,(day+4*86400)*1000)-21)<1e-9);
 assert.equal(reactionAfterArticle(article,candles,(day+2*86400+43200)*1000),null);
 assert.equal(reactionAfterArticle({pubDate:'invalid'},candles),null);
});
