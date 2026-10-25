// Confirmed swing zones, evaluated only with candles available at the cutoff.
export function cleanCandles(input = []) {
  const byDay = new Map();
  const byTime = new Map(input.map(c=>[c.time,c]));
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

export function significantLevels(input, wing = 5) {
  const candles = cleanCandles(input).slice(-120);
  if (candles.length < wing*2+2) return [];
  const last = candles.at(-1).close;
  const recent = candles.slice(-15);
  const atr = recent.slice(1).reduce((sum,c,i) => sum+Math.max(c.high-c.low,Math.abs(c.high-recent[i].close),Math.abs(c.low-recent[i].close)),0)/(recent.length-1);
  if (!(atr>0)) return [];
  const tolerance = Math.max(atr*0.6,last*0.001);
  const swings = [];
  for (let i=wing;i<candles.length-wing;i++) {
    const c=candles[i];
    const neighbors=candles.slice(i-wing,i+wing+1).filter((_,j)=>j!==wing);
    if (neighbors.every(n=>n.high<c.high)) swings.push({price:c.high,kind:'resistance',index:i,amplitude:c.high-Math.min(...neighbors.map(n=>n.low))});
    if (neighbors.every(n=>n.low>c.low)) swings.push({price:c.low,kind:'support',index:i,amplitude:Math.max(...neighbors.map(n=>n.high))-c.low});
  }
  const groups=[];
  for(const swing of swings.sort((a,b)=>a.price-b.price)) {
    let group=groups.find(g=>g.kind===swing.kind && Math.abs(g.price-swing.price)<=tolerance);
    if(!group) {group={...swing,touches:0,total:0};groups.push(group);}
    group.total+=swing.price;group.touches++;group.price=group.total/group.touches;
    group.amplitude=Math.max(group.amplitude,swing.amplitude);
  }
  const valid=groups.filter(g=>(g.touches>=2 || g.amplitude>=atr*2) && Math.abs(g.price-last)<=Math.min(atr*15,last*0.3));
  const support=valid.filter(g=>g.kind==='support'&&g.price<last).sort((a,b)=>b.price-a.price)[0];
  const resistance=valid.filter(g=>g.kind==='resistance'&&g.price>last).sort((a,b)=>a.price-b.price)[0];
  return [support,resistance].filter(Boolean);
}
