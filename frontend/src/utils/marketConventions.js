export const ANALYSIS_DAYS=365;
export function quoteView(asset,company,analysis){
 const q=company?.quote;
 if(Number.isFinite(q?.price)&&q.price>0)return {price:q.price,currency:q.currency,asOf:q.quoteAsOf,kind:'quote'};
 if(Number.isFinite(asset?.price)&&asset.price>0)return {price:asset.price,currency:asset.currency,asOf:asset.quoteAsOf,kind:'quote'};
 return {price:analysis?.meta?.lastPrice,currency:analysis?.meta?.currency,asOf:analysis?.meta?.to?new Date(analysis.meta.to*1000).toISOString():null,kind:'close'};
}

export function currentSelection(selected,assets=[]) {
  return selected?assets.find(a=>a.id===selected.id&&a.type===selected.type)??selected:assets[0]??null;
}

export function marketStats(assets=[]) {
  const priced=assets.filter(a=>Number.isFinite(a.price)&&a.price>0);
  const known=priced.filter(a=>Number.isFinite(a.change24h));
  return {total:priced.length,known:known.length,missing:priced.length-known.length,
    gainers:known.filter(a=>a.change24h>0).length,losers:known.filter(a=>a.change24h<0).length,
    unchanged:known.filter(a=>a.change24h===0).length,
    avgChange:known.length?known.reduce((s,a)=>s+a.change24h,0)/known.length:null};
}
