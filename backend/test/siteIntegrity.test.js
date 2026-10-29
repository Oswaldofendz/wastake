import test from 'node:test';
import {normalizeFeedArticle} from '../src/services/newsService.js';
import {compactNumber} from '../../frontend/src/utils/compactNumber.js';
import assert from 'node:assert/strict';
import {quoteInUsd,normalizeUsdRates,portfolioPriceChange} from '../../frontend/src/utils/portfolioCurrency.js';
import {portfolioAllocation,portfolioMetrics} from '../../frontend/src/utils/portfolioMetrics.js';
import {assetDescriptor,routeSelection,assetSearchParams} from '../../frontend/src/utils/assetRoute.js';
import {createPortfolioLoader} from '../../frontend/src/services/portfolioLoader.js';
import {createPublicNewsCache} from '../../frontend/src/utils/publicNewsCache.js';
import {createPublicFeedCache} from '../src/services/publicFeedCache.js';
import {createNewsSnapshotService} from '../src/services/newsSnapshotService.js';
import {evaluateAlertCondition} from '../src/services/alertConditions.js';
const now=Date.UTC(2026,9,29,12);
const fx=normalizeUsdRates({result:'success',base_code:'USD',time_last_update_unix:(now-3600000)/1000,rates:{USD:1,EUR:.8,JPY:160,GBP:.8}},now);
const article={title:'Company report',link:'https://example.com/report',pubDate:'2026-10-29T10:00:00Z',snippet:'Public source excerpt'};

test('portfolio valuation converts local quotes into USD and handles pence without assuming missing rates',()=>{
 assert.equal(quoteInUsd({price:80,currency:'EUR'},fx),100);
 assert.equal(quoteInUsd({price:16000,currency:'JPY'},fx),100);
 assert.equal(quoteInUsd({price:8000,currency:'GBp'},fx),100);
 assert.equal(quoteInUsd({price:8000,currency:'GBX'},fx),100);
 assert.equal(quoteInUsd({price:100,currency:'USD'},null),100);
 assert.equal(quoteInUsd({price:80,currency:'EUR'},null),null);
 assert.equal(quoteInUsd({price:80},fx),null);
 assert.equal(quoteInUsd({price:0,currency:'USD'},fx),null);
 const value=2*quoteInUsd({price:80,currency:'EUR'},fx);assert.equal(value-160,40);
});

test('FX references reject a wrong base, future date, stale date and invalid rates',()=>{
 const data={result:'success',base_code:'USD',time_last_update_unix:now/1000,rates:{USD:1,EUR:0,JPY:-2,GBP:'0.8'}};
 assert.equal(normalizeUsdRates({...data,base_code:'EUR'},now),null);
 assert.equal(normalizeUsdRates({...data,time_last_update_unix:now/1000+1},now),null);
 assert.equal(normalizeUsdRates({...data,time_last_update_unix:now/1000-4*86400},now),null);
 assert.equal(quoteInUsd({price:80,currency:'GBP'},normalizeUsdRates(data,now)),null);
});

test('portfolio daily price change uses prior values, not current-value weights or an incomplete subset',()=>{
 assert.ok(Math.abs(portfolioPriceChange([{currentValue:100,change24h:100},{currentValue:100,change24h:-50}])+20)<1e-10);
 assert.equal(portfolioPriceChange([{currentValue:100,change24h:0},{currentValue:null,change24h:10}]),null);
 assert.equal(portfolioPriceChange([{currentValue:100,change24h:null}]),null);
 assert.equal(portfolioPriceChange([{currentValue:100,change24h:0},{is_simulation:true,currentValue:100,change24h:90}]),0);
});

test('allocation groups repeated DCA purchases and refuses to replace missing market value with historical cost',()=>{
 const rows=[{asset_id:'AAPL',asset_type:'stock',asset_name:'Apple',currentValue:50,costBasis:20},{asset_id:'AAPL',asset_type:'stock',currentValue:50,costBasis:30},{asset_id:'bitcoin',asset_type:'crypto',currentValue:100,costBasis:10}];
 const allocation=portfolioAllocation(rows);assert.equal(allocation.length,2);assert.equal(allocation.find(p=>p.asset_id==='AAPL').currentValue,100);
 rows[0].currentValue=null;assert.equal(portfolioAllocation(rows),null);assert.equal(portfolioMetrics(rows).concentration,null);
});

