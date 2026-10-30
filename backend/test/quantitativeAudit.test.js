import test from 'node:test';
import assert from 'node:assert/strict';
import {computeIndicators} from '../src/services/technicalAnalysisService.js';
import {companyRatios,evaluateDcf,financialQuote,dcfSensitivity} from '../../frontend/src/utils/companyValuation.js';
import {portfolioMetrics,plannedContributions} from '../../frontend/src/utils/portfolioMetrics.js';
import {portfolioPriceChange,quoteInUsd} from '../../frontend/src/utils/portfolioCurrency.js';
import {closedPriceSeries,pairedReturnCorrelation} from '../../frontend/src/utils/returnStatistics.js';
import {normalizeCryptoResearch} from '../src/services/cryptoResearchService.js';
import {validateItem} from '../src/services/fundamentalsAnalysisService.js';
import {evaluateAlertCondition} from '../src/services/alertConditions.js';
import {compareEconomicValues,numericEventValue} from '../../frontend/src/utils/calendar.js';
import {rsiPoints,bollingerPoints} from '../../frontend/src/utils/chartWorkspace.js';
import {formatNumeric,quotePrecision} from '../../frontend/src/utils/numberFormat.js';
import {entrySummary} from '../../frontend/src/utils/entrySummary.js';

const near=(a,b,tolerance=1e-9)=>assert.ok(Number.isFinite(a)&&Number.isFinite(b)&&Math.abs(a-b)<=tolerance,`${a} != ${b}`);
const bars=Array.from({length:160},(_,i)=>{const close=100+i*.12+Math.sin(i/4)*2;return {time:(17000+i)*86400,open:close-.3,close,high:close+1,low:close-1,volume:100+i};});
const scaled=k=>bars.map(c=>({...c,open:c.open*k,high:c.high*k,low:c.low*k,close:c.close*k}));
const fact=(value,currency='USD',date='2025-12-31',period='12M')=>({value,currency,date,period});
const scenario={cashFlows:[100,100,100,100,100],wacc:.1,g:0,shares:100,margin:.2,cash:0,debt:0,preferred:0,minority:0,nonOperatingAssets:0,otherClaims:0,price:8};

test('technical interpretation is invariant to the quote denomination, including micro-priced tokens',()=>{
 const base=computeIndicators(bars);
 for(const scale of [1e-10,1e-8,1e-4,1e6]){
  const actual=computeIndicators(scaled(scale));
  assert.equal(actual.summary.score10,base.summary.score10);assert.equal(actual.summary.overall,base.summary.overall);assert.equal(actual.summary.coverage,base.summary.coverage);
  near(actual.indicators.ema20.current/scale,base.indicators.ema20.current,1e-9);
  near(actual.indicators.atr.current/scale,base.indicators.atr.current,1e-9);
  assert.ok(actual.indicators.ema20.current>0&&actual.meta.lastPrice>0);
 }
});

test('constant prices are neutral in both chart and server; zero-width bands cannot become sell signals',()=>{
 const flat=bars.map(c=>({...c,open:100,close:100,high:100,low:100})),result=computeIndicators(flat);
 assert.equal(result.indicators.rsi.current,50);assert.equal(rsiPoints(flat).at(-1).value,50);
 assert.equal(result.summary.score10,5);assert.equal(result.summary.score,0);assert.equal(result.summary.overall,'neutral');
 assert.equal(result.signals.bb.signal,'neutral');assert.ok(!/NaN|null|Infinity/.test(result.signals.bb.label));assert.ok(result.summary.coverage<100);
});

test('legacy score and semaphore always express the same index rather than a second contradictory model',()=>{
 for(const rows of [bars,scaled(1e-8),bars.map((c,i)=>({...c,open:300-c.open,close:300-c.close,high:300-c.low,low:300-c.high}))]){
  const {summary:s}=computeIndicators(rows);near(s.score,20*(s.score10-5),1e-9);
  assert.equal(s.overall,s.score10>=6?'buy':s.score10<=4?'sell':'neutral');
 }
});

