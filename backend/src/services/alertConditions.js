// Missing data is never zero and must never satisfy an alert comparison.
export function evaluateAlertCondition(alert,quote,analysis,now=Date.now()){
 const type=alert.alert_type,target=alert.target_value;
 if(type.startsWith('price_')||type.startsWith('change_')){
  const stamp=Date.parse(quote?.quoteAsOf),maxAge=alert.asset_type==='crypto'?30*60000:4*86400000;
  if(!quote||quote.id!==alert.asset_id||quote.isStale||!Number.isFinite(stamp)||stamp>now||now-stamp>maxAge||!Number.isFinite(target))return false;
  if(type.startsWith('price_')){
   // Saved price targets are explicitly USD; legacy foreign targets cannot be
   // reinterpreted in another currency without the owner's confirmation.
   if(quote.currency!=='USD'||!Number.isFinite(quote.price)||quote.price<=0||target<=0)return false;
   return type==='price_above'?quote.price>=target:type==='price_below'?quote.price<=target:false;
  }
  if(!Number.isFinite(quote.change24h))return false;
  return type==='change_above'?quote.change24h>=target:type==='change_below'?quote.change24h<=target:false;
 }
 const rsi=analysis?.indicators?.rsi?.current,histogram=analysis?.indicators?.macd?.current?.histogram;
 if(type==='rsi_overbought')return Number.isFinite(rsi)&&rsi>=70;
 if(type==='rsi_oversold')return Number.isFinite(rsi)&&rsi<=30;
 if(type==='macd_bullish')return Number.isFinite(histogram)&&histogram>0;
 if(type==='macd_bearish')return Number.isFinite(histogram)&&histogram<0;
 return false;
}
