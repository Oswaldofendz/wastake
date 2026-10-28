import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {DRAWING_KINDS,FIB_RATIOS,drawingWithPoint,validDrawing} from '../utils/chartDrawings.js';

const glyphs={select:'↖',horizontal:'―',trend:'╱',ray:'↗',box:'▱',fib:'☷',note:'T'};
export function DrawingToolbar({tool,setTool,drawings,onChange,onUndo,canUndo,disabled=false}){
 const {t}=useTranslation();
 return <div role="group" aria-label={t('draw_tools')} className="flex min-w-0 items-center gap-1 overflow-x-auto py-1">
   {['select',...DRAWING_KINDS].map(kind=><button type="button" key={kind} disabled={disabled} aria-pressed={tool===kind} title={t('draw_'+kind)} aria-label={t('draw_'+kind)} onClick={()=>setTool(kind)} className={`min-h-9 min-w-9 shrink-0 rounded border text-sm disabled:opacity-30 ${tool===kind?'border-teal-500 bg-teal-950/40 text-teal-200':'border-transparent text-slate-400 hover:bg-slate-700/40'}`}>{glyphs[kind]}</button>)}
   <span className="mx-1 h-5 border-l border-slate-700"/>
   {onUndo&&<button type="button" disabled={!canUndo} onClick={onUndo} aria-label={t('agent_undo')} title={t('agent_undo')} className="min-h-9 min-w-9 text-slate-300 disabled:opacity-30">↶</button>}
   <button type="button" disabled={!drawings.length} onClick={()=>onChange([])} className="min-h-9 shrink-0 rounded px-2 text-xs text-slate-400 disabled:opacity-30">{t('draw_clear')} · {drawings.length}</button>
 </div>;
}