test('RSI, EMA, MACD and population Bollinger formulas agree with independent arithmetic',()=>{
 const closes=bars.map(c=>c.close),ema=(values,period)=>{let e=values.slice(0,period).reduce((a,b)=>a+b,0)/period;const out=[e];for(const v of values.slice(period)){e+=(v-e)*2/(period+1);out.push(e);}return out;};
 const result=computeIndicators(bars).indicators;
 near(result.ema20.current,ema(closes,20).at(-1),1e-9);
 const fast=ema(closes,12),slow=ema(closes,26),macd=slow.map((v,i)=>fast[i+14]-v),signal=ema(macd,9).at(-1);
 near(result.macd.current.macd,macd.at(-1),1e-9);near(result.macd.current.histogram,macd.at(-1)-signal,1e-9);
 near(result.rsi.current,rsiPoints(bars).at(-1).value,.0051);
 const tail=closes.slice(-20),mean=tail.reduce((a,b)=>a+b,0)/20,sd=Math.sqrt(tail.reduce((s,v)=>s+(v-mean)**2,0)/20);
 near(result.bollingerBands.current.upper,mean+2*sd,1e-9);near(result.bollingerBands.current.lower,bollingerPoints(bars).at(-1).lower,1e-9);
});

test('relative volume needs twenty consecutive prior observations and excludes the current candle from the average',()=>{
 const clean=bars.map(c=>({...c,volume:100}));clean.at(-1).volume=200;
 assert.equal(computeIndicators(clean).indicators.volume.ratio,2);
 clean.at(-5).volume=undefined;assert.equal(computeIndicators(clean).indicators.volume.ratio,null);
 clean.at(-5).volume=100;clean.at(-1).volume=0;assert.equal(computeIndicators(clean).indicators.volume.ratio,0);
});

test('invalid, unordered or duplicate price bars cannot enter the technical calculation',()=>{
 assert.throws(()=>computeIndicators([...bars].reverse()),/ordenadas/);
 assert.throws(()=>computeIndicators([...bars.slice(0,-1),{...bars.at(-1),close:NaN}]),/válidas/);
 assert.throws(()=>computeIndicators([...bars,bars.at(-1)]),/únicas/);
});

test('P/FCF cannot mix a dollar capitalization with euro cash flows; margins need matching periods',()=>{
 const data={quote:{price:10,currency:'USD'},marketCap:fact(1000),flows:{revenue:fact(100),operatingCashFlow:fact(50,'EUR'),capex:fact(10,'EUR'),operatingIncome:fact(20,'USD','2024-12-31')}};
 const ratios=companyRatios(data);assert.equal(ratios.fcf,40);assert.equal(ratios.pfcf,null);assert.equal(ratios.operatingMargin,null);assert.equal(ratios.ps,10);
 data.flows.capex= fact(10,'EUR','2025-12-31','3M');assert.equal(companyRatios(data).fcf,null);
});

test('a missing revenue fact is not a minus-one-hundred-percent growth report',()=>{
 const priorRevenue=fact(100,'USD','2024-12-31');
 assert.equal(companyRatios({flows:{revenue:fact(null)},priorRevenue}).revenueGrowth,null);
 assert.equal(companyRatios({flows:{revenue:fact(0)},priorRevenue}).revenueGrowth,-100);
 assert.equal(companyRatios({flows:{revenue:fact(110)},priorRevenue}).revenueGrowth,10.000000000000009);
 assert.equal(companyRatios({flows:{revenue:fact(110,'USD','2026-03-31','3M')},priorRevenue}).revenueGrowth,null);
});

test('share subunits use one currency convention in P/E and manual DCF inputs',()=>{
 assert.deepEqual(financialQuote({price:200,currency:'GBX'}),{price:200,currency:'GBP',unitPrice:2});
 assert.equal(companyRatios({quote:{price:200,currency:'GBX'},flows:{eps:fact(.5,'GBP')}}).pe,4);
 assert.equal(financialQuote({price:12345,currency:'ZAc'}).unitPrice,123.45);
 assert.equal(financialQuote({price:Infinity,currency:'USD'}).unitPrice,null);
});

