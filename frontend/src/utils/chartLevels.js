// Confirmed swing zones, evaluated only with candles available at the cutoff.
import {timedCandles} from './timedCandles.js';
export function cleanCandles(input = []) {
  const byDay = new Map();
  const byTime = new Map((Array.isArray(input)?input:[]).filter(c=>c&&[c.time,c.open,c.high,c.low,c.close].every(Number.isFinite)&&c.low>0&&c.high>=Math.max(c.open,c.close)&&c.low<=Math.min(c.open,c.close)).map(c=>[c.time,c]));
  for (const c of [...byTime.values()].sort((a,b)=>a.time-b.time)) {
    if (![c.time,c.open,c.high,c.low,c.close].every(Number.isFinite) || c.low <= 0 || c.high < Math.max(c.open,c.close) || c.low > Math.min(c.open,c.close)) continue;
    const time=Math.floor(c.time/86400)*86400;
    const previous=byDay.get(time);
    byDay.set(time,previous?{...previous,high:Math.max(previous.high,c.high),low:Math.min(previous.low,c.low),close:c.close,volume:Number.isFinite(previous.volume)&&Number.isFinite(c.volume)?previous.volume+c.volume:undefined}:{...c,time});
  }
  return [...byDay.values()].sort((a,b) => a.time-b.time);
}

export function emaSeries(candles, period) {
  if (candles.length < period) return [];
  let value = candles.slice(0,period).reduce((s,c) => s+c.close,0)/period;
  const out = [{time:candles[period-1].time,value}];
  for (let i=period;i<candles.length;i++) {
    value += (candles[i].close-value)*2/(period+1);
    out.push({time:candles[i].time,value});
  }
  return out;
}

function meanTrueRange(candles,end) {
  const start=Math.max(1,end-13);
  if(end<start)return 0;
  let sum=0;
  for(let i=start;i<=end;i++){const c=candles[i],previous=candles[i-1].close;sum+=Math.max(c.high-c.low,Math.abs(c.high-previous),Math.abs(c.low-previous));}
  return sum/(end-start+1);
}

export function significantLevels(input, wing = null, now = Date.now(),intervalSeconds=86400) {
  if(wing===null){
    const candidates=[...significantLevels(input,2,now,intervalSeconds),...significantLevels(input,5,now,intervalSeconds)];
    return ['support','resistance'].map(kind=>candidates.filter(l=>l.kind===kind).sort((a,b)=>a.distancePct-b.distancePct)[0]).filter(Boolean);
  }
  const all=(intervalSeconds===86400?cleanCandles(input):timedCandles(input)).filter(c=>c.time<=now/1000);
  const today=now/1000;
  // An unfinished daily candle can locate today's price, never confirm a pivot.
  const candles=all.filter(c=>intervalSeconds===86400?c.time<Math.floor(now/86400000)*86400:c.time+intervalSeconds<=today).slice(-120);
  if(!Number.isInteger(wing)||wing<1||candles.length<Math.max(14,wing*2+2))return [];
  const last=all.at(-1).close;
  const atr=meanTrueRange(candles,candles.length-1);
  if(!(atr>0))return [];
  const tolerance=Math.max(atr*.35,last*.001);
  const breakBuffer=Math.max(atr*.25,last*.0005);
  const swings=[];
  for(let i=wing;i<candles.length-wing;i++){
    const c=candles[i],left=candles.slice(i-wing,i),right=candles.slice(i+1,i+wing+1);
    const localAtr=meanTrueRange(candles,i);
    const add=(kind,price,amplitude)=>{
      // A close beyond the zone invalidates that touch permanently. Recapture
      // requires a NEW confirmed pivot; switching sides alone is not a retest.
      const broken=candles.slice(i+1).some(bar=>kind==='support'?bar.close<price-breakBuffer:bar.close>price+breakBuffer);
      if(!broken)swings.push({kind,price,index:i,time:c.time,confirmedAt:right.at(-1).time,amplitude,localAtr});
    };
    // Equal highs/lows form one plateau: only the rightmost bar can confirm.
    if(left.every(n=>n.high<=c.high)&&right.every(n=>n.high<c.high))add('resistance',c.high,c.high-Math.max(Math.min(...left.map(n=>n.low)),Math.min(...right.map(n=>n.low))));
    if(left.every(n=>n.low>=c.low)&&right.every(n=>n.low>c.low))add('support',c.low,Math.min(Math.max(...left.map(n=>n.high)),Math.max(...right.map(n=>n.high)))-c.low);
  }
  const groups=[];
  for(const swing of swings.sort((a,b)=>a.time-b.time)){
    // Fixed anchor prevents chains of nearby pivots drifting into broad bands.
    let group=groups.find(g=>g.kind===swing.kind&&Math.abs(g.anchor-swing.price)<=tolerance);
    if(!group){group={kind:swing.kind,anchor:swing.price,events:[]};groups.push(group);}
    if(!group.events.length||swing.index-group.events.at(-1).index>wing)group.events.push(swing);
  }
  const valid=groups.flatMap(group=>{
    const events=group.events,latest=events.at(-1),touches=events.length;
    if(touches<2&&!(latest.localAtr>0&&latest.amplitude>=latest.localAtr*1.5))return [];
    const prices=events.map(e=>e.price).sort((a,b)=>a-b),middle=Math.floor(prices.length/2);
    const price=prices.length%2?prices[middle]:(prices[middle-1]+prices[middle])/2;
    const distance=Math.abs(price-last);
    if(distance>Math.min(atr*8,last*.2))return [];
    if(group.kind==='support'?price>=last:price<=last)return [];
    return [{kind:group.kind,price,low:Math.min(...prices)-tolerance/2,high:Math.max(...prices)+tolerance/2,touches,index:latest.index,time:latest.time,confirmedAt:latest.confirmedAt,wing,amplitude:latest.amplitude,distancePct:distance/last*100,lookback:candles.length}];
  });
  return ['support','resistance'].map(kind=>valid.filter(g=>g.kind===kind).sort((a,b)=>a.distancePct-b.distancePct)[0]).filter(Boolean);
}