// SVG objects keep their time/price anchors while the underlying chart pans or zooms.
// Pointer edits are local; only release commits one undoable change.
export function DrawingOverlay({handle,drawings,onChange,tool,setTool,selectedId,onSelect}){
 const {t,i18n}=useTranslation();
 const svg=useRef(null),drag=useRef(null),latest=useRef(drawings);
 const [size,setSize]=useState({width:0,height:0}),[,redraw]=useState(0),[first,setFirst]=useState(null),[cursor,setCursor]=useState(null),[draft,setDraft]=useState(null);
 latest.current=drawings;
 useEffect(()=>{setFirst(null);setDraft(null);setCursor(null);},[tool,handle]);
 useEffect(()=>{
   if(!handle||!svg.current)return;
   const node=svg.current.parentElement;
   let frame;
   const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{setSize({width:node.clientWidth,height:node.clientHeight});redraw(n=>n+1);});};
   const observer=new ResizeObserver(update);observer.observe(node);
   handle.chart.timeScale().subscribeVisibleLogicalRangeChange(update);
   node.addEventListener('pointermove',update);node.addEventListener('wheel',update);update();
   return()=>{cancelAnimationFrame(frame);observer.disconnect();handle.chart.timeScale().unsubscribeVisibleLogicalRangeChange(update);node.removeEventListener('pointermove',update);node.removeEventListener('wheel',update);};
 },[handle]);
 useEffect(()=>{const key=e=>{if(e.key==='Escape'){setTool('select');setFirst(null);onSelect(null);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[setTool,onSelect]);
 if(!handle)return null;
 const plotWidth=Math.max(0,size.width-72),plotHeight=Math.max(0,size.height-30);
 const project=point=>({x:handle.chart.timeScale().timeToCoordinate(point.time),y:handle.series.priceToCoordinate(point.price)});
 const pointAt=e=>{
   const rect=svg.current.getBoundingClientRect(),x=e.clientX-rect.left,y=e.clientY-rect.top;
   if(x<0||x>plotWidth||y<0||y>plotHeight)return null;
   const logical=handle.chart.timeScale().coordinateToLogical(x),price=handle.series.coordinateToPrice(y);
   if(logical==null||price==null||price<=0)return null;
   const index=Math.max(0,Math.min(handle.candles.length-1,Math.round(logical)));
   return {time:handle.candles[index].time,price};
 };
 const finish=e=>{
   if(drag.current){if(draft)onChange(latest.current.map(d=>d.id===draft.id?draft:d));drag.current=null;setDraft(null);try{e.currentTarget.releasePointerCapture(e.pointerId);}catch{}return;}
 };
 const create=e=>{
   if(tool==='select'){onSelect(null);return;}
   const point=pointAt(e);if(!point||drawings.length>=30)return;
   const complete=['horizontal','note'].includes(tool)||first;
   if(!complete){setFirst(point);setCursor(point);return;}
   const drawing={id:crypto.randomUUID(),kind:tool,points:first?[first,point]:[point],label:t('draw_'+tool),reason:t('draw_manual_reason'),origin:'manual',color:'#fbbf24'};
   if(validDrawing(drawing)){onChange([...drawings,drawing]);onSelect(drawing.id);}
   setFirst(null);setCursor(null);setTool('select');
 };
 const shown=drawings.map(d=>draft?.id===d.id?draft:d);
 if(first&&cursor)shown.push({id:'preview',kind:tool,points:[first,cursor],label:'',color:'#fbbf24'});
 const select=(e,d)=>{e.stopPropagation();onSelect(d.id);};
 const stroke=(d)=>d.color&&/^#[a-f\d]{6}$/i.test(d.color)?d.color:'#2dd4bf';
 const selected=drawings.find(d=>d.id===selectedId);
 return <>
  <svg ref={svg} className="absolute inset-0 z-[5] h-full w-full touch-none" style={{pointerEvents:tool==='select'?'none':'auto',cursor:tool==='select'?'default':'crosshair'}} aria-label={t('draw_surface')}
   onPointerDown={create} onPointerMove={e=>{const p=pointAt(e);if(!p)return;if(drag.current){setDraft(drawingWithPoint(drag.current.drawing,drag.current.index,p));}else if(first)setCursor(p);}}
   onPointerUp={finish} onPointerCancel={()=>{drag.current=null;setDraft(null);}}>
   <defs><clipPath id={`draw-clip-${handle.id}`}><rect width={plotWidth} height={plotHeight}/></clipPath></defs>
   <g clipPath={`url(#draw-clip-${handle.id})`}>
    {shown.filter(d=>validDrawing(d)||d.id==='preview').map(d=>{
     const a=project(d.points[0]),b=d.points[1]?project(d.points[1]):null,color=stroke(d),isSelected=d.id===selectedId;
     if(a.x==null||a.y==null||(b&&(b.x==null||b.y==null)))return null;
     const line=(x1,y1,x2,y2,key)=> <g key={key}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth="14" style={{pointerEvents:tool==='select'?'stroke':'none'}} onPointerDown={e=>select(e,d)}/><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={isSelected?2:1.3} style={{pointerEvents:'none'}}/></g>;
     return <g key={d.id}>
      {d.kind==='horizontal'&&line(0,a.y,plotWidth,a.y,'h')}
      {d.kind==='trend'&&line(a.x,a.y,b.x,b.y,'t')}
      {d.kind==='ray'&&(()=>{const dx=b.x-a.x;if(Math.abs(dx)<1)return line(a.x,a.y,b.x,b.y,'r');const x=dx>0?plotWidth:0;return line(a.x,a.y,x,a.y+(b.y-a.y)*(x-a.x)/dx,'r');})()}
      {d.kind==='box'&&<rect x={Math.min(a.x,b.x)} y={Math.min(a.y,b.y)} width={Math.max(2,Math.abs(a.x-b.x))} height={Math.max(2,Math.abs(a.y-b.y))} fill={color+'15'} stroke={color} strokeWidth={isSelected?2:1} style={{pointerEvents:tool==='select'?'all':'none'}} onPointerDown={e=>select(e,d)}/>}
      {d.kind==='fib'&&FIB_RATIOS.map(ratio=>{const y=b.y+(a.y-b.y)*ratio;return <g key={ratio}>{line(Math.min(a.x,b.x),y,Math.max(a.x,b.x),y,ratio)}<text x={Math.min(a.x,b.x)+4} y={y-4} fill={color} fontSize="10">{(ratio*100).toLocaleString(i18n.language,{maximumFractionDigits:1})}%</text></g>;})}
      {d.label&&<text x={Math.min(plotWidth-165,Math.max(4,a.x+5))} y={Math.max(15,a.y-7)} fill={color} fontSize="11" style={{pointerEvents:tool==='select'?'all':'none',cursor:'pointer'}} onPointerDown={e=>select(e,d)}>{d.label.slice(0,48)}</text>}
      {isSelected&&d.points.map((point,index)=>{const p=project(point);return <circle key={index} cx={p.x} cy={p.y} r="6" fill="#111827" stroke={color} strokeWidth="2" style={{pointerEvents:'all',cursor:'move'}} onPointerDown={e=>{e.stopPropagation();drag.current={drawing:d,index};setDraft(d);svg.current.setPointerCapture(e.pointerId);}}/>;})}
     </g>;
    })}
   </g>
  </svg>
  {tool!=='select'&&<p className="pointer-events-none absolute left-3 top-3 rounded bg-slate-950/90 px-3 py-2 text-[11px] text-amber-200">{t(first?'draw_second_point':['horizontal','note'].includes(tool)?'draw_one_point':'draw_first_point')} · Esc</p>}
  {selected&&<div className="absolute bottom-10 left-2 z-10 max-w-[min(360px,85%)] rounded-lg border border-slate-600 bg-slate-950/95 p-3 shadow-xl" role="group" aria-label={t('draw_edit')}>
    <div className="flex items-center gap-2"><input aria-label={t('draw_label')} value={selected.label??''} maxLength={80} onChange={e=>onChange(drawings.map(d=>d.id===selected.id?{...d,label:e.target.value}:d))} className="min-h-8 min-w-0 flex-1 rounded border border-slate-600 bg-slate-900 px-2 text-xs"/><button type="button" onClick={()=>{onChange(drawings.filter(d=>d.id!==selected.id));onSelect(null);}} className="min-h-8 px-2 text-xs text-rose-300">{t('agent_delete')}</button><button type="button" onClick={()=>onSelect(null)} aria-label={t('draw_close')} className="min-h-8 px-1">×</button></div>
    <p className="mt-2 text-[11px] leading-5 text-slate-300">{selected.origin==='manual'?t('draw_manual_reason'):selected.reason}</p>
    <div className="mt-2 flex flex-wrap gap-2">{selected.points.map((p,index)=><label key={index} className="min-w-0 flex-1 text-[10px] text-slate-400">{new Date(p.time*1000).toLocaleDateString(i18n.language,{timeZone:'UTC'})}<input type="number" min="0" step="any" value={Number(p.price.toPrecision(10))} aria-label={`${t('agent_price')} ${index+1}`} onChange={e=>onChange(drawings.map(d=>d.id===selected.id?drawingWithPoint(d,index,{...p,price:Number(e.target.value)}):d))} className="mt-1 min-h-8 w-full rounded border border-slate-700 bg-slate-900 px-2 text-xs"/></label>)}</div>
    <p className="mt-2 text-[10px] text-slate-500">{t('draw_drag_hint')}</p>
  </div>}
 </>;
}
