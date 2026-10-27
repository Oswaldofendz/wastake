import test from 'node:test';
import assert from 'node:assert/strict';
import { universe,extraInstruments,normalizeBulkRows } from '../src/services/catalogueService.js';
import { normalizeWhales } from '../src/services/whaleService.js';
import { normalizeCryptoResearch } from '../src/services/cryptoResearchService.js';
import { matchingYahooCrypto } from '../src/services/cryptoIdentityService.js';
import { getAssetGroup } from '../../frontend/src/data/assetSectors.js';
import { quoteView } from '../../frontend/src/utils/marketConventions.js';
import axios from 'axios';
import { getCryptoPrices } from '../src/services/priceService.js';
test('primary crypto quotes distinguish a missing daily move from a real zero',async()=>{
 const original=axios.get;axios.get=async()=>({data:{'fixture-missing':{usd:10},'fixture-zero':{usd:10,usd_24h_change:0},'fixture-invalid':{usd:null}}});
 try{const p=await getCryptoPrices(['fixture-missing','fixture-zero','fixture-invalid']);assert.equal(p['fixture-missing'].change24h,null);assert.equal(p['fixture-zero'].change24h,0);assert.equal(p['fixture-invalid'],undefined);}finally{axios.get=original;}
});
test('a blocked primary crypto feed can use source-labelled bulk quotes with exact name and symbol identity',async()=>{
 const original=axios.get;axios.get=async url=>{if(url.includes('coinpaprika'))return {data:[{name:'Hyperliquid',symbol:'HYPE',last_updated:'2026-01-01T00:00:00Z',quotes:{USD:{price:2,market_cap:20,volume_24h:3,percent_change_24h:0}}}]};throw Object.assign(Error('fixture blocked'),{response:{status:429}});};
 try{const prices=await getCryptoPrices(['hyperliquid']);assert.equal(prices.hyperliquid.source,'CoinPaprika');assert.equal(prices.hyperliquid.change24h,0);assert.equal(prices.hyperliquid.quoteAsOf,'2026-01-01T00:00:00Z');}finally{axios.get=original;}
});
test('reference quotes never borrow the timestamp of a different historical price',()=>{
 const analysis={meta:{lastPrice:10,currency:'USD',to:1000}};
 const live=quoteView({price:12,currency:'USD'},null,analysis);assert.equal(live.price,12);assert.equal(live.asOf,undefined);
 assert.equal(quoteView({},null,analysis).kind,'close');assert.equal(quoteView({},null,analysis).price,10);
});

test('dated membership contains 200 distinct global companies and 100 crypto IDs, without seed quotes',()=>{
 assert.equal(universe.stocks.length,200);assert.equal(new Set(universe.stocks.map(a=>a.id)).size,200);
 assert.equal(universe.crypto.length,100);assert.equal(new Set(universe.crypto.map(a=>a.id)).size,100);
 assert.ok(universe.stocks.some(a=>a.id==='2222.SR'));assert.ok(universe.stocks.some(a=>a.id==='005930.KS'));
 assert.ok(universe.crypto.some(a=>a.id==='hyperliquid'));assert.ok(Date.parse(universe.asOf)>0);
 assert.ok([...universe.stocks,...universe.crypto].every(a=>!('price' in a)&&!('marketCap' in a)));
 assert.equal(new Set(extraInstruments.map(a=>a.id)).size,extraInstruments.length);
});
test('provider sector classifications group international companies and retain unknowns',()=>{
 assert.equal(getAssetGroup({type:'stock',sector:'Financial Services'}),'financials');
 assert.equal(getAssetGroup({type:'stock',sector:'Consumer Discretionary'}),'discretionary');
 assert.equal(getAssetGroup({type:'stock',sector:'Basic Materials'}),'materials');
 assert.equal(getAssetGroup({type:'stock',sector:'Unknown'}),'unclassified');
});
test('bulk quotes preserve absent data rather than converting it to zero',()=>{
 const rows=normalizeBulkRows([{symbol:'TEST',lastsale:'$12.30',pctchange:'N/A',marketCap:'',sector:'Technology'},{symbol:'ZERO',lastsale:'0',pctchange:'0%'}]);
 assert.equal(rows.TEST.price,12.3);assert.equal(rows.TEST.change,null);assert.equal(rows.TEST.marketCap,null);assert.equal(rows.ZERO.change,0);
});
test('crypto history mapping requires identity, not a matching ticker alone',()=>{
 const quotes=[{symbol:'HYPE-USD',quoteType:'CRYPTOCURRENCY',shortname:'Another Hype USD'},{symbol:'HYPE32196-USD',quoteType:'CRYPTOCURRENCY',shortname:'Hyperliquid USD'}];
 assert.equal(matchingYahooCrypto(quotes,{name:'Hyperliquid'}),'HYPE32196-USD');
 assert.equal(matchingYahooCrypto(quotes,{name:'Unrelated'}),null);
});
test('crypto fundamentals retain absent values and make dilution and turnover arithmetic auditable',()=>{
 const d=normalizeCryptoResearch({id:'fixture',name:'Fixture',market_data:{market_cap:{usd:100},fully_diluted_valuation:{usd:400},total_volume:{usd:20},circulating_supply:10,max_supply:40}});
 assert.equal(d.fdvToCap,4);assert.equal(d.volumeToCap,20);assert.equal(d.circulatingPercent,25);assert.equal(d.changes.year,null);
 const missing=normalizeCryptoResearch({id:'fixture'});assert.equal(missing.fdvToCap,null);assert.equal(missing.volumeToCap,null);assert.equal(missing.price,null);
});
test('transactions preserve confirmation and missing price/time, deduplicate and retain output-sum semantics',()=>{
 const pending={txid:'pending',value:600_000_000},confirmed={txid:'confirmed',vout:[{value:500_000_000},{value:100_000_000}],status:{confirmed:true,block_time:123}};
 const values=normalizeWhales([pending,confirmed,confirmed,{txid:'small',value:10}],null,999);
 assert.equal(values.length,2);assert.ok(values.every(v=>v.usd===null));assert.equal(values.find(v=>v.txid==='pending').time,null);
 assert.equal(values.find(v=>v.txid==='confirmed').status,'confirmed');assert.equal(values.find(v=>v.txid==='confirmed').btc,6);
 assert.equal(normalizeWhales([pending],100,999)[0].usd,600);assert.equal(normalizeWhales([pending],-1,999)[0].usd,null);
 assert.equal(normalizeWhales([{...pending,txid:'confirmed'},confirmed],100,999)[0].status,'confirmed');
});
