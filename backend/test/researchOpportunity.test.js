import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluateCandidate} from '../src/services/opportunityService.js';
import {cryptoValuation,researchQuality} from '../../frontend/src/utils/researchQuality.js';
import {mergeAutomaticAnalysis,chartContextMatches} from '../../frontend/src/utils/automaticChart.js';
import {initialWorkspace,applyChartActions} from '../../frontend/src/utils/chartWorkspace.js';
import {drawingWithPoint} from '../../frontend/src/utils/chartDrawings.js';
const now=Date.parse('2026-10-28T12:00:00Z');
const asset={id:'TEST',type:'stock',symbol:'TEST',name:'Fixture, never displayed publicly'};
const snapshot={id:'TEST',type:'stock',interval:'1d',asOf:now/1000-86400,source:'fixture',currency:'USD',closedCount:100,coverage:100,snapshotId:'fixture',facts:{score:7,close:105,ema20:103,ema50:100,rsi:58,macd:.1,atrPercent:2,volumeRatio:1}};
const fact=value=>({value,currency:'USD',date:'2025-12-31'});
const research={symbol:'TEST',company:{sector:'Technology'},yearEnd:'2025-12-31',flows:{earnings:fact(50),operatingCashFlow:fact(90),capex:fact(-10)},financialSource:'fixture'};
test('entry candidates need complete, fresh, aligned closed-bar evidence plus positive corporate earnings and FCF',()=>{
 assert.equal(evaluateCandidate(asset,snapshot,research,now).eligible,true);
 assert.equal(evaluateCandidate(asset,{...snapshot,coverage:90},research,now).reason,'technical_data');
 assert.equal(evaluateCandidate(asset,{...snapshot,asOf:now/1000-6*86400},research,now).reason,'stale');
 assert.equal(evaluateCandidate(asset,{...snapshot,asOf:now/1000+1},research,now).reason,'stale');
 for(const facts of [{rsi:70},{macd:-.1},{ema20:106},{score:5.9}])assert.equal(evaluateCandidate(asset,{...snapshot,facts:{...snapshot.facts,...facts}},research,now).eligible,false);
 assert.equal(evaluateCandidate(asset,snapshot,{...research,flows:{...research.flows,earnings:fact(-1)}},now).reason,'fundamental_risk');
 assert.equal(evaluateCandidate(asset,snapshot,{...research,flows:{earnings:fact(50)}},now).reason,'fundamental_data');
 assert.equal(evaluateCandidate(asset,snapshot,{...research,company:{sector:'Financial Services'}},now).reason,'specialist');
 const mismatch={...research,flows:{...research.flows,earnings:{...fact(50),currency:'EUR'}}};
 assert.equal(evaluateCandidate(asset,snapshot,mismatch,now).reason,'fundamental_data');
 assert.equal(evaluateCandidate(asset,{...snapshot,id:'OTHER'},research,now).reason,'identity');
});
test('crypto gates never treat low token price, low RSI or missing FDV as proof of cheapness',()=>{
 const a={...asset,id:'fixture-token',type:'crypto'},s={...snapshot,id:a.id,type:'crypto'};
 const r={id:a.id,name:'Fixture Token',marketCap:200e6,volume24h:20e6,fdv:300e6,circulating:100,totalSupply:150,dataAsOf:new Date(now).toISOString()};
 assert.equal(evaluateCandidate(a,s,r,now).eligible,true);
 assert.equal(evaluateCandidate(a,s,{...r,fdv:null},now).eligible,false);
 assert.equal(evaluateCandidate(a,s,{...r,volume24h:0},now).eligible,false);
 assert.equal(evaluateCandidate(a,s,{...r,categories:['USD Stablecoin']},now).reason,'pegged');
 assert.equal(evaluateCandidate(a,s,{...r,dataAsOf:'2026-10-20'},now).eligible,false);
 for(const data of [null,{},r,{...r,price:.00001},{...r,athChange:-95}])assert.equal(cryptoValuation(data).status,'unpriced');
 const q=researchQuality({id:'a',symbol:'A',price:1,marketCap:10,volume24h:0,circulating:5,dataAsOf:'2020-01-01'},'crypto',now);
 assert.ok(q.missing.includes('date')&&q.missing.includes('volume')&&q.missing.includes('dilution'));
 assert.equal(cryptoValuation({circulating:50,totalSupply:100,maxSupply:200}).mintedFloat,50);
});
test('automatic chart updates replace only their own computed marks, preserve edits and ignore destructive model commands',()=>{
 const draw=(id,extra={})=>({id,kind:'horizontal',points:[{time:1700000000,price:100}],origin:'computed',...extra});
 const old=draw('auto',{automatic:true}),chat=draw('chat'),manual=drawingWithPoint(draw('edited',{automatic:true}),0,{time:1700000000,price:105});
 const workspace={...initialWorkspace(),drawings:[old,chat,manual]};
 const updated=mergeAutomaticAnalysis(workspace,[{type:'clear'},{type:'interval',value:'4h'},{type:'draw',drawings:[draw('new')]}]);
 assert.deepEqual(updated.drawings.map(d=>d.id),['chat','edited','new']);
 assert.equal(updated.drawings.at(-1).automatic,true);assert.equal(updated.interval,'1d');assert.deepEqual(updated.ema,[20,50]);
 assert.deepEqual(workspace.drawings.map(d=>d.id),['auto','chat','edited']);
 assert.equal(applyChartActions(updated,[{type:'draw',drawings:[draw('new')]}]).drawings.length,3);
});

test('automatic analysis rejects old snapshots during an asset, interval or venue transition',()=>{
 const context={id:'TEST',type:'stock',interval:'1d',venue:'auto'};
 assert.equal(chartContextMatches(snapshot,context),true);
 for(const change of [{id:'OTHER'},{interval:'4h'},{type:'crypto'},{venue:'Coinbase'}])assert.equal(chartContextMatches(snapshot,{...context,...change}),false);
});
