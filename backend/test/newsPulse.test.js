import test from 'node:test';
import assert from 'node:assert/strict';
import {newsPulse, NEWS_MARKETS} from '../../frontend/src/utils/newsSentiment.js';
import {validateMarketAssessments, createStoryAnalysisCache} from '../src/services/fundamentalsAnalysisService.js';
import {createNewsSnapshotService} from '../src/services/newsSnapshotService.js';

const now = Date.UTC(2026,9,30,17);
const quote = 'The publisher reports a security breach affecting this exchange and its customers.';
const assessment = (direction=100,relevance=20) => ({direction,relevance,confidence:60,marketLink:80,evidenceQuote:quote,reason:'El incidente afecta a esta plataforma de criptoactivos.'});
function story(id, direction=100, relevance=20, extras={}) {
 return {title:`Distinct financial event ${id}`,link:`https://example.com/news/${id}`,pubDate:new Date(now-60000).toISOString(),source:'Test publisher',analysisProvider:'test-provider',analysisDepth:'rss',factors:{assetLink:80,evidence:60},score:direction,relevance,confidence:60,evidenceQuote:quote,mechanism:'El incidente afecta al activo indicado.',marketAssessments:{crypto:assessment(direction,relevance)},...extras};
}
const calculate = (news,extra={}) => newsPulse(news,{market:'crypto',now,...extra});
const close = (a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);

test('one major adverse story outweighs ten minor favorable events, with no built-in negative bias',()=>{
 const minor=Array.from({length:10},(_,i)=>story(`minor-${i}`));
 const pulse=calculate([...minor,story('major',-100,90)]);
 close(pulse.value,5+5*(10*.2**3-.9**3)/(10*.2**3+.9**3));
 assert.ok(pulse.value<1); assert.equal(pulse.events,11); assert.ok(pulse.rows[0].share>.9);
 const mirror=calculate([...minor.map(a=>({...a,marketAssessments:{crypto:assessment(-100,20)}})),story('major',100,90)]);
 close(mirror.value,10-pulse.value);
});

test('missing context is not neutral, while explicitly assessed neutral news produces five',()=>{
 assert.equal(calculate([]).value,null);
 assert.equal(calculate([story('rules',-100,99,{analysisProvider:undefined})]).value,null);
 assert.equal(calculate([story('old-model',-100,99,{marketAssessments:undefined})]).value,null);
 assert.equal(calculate([story('neutral',0,70)]).value,5);
});

test('opposite market interpretations stay independent; broad generic reference tags never become sentiment votes',()=>{
 const article=story('war',-80,90,{assets:['SPY','XAU','USD'],marketAssessments:{stocks:assessment(-80,90),commodities:assessment(70,70)}});
 close(newsPulse([article],{market:'stocks',now}).value,1);
 close(newsPulse([article],{market:'commodities',now}).value,8.5);
 assert.equal(newsPulse([article],{market:'forex',now}).value,null);
 for(const market of NEWS_MARKETS.filter(m=>!['stocks','commodities'].includes(m))) assert.equal(newsPulse([article],{market,now}).value,null);
});

test('duplicates and grouped cross-source reports cannot multiply one known event',()=>{
 const original=story('one',-100,90,{eventKey:'exchange-security-breach-2026-10-30'});
 const tracking={...original,link:original.link+'?utm_source=rss'};
 const syndicated=story('syndicated',-100,80,{eventKey:original.eventKey});
 const pulse=calculate([original,tracking,syndicated,story('other',100,70)]);
 assert.equal(pulse.available,3);assert.equal(pulse.assessed,3);assert.equal(pulse.events,2);assert.equal(pulse.grouped,1);
 close(pulse.value,calculate([original,story('other',100,70)]).value);
});

test('freshness halves weight every twelve hours; future, expired and unsafe links never count',()=>{
 const fresh=story('fresh',100,80,{pubDate:new Date(now).toISOString()});
 const aged=story('aged',-100,80,{pubDate:new Date(now-12*3600000).toISOString()});
 const result=calculate([fresh,aged,story('future',100,90,{pubDate:new Date(now+1).toISOString()}),story('expired',100,90,{pubDate:new Date(now-86400000).toISOString()}),story('bad',100,90,{link:'javascript:alert(1)'})]);
 assert.equal(result.available,2);close(result.rows[0].weight,2*result.rows[1].weight);close(result.value,20/3);
});

