import test from 'node:test';
import assert from 'node:assert/strict';
import {CCI,MFI,WilliamsR,ROC} from 'technicalindicators';
import {cciPoints,mfiPoints,williamsPoints,rocPoints,cmfPoints,donchianPoints,keltnerPoints,liquidityZones} from '../../frontend/src/utils/expandedChartMath.js';
import {candleEnd,calendarBarTime,CHART_INTERVALS} from '../../frontend/src/utils/chartIntervals.js';
import {requestedTools,executeTools} from '../src/services/chartAgentTools.js';
import {chartActions,snapshotFromCandles,validAgentInsight} from '../src/services/chartAgentService.js';
import {createNewsSnapshotService} from '../src/services/newsSnapshotService.js';
const bars=Array.from({length:100},(_,i)=>{const close=100+i*.1+Math.sin(i/3)*3;return {time:1700000100+i*900,open:close-.5,high:close+2,low:close-2,close,volume:100+i};});
test('CCI, MFI, Williams and ROC match independent numerical implementations',()=>{
 const input={high:bars.map(b=>b.high),low:bars.map(b=>b.low),close:bars.map(b=>b.close),volume:bars.map(b=>b.volume)};
 assert.ok(Math.abs(cciPoints(bars).at(-1).value-CCI.calculate({...input,period:20}).at(-1))<1e-8);
 assert.ok(Math.abs(mfiPoints(bars).at(-1).value-MFI.calculate({...input,period:14}).at(-1))<.011);
 assert.ok(Math.abs(williamsPoints(bars).at(-1).value-WilliamsR.calculate({...input,period:14}).at(-1))<1e-8);
 assert.ok(Math.abs(rocPoints(bars).at(-1).value-ROC.calculate({values:input.close,period:12}).at(-1))<1e-8);
 const bad=bars.map((b,i)=>i===5?{...b,volume:undefined}:b);assert.deepEqual(mfiPoints(bad),[]);assert.deepEqual(cmfPoints(bad),[]);
 const channel=donchianPoints(bars).at(-1);assert.ok(channel.upper>=channel.middle&&channel.middle>=channel.lower);assert.ok(keltnerPoints(bars).at(-1).upper>keltnerPoints(bars).at(-1).lower);
});
test('liquidity proxy needs repeated independent confirmed swings and retires a traversed zone',()=>{
 const b=Array.from({length:55},(_,i)=>({time:1700000100+i*900,open:100,close:100,high:101,low:99,volume:100}));b[20].high=110;b[36].high=110;
 const zones=liquidityZones(b);assert.ok(zones.some(z=>z.kind==='high'&&z.touches===2));
 const crossed=[...b,{...b.at(-1),time:b.at(-1).time+900,high:112}];assert.equal(liquidityZones(crossed).some(z=>z.kind==='high'),false);
 const snap={candles:b,asOf:b.at(-1).time,snapshotId:'test',facts:{},intervalSeconds:900};
 assert.deepEqual(requestedTools('Dibuja zonas de liquidez'),[{name:'draw',drawing:'liquidity'}]);
 const result=executeTools(snap,requestedTools('liquidez'));assert.ok(result.annotations.length>0);assert.ok(result.annotations.every(a=>a.reason.includes('no son órdenes')));
 assert.deepEqual(requestedTools('No dibujes liquidez'),[]);assert.deepEqual(requestedTools('order book liquidity'),[]);
 assert.equal(requestedTools('Muestra CCI')[0].indicator,'cci');
});
test('expanded intervals use real calendar month/week boundaries and incomplete bars never enter facts',()=>{
 assert.equal(CHART_INTERVALS.length,9);assert.equal(chartActions('pon velas de 5 minutos')[0].value,'5m');
 const start=Date.UTC(2026,1,1)/1000;assert.equal(candleEnd(start,'1mo'),Date.UTC(2026,2,1)/1000);
 assert.equal(calendarBarTime(Date.UTC(2026,9,28,14)/1000,'1w'),Date.UTC(2026,9,26)/1000);
 const weekly=bars.slice(0,5).map((b,i)=>({...b,time:Date.UTC(2026,8,28+i*7)/1000}));
 const s=snapshotFromCandles(weekly,{id:'test',type:'stock',interval:'1w'},Date.UTC(2026,9,28));assert.equal(s.closedCount,4);
 const exchangeWeeks=bars.slice(0,3).map((b,i)=>({...b,time:Date.UTC(2026,9,8+i*7)/1000}));const k=snapshotFromCandles(exchangeWeeks,{id:'bitcoin',type:'crypto',interval:'1w',source:'Kraken'},Date.UTC(2026,9,28));assert.equal(k.closedCount,2);assert.equal(k.asOf,Date.UTC(2026,9,15)/1000);
 assert.ok(validAgentInsight({explanation:'El RSI de the asset está entre sus extremos habituales y presenta una lectura mixta.',facts:['rsi']},'es',{rsi:45}).explanation.includes('el activo'));
});
test('news snapshots return headlines while analysis runs, then reuse the dated analysis',async()=>{
 let finish,reads=0,analyses=0;const pending=new Promise(r=>{finish=r;});
 const service=createNewsSnapshotService({read:async()=>{reads++;return [{title:'Test headline',link:'https://example.com/a',pubDate:'2026-10-28T10:00:00Z',snippet:'Source excerpt'}];},analyze:async news=>{analyses++;await pending;return {news:news.map(a=>({...a,analysisProvider:'test'})),aiStatus:'ready',analyzedCount:1};}});
 const target={id:'AAPL',type:'stock',aliases:['Apple']},first=await service(target);assert.equal(first.news.length,1);assert.equal(first.revalidating,true);assert.equal(first.analyzedCount,0);
 await service(target);assert.equal(reads,1);assert.equal(analyses,1);finish();await new Promise(r=>setImmediate(r));const ready=await service(target);assert.equal(ready.revalidating,false);assert.equal(ready.analyzedCount,1);assert.ok(ready.analysisAsOf);
});
test('stale news is returned immediately while a refresh is pending, without mixing assets or languages',async()=>{
 let instant=1000000,block=false,release;const pending=new Promise(r=>{release=r;});
 const service=createNewsSnapshotService({now:()=>instant,read:async id=>{if(block)await pending;return [{title:id,link:'https://example.com/'+id,pubDate:'2026-10-28T10:00:00Z'}];},analyze:async news=>({news,aiStatus:'unavailable',analyzedCount:0})});
 const a={id:'AAPL',type:'stock',aliases:[]};await service(a,'es',false);instant+=121000;block=true;const cached=await service(a,'es',false);assert.equal(cached.news[0].title,'AAPL');assert.equal(cached.stale,true);assert.equal(cached.revalidating,true);release();await new Promise(r=>setImmediate(r));assert.equal((await service({...a,id:'MSFT'},'en',false)).news[0].title,'MSFT');
});