test('an asset deep link cannot silently resolve to a different asset, type, or translated name',()=>{
 const stock={id:'WMT',type:'stock',name:'Walmart',symbol:'WMT'},other={id:'WMT',type:'crypto',name:'Other token'};
 assert.equal(routeSelection('?inspect=WMT&kind=stock',[other,stock]).name,'Walmart');
 assert.equal(assetDescriptor('?inspect=../secret&kind=stock'),null);
 assert.equal(assetDescriptor('?inspect=WMT&kind=unexpected'),null);
 assert.equal(routeSelection('?inspect=EXTERNAL&kind=stock',[]).id,'EXTERNAL');
 const params=new URLSearchParams(assetSearchParams('?inspect=WMT&kind=stock&from=entry&lang=es',{id:'AAPL',type:'stock'}));assert.equal(params.get('inspect'),'AAPL');assert.equal(params.get('from'),null);assert.equal(params.get('lang'),'es');
 assert.equal(new URLSearchParams(assetSearchParams('?inspect=WMT&kind=stock&lang=es',null)).get('inspect'),null);
});

function fakeClient({rows=[],legacy=0,readError=null,countError=null}={}){
 const state={reads:0,creates:0,filters:[]};
 return {state,from(table){let inserted=null;const q={select(){return q;},eq(k,v){state.filters.push([table,k,v]);return q;},order:async()=>{state.reads++;await new Promise(r=>setImmediate(r));return {data:rows,error:readError};},is:async()=>({count:legacy,error:countError}),insert(data){state.creates++;inserted=data;return q;},single:async()=>({data:{...inserted,id:'new'},error:null})};return q;}};
}

test('first-login portfolio loading waits for a successful read and coalesces concurrent mounts',async()=>{
 const client=fakeClient(),load=createPortfolioLoader(client);const [a,b]=await Promise.all([load('owner'),load('owner')]);assert.equal(client.state.reads,1);assert.equal(client.state.creates,1);assert.equal(a[0].id,b[0].id);assert.ok(client.state.filters.some(f=>f[1]==='user_id'&&f[2]==='owner'));
 const existing=fakeClient({rows:[{id:'existing',name:'My portfolio'}]});assert.equal((await createPortfolioLoader(existing)('owner'))[0].id,'existing');assert.equal(existing.state.creates,0);
});

test('a failed portfolio query cannot create a duplicate empty portfolio; legacy positions remain accessible',async()=>{
 const failed=fakeClient({readError:Error('offline')});await assert.rejects(createPortfolioLoader(failed)('owner'));assert.equal(failed.state.creates,0);
 const failedCount=fakeClient({countError:Error('offline')});await assert.rejects(createPortfolioLoader(failedCount)('owner'));assert.equal(failedCount.state.creates,0);
 const unknownCount=fakeClient({legacy:null});await assert.rejects(createPortfolioLoader(unknownCount)('owner'));assert.equal(unknownCount.state.creates,0);
 const legacy=fakeClient({legacy:2}),rows=await createPortfolioLoader(legacy)('owner');assert.equal(rows[0].id,'__unassigned__');assert.equal(rows[0].virtual,true);assert.equal(legacy.state.creates,0);
});

test('missing RSI and quote fields cannot trigger price, percentage or technical alerts',()=>{
 const base={asset_id:'AAPL',asset_type:'stock',target_value:100},quote={id:'AAPL',currency:'USD',price:100,change24h:0,quoteAsOf:new Date(now-60000).toISOString()};
 assert.equal(evaluateAlertCondition({...base,alert_type:'price_below'},{...quote,price:null},null,now),false);
 assert.equal(evaluateAlertCondition({...base,alert_type:'rsi_oversold'},null,{indicators:{rsi:{current:null}}},now),false);
 assert.equal(evaluateAlertCondition({...base,alert_type:'rsi_oversold'},null,{indicators:{rsi:{current:0}}},now),true);
 assert.equal(evaluateAlertCondition({...base,alert_type:'change_below',target_value:2},{...quote,change24h:null},null,now),false);
 assert.equal(evaluateAlertCondition({...base,alert_type:'price_above'},quote,null,now),true);
 assert.equal(evaluateAlertCondition({...base,alert_type:'price_above'},{...quote,currency:'JPY'},null,now),false);
 assert.equal(evaluateAlertCondition({...base,alert_type:'price_above'},{...quote,isStale:true},null,now),false);
 assert.equal(evaluateAlertCondition({...base,alert_type:'price_above'},{...quote,quoteAsOf:null},null,now),false);
 assert.equal(evaluateAlertCondition({...base,alert_type:'price_above'},{...quote,id:'MSFT'},null,now),false);
});

