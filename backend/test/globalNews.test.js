import test from 'node:test';
import {createStoryAnalysisCache} from '../src/services/fundamentalsAnalysisService.js';
import assert from 'node:assert/strict';
import {impactTopic,normalizeImpactItems,selectImpactAlerts,createMarketImpactService} from '../src/services/marketImpactService.js';
import {MARKET_NEWS_SOURCES} from '../src/services/marketNewsRules.js';
import {createNewsSnapshotService} from '../src/services/newsSnapshotService.js';
import {newsAliases} from '../src/services/newsService.js';
import {tickerMarketAlerts,tickerDuration} from '../../frontend/src/utils/marketImpact.js';
const now=Date.UTC(2026,9,30,15),source={id:'cnbc',name:'CNBC Markets',host:'www.cnbc.com',official:false};
const item=(title,path,date=now-60000)=>({title,link:`https://www.cnbc.com/${path}`,pubDate:new Date(date).toISOString(),contentSnippet:'A public publisher report with source-specific detail, conditional developments and explicit context about the named business and financial markets.'});

test('global coverage includes security, corporate results and geopolitics without mistaking a rate preview for a decision',()=>{
 assert.equal(impactTopic('Binance says it will cover losses after security breach','cnbc'),'security');
 assert.equal(impactTopic('Amazon reports quarterly earnings and negative cash flow','cnbc'),'corporate');
 assert.equal(impactTopic('Russian strikes cause energy blackouts in Ukraine','bbc-world'),'geopolitics');
 assert.equal(impactTopic('Fed expected to hold rates next week','cnbc'),null);
 assert.equal(impactTopic('A company launches a new red logo','bbc-world'),null);
 assert.ok(MARKET_NEWS_SOURCES.length>=9);
});

test('distinct same-day corporate events survive grouping; duplicate URLs do not erase unrelated companies',()=>{
 const rows=normalizeImpactItems([item('Amazon earnings fall short','amzn'),item('Alphabet earnings decline','googl'),{...item('Amazon earnings fall short','amzn'),link:'https://www.cnbc.com/amzn?utm_source=rss'}],source,now);
 const selected=selectImpactAlerts(rows,now);assert.equal(selected.length,2);assert.ok(selected.some(a=>a.explicitAssets.includes('AMZN')));assert.ok(selected.some(a=>a.explicitAssets.includes('GOOGL')));
 assert.ok(selected.every(a=>a.priority>=0&&a.priority<=100&&a.classification==='wastake-topic-rule'));
});

test('a source host, freshness and uncertainty remain explicit for global news',()=>{
 const bbc=MARKET_NEWS_SOURCES.find(s=>s.id==='bbc-world');
 const rows=normalizeImpactItems([{...item('Binance hack investigated','news'),link:'https://www.bbc.co.uk/news/articles/test'},{...item('Binance hack investigated','evil'),link:'https://www.bbc.co.uk.evil.example/news'},{...item('Binance hack investigated','future'),pubDate:new Date(now+1).toISOString()},{...item('Binance hack investigated','old'),pubDate:new Date(now-86400000).toISOString()}],bbc,now);
 assert.equal(rows.length,1);assert.equal(rows[0].official,false);assert.equal(rows[0].reportType,'reported');
 const outlook=normalizeImpactItems([item('Analysts urge investors to buy after Binance hack','opinion')],source,now)[0];assert.equal(outlook.reportType,'outlook');assert.ok(outlook.priority<rows[0].priority);
});

test('the ticker balances categories, excludes outlooks and retains the same measured pixel speed for longer sequences',()=>{
 const rows=normalizeImpactItems([item('Binance security breach reported','hack'),item('Amazon earnings disappoint','earnings'),item('Ukraine war affects oil transport','war'),item('Stocks plunge after spending concerns','market'),item('Analysts urge investors to buy after Binance hack','opinion')],source,now);
 const selected=tickerMarketAlerts(selectImpactAlerts(rows,now));assert.equal(selected.length,4);assert.equal(new Set(selected.map(a=>a.category)).size,4);
 assert.equal(tickerDuration(1640,82),20);assert.equal(tickerDuration(3280,82),40);assert.ok(tickerDuration(1640,82)<tickerDuration(1640,45));
});

