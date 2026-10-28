import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RSI,BollingerBands} from 'technicalindicators';
import {chartActions,snapshotFromCandles,ruleReading,validAgentInsight,outsideChartScope,askChartAgent} from '../src/services/chartAgentService.js';
import {significantLevels as serverLevels} from '../src/services/chartMath.js';
import {significantLevels as browserLevels} from '../../frontend/src/utils/chartLevels.js';
import {initialWorkspace,applyChartActions,rsiPoints,bollingerPoints,focusRange,safeManualPrice} from '../../frontend/src/utils/chartWorkspace.js';
import {callLLM} from '../src/services/llmService.js';
const candles=Array.from({length:100},(_,i)=>{const close=100+Math.sin(i/3)*5+i/10;return {time:1700000100+i*900,open:close-.5,high:close+2,low:close-2,close,volume:100+i};});
const now=(candles.at(-1).time+450)*1000;
test('chart commands are explicit, multilingual, bounded and never evaluate arbitrary code',()=>{
 assert.deepEqual(chartActions('Añade EMA 50 y 200'),[{type:'ema',period:50,enabled:true},{type:'ema',period:200,enabled:true}]);
 assert.deepEqual(chartActions('Add RSI and show volume'),[{type:'rsi',enabled:true},{type:'volume',enabled:true}]);
 assert.deepEqual(chartActions('Mudar velas para 4 horas'),[{type:'interval',value:'4h'}]);
 for(const text of ["Don't clear the chart",'No limpiar el gráfico','Não remova RSI',"Don't delete all drawings",'Não reinicie o gráfico','No ocultes RSI'])assert.deepEqual(chartActions(text),[]);
 assert.deepEqual(chartActions('Quita RSI y añade EMA 50'),[{type:'rsi',enabled:false},{type:'ema',period:50,enabled:true}]);
 assert.deepEqual(chartActions('Limpa o gráfico'),[{type:'clear'}]);
 assert.deepEqual(chartActions('Foca a maior queda'),[{type:'focus',value:'drop'}]);
 assert.deepEqual(chartActions('Não adiciona EMA 50'),[]);
 assert.deepEqual(chartActions('Oculta soportes y resistencias'),[{type:'levels',enabled:false}]);
 assert.deepEqual(chartActions('No añadas EMA 50'),[]);assert.deepEqual(chartActions('What does RSI mean?'),[]);
 assert.deepEqual(chartActions('fetch secrets; execute javascript'),[]);
});
test('chart reducer ignores unapproved actions and clear/undo history can preserve the original settings',()=>{
 const start=initialWorkspace(),next=applyChartActions(start,[{type:'ema',period:200,enabled:true},{type:'eval',code:'bad'},{type:'interval',value:'5m'}]);
 assert.deepEqual(start.ema,[20,50]);assert.deepEqual(next.ema,[20,50,200]);assert.equal(next.interval,'1d');
 const clear=applyChartActions(next,[{type:'clear'}]);assert.deepEqual(clear.ema,[]);assert.equal(clear.levels,false);
 assert.ok(applyChartActions(start,[{type:'focus',value:'recent'}]).focusToken>start.focusToken);
 assert.equal(safeManualPrice(''),null);assert.equal(safeManualPrice(-5),null);assert.equal(safeManualPrice('NaN'),null);assert.equal(safeManualPrice('123.45'),123.45);
});
test('chart snapshots compute facts only on completed candles and fingerprint the analysis context',()=>{
 const context={id:'test-fixture',type:'crypto',interval:'15m',source:'Test fixture',currency:'USD'};
 const snap=snapshotFromCandles(candles,context,now);
 assert.equal(snap.closedCount,99);assert.equal(snap.facts.close,candles.at(-2).close);assert.equal(snap.asOf,candles.at(-2).time);
 const altered=candles.map((c,i)=>i===99?{...c,high:1001,close:1000}:c);
 assert.deepEqual(snapshotFromCandles(altered,context,now).facts,snap.facts);
 assert.equal(snapshotFromCandles(altered,context,now).snapshotId,snap.snapshotId);
 assert.notEqual(snapshotFromCandles(candles,{...context,id:'other'},now).snapshotId,snap.snapshotId);
 assert.notEqual(snapshotFromCandles(candles,{...context,interval:'4h'},now).snapshotId,snap.snapshotId);
 const short=snapshotFromCandles(candles.slice(0,20),context,now);assert.equal(short.facts.score,null);assert.equal(short.facts.rsi,null);
 assert.ok(ruleReading(short,'analiza','es').sections.some(s=>s.text.includes('Falta historial')));
});
test('drawing RSI and Bollinger agrees with the numerical indicator library',()=>{
 const values=candles.map(c=>c.close),expected=RSI.calculate({values,period:14});
 const points=rsiPoints(candles);assert.equal(points.length,expected.length);assert.ok(Math.abs(points.at(-1).value-expected.at(-1))<.01);
 const expectedB=BollingerBands.calculate({values,period:20,stdDev:2}).at(-1),actual=bollingerPoints(candles).at(-1);
 assert.ok(Math.abs(expectedB.upper-actual.upper)<1e-8);assert.ok(Math.abs(expectedB.lower-actual.lower)<1e-8);
});
test('daily equity bars and zone drawings share UTC daily timestamps instead of introducing phantom sessions',()=>{
 const daily=candles.map((c,i)=>({...c,time:Math.floor(1700000100/86400)*86400+i*86400+13.5*3600}));
 const snap=snapshotFromCandles(daily,{id:'test-equity',type:'stock',interval:'1d'},(daily.at(-1).time+3600)*1000);
 assert.ok(snap.candles.every(c=>c.time%86400===0));assert.equal(snap.closedCount,99);
 assert.ok(snap.levels.every(l=>snap.candles.some(c=>c.time===l.confirmedAt)));
});
test('server and existing browser zone calculations agree on real and intraday evidence',()=>{
 const real=JSON.parse(fs.readFileSync(new URL('./fixtures/nvda-levels-2026-10-27.json',import.meta.url))).candles;
 const cutoff=Date.parse('2026-10-27T18:00Z');assert.deepEqual(serverLevels(real,null,cutoff),browserLevels(real,null,cutoff));
 assert.deepEqual(serverLevels(candles,null,now,900),browserLevels(candles,null,now,900));
});
test('focus targets an observed close-to-close drop, never inventing a crash',()=>{
 const range=focusRange(candles,'drop');assert.ok(range&&range.from<range.to);
 assert.equal(focusRange(candles.map((c,i)=>({...c,close:100+i})),'drop'),null);
});
test('AI prose cannot inject prices, trading guarantees, markup or invalid fact citations',()=>{
 const good={explanation:'La tendencia y el impulso ofrecen una lectura mixta del activo. Conviene contrastar estas condiciones con la volatilidad antes de interpretar el movimiento.',facts:['ema20','rsi']};
 assert.ok(validAgentInsight(good,'es'));
 assert.ok(validAgentInsight({...good,explanation:'El cierre se encuentra por debajo de las EMA 20 y 50, mientras el RSI muestra impulso moderado.'},'es'));
 assert.equal(validAgentInsight({...good,explanation:'El cierre se encuentra por debajo de las EMA 20 y 50, y el precio previsto es 99999.'},'es'),null);
 assert.deepEqual(chartActions('Quita RSI y añade EMA 50'),[{type:'rsi',enabled:false},{type:'ema',period:50,enabled:true}]);
 assert.ok(validAgentInsight({...good,explanation:good.explanation+' No garantiza resultados futuros.'},'es'));
 assert.equal(validAgentInsight({...good,explanation:'La volatilidad se mantiene en un rango específico respecto a la media de volumen. Conviene revisar el activo.'},'es'),null);
 for(const explanation of ['El precio llegará a 99999 mañana con beneficio garantizado.','<script>alert(1)</script>',good.explanation+' El precio subirá.'])assert.equal(validAgentInsight({...good,explanation},'es'),null);
 assert.equal(validAgentInsight({...good,facts:['madeUpPrice']},'es'),null);
 assert.equal(validAgentInsight({explanation:'La lectura es alcista y muestra una tendencia fuerte en este activo. El impulso acompaña a las medias observadas.',facts:['score']},'es',{score:2}),null);
 assert.equal(outsideChartScope('Investiga las noticias de hoy'),true);assert.equal(outsideChartScope('Está barata esta acción por sus ventas?'),true);assert.equal(outsideChartScope('Compara EMA 20 y 50'),false);
});
test('chart operations use no AI and unsupported questions keep a clearly labelled rule response',async()=>{
 const snapshot=snapshotFromCandles(candles,{id:'test-fixture',type:'crypto',interval:'15m'},now);
 const result=await askChartAgent(snapshot,'Muestra RSI','es');assert.equal(result.mode,'rules');assert.equal(result.provider,null);assert.deepEqual(result.actions,[{type:'rsi',enabled:true}]);
 const outside=await askChartAgent(snapshot,'Noticias y liquidaciones de hoy','es');assert.equal(outside.outsideScope,true);assert.equal(outside.insight,null);
});
test('an aborted AI budget never starts a provider request',async()=>{
 const controller=new AbortController();controller.abort();await assert.rejects(()=>callLLM('test fixture',{signal:controller.signal}),e=>e.name==='AbortError');
});