test('RSS failures retain a bounded stale copy without inventing a new successful-fetch date',async()=>{
 let instant=now,fail=false,calls=0;const read=createPublicFeedCache(async()=>{calls++;if(fail)throw Error('offline');return [article];},{now:()=>instant});const feed={url:'https://example.com/rss'};
 const first=await read(feed);assert.equal(first.status,'ok');assert.equal(first.articles[0].sourceStale,false);const asOf=first.dataAsOf;
 instant+=121000;fail=true;const stale=await read(feed);assert.equal(stale.status,'stale');await new Promise(r=>setImmediate(r));const failed=await read(feed);assert.equal(failed.dataAsOf,asOf);assert.equal(failed.articles[0].sourceStale,true);
 instant+=1800000;const expired=await read(feed);assert.equal(expired.status,'unavailable');assert.equal(expired.articles.length,0);assert.ok(calls>=2);
});

test('a successful empty RSS feed replaces old news and concurrent cold requests share one load',async()=>{
 let instant=now,rows=[article],calls=0;const read=createPublicFeedCache(async()=>{calls++;return rows;},{now:()=>instant});const feed={url:'https://example.com/rss'};
 await Promise.all([read(feed),read(feed)]);assert.equal(calls,1);instant+=121000;rows=[];await read(feed);await new Promise(r=>setImmediate(r));const empty=await read(feed);assert.equal(empty.status,'ok');assert.deepEqual(empty.articles,[]);
});

test('browser news cache clears a confirmed empty result and cannot extend a failed copy indefinitely',()=>{
 let instant=now;const storage={value:null,getItem(){return this.value;},setItem(k,v){this.value=v;}};
 const cache=createPublicNewsCache(()=>storage,()=>instant),a={id:'AAPL'};cache.remember(a,'stock','es',{news:[article],sourceStatus:'ok'});const storedAt=cache.read(a,'stock','es').storedAt;
 instant+=1000;cache.remember(a,'stock','es',{news:[],sourceStatus:'unavailable'});assert.equal(cache.read(a,'stock','es').storedAt,storedAt);assert.equal(cache.read(a,'stock','es').stale,true);
 cache.remember(a,'stock','es',{news:[],sourceStatus:'ok'});assert.deepEqual(cache.read(a,'stock','es').news,[]);
 instant+=21600001;assert.equal(cache.read(a,'stock','es'),null);
});

test('contextual analysis cannot erase a source-failure warning or poison the headline cache',async()=>{
 const raw=Object.assign([article],{sourceStatus:'partial',stale:true,dataAsOf:new Date(now-600000).toISOString()});
 const service=createNewsSnapshotService({read:async()=>raw,analyze:async()=>({wrong:'shape'}),now:()=>now});
 const target={id:'AAPL',type:'stock',aliases:[]};assert.equal((await service(target)).sourceStatus,'partial');await new Promise(r=>setImmediate(r));const result=await service(target);assert.equal(result.news.length,1);assert.equal(result.aiStatus,'unavailable');assert.equal(result.stale,true);
});

test('capitalization units mean the same amount in Spanish, English and Portuguese',()=>{for(const locale of ['es','en','pt']){assert.ok(compactNumber(5.25e12,locale).endsWith(' T'));assert.ok(compactNumber(1.3e9,locale).endsWith(' B'));assert.equal(compactNumber(null,locale),'—');}});

test('RSS links and publication times must be usable before they enter current-news views',()=>{
 assert.equal(normalizeFeedArticle({title:'News',link:'javascript:alert(1)',pubDate:article.pubDate},'Source',now),null);
 assert.equal(normalizeFeedArticle({title:'News',link:article.link,pubDate:'invalid'},'Source',now),null);
 assert.equal(normalizeFeedArticle({title:'News',link:article.link,pubDate:new Date(now+1000).toISOString()},'Source',now),null);
 assert.equal(normalizeFeedArticle({title:' News ',link:article.link,isoDate:article.pubDate},'Source',now).title,'News');
});