test('DCF uses FCFF/WACC, an end-of-year terminal value and a separate equity bridge',()=>{
 const out=evaluateDcf({...scenario,g:.02,cash:20,debt:50,preferred:10,minority:5,nonOperatingAssets:8,otherClaims:3});
 const pv=Array.from({length:5},(_,i)=>100/1.1**(i+1)).reduce((a,b)=>a+b,0),terminal=(100*1.02/(.1-.02))/1.1**5;
 near(out.enterpriseValue,pv+terminal);near(out.fairValue,(pv+terminal+20-50-10-5+8-3)/100);
 near(out.threshold,out.fairValue*.8);near(out.marginAtPrice,100*(1-8/out.fairValue));
 const table=dcfSensitivity(scenario);assert.ok(table[0][1].value>table[1][1].value&&table[1][1].value>table[2][1].value);assert.ok(table[1][2].value>table[1][1].value);
});

test('DCF never emits a fabricated upside for an unusable price or infinity for extreme inputs',()=>{
 for(const price of [Infinity,NaN,null,0,-1]){const r=evaluateDcf({...scenario,price});assert.equal(r.upside,null);assert.equal(r.marginAtPrice,null);assert.equal(r.status,'no_price');}
 assert.equal(evaluateDcf({...scenario,shares:Number.MIN_VALUE}).error,'invalid');
 assert.equal(evaluateDcf({...scenario,price:Number.MIN_VALUE}).error,'invalid');
});

test('portfolio profit is unknown if cost is missing; asset classes cannot collapse into one concentration bucket',()=>{
 const missing=portfolioMetrics([{asset_id:'TEST',asset_type:'stock',currentValue:10,costBasis:null}]);
 assert.equal(missing.totalValue,10);assert.equal(missing.totalCost,null);assert.equal(missing.totalPnl,null);
 const mixed=portfolioMetrics([{asset_id:'SAME',asset_type:'stock',currentValue:60,costBasis:50},{asset_id:'SAME',asset_type:'crypto',currentValue:40,costBasis:30}]);
 assert.equal(mixed.assets,2);assert.equal(mixed.concentration,60);assert.equal(mixed.totalPnl,20);assert.equal(mixed.totalPnlPct,25);
});

test('contribution plans handle fortnightly periods and reject unsupported or fractional schedules',()=>{
 assert.equal(plannedContributions(100,'weekly',12),5200);assert.equal(plannedContributions(100,'biweekly',12),2600);assert.equal(plannedContributions(100,'monthly',12),1200);
 assert.equal(plannedContributions(100,'daily',12),null);assert.equal(plannedContributions(100,'constructor',12),null);assert.equal(plannedContributions(100,'weekly',1.5),null);
});

test('portfolio daily price return uses prior market values rather than an average of percentages',()=>{
 const positions=[{currentValue:110,change24h:10},{currentValue:90,change24h:-10}];
 near(portfolioPriceChange(positions),0);assert.equal(portfolioPriceChange([{...positions[0],change24h:null}]),null);
 near(quoteInUsd({price:8000,currency:'GBX'},{rates:{GBP:.8}}),100);
});

test('correlations use completed shared observations and remain defined for small but varying FX returns',()=>{
 const start=Date.UTC(2026,8,1)/1000,now=Date.UTC(2026,9,30),a=[],b=[];let x=100,y=1;
 for(let i=0;i<30;i++){if(i){const r=(i%3-1)*1e-7;x*=1+r;y*=1+2*r;}a.push({time:start+i*86400,close:x});b.push({time:start+i*86400,close:y});}
 const sa=closedPriceSeries([...a,{time:Math.floor(now/86400000)*86400,close:1e9}],now),sb=closedPriceSeries(b,now);
 assert.equal(sa.size,30);near(pairedReturnCorrelation(sa,sb).value,1,1e-7);assert.equal(pairedReturnCorrelation(sa,sb).count,29);
 assert.equal(pairedReturnCorrelation(new Map([...sa].map(([d])=>[d,1])),sb).value,null);
 assert.equal(pairedReturnCorrelation(new Map([...sa].slice(0,10)),sb).value,null);
});

test('relative-price chart history is actually bounded to the displayed ninety calendar days',()=>{
 const now=Date.UTC(2026,9,30),today=Math.floor(now/86400000)*86400;
 const rows=Array.from({length:365},(_,i)=>({time:today-(365-i)*86400,close:100+i}));
 assert.equal(closedPriceSeries(rows,now).size,90);assert.equal(closedPriceSeries([...rows,{time:today+86400,close:100}],now).size,90);
});

