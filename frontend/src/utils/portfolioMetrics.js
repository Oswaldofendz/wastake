export function portfolioMetrics(positions) {
  const values=new Map();
  const real=positions.filter(p=>!p.is_simulation);
  const quoted=real.filter(p=>Number.isFinite(p.currentValue));
  quoted.forEach(p=>values.set(p.asset_id,(values.get(p.asset_id)||0)+p.currentValue));
  const quotedValue=quoted.reduce((s,p)=>s+p.currentValue,0);
  const totalCost=real.reduce((s,p)=>s+p.costBasis,0);
  const complete=quoted.length===real.length;
  return { assets:new Set(real.map(p=>p.asset_id)).size, quoted:quoted.length, count:real.length,
    concentration:complete&&quotedValue>0?Math.max(...values.values())/quotedValue*100:null,
    totalValue:complete?quotedValue:null,totalCost,totalPnl:complete?quotedValue-totalCost:null,
    totalPnlPct:complete&&totalCost>0?(quotedValue/totalCost-1)*100:null };
}
export function plannedContributions(amount, frequency, months) {
  if(!Number.isFinite(amount)||amount<0||!Number.isFinite(months)||months<1||months>600)return null;
  return amount*Math.floor(months*(frequency==='weekly'?52/12:1));
}

export function portfolioAllocation(positions=[]){
 const real=positions.filter(p=>!p.is_simulation);
 if(!real.length||real.some(p=>!Number.isFinite(p.currentValue)||p.currentValue<0))return null;
 const grouped=new Map();for(const p of real){const key=`${p.asset_type}:${p.asset_id}`,old=grouped.get(key);grouped.set(key,{...p,currentValue:(old?.currentValue??0)+p.currentValue});}
 return [...grouped.values()];
}
