// Price returns only: no dividends, FX conversion, or causal interpretation.
export function closedPriceSeries(candles=[],now=Date.now(),days=90) {
  const today=Math.floor(now/86400000)*86400,cutoff=today-days*86400,result=new Map();
  const ordered=candles.filter(c=>Number.isFinite(c.time)&&Number.isFinite(c.close)&&c.close>0&&c.time<today&&c.time>=cutoff).sort((a,b)=>a.time-b.time);
  for(const c of ordered)result.set(new Date(c.time*1000).toISOString().slice(0,10),c.close);
  return result;
}

export function pairedReturnCorrelation(a,b,maxCloses=90) {
  const dates=[...a.keys()].filter(date=>b.has(date)).sort().slice(-maxCloses),x=[],y=[];
  for(let i=1;i<dates.length;i++) {
    const p=dates[i-1],t=dates[i],ap=a.get(p),bp=b.get(p),at=a.get(t),bt=b.get(t);
    if(![ap,bp,at,bt].every(v=>Number.isFinite(v)&&v>0))continue;
    const ax=at/ap-1,by=bt/bp-1;
    if(Number.isFinite(ax)&&Number.isFinite(by)){x.push(ax);y.push(by);}
  }
  const count=x.length,empty={value:null,count,from:dates[0]??null,to:dates.at(-1)??null};
  if(count<10)return empty;
  const centered=values=>{const mean=values.reduce((sum,v)=>sum+v/values.length,0);const differences=values.map(v=>v-mean),scale=Math.max(...differences.map(Math.abs)),noise=32*Number.EPSILON*Math.max(1,...values.map(Math.abs));return scale>noise&&Number.isFinite(scale)?differences.map(v=>v/scale):null;};
  const dx=centered(x),dy=centered(y);
  if(!dx||!dy)return empty;
  const cov=dx.reduce((sum,v,i)=>sum+v*dy[i],0),vx=dx.reduce((sum,v)=>sum+v*v,0),vy=dy.reduce((sum,v)=>sum+v*v,0);
  const value=cov/Math.sqrt(vx*vy);
  return {...empty,value:Number.isFinite(value)?Math.max(-1,Math.min(1,value)):null};
}
