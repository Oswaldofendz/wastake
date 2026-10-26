import axios from 'axios';
import { createSingleFlight } from './singleFlight.js';
import { getSingleQuote } from './priceService.js';

const headers={ 'User-Agent':'Mozilla/5.0 (compatible; WaStake/1.0)', Accept:'application/json' };
const cache=new Map();
const once=createSingleFlight();
const annual={revenue:'TotalRevenue',earnings:'NetIncome',eps:'DilutedEPS',operatingIncome:'OperatingIncome',ebitda:'EBITDA',operatingCashFlow:'OperatingCashFlow',capex:'CapitalExpenditure'};
const balance={debt:'TotalDebt',cash:'CashAndCashEquivalents',investments:'OtherShortTermInvestments',equity:'StockholdersEquity',shares:'OrdinarySharesNumber',preferred:'PreferredStock',minority:'MinorityInterest'};
const types=[...Object.values(annual).map(t=>`annual${t}`),...Object.values(balance).flatMap(t=>[`quarterly${t}`,`annual${t}`])];
function shortProfile(value) {
  const text=String(value||'').replace(/\s+/g,' ').trim();
  if(text.length<=360)return text;
  const excerpt=text.slice(0,357);
  const sentence=excerpt.lastIndexOf('. ');
  return sentence>180?excerpt.slice(0,sentence+1):`${excerpt.slice(0,excerpt.lastIndexOf(' '))}…`;
}

export function parseFinancialSeries(rows=[],now=Date.now()) {
  const output={};
  for(const row of rows) {
    const tag=row.meta?.type?.[0];
    if(!types.includes(tag)||!Array.isArray(row[tag]))continue;
    const dates=new Map();
    for(const fact of row[tag]) {
      const value=fact.reportedValue?.raw;
      const end=Date.parse(fact.asOfDate);
      if(!Number.isFinite(value)||!Number.isFinite(end)||end>now)continue;
      if(tag.startsWith('annual')&&fact.periodType!=='12M')continue;
      dates.set(fact.asOfDate,{value,date:fact.asOfDate,currency:fact.currencyCode||null,period:fact.periodType,tag});
    }
    output[tag]=[...dates.values()].sort((a,b)=>a.date.localeCompare(b.date));
  }
  const yearEnd=output.annualTotalRevenue?.at(-1)?.date??null;
  const flows=Object.fromEntries(Object.entries(annual).map(([key,suffix])=>[key,output[`annual${suffix}`]?.find(f=>f.date===yearEnd)??null]));
  const pointCandidates=Object.values(balance).flatMap(suffix=>[...(output[`quarterly${suffix}`]??[]),...(output[`annual${suffix}`]??[])]);
  const balanceDate=pointCandidates.filter(f=>f.tag.endsWith('TotalDebt')||f.tag.endsWith('CashAndCashEquivalents')).sort((a,b)=>a.date.localeCompare(b.date)).at(-1)?.date??null;
  const snapshot=Object.fromEntries(Object.entries(balance).map(([key,suffix])=>[key,output[`quarterly${suffix}`]?.find(f=>f.date===balanceDate)??output[`annual${suffix}`]?.find(f=>f.date===balanceDate)??null]));
  const priorRevenue=output.annualTotalRevenue?.filter(f=>f.date<yearEnd&&Date.parse(yearEnd)-Date.parse(f.date)>330*86400000&&Date.parse(yearEnd)-Date.parse(f.date)<400*86400000).at(-1)??null;
  return {yearEnd,balanceDate,flows,snapshot,priorRevenue};
}

function numeric(value) {
  if(typeof value!=='string'&&typeof value!=='number')return null;
  const n=Number(String(value).replace(/[$,]/g,''));
  return Number.isFinite(n)&&n>0?n:null;
}

async function loadResearch(symbol) {
  const hit=cache.get(symbol);
  if(hit&&Date.now()-hit.at<3600_000)return hit.value;
  return once(symbol,async()=>{
    const end=Math.floor(Date.now()/1000);
    const start=end-5*366*86400;
    const financialUrl=`https://query1.finance.yahoo.com/ws/fundamentals-timeseries/v1/finance/timeseries/${encodeURIComponent(symbol)}`;
    const [financial,profile,summary]=await Promise.allSettled([
      axios.get(financialUrl,{params:{type:types.join(','),period1:start,period2:end},headers,timeout:15000,maxContentLength:3_000_000}),
      axios.get(`https://api.nasdaq.com/api/company/${encodeURIComponent(symbol)}/company-profile`,{headers,timeout:8000}),
      axios.get(`https://api.nasdaq.com/api/quote/${encodeURIComponent(symbol)}/summary`,{params:{assetclass:'stocks'},headers,timeout:8000}),
    ]);
    const p=profile.status==='fulfilled'?profile.value.data?.data:null;
    const verifiedProfile=p?.Symbol?.value===symbol?p:null;
    const s=summary.status==='fulfilled'?summary.value.data?.data:null;
    const marketCap=s?.symbol===symbol?numeric(s.summaryData?.MarketCap?.value):null;
    const company=verifiedProfile?{
      name:p.CompanyName?.value||symbol,description:shortProfile(p.CompanyDescription?.value),sector:p.Sector?.value||null,industry:p.Industry?.value||null,
      website:/^https?:\/\//i.test(p.CompanyUrl?.value||'')?p.CompanyUrl.value:null,
      sourceUrl:`https://www.nasdaq.com/market-activity/stocks/${encodeURIComponent(symbol.toLowerCase())}/company-profile`,
    }:null;
    const statements=financial.status==='fulfilled'?parseFinancialSeries(financial.value.data?.timeseries?.result??[]):parseFinancialSeries();
    const value={symbol,company,...statements,marketCap:marketCap?{value:marketCap,currency:'USD',source:'Nasdaq',date:new Date().toISOString()}:null,
      financialSource:'Yahoo Finance',financialSourceUrl:`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/financials/`,
      balanceSourceUrl:`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/balance-sheet/`,
      cashSourceUrl:`https://finance.yahoo.com/quote/${encodeURIComponent(symbol)}/cash-flow/`,
      retrievedAt:new Date().toISOString(),partial:!company||!statements.yearEnd||!marketCap};
    if(cache.size>=150)cache.delete(cache.keys().next().value);
    cache.set(symbol,{at:Date.now(),value});
    return value;
  });
}

export async function getCompanyResearch(symbol,type='stock') {
  if(type!=='stock')return {symbol,type,applicable:false,retrievedAt:new Date().toISOString()};
  const [financial,quote]=await Promise.allSettled([loadResearch(symbol),getSingleQuote(symbol,'stock')]);
  return {symbol,type,applicable:true,...(financial.status==='fulfilled'?financial.value:{partial:true,flows:{},snapshot:{}}),quote:quote.status==='fulfilled'?quote.value:null};
}
