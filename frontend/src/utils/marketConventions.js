export const ANALYSIS_DAYS=365;

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
