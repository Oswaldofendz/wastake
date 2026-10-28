import {applyChartActions} from './chartWorkspace.js';
// Automatic refresh replaces only its own computed marks. User edits and chat drawings survive.
export function mergeAutomaticAnalysis(current,actions){
 const drawings=current.drawings.filter(d=>!((d.automatic||(current.fvg&&d.tool==='fvg')||(current.liquidity&&d.tool==='liquidity'))&&d.origin==='computed'));
 const bounded=actions.filter(a=>['draw','ema','rsi','fvg','liquidity'].includes(a.type)).map(a=>a.type==='draw'?{...a,drawings:a.drawings.map(d=>({...d,automatic:true}))}:a);
 return applyChartActions({...current,drawings},bounded);
}

export function chartContextMatches(snapshot,context){
 return Boolean(snapshot&&snapshot.id===context.id&&snapshot.type===context.type&&snapshot.interval===context.interval&&(snapshot.venue??'auto')===context.venue);
}
