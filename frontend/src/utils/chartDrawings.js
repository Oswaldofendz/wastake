export const DRAWING_KINDS=['horizontal','trend','ray','box','fib','note'];
export const FIB_RATIOS=[0,.236,.382,.5,.618,.786,1];
export function validDrawing(value){
  if(!value||!DRAWING_KINDS.includes(value.kind)||typeof value.id!=='string')return false;
  const count=['horizontal','note'].includes(value.kind)?1:2;
  return Array.isArray(value.points)&&value.points.length===count&&value.points.every(p=>Number.isFinite(p.time)&&p.time>0&&Number.isFinite(p.price)&&p.price>0&&p.price<=1e12);
}
export function drawingWithPoint(drawing,index,point){
  const next={...drawing,origin:'manual',reason:null,points:drawing.points.map((p,i)=>i===index?point:p)};
  return validDrawing(next)?next:drawing;
}
export function sharedPerformance(left=[],right=[]){
  const other=new Map(right.map(c=>[c.time,c.close]));
  const aligned=left.filter(c=>c.close>0&&other.get(c.time)>0);
  if(aligned.length<2)return null;
  const base=aligned[0];
  return {from:base.time,to:aligned.at(-1).time,count:aligned.length,left:aligned.map(c=>({time:c.time,value:(c.close/base.close-1)*100})),right:aligned.map(c=>({time:c.time,value:(other.get(c.time)/other.get(base.time)-1)*100}))};
}