test('evidence and confidence change relative weight; RSS caps hold and one dominant event is flagged',()=>{
 const strong=story('strong',-100,80), weak=story('weak',100,80,{factors:{evidence:30},marketAssessments:{crypto:{...assessment(100,80),confidence:30}}});
 const result=calculate([strong,weak]);close(result.rows[0].weight,4*result.rows[1].weight);assert.ok(result.limited);assert.ok(result.dominance>.65);
 const uncapped=story('rss',100,80,{factors:{evidence:100},marketAssessments:{crypto:{...assessment(100,80),confidence:100}}});
 close(calculate([uncapped]).totalWeight,calculate([story('rss',100,80)]).totalWeight);
});

test('invalid numbers, weak market linkage and title-only evidence cannot yield a value',()=>{
 for(const update of [{direction:NaN},{direction:101},{direction:null},{direction:'100'},{relevance:Infinity},{confidence:0},{marketLink:29},{evidenceQuote:'short'},{reason:''}]) {
  assert.equal(calculate([story('invalid',100,80,{marketAssessments:{crypto:{...assessment(),...update}}})]).value,null);
 }
 assert.equal(calculate([story('title',100,80,{analysisDepth:'title'})]).value,null);
 assert.equal(calculate([story('weak-evidence',100,80,{factors:{evidence:19}})]).value,null);
});

test('a single-asset pulse uses only contextual evidence for that target and obeys its selected window',()=>{
 const article=story('asset',-60,80,{marketAssessments:undefined,pubDate:new Date(now-48*3600000).toISOString()});
 assert.equal(calculate([article],{asset:true}).value,null);
 close(calculate([article],{asset:true,windowHours:168}).value,2);
 assert.equal(calculate([article],{market:'stocks',windowHours:168}).value,null);
});

test('contributions reconcile exactly to the needle; all input orders agree',()=>{
 const input=[story('a',40,30),story('b',-70,85),story('c',0,60)], pulse=calculate(input);
 close(5+pulse.rows.reduce((sum,r)=>sum+r.contribution,0),pulse.value);
 close(pulse.rows.reduce((sum,r)=>sum+r.share,0),1);
 close(calculate(input.reverse()).value,pulse.value);
 assert.ok(pulse.mixed);assert.ok(pulse.value>=0&&pulse.value<=10);
});

test('market assessment validation requires source evidence, a supported numeric scope and localized explanation',()=>{
 const article={analysisText:quote,analysisDepth:'rss'}, factors={severity:90,assetLink:80,surprise:60,persistence:70,evidence:80};
 const candidate={...assessment(-80),confidence:95};
 const result=validateMarketAssessments({crypto:candidate,stocks:{...candidate,evidenceQuote:'A claim not present in the source material.'},unknown:candidate,forex:{...candidate,direction:null}},article,factors,'es');
 assert.deepEqual(Object.keys(result),['crypto']);assert.equal(result.crypto.confidence,60);
 assert.equal(result.crypto.relevance,77);assert.equal(result.crypto.direction,-80);
 assert.deepEqual(validateMarketAssessments({crypto:{...candidate,reason:'The affected exchange could restrict customer access to their funds.'}},article,factors,'es'),{});
});

test('story cache and live snapshot preserve the market evidence and event identity without borrowing another article context',async()=>{
 const raw=story('cached',-70,80,{eventKey:'exchange-breach-2026-10-30'});let calls=0;
 const cached=createStoryAnalysisCache(async rows=>{calls++;return {news:rows,analyzedCount:1,aiStatus:'partial'};},{now:()=>now});
 await cached([raw],'es',{type:'market'});const copy=await cached([{...raw,marketAssessments:undefined,eventKey:null}],'es',{type:'market'});
 assert.equal(calls,1);assert.equal(copy.news[0].marketAssessments.crypto.direction,-70);assert.equal(copy.news[0].eventKey,raw.eventKey);
 const service=createNewsSnapshotService({readGlobal:async()=>Object.assign([raw],{sourceStatus:'ok'}),analyze:cached,now:()=>now});
 await service({id:'global',type:'market'},'es',true);await new Promise(r=>setImmediate(r));const snapshot=await service({id:'global',type:'market'},'es',false);
 assert.equal(snapshot.news[0].marketAssessments.crypto.direction,-70);assert.equal(snapshot.news[0].eventKey,raw.eventKey);
});
