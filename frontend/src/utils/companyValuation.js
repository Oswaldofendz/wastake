const value=f=>Number.isFinite(f?.value)?f.value:null;
const sameCurrency=(...facts)=>facts.every(f=>f&&f.currency&&f.currency===facts[0].currency);
const samePeriod=(...facts)=>facts.every(f=>f?.date&&f.date===facts[0].date&&(!f.period||!facts[0].period||f.period===facts[0].period));
const ratio=(numerator,denominator)=>Number.isFinite(numerator)&&Number.isFinite(denominator)&&denominator>0&&Number.isFinite(numerator/denominator)?numerator/denominator:null;

export function financialQuote(quote) {
  const price=Number.isFinite(quote?.price)&&quote.price>0?quote.price:null;
  const subunit=({GBp:['GBP',100],GBX:['GBP',100],ZAc:['ZAR',100]})[quote?.currency];
  return {price,currency:subunit?.[0]??quote?.currency,unitPrice:price===null?null:price/(subunit?.[1]??1)};
}

export function companyRatios(data) {
  const f=data?.flows??{},b=data?.snapshot??{},q=data?.quote;
  const {price,currency,unitPrice}=financialQuote(q);
  const cap=data?.marketCap?.currency===currency&&value(data?.marketCap)>0?value(data?.marketCap):null;
  const fcf=[f.operatingCashFlow,f.capex].every(f=>value(f)!==null)&&sameCurrency(f.operatingCashFlow,f.capex)&&samePeriod(f.operatingCashFlow,f.capex)?value(f.operatingCashFlow)-Math.abs(value(f.capex)):null;
  const netDebt=[b.debt,b.cash].every(f=>value(f)!==null)&&sameCurrency(b.debt,b.cash)&&b.debt.date===b.cash.date?value(b.debt)-value(b.cash):null;
  const completeBridge=[b.debt,b.cash,b.preferred,b.minority].every(f=>value(f)!==null&&f.date===b.debt.date)&&sameCurrency(b.debt,b.cash,b.preferred,b.minority)&&b.debt.currency===currency;
  const ev=cap!==null&&completeBridge?cap+value(b.debt)+value(b.preferred)+value(b.minority)-value(b.cash):null;
  const opMargin=sameCurrency(f.operatingIncome,f.revenue)&&samePeriod(f.operatingIncome,f.revenue)?ratio(value(f.operatingIncome),value(f.revenue)):null;
  const growthDays=(Date.parse(f.revenue?.date)-Date.parse(data?.priorRevenue?.date))/86400000;
  const growthCompatible=sameCurrency(f.revenue,data?.priorRevenue)&&value(f.revenue)!==null&&value(data?.priorRevenue)>0&&growthDays>330&&growthDays<400&&(!f.revenue.period||!data.priorRevenue.period||f.revenue.period===data.priorRevenue.period);
  return {price,currency,fcf,netDebt,ev,pe:f.eps?.currency===currency?ratio(unitPrice,value(f.eps)):null,
    ps:f.revenue?.currency===currency?ratio(cap,value(f.revenue)):null,pfcf:f.operatingCashFlow?.currency===currency?ratio(cap,fcf):null,
    evEbitda:f.ebitda?.currency===currency?ratio(ev,value(f.ebitda)):null,
    operatingMargin:opMargin===null?null:opMargin*100,
    revenueGrowth:growthCompatible?(value(f.revenue)/value(data.priorRevenue)-1)*100:null};
}

export function evaluateDcf(input) {
  const {cashFlows,wacc,g,cash,debt,preferred,minority,nonOperatingAssets,otherClaims,shares,price,margin}=input;
  const adjustments=[cash,debt,preferred,minority,nonOperatingAssets,otherClaims];
  if(!Array.isArray(cashFlows)||cashFlows.length!==5||!cashFlows.every(Number.isFinite)||![wacc,g,shares,margin,...adjustments].every(Number.isFinite))return {error:'missing'};
  if(!(wacc>0&&wacc<=1&&g>-1&&wacc>g&&shares>0&&margin>=0&&margin<1)||adjustments.some(v=>v<0))return {error:'invalid'};
  if(cashFlows.at(-1)<=0)return {error:'terminal'};
  const pvFlows=cashFlows.map((fcf,i)=>fcf/(1+wacc)**(i+1));
  const terminalValue=cashFlows.at(-1)*(1+g)/(wacc-g);
  const pvTerminal=terminalValue/(1+wacc)**5;
  const enterpriseValue=pvFlows.reduce((a,b)=>a+b,0)+pvTerminal;
  const equityValue=enterpriseValue+cash+nonOperatingAssets-debt-preferred-minority-otherClaims;
  const fairValue=equityValue>0?equityValue/shares:null;
  const threshold=fairValue===null?null:fairValue*(1-margin);
  const hasPrice=Number.isFinite(price)&&price>0;
  if(![enterpriseValue,equityValue,terminalValue,pvTerminal].every(Number.isFinite))return {error:'invalid'};
  if(fairValue!==null&&(!Number.isFinite(fairValue)||!Number.isFinite(threshold)))return {error:'invalid'};
  if(fairValue>0&&hasPrice&&(!Number.isFinite(fairValue/price)||!Number.isFinite(price/fairValue)))return {error:'invalid'};
  const tolerance=(fairValue??0)*1e-10;
  const status=fairValue===null?'no_equity':!hasPrice?'no_price':Math.abs(price-fairValue)<=tolerance?'at_value':price<=threshold+tolerance?'below_margin':price<fairValue?'below':'above';
  return {pvFlows,terminalValue,pvTerminal,enterpriseValue,equityValue,fairValue,threshold,status,
    upside:fairValue&&hasPrice?(fairValue/price-1)*100:null,
    marginAtPrice:fairValue&&hasPrice?(1-price/fairValue)*100:null,
    terminalWeight:enterpriseValue>0?pvTerminal/enterpriseValue*100:null};
}

export function dcfSensitivity(input) {
  return [-0.01,0,0.01].map(dr=>[-0.005,0,0.005].map(dg=>{
    const wacc=input.wacc+dr,g=input.g+dg;
    const result=evaluateDcf({...input,wacc,g});
    return {wacc,g,value:result.fairValue??null};
  }));
}
