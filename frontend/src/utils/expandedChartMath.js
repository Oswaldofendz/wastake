import {atrAdxPoints} from './advancedChartMath.js';
import {emaSeries} from './chartLevels.js';
const typical=b=>(b.high+b.low+b.close)/3;
export function cciPoints(bars,period=20){const out=[];for(let i=period-1;i<bars.length;i++){const rows=bars.slice(i-period+1,i+1).map(typical),mean=rows.reduce((a,b)=>a+b,0)/period,dev=rows.reduce((s,v)=>s+Math.abs(v-mean),0)/period;if(dev>0)out.push({time:bars[i].time,value:(typical(bars[i])-mean)/(.015*dev)});}return out;}
export function williamsPoints(bars,period=14){return bars.flatMap((b,i)=>{if(i<period-1)return [];const r=bars.slice(i-period+1,i+1),hi=Math.max(...r.map(c=>c.high)),lo=Math.min(...r.map(c=>c.low));return hi>lo?[{time:b.time,value:-100*(hi-b.close)/(hi-lo)}]:[];});}
export function rocPoints(bars,period=12){return bars.slice(period).flatMap((b,i)=>bars[i].close>0?[{time:b.time,value:100*(b.close/bars[i].close-1)}]:[]);}
export function mfiPoints(bars,period=14){if(bars.some(b=>!Number.isFinite(b.volume)||b.volume<0))return [];const out=[];for(let i=period;i<bars.length;i++){let pos=0,neg=0;for(let j=i-period+1;j<=i;j++){const flow=typical(bars[j])*bars[j].volume,sign=Math.sign(typical(bars[j])-typical(bars[j-1]));if(sign>0)pos+=flow;if(sign<0)neg+=flow;}if(pos+neg>0)out.push({time:bars[i].time,value:neg===0?100:100-100/(1+pos/neg)});}return out;}
export function cmfPoints(bars,period=20){if(bars.some(b=>!Number.isFinite(b.volume)||b.volume<0))return [];const out=[];for(let i=period-1;i<bars.length;i++){const r=bars.slice(i-period+1,i+1),volume=r.reduce((s,b)=>s+b.volume,0);if(volume>0)out.push({time:bars[i].time,value:r.reduce((s,b)=>s+(b.high>b.low?(2*b.close-b.high-b.low)/(b.high-b.low):0)*b.volume,0)/volume});}return out;}
export function donchianPoints(bars,period=20){return bars.slice(period-1).map((b,i)=>{const r=bars.slice(i,i+period),upper=Math.max(...r.map(c=>c.high)),lower=Math.min(...r.map(c=>c.low));return {time:b.time,upper,lower,middle:(upper+lower)/2};});}
export function keltnerPoints(bars){const atr=new Map(atrAdxPoints(bars,10).atr.map(p=>[p.time,p.value]));return emaSeries(bars,20).filter(p=>atr.has(p.time)).map(p=>({time:p.time,middle:p.value,upper:p.value+2*atr.get(p.time),lower:p.value-2*atr.get(p.time)}));}
// Price-only liquidity proxies, never actual resting orders or liquidation levels.
export function liquidityZones(bars){
 if(bars.length<20)return [];const rows=bars.slice(-160),price=rows.at(-1).close,atr=atrAdxPoints(rows).atr.at(-1)?.value;if(!(atr>0))return [];
 const tolerance=Math.max(price*.0005,atr*.15),zones=[];
 for(const kind of ['high','low']){const pivots=[];for(let i=2;i<rows.length-2;i++){const neighbors=[rows[i-2][kind],rows[i-1][kind],rows[i+1][kind],rows[i+2][kind]],v=rows[i][kind];if((kind==='high'?neighbors.every(n=>v>=n)&&neighbors.some(n=>v>n):neighbors.every(n=>v<=n)&&neighbors.some(n=>v<n))&&(!pivots.length||i-pivots.at(-1).index>=4))pivots.push({index:i,value:v});}
 const used=new Set();for(const p of pivots){if(used.has(p.index))continue;const group=pivots.filter(q=>Math.abs(q.value-p.value)<=tolerance&&!used.has(q.index));if(group.length<2)continue;group.forEach(q=>used.add(q.index));const lower=Math.min(...group.map(q=>q.value))-tolerance/2,upper=Math.max(...group.map(q=>q.value))+tolerance/2,lastIndex=group.at(-1).index;
 if(kind==='high'?lower<=price:upper>=price)continue;
 if(rows.slice(lastIndex+1).some(b=>kind==='high'?b.high>upper:b.low<lower))continue;
 zones.push({kind,lower,upper,touches:group.length,formedAt:rows[lastIndex+2].time});}
 }
 return zones.sort((a,b)=>Math.abs((a.lower+a.upper)/2-price)-Math.abs((b.lower+b.upper)/2-price)).slice(0,4);
}
export function expandedStudies(bars){return {cci:cciPoints(bars),mfi:mfiPoints(bars),williams:williamsPoints(bars),roc:rocPoints(bars),cmf:cmfPoints(bars),donchian:donchianPoints(bars),keltner:keltnerPoints(bars)};}