test('breaking headlines return before contextual analysis and global snapshots never use a selected asset feed',async()=>{
 let finish;const pending=new Promise(resolve=>{finish=resolve;});let readGlobal=0,readAsset=0;
 const raw=Object.assign(selectImpactAlerts(normalizeImpactItems([item('Binance security breach reported','hack')],source,now),now).map(a=>({...a,marketCategory:a.category,link:a.url,pubDate:a.publishedAt})),{sourceStatus:'ok',sourceCheckedAt:new Date(now).toISOString(),sources:[{name:source.name,status:'ok'}]});
 const service=createNewsSnapshotService({read:async()=>{readAsset++;return[];},readGlobal:async()=>{readGlobal++;return raw;},analyze:async()=>pending,now:()=>now});
 const target={id:'global',type:'market',aliases:[]},first=await service(target,'es',false);
 assert.equal(first.count,1);assert.equal(first.revalidating,false);assert.equal(first.sources.length,1);
 const analyzing=await service(target);assert.equal(analyzing.count,1);assert.equal(analyzing.revalidating,true);assert.equal(readGlobal,1);assert.equal(readAsset,0);
 finish({news:raw,aiStatus:'unavailable',analyzedCount:0});await new Promise(r=>setImmediate(r));assert.equal((await service(target,'es',false)).count,1);
});

test('global source failures retain dated reports only until the publication window expires',async()=>{
 let instant=now,fail=false;
 const service=createMarketImpactService({sources:[source],now:()=>instant,fetchFeed:async()=>{if(fail)throw Error('offline');return[item('Binance security breach reported','hack')];}});
 const fresh=await service();assert.equal(fresh.alerts.length,1);instant+=61000;fail=true;const stale=await service();assert.equal(stale.alerts[0].feedStale,true);assert.equal(stale.sources[0].checkedAt,fresh.sources[0].checkedAt);
 instant=now+86400000;assert.equal((await service()).alerts.length,0);
});

test('dashboard ticker-only news lookup includes the same protected company identities as research',()=>{
 assert.ok(newsAliases('NVDA','stock').includes('NVIDIA'));
 assert.ok(newsAliases('AMZN','stock').includes('Amazon'));
 assert.ok(newsAliases('GOOGL','stock').includes('google'));
 assert.ok(newsAliases('binancecoin','crypto').includes('binance'));
 assert.deepEqual(newsAliases('__proto__','stock'),[]);
 assert.deepEqual(newsAliases('unknown','stock',['Same','Same','']),['Same']);
 assert.ok(newsAliases('bitcoin','crypto').includes('Bitcoin'));
});

test('new reports analyze only uncached stories, with language, target, expiry and fresh-source isolation',async()=>{
 let instant=now;const calls=[];
 const enrich=createStoryAnalysisCache(async(news,lang,target)=>{calls.push(news.map(a=>a.title));return{news:news.map(a=>({...a,summary:'Synthetic reviewed context',analysisProvider:'test-provider',analysisVersion:'test'})),aiStatus:'ready',analyzedCount:news.length};},{now:()=>instant});
 const a={title:'Report A',link:'https://www.cnbc.com/a',pubDate:new Date(now-1000).toISOString(),snippet:'Source A'},b={...a,title:'Report B',link:'https://www.cnbc.com/b'},c={...a,title:'Report C',link:'https://www.cnbc.com/c'},target={id:'global',type:'market'};
 assert.equal((await enrich([a,b],'es',target)).analyzedCount,2);
 const fresh=await enrich([{...a,sourceStale:true,sourceFetchedAt:'new-source-time'},b,c],'es',target);
 assert.deepEqual(calls[1],['Report C']);assert.equal(fresh.news[0].sourceStale,true);assert.equal(fresh.news[0].sourceFetchedAt,'new-source-time');assert.equal(fresh.analyzedCount,3);
 await enrich([a],'en',target);assert.equal(calls.length,3);
 await enrich([a],'es',{id:'AAPL',type:'stock'});assert.equal(calls.length,4);
 instant+=3600001;await enrich([a],'es',target);assert.equal(calls.length,5);
});
