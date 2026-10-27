import test from 'node:test';import assert from 'node:assert/strict';
import {parseExchangeBars,aggregateHours,exchangeIdentity,parseReferenceRates} from '../src/services/publicMarketSources.js';
test('exchange identity never guesses a project from a shared ticker',()=>{assert.deepEqual(exchangeIdentity('bitcoin'),exchangeIdentity('BTC-USD'));assert.equal(exchangeIdentity('BTC'),null);assert.equal(exchangeIdentity('fake-bitcoin'),null);});
test('Kraken and Coinbase OHLC field order is explicit, invalid and future rows are excluded',()=>{
 const stamp=1700000000,now=(stamp+900)*1000;
 const a=parseExchangeBars({error:[],result:{XXBTZUSD:[[stamp,'10','15','8','12','11','4',3]],last:stamp}},'Kraken',now);
 const b=parseExchangeBars([[stamp,8,15,10,12,4],[stamp+1000,8,15,10,12,4],[stamp-900,15,8,10,12,4]],'Coinbase',now);
 assert.deepEqual(a,b);assert.equal(a[0].volume,4);assert.throws(()=>parseExchangeBars({error:['EQuery']},'Kraken',now));
});
test('four-hour OHLC preserves observed extremes and refuses missing hourly bars',()=>{
 const rows=Array.from({length:4},(_,i)=>({time:144000+i*3600,open:10+i,high:15+i,low:8+i,close:12+i,volume:2}));
 assert.deepEqual(aggregateHours(rows,14400,160000000),[{time:144000,open:10,high:18,low:8,close:15,volume:8}]);
 assert.deepEqual(aggregateHours(rows.filter((_,i)=>i!==1),14400,160000000),[]);
});
test('daily FX reference preserves date and currency; missing, negative and future data are not zero',()=>{
 const rows=[{base:'EUR',quote:'USD',rate:1.1,date:'2026-10-27'},{base:'EUR',quote:'GBP',rate:null,date:'2026-10-27'},{base:'USD',quote:'CHF',rate:1,date:'2026-10-27'},{base:'EUR',quote:'JPY',rate:150,date:'2026-10-28'}];
 assert.deepEqual(parseReferenceRates(rows,Date.parse('2026-10-27T18:00Z')),[rows[0]]);
});
