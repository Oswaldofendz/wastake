// Calculations use observed OHLCV bars only. Callers pass completed candles.
export function atrAdxPoints(bars,period=14){
 let trSum=0,plusSum=0,minusSum=0,adx=null,dxSeed=[];const atr=[],adxRows=[];
 for(let i=1;i<bars.length;i++){
  const c=bars[i],p=bars[i-1],tr=Math.max(c.high-c.low,Math.abs(c.high-p.close),Math.abs(c.low-p.close));
  const up=c.high-p.high,down=p.low-c.low,plus=up>down&&up>0?up:0,minus=down>up&&down>0?down:0;
  if(i<=period){trSum+=tr;plusSum+=plus;minusSum+=minus;}else{trSum=trSum-trSum/period+tr;plusSum=plusSum-plusSum/period+plus;minusSum=minusSum-minusSum/period+minus;}
  if(i<period)continue;
  atr.push({time:c.time,value:trSum/period});
  const pdi=trSum>0?100*plusSum/trSum:0,mdi=trSum>0?100*minusSum/trSum:0,dx=pdi+mdi>0?100*Math.abs(pdi-mdi)/(pdi+mdi):0;
  if(adx===null){dxSeed.push(dx);if(dxSeed.length<period)continue;adx=dxSeed.reduce((s,v)=>s+v,0)/period;}else adx=(adx*(period-1)+dx)/period;
  adxRows.push({time:c.time,value:adx,pdi,mdi});
 }
 return {atr,adx:adxRows};
}
export function stochasticPoints(bars,period=14){
 const rows=[];
 for(let i=period-1;i<bars.length;i++){const sample=bars.slice(i-period+1,i+1),low=Math.min(...sample.map(b=>b.low)),high=Math.max(...sample.map(b=>b.high));if(high===low)continue;const k=100*(bars[i].close-low)/(high-low);rows.push({time:bars[i].time,value:k,index:i});}
 return rows.map((r,i)=>({...r,signal:i>=2&&rows[i-2].index===r.index-2?(r.value+rows[i-1].value+rows[i-2].value)/3:null}));
}
export function obvPoints(bars){
 if(!bars.length||bars.some(b=>!Number.isFinite(b.volume)||b.volume<0))return [];
 let value=0;return bars.map((b,i)=>{if(i)value+=Math.sign(b.close-bars[i-1].close)*b.volume;return {time:b.time,value};});
}
export function vwapPoints(bars,intervalSeconds){
 if(!intervalSeconds||intervalSeconds>=86400)return [];
 let day=null,pv=0,volume=0,valid=true,previous=null;const out=[];
 for(const b of bars){const nextDay=Math.floor(b.time/86400);if(nextDay!==day){day=nextDay;pv=0;volume=0;valid=true;previous=null;}
  if(previous!==null&&b.time-previous>intervalSeconds*1.1)valid=false;
  if(!Number.isFinite(b.volume)||b.volume<0)valid=false;
  previous=b.time;if(!valid)continue;volume+=b.volume;pv+=(b.high+b.low+b.close)/3*b.volume;if(volume>0)out.push({time:b.time,value:pv/volume});
 }
 return out;
}
// FVG: separation of first/third wicks, confirmed by the third completed bar.
// A later wick reaching the far edge retires the zone. This is not order-book imbalance.
export function fairValueGaps(bars,intervalSeconds=86400,limit=5){
 if(bars.length<3)return [];
 const atrMap=new Map(atrAdxPoints(bars).atr.map(p=>[p.time,p.value])),zones=[];
 for(let i=Math.max(2,bars.length-120);i<bars.length;i++){
  const a=bars[i-2],b=bars[i-1],c=bars[i];
  if(intervalSeconds<86400&&(b.time-a.time!==intervalSeconds||c.time-b.time!==intervalSeconds))continue;
  const bullish=c.low>a.high&&b.close>b.open,bearish=c.high<a.low&&b.close<b.open;
  if(!bullish&&!bearish)continue;
  const atr=atrMap.get(b.time);if(!Number.isFinite(atr))continue;
  const low=bullish?a.high:c.high,high=bullish?c.low:a.low;
  if(high-low<Math.max(c.close*.0005,atr*.1)||Math.abs(b.close-b.open)<atr*.5)continue;
  let filled=false,remainingLow=low,remainingHigh=high;
  for(const later of bars.slice(i+1)){if((bullish&&later.low<=low)||(!bullish&&later.high>=high)){filled=true;break;}if(bullish)remainingHigh=Math.min(remainingHigh,later.low);else remainingLow=Math.max(remainingLow,later.high);}
  if(!filled)zones.push({direction:bullish?'bullish':'bearish',low:remainingLow,high:remainingHigh,originalLow:low,originalHigh:high,formedAt:c.time,partial:remainingLow!==low||remainingHigh!==high});
 }
 const price=bars.at(-1).close,distance=z=>price<z.low?z.low-price:price>z.high?price-z.high:0;
 return zones.sort((a,b)=>distance(a)-distance(b)||b.formedAt-a.formedAt).slice(0,limit);
}
