import test from 'node:test';
import assert from 'node:assert/strict';
import {homeAssets,homeStories,nextCalendarEvents,initialPage,safeSource,homeBreakingAlerts,marketStoryEligible} from '../../frontend/src/utils/homeDiscovery.js';
import {marketLeaders} from '../../frontend/src/utils/discoveryHighlights.js';
import {homeCopy} from '../../frontend/src/i18n/homeCopy.js';

const now=Date.parse('2026-11-08T12:00:00Z');
test('company rankings represent issuers once without summing their share-class caps',()=>{
  const stock=(id,cap)=>({id,symbol:id,type:'stock',currency:'USD',price:100,marketCap:cap,change24h:1});
  const rows=[stock('GOOGL',350),stock('GOOG',340),stock('AAPL',500),stock('MSFT',400),stock('NVDA',450),stock('AMZN',200)];
  const leaders=marketLeaders(rows).stockCap;
  assert.equal(leaders.length,5);assert.equal(leaders.filter(a=>['GOOG','GOOGL'].includes(a.id)).length,1);
  assert.equal(leaders.find(a=>a.id==='GOOGL').marketCap,350);
  assert.equal(rows[1].marketCap,340);assert.equal(rows[0].symbol,'GOOGL');
});
test('home preview offers multiple asset classes and keeps valid zero moves without inventing quotes',()=>{
  const rows=Array.from({length:20},(_,i)=>({id:'S'+i,type:'stock',price:1,marketCap:100-i}));
  rows.push({id:'bitcoin',type:'crypto',price:10,change24h:0},{id:'SPY',type:'etf',price:3},{id:'TLT',type:'bond',price:2},{id:'XAU',type:'commodity',price:4},{id:'EUR',type:'forex',price:1},{id:'^GSPC',type:'index',price:2},{id:'bad',type:'crypto',price:null});
  assert.deepEqual(homeAssets(rows).slice(0,7).map(a=>a.type),['stock','crypto','etf','bond','commodity','forex','index']);
  assert.equal(homeAssets(rows,'crypto')[0].change24h,0);assert.deepEqual(homeAssets([], 'funds'),[]);
  assert.deepEqual(homeAssets(rows,'funds').map(a=>a.id),['SPY','TLT']);
});
test('home reporting rejects unsafe, future and expired stories and suppresses the same event and ticker URLs',()=>{
  const story=(id,hours,extra={})=>({title:id,link:'https://example.test/'+id,pubDate:new Date(now-hours*3600000).toISOString(),category:'macro',priority:70,...extra});
  const news=[story('old',48,{priority:100}),story('current',2),story('duplicate',1,{eventId:'one'}),story('another coverage',1,{eventId:'one'}),story('future',-1),story('expired',73),story('unsafe',1,{link:'javascript:alert(1)'}),story('unrelated',1,{category:'sports'}),story('ticker',1)];
  const result=homeStories(news,now,['https://example.test/ticker'],10);
  assert.deepEqual(result.map(a=>a.title),['duplicate','current','old']);
  assert.equal(safeSource('data:text/html,anything'),null);
});
test('next events retain real dates, do not invent a release time, and exclude published releases',()=>{
  const events=[{title:'Past',scheduledAt:'2026-11-08T11:00:00Z'},{title:'Dated only',date:'2026-11-09'},{title:'Upcoming',scheduledAt:'2026-11-08T18:00:00Z'},{title:'Missing date'},{title:'Upcoming',scheduledAt:'2026-11-08T18:00:00Z'},{title:'Yesterday',date:'2026-11-07'}];
  const result=nextCalendarEvents(events,now);
  assert.deepEqual(result.map(e=>e.title),['Upcoming','Dated only']);assert.equal(result[1].scheduledAt,undefined);
});
test('breaking news requires a recent material event and generic personal-data hacks cannot imply market exposure',()=>{
  const base={publishedAt:new Date(now-3600000).toISOString(),priority:90,category:'security'};
  const personal={...base,title:'Italian minister says hackers leaked his personal data',explicitAssets:[]};
  const financial={...base,title:'Crypto exchange halts withdrawals after wallet breach'};
  assert.equal(marketStoryEligible(personal),false);assert.equal(marketStoryEligible(financial),true);
  assert.deepEqual(homeBreakingAlerts([personal,financial,{...financial,priority:70},{...financial,publishedAt:new Date(now-7*3600000).toISOString()}],now),[financial]);
});
test('old dashboard deep links open the asset dossier while home and specialist routes keep their purpose',()=>{
  assert.equal(initialPage('#dashboard','?inspect=WMT&kind=stock&from=entry'),'panorama');
  assert.equal(initialPage('#dashboard','?inspect=../secret&kind=stock'),'dashboard');
  assert.equal(initialPage('#dashboard',''),'dashboard');assert.equal(initialPage('#chart-ai','?inspect=WMT&kind=stock'),'chart-ai');
});
test('home and navigation copy has complete ES, EN and PT coverage',()=>{
  const keys=Object.keys(homeCopy.es).sort();
  for(const lang of ['en','pt'])assert.deepEqual(Object.keys(homeCopy[lang]).sort(),keys);
  for(const copy of Object.values(homeCopy))assert.ok(Object.values(copy).every(text=>typeof text==='string'&&text.trim()));
});
