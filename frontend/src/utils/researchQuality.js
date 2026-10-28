const finite=n=>Number.isFinite(n);
export function researchQuality(data,type,now=Date.now()){
 const checks=type==='crypto'?{
  identity:!!data?.id&&!!data?.symbol,price:data?.price>0,capitalization:data?.marketCap>0,
  volume:finite(data?.volume24h)&&data.volume24h>0,supply:data?.circulating>0,
  dilution:data?.fdv>0&&(data?.totalSupply>0||data?.maxSupply>0),
  date:finite(Date.parse(data?.dataAsOf))&&Date.parse(data.dataAsOf)<=now&&now-Date.parse(data.dataAsOf)<=36*3600000,
  profile:!!data?.description,
 }:{
  identity:!!data?.symbol&&!!data?.company?.name,price:data?.quote?.price>0,capitalization:data?.marketCap?.value>0,
  revenue:finite(data?.flows?.revenue?.value),earnings:finite(data?.flows?.earnings?.value),
  cashflow:finite(data?.flows?.operatingCashFlow?.value)&&finite(data?.flows?.capex?.value),
  balance:finite(data?.snapshot?.debt?.value)&&finite(data?.snapshot?.cash?.value),
  date:finite(Date.parse(data?.yearEnd))&&Date.parse(data.yearEnd)<=now&&now-Date.parse(data.yearEnd)<=550*86400000,
  profile:!!data?.company?.description,
 };
 const missing=Object.entries(checks).filter(([,ok])=>!ok).map(([key])=>key);
 return {checks,missing,available:Object.keys(checks).length-missing.length,total:Object.keys(checks).length,complete:!missing.length};
}
export function cryptoValuation(data){
 const quality=researchQuality(data,'crypto');
 // Market-cap/FDV and price declines are NOT intrinsic-value estimates.
 // Exchange turnover is not order-book depth or token-holder income.
 return {status:'unpriced',quality,fdvToCap:data?.marketCap>0&&data?.fdv>0?data.fdv/data.marketCap:null,
  mintedFloat:data?.totalSupply>0&&data?.circulating>=0&&data.circulating<=data.totalSupply?100*data.circulating/data.totalSupply:null,
  capacityFloat:data?.maxSupply>0&&data?.circulating>=0&&data.circulating<=data.maxSupply?100*data.circulating/data.maxSupply:null,
  marketValueFormula:'price × circulating supply',fundamentalGaps:['holderIncome','unlocks','usage','security']};
}
