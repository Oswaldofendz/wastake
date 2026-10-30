export function portfolioMetrics(positions) {
  const values=new Map();
  const real=positions.filter(p=>!p.is_simulation);
  const key=p=>`${p.asset_type}:${p.asset_id}`;
  const quoted=real.filter(p=>Number.isFinite(p.currentValue)&&p.currentValue>=0);
  quoted.forEach(p=>values.set(key(p),(values.get(key(p))||0)+p.currentValue));
  const quotedValue=quoted.reduce((s,p)=>s+p.currentValue,0);
  const costComplete=real.every(p=>Number.isFinite(p.costBasis)&&p.costBasis>=0);
  const totalCost=costComplete?real.reduce((s,p)=>s+p.costBasis,0):null;
  const complete=quoted.length===real.length;
  return { assets:new Set(real.map(key)).size, quoted:quoted.length, count:real.length, costComplete,
    concentration:complete&&quotedValue>0?Math.max(...values.values())/quotedValue*100:null,
    totalValue:complete?quotedValue:null,totalCost,totalPnl:complete&&costComplete?quotedValue-totalCost:null,
    totalPnlPct:complete&&totalCost>0?(quotedValue/totalCost-1)*100:null };
}
export function plannedContributions(amount, frequency, months) {
  const periodsPerYear={weekly:52,biweekly:26,monthly:12}[frequency];
  if(!Number.isFinite(amount)||amount<0||!Number.isInteger(months)||months<1||months>600||!Number.isFinite(periodsPerYear))return null;
  return amount*Math.floor(months*periodsPerYear/12);
}

export function portfolioAllocation(positions=[]){
 const real=positions.filter(p=>!p.is_simulation);
 if(!real.length||real.some(p=>!Number.isFinite(p.currentValue)||p.currentValue<0))return null;
 const grouped=new Map();for(const p of real){const key=`${p.asset_type}:${p.asset_id}`,old=grouped.get(key);grouped.set(key,{...p,currentValue:(old?.currentValue??0)+p.currentValue});}
 return [...grouped.values()];
}
