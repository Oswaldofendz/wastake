// Intraday bars must keep their timestamps; daily aggregation would erase them.
export function timedCandles(input=[]){
 return [...new Map((Array.isArray(input)?input:[]).filter(c=>c&&[c.time,c.open,c.high,c.low,c.close].every(Number.isFinite)&&c.low>0&&c.high>=Math.max(c.open,c.close)&&c.low<=Math.min(c.open,c.close)).map(c=>[c.time,c])).values()].sort((a,b)=>a.time-b.time);
}
