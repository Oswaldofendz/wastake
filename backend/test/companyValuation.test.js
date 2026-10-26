import test from 'node:test';
import assert from 'node:assert/strict';
import { companyRatios,evaluateDcf,dcfSensitivity } from '../../frontend/src/utils/companyValuation.js';
import { parseFinancialSeries } from '../src/services/companyResearchService.js';
import { protectFinancialNames,restoreFinancialNames } from '../src/services/financialLanguageService.js';
import { entrySummary } from '../../frontend/src/utils/entrySummary.js';

// Synthetic fixtures: these are not financial records or production defaults.
const scenario=()=>({cashFlows:[100,100,100,100,100],wacc:.1,g:0,cash:0,debt:0,preferred:0,minority:0,nonOperatingAssets:0,otherClaims:0,shares:100,price:8,margin:.2});
const fact=(value,currency='USD',date='2025-12-31')=>({value,currency,date});
test('quick reading uses the existing score boundaries and never invents missing direction',()=>{
  const input=score=>({analysis:{summary:{score10:score,coverage:100}}});
  assert.equal(entrySummary(input(4)),'wait');assert.equal(entrySummary(input(4.1)),'mixed');assert.equal(entrySummary(input(5.9)),'mixed');assert.equal(entrySummary(input(6)),'favorable');
  assert.equal(entrySummary({loading:true}),'pending');assert.equal(entrySummary({error:true}),'unavailable');
  assert.equal(entrySummary(input(null)),'unavailable');assert.equal(entrySummary(input(11)),'unavailable');
  assert.equal(entrySummary({analysis:{summary:{score10:9,coverage:65}}}),'incomplete');
});
test('bullish technicals cannot conceal losses, negative cash flow or unavailable company accounts',()=>{
  const input={isStock:true,analysis:{summary:{score10:8,coverage:100}},company:{yearEnd:'2025-12-31',company:{sector:'Technology'},flows:{earnings:fact(30),operatingCashFlow:fact(50),capex:fact(-10)}}};
  assert.equal(entrySummary(input),'favorable');
  assert.equal(entrySummary({...input,company:null}),'incomplete');
  assert.equal(entrySummary({...input,company:{...input.company,company:null}}),'incomplete');
  assert.equal(entrySummary({...input,company:{...input.company,flows:{...input.company.flows,earnings:fact(-1)}}}),'caution');
  assert.equal(entrySummary({...input,company:{...input.company,flows:{...input.company.flows,capex:fact(-70)}}}),'caution');
  assert.equal(entrySummary({...input,company:{...input.company,flows:{...input.company.flows,operatingCashFlow:null}}}),'incomplete');
  assert.equal(entrySummary({...input,company:{...input.company,company:{sector:'Finance'}}}),'specialist');
});
test('scenario price caution overrides favorable entry presentation but invalid inputs do not create a valuation',()=>{
  const input={isStock:true,analysis:{summary:{score10:8,coverage:100}},company:{yearEnd:'2025-12-31',company:{sector:'Industrials'},flows:{earnings:fact(30),operatingCashFlow:fact(50),capex:fact(-10)}}};
  assert.equal(entrySummary({...input,scenario:{status:'above',fairValue:10}}),'valuationCaution');
  assert.equal(entrySummary({...input,scenario:{status:'no_equity',fairValue:null}}),'valuationCaution');
  assert.equal(entrySummary({...input,scenario:{error:'missing'}}),'favorable');
  assert.equal(entrySummary({...input,analysis:{summary:{score10:3,coverage:100}},scenario:{status:'below_margin',fairValue:30}}),'wait');
});
test('constant FCFF perpetuity, separate safety discount and upside',()=>{
  const r=evaluateDcf(scenario());
  assert.ok(Math.abs(r.enterpriseValue-1000)<1e-8);
  assert.ok(Math.abs(r.fairValue-10)<1e-8);
  assert.equal(r.status,'below_margin');assert.ok(Math.abs(r.marginAtPrice-20)<1e-8);assert.ok(Math.abs(r.upside-25)<1e-8);
  assert.equal(evaluateDcf({...scenario(),price:10}).status,'at_value');
  assert.equal(evaluateDcf({...scenario(),price:9}).status,'below');
  assert.equal(evaluateDcf({...scenario(),price:11}).status,'above');
});
test('equity bridge subtracts preferred and minority; recognizes cash',()=>{
  assert.ok(Math.abs(evaluateDcf({...scenario(),cash:20,debt:50,preferred:30,minority:40,otherClaims:10,nonOperatingAssets:10}).fairValue-9)<1e-8);
});
test('no fabricated value from missing assumptions or invalid perpetuity',()=>{
  assert.equal(evaluateDcf({...scenario(),cash:NaN}).error,'missing');
  assert.equal(evaluateDcf({...scenario(),wacc:0}).error,'invalid');
  assert.equal(evaluateDcf({...scenario(),g:.1}).error,'invalid');
  assert.equal(evaluateDcf({...scenario(),shares:0}).error,'invalid');
  assert.equal(evaluateDcf({...scenario(),cashFlows:[1,2,3,4,-1]}).error,'terminal');
  assert.equal(evaluateDcf({...scenario(),cashFlows:[-10,-5,3,50,100]}).error,undefined);
  assert.equal(evaluateDcf({...scenario(),debt:2000}).status,'no_equity');
  assert.equal(evaluateDcf({...scenario(),price:null}).status,'no_price');
  assert.equal(dcfSensitivity({...scenario(),g:.095})[0][1].value,null);
});
test('missing or negative company data cannot become cheap multiples or zero margin',()=>{
  const empty=companyRatios({quote:{price:20,currency:'USD'}});
  assert.equal(empty.operatingMargin,null);assert.equal(empty.fcf,null);assert.equal(empty.pe,null);assert.equal(empty.ps,null);
  const negative=companyRatios({quote:{price:20,currency:'USD'},marketCap:fact(100),flows:{revenue:fact(40),eps:fact(-2),operatingCashFlow:fact(5),capex:fact(-10)}});
  assert.equal(negative.pe,null);assert.equal(negative.pfcf,null);assert.equal(negative.fcf,-5);assert.equal(negative.ps,2.5);
  assert.equal(companyRatios({flows:{operatingCashFlow:fact(null),capex:fact(5)}}).fcf,null);
});
test('ratios respect periods, currencies and missing enterprise-value adjustments',()=>{
  const r=companyRatios({quote:{price:100,currency:'EUR'},marketCap:fact(1000),flows:{revenue:fact(50),eps:fact(2),operatingCashFlow:fact(20),capex:fact(5,'USD','2024-12-31')}});
  assert.equal(r.pe,null);assert.equal(r.ps,null);assert.equal(r.fcf,null);assert.equal(r.ev,null);
  const gb=companyRatios({quote:{price:200,currency:'GBp'},flows:{eps:fact(.5,'GBP')}});assert.equal(gb.pe,4);
  assert.equal(companyRatios({quote:{price:null,currency:'GBp'},flows:{eps:fact(.5,'GBP')}}).pe,null);
});
test('financial parser aligns annual flows and dated balance without filling missing facts',()=>{
  const row=(tag,values)=>({meta:{type:[tag]},[tag]:values.map(([date,value,periodType='12M'])=>({asOfDate:date,reportedValue:{raw:value},currencyCode:'USD',periodType}))});
  const parsed=parseFinancialSeries([
    row('annualTotalRevenue',[['2024-12-31',80],['2025-12-31',100],['2027-12-31',900]]),
    row('annualCapitalExpenditure',[['2024-12-31',-8],['2025-12-31',-10]]),
    row('annualNetIncome',[['2024-12-31',3]]),
    row('quarterlyTotalDebt',[['2026-03-31',50,'3M']]),
    row('quarterlyCashAndCashEquivalents',[['2025-12-31',10,'3M']]),
  ],Date.parse('2026-10-26'));
  assert.equal(parsed.yearEnd,'2025-12-31');assert.equal(parsed.flows.capex.value,-10);assert.equal(parsed.flows.earnings,null);
  assert.equal(parsed.priorRevenue.value,80);assert.equal(parsed.balanceDate,'2026-03-31');assert.equal(parsed.snapshot.cash,null);
  const annualOnly=parseFinancialSeries([row('quarterlyTotalDebt',[]),row('annualTotalDebt',[['2025-12-31',50]])],Date.parse('2026-10-26'));
  assert.equal(annualOnly.balanceDate,'2025-12-31');assert.equal(annualOnly.snapshot.debt.value,50);
});
test('dynamic company identities survive translation placeholders including punctuation',()=>{
  const original='Boeing and ASML Holding N.V. report $100 in sales.';
  const p=protectFinancialNames(original,['ASML Holding N.V.','Boeing']);
  assert.ok(!p.text.includes('Boeing'));assert.ok(!p.text.includes('ASML Holding N.V.'));
  assert.equal(restoreFinancialNames(p.text,p.identities),original);
  assert.equal(restoreFinancialNames(p.text.replace(p.identities[0].token,''),p.identities),null);
  const bank=protectFinancialNames('Bank of America serves customers.',['Bank of America Corporation']);
  assert.ok(!bank.text.includes('Bank of America'));
  assert.equal(restoreFinancialNames(bank.text,bank.identities),'Bank of America serves customers.');
});
