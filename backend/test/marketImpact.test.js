import test from 'node:test';
import assert from 'node:assert/strict';
import {impactTopic,normalizeImpactItems,selectImpactAlerts,extractFedDecision,createMarketImpactService,IMPACT_WINDOW_MS} from '../src/services/marketImpactService.js';
import {visibleMarketAlerts} from '../../frontend/src/utils/marketImpact.js';
const now=Date.parse('2026-10-28T18:30:00Z');
const fed={id:'fed',name:'Federal Reserve',host:'www.federalreserve.gov',official:true};
const cnbc={id:'cnbc',name:'CNBC',host:'www.cnbc.com',official:false};
// Synthetic public-feed fixtures are confined to tests; no application news is seeded.
const release={title:'Federal Reserve issues FOMC statement',link:'https://www.federalreserve.gov/newsevents/pressreleases/monetary20261028a.htm',pubDate:'Wed, 28 Oct 2026 18:00:00 GMT'};
const paragraph=(action,lower,upper)=>`<p>The Committee decided to ${action} the target range for the federal funds rate at ${lower} to ${upper} percent, in support of its mandate.</p>`;

test('market alerts require a recent publication, an explicit event topic and the expected source host',()=>{
 const fixtures=[release,{...release,pubDate:'Tue, 27 Oct 2026 18:00:00 GMT'},{...release,pubDate:'Wed, 28 Oct 2026 19:00:00 GMT'},{...release,pubDate:null},{...release,link:'https://evil.example/a'},{...release,link:'https://www.federalreserve.gov:8080/a'},{...release,link:'https://user:secret@www.federalreserve.gov/a'},{...release,title:'Minutes of the Board discount rate meetings'}];
 const alerts=normalizeImpactItems(fixtures,fed,now);assert.equal(alerts.length,1);assert.equal(alerts[0].publishedAt,'2026-10-28T18:00:00.000Z');assert.equal(alerts[0].decision,null);
 assert.equal(impactTopic('Fed expected to hold rates steady','cnbc'),null);assert.equal(impactTopic('Fed holds rates steady despite inflation concerns','cnbc'),'fed_decision');assert.equal(impactTopic('Inflation data could rise next month','cnbc'),null);assert.equal(impactTopic('CPI inflation falls below expectations','cnbc'),'inflation');
 assert.equal(impactTopic('Monetary policy decisions','ecb'),'ecb_decision');assert.equal(impactTopic('Bank lending survey','ecb'),null);
});
test('official decisions replace duplicate press headlines, without treating the calendar as released news',()=>{
 const official=normalizeImpactItems([release],fed,now),press=normalizeImpactItems([{title:'Fed holds rates steady',link:'https://www.cnbc.com/fed',pubDate:'2026-10-28T18:20:00Z'}],cnbc,now);
 const selected=selectImpactAlerts([...press,...official],now);assert.equal(selected.length,1);assert.equal(selected[0].sourceId,'fed');assert.equal(selected[0].publishedAt,official[0].publishedAt);
 assert.equal(selectImpactAlerts([{...official[0],publishedAt:'invalid'}],now).length,0);
 const revised=selectImpactAlerts([{...official[0],decision:{action:'hold',lower:3.75,upper:4}}],now);assert.notEqual(selected[0].id,revised[0].id);
});
test('Fed target ranges are extracted only from the actual decision paragraph, including fractional rates',()=>{
 assert.deepEqual(extractFedDecision(paragraph('maintain','3-3/4','4')),{action:'hold',lower:3.75,upper:4,unit:'percent',basis:'official-statement'});
 assert.equal(extractFedDecision(paragraph('raise','4¼','4½')).upper,4.5);assert.equal(extractFedDecision(paragraph('lower','0','1/4')).upper,.25);
 assert.equal(extractFedDecision('<p>Analysts expect the Fed to maintain rates at 3.75 to 4 percent.</p>'),null);
 assert.equal(extractFedDecision(paragraph('maintain','4','3')),null);assert.equal(extractFedDecision(paragraph('maintain','1','9')),null);
 assert.equal(extractFedDecision('<script>'+paragraph('maintain','3','4')+'</script>'),null);
});
test('concurrent visitors share refreshes; source failure retains only unexpired evidence with a warning',async()=>{
 let instant=now,calls=0,fail=false;
 const service=createMarketImpactService({sources:[fed],now:()=>instant,fetchFeed:async()=>{calls++;if(fail)throw Error('offline');return [release];},fetchStatement:async()=>paragraph('maintain','3-3/4','4')});
 const [a,b]=await Promise.all([service(),service()]);assert.equal(calls,1);assert.equal(a.alerts[0].decision.upper,4);assert.deepEqual(a,b);
 await service();assert.equal(calls,1);
 instant+=61_000;fail=true;const stale=await service();assert.equal(stale.status,'unavailable');assert.equal(stale.alerts[0].feedStale,true);assert.equal(stale.sources[0].checkedAt,a.sources[0].checkedAt);
 instant=now+IMPACT_WINDOW_MS;assert.equal((await service()).alerts.length,0);
});
test('an unavailable detail page does not hide a publication and is retried on the next refresh',async()=>{
 let instant=now,attempts=0;
 const service=createMarketImpactService({sources:[fed],now:()=>instant,fetchFeed:async()=>[release],fetchStatement:async()=>{attempts++;if(attempts===1)throw Error('not yet');return paragraph('maintain','3-3/4','4');}});
 const first=await service();assert.equal(first.alerts.length,1);assert.equal(first.alerts[0].decision,null);
 instant+=61_000;assert.equal((await service()).alerts[0].decision.lower,3.75);assert.equal(attempts,2);
 const down=createMarketImpactService({sources:[fed],now:()=>now,fetchFeed:async()=>{throw Error('offline');}});assert.equal((await down()).status,'unavailable');
});
test('browser expiry and dismissal cannot present a future or stale publication as breaking news',()=>{
 const alerts=selectImpactAlerts(normalizeImpactItems([release],fed,now),now),data={alerts};
 assert.equal(visibleMarketAlerts(data,[],now).length,1);assert.equal(visibleMarketAlerts(data,[alerts[0].id],now).length,0);
 assert.equal(visibleMarketAlerts(data,[],Date.parse(alerts[0].expiresAt)).length,0);assert.equal(visibleMarketAlerts(data,[],Date.parse(release.pubDate)-1).length,0);
});
