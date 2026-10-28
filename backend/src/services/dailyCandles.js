// Normalize real OHLC bars; never reconstruct highs/lows from closing prices.
export function dailyCandles(input=[]) {
  const ordered=[...new Map(input.filter(c=>c&&[c.time,c.open,c.high,c.low,c.close].every(Number.isFinite)&&c.low>0&&c.high>=Math.max(c.open,c.close)&&c.low<=Math.min(c.open,c.close)).map(c=>[c.time,c])).values()].sort((a,b)=>a.time-b.time);
  const days=new Map();
  for(const bar of ordered){
    const time=Math.floor(bar.time/86400)*86400,previous=days.get(time);
    days.set(time,previous?{...previous,high:Math.max(previous.high,bar.high),low:Math.min(previous.low,bar.low),close:bar.close,volume:Number.isFinite(previous.volume)&&Number.isFinite(bar.volume)?previous.volume+bar.volume:undefined}:{...bar,time});
  }
  return [...days.values()];
}

export function completedDailyCandles(input=[],now=Date.now()){
 const bars=dailyCandles(input).filter(c=>c.time<Math.floor(now/86400000)*86400);
 bars.source=input.source??null;bars.currency=input.currency??null;return bars;
}
