import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeYahooAsset, normalizeNasdaqRows } from '../src/services/assetDiscoveryService.js';
import { cleanCandles, significantLevels, emaSeries } from '../../frontend/src/utils/chartLevels.js';
import { portfolioMetrics, plannedContributions } from '../../frontend/src/utils/portfolioMetrics.js';

test('external identity keeps its exchange and data provider, including Yahoo crypto symbols',()=>{
  const a=normalizeYahooAsset({symbol:'ASML.AS',quoteType:'EQUITY',longname:'ASML Holding N.V.',exchDisp:'Amsterdam'});
  assert.equal(a.id,'ASML.AS');assert.equal(a.exchange,'Amsterdam');assert.equal(a.analysisType,'stock');
  assert.equal(normalizeYahooAsset({symbol:'BTC-USD',quoteType:'CRYPTOCURRENCY'}).analysisType,'stock');
  assert.equal(normalizeYahooAsset({symbol:'../../secret',quoteType:'EQUITY'}),null);
  assert.equal(normalizeYahooAsset({symbol:'OPT',quoteType:'OPTION'}),null);
});
test('rankings use actual positive source caps and never replace missing caps with fixed weights',()=>{
  const rows=normalizeNasdaqRows([{symbol:'AAPL',name:'Apple',lastsale:'$200.00',pctchange:'1.2%',marketCap:'3,000,000'},{symbol:'ZZ',lastsale:'$20',marketCap:'N/A'}]);
  assert.equal(rows.length,1);assert.equal(rows[0].marketCap,3e6);assert.equal(rows[0].price,200);
});
test('candle cleanup aggregates real intraday OHLC and rejects invalid bars',()=>{
  const data=cleanCandles([{time:86400,open:10,high:13,low:8,close:12,volume:3},{time:90000,open:12,high:14,low:9,close:11,volume:4},{time:172800,open:10,high:5,low:8,close:10}]);
  assert.equal(data.length,1);assert.deepEqual(data[0],{time:86400,open:10,high:14,low:8,close:11,volume:7});
  assert.equal(emaSeries(data,20).length,0);
});
test('support/resistance needs confirmed swings and returns at most one level on each side',()=>{
  const candles=Array.from({length:100},(_,i)=>{const p=100+Math.sin(i*Math.PI/10)*8;return{time:(i+1)*86400,open:p,close:p,high:p+1,low:p-1};});
  const levels=significantLevels(candles);
  assert.ok(levels.length>0&&levels.length<=2);
  assert.equal(new Set(levels.map(l=>l.kind)).size,levels.length);
  assert.ok(levels.every(l=>l.index<=94));
  assert.deepEqual(significantLevels(candles.slice(0,10)),[]);
});
test('missing portfolio quotes never become losses; concentration aggregates lots by asset',()=>{
  const positions=[{asset_id:'BTC',currentValue:200,costBasis:100},{asset_id:'BTC',currentValue:300,costBasis:200},{asset_id:'ETF',currentValue:null,costBasis:100}];
  const metrics=portfolioMetrics(positions);
  assert.equal(metrics.totalValue,null);assert.equal(metrics.totalPnl,null);assert.equal(metrics.totalPnlPct,null);
  assert.equal(metrics.assets,2);assert.equal(metrics.concentration,100);assert.equal(metrics.quoted,2);
  assert.equal(plannedContributions(100,'weekly',12),5200);assert.equal(plannedContributions(100,'monthly',12),1200);
  assert.equal(plannedContributions(-1,'monthly',12),null);
});