test('invalid supply and negative volume cannot produce dilution over one hundred percent or negative turnover',()=>{
 const bad=normalizeCryptoResearch({id:'test',market_data:{market_cap:{usd:100},total_volume:{usd:-10},circulating_supply:20,total_supply:15,max_supply:10}});
 assert.equal(bad.volume24h,null);assert.equal(bad.volumeToCap,null);assert.equal(bad.circulatingPercent,null);assert.equal(bad.supplyConsistent,false);assert.equal(bad.partial,true);
 const zero=normalizeCryptoResearch({id:'test',market_data:{market_cap:{usd:100},total_volume:{usd:0},circulating_supply:10,total_supply:20,max_supply:30}});assert.equal(zero.volumeToCap,0);assert.equal(zero.supplyConsistent,true);
});

test('economic surprises compare the same units and never reinterpret a malformed comma as a tenfold change',()=>{
 assert.equal(numericEventValue('1,234.5K'),1234500);assert.equal(numericEventValue('5,2%'),null);assert.equal(numericEventValue('1,23,456M'),null);
 assert.equal(compareEconomicValues('5.2%','5.1%'),'above');assert.equal(compareEconomicValues('5.2%','5.1'),null);assert.equal(compareEconomicValues('120K','120000'),'inline');
});

test('missing model direction or confidence is unknown, not a valid neutral news assessment',()=>{
 const article={title:'Apple gains 5%',analysisDepth:'rss',analysisText:'Apple reported stronger sales in China during the latest quarter.'};
 const item={index:0,language:'es',localizedTitle:'Apple sube 5%',summary:'La empresa informa de una mejora de sus ventas.',mechanism:'Las ventas pueden cambiar las expectativas del mercado.',watch:'Revisar las ventas y los resultados de la empresa.',limitations:'El texto no detalla las cifras de ventas.',factors:{severity:20,assetLink:60,surprise:20,persistence:20,evidence:40},direction:0,confidence:60,evidenceQuote:article.analysisText};
 assert.ok(validateItem(item,0,article,'es'));
 for(const update of [{direction:null},{direction:''},{direction:101},{confidence:null},{confidence:0},{factors:{...item.factors,severity:true}}])assert.equal(validateItem({...item,...update},0,article,'es'),null);
});

test('technical alerts require a fresh closed-price snapshot; valid RSI zero remains an actual numeric observation',()=>{
 const now=Date.UTC(2026,9,30),alert={asset_type:'crypto',alert_type:'rsi_oversold'},analysis={indicators:{rsi:{current:0}},meta:{to:now/1000-86400}};
 assert.equal(evaluateAlertCondition(alert,null,analysis,now),true);
 for(const to of [undefined,NaN,now/1000+1,now/1000-4*86400])assert.equal(evaluateAlertCondition(alert,null,{...analysis,meta:{to}},now),false);
});

test('display precision preserves FX pips and very small indicator values instead of rendering zero',()=>{
 assert.equal(quotePrecision(1.23456),5);assert.equal(quotePrecision(150.123),3);
 assert.equal(formatNumeric(1.23456,'en'),'1.23456');assert.equal(formatNumeric(1.23456,'es'),'1,23456');
 assert.notEqual(formatNumeric(1.23456e-9,'en'),'0');assert.match(formatNumeric(1e-22,'en'),/E/);assert.equal(formatNumeric(NaN),'—');
});

test('an attractive technical reading cannot conceal stale or mismatched annual company accounts',()=>{
 const now=Date.UTC(2026,9,30),company={yearEnd:'2025-12-31',company:{sector:'Technology'},flows:{earnings:fact(20),operatingCashFlow:fact(30),capex:fact(10)}};
 const input={isStock:true,now,analysis:{summary:{score10:8,coverage:100}},company};
 assert.equal(entrySummary(input),'favorable');
 for(const yearEnd of ['2020-12-31','2027-12-31','bad'])assert.equal(entrySummary({...input,company:{...company,yearEnd}}),'incomplete');
 assert.equal(entrySummary({...input,company:{...company,flows:{...company.flows,earnings:fact(20,'USD','2024-12-31')}}}),'incomplete');
});
