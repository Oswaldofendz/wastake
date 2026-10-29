// Portfolio costs are recorded in USD. Never add a local-currency quote to them.
export function normalizeUsdRates(data, now=Date.now()) {
  const timestamp=Number(data?.time_last_update_unix)*1000;
  if(data?.result!=='success'||data?.base_code!=='USD'||!Number.isFinite(timestamp)||timestamp>now||now-timestamp>3*86400000)return null;
  const rates=Object.fromEntries(Object.entries(data.rates??{}).filter(([code,rate])=>/^[A-Z]{3}$/.test(code)&&Number.isFinite(rate)&&rate>0));
  if(rates.USD!==1)return null;
  return {rates,date:new Date(timestamp).toISOString(),source:'ExchangeRate-API',sourceUrl:'https://www.exchangerate-api.com/'};
}

export function quoteInUsd(asset, fx) {
  if(!Number.isFinite(asset?.price)||asset.price<=0)return null;
  const currency=asset.currency??(asset.type==='crypto'?'USD':null);
  if(currency==='USD')return asset.price;
  const subunit=({GBp:['GBP',100],GBX:['GBP',100],ZAc:['ZAR',100]})[currency];
  const code=subunit?.[0]??currency,scale=subunit?.[1]??1,rate=fx?.rates?.[code];
  return Number.isFinite(rate)&&rate>0?asset.price/scale/rate:null;
}

// Price-only change at today's FX references, not a complete account return.
export function portfolioPriceChange(positions) {
  const real=positions.filter(p=>!p.is_simulation);
  if(!real.length||real.some(p=>!Number.isFinite(p.currentValue)||p.currentValue<=0||!Number.isFinite(p.change24h)||p.change24h<=-100))return null;
  const current=real.reduce((sum,p)=>sum+p.currentValue,0);
  const previous=real.reduce((sum,p)=>sum+p.currentValue/(1+p.change24h/100),0);
  return previous>0?(current/previous-1)*100:null;
}
