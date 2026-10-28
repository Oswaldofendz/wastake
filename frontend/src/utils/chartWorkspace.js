import {validDrawing} from './chartDrawings.js';
export const initialWorkspace=()=>({interval:'1d',levels:false,ema:[20,50],sma:[],rsi:false,macd:false,bollinger:false,volume:true,focus:'recent',focusToken:0,lines:[],drawings:[],compare:null});
export function applyChartActions(current,actions=[]){
 let next={...current,ema:[...current.ema],sma:[...(current.sma??[])],lines:[...current.lines],drawings:[...(current.drawings??[])]};
 for(const action of actions.slice(0,8)){
  if(['levels','rsi','macd','bollinger','volume'].includes(action.type)&&typeof action.enabled==='boolean')next[action.type]=action.enabled;
  else if(action.type==='ema'&&[20,50,200].includes(action.period)&&typeof action.enabled==='boolean')next.ema=action.enabled?[...new Set([...next.ema,action.period])].sort((a,b)=>a-b):next.ema.filter(p=>p!==action.period);
  else if(action.type==='sma'&&[20,50,200].includes(action.period)&&typeof action.enabled==='boolean')next.sma=action.enabled?[...new Set([...next.sma,action.period])].sort((a,b)=>a-b):next.sma.filter(p=>p!==action.period);
  else if(action.type==='draw'&&Array.isArray(action.drawings))next.drawings=[...new Map([...next.drawings,...action.drawings.filter(validDrawing)].map(d=>[d.id,d])).values()].slice(-30);
  else if(action.type==='removeDrawing')next.drawings=next.drawings.filter(d=>d.id!==action.id);
  else if(action.type==='removeLevels')next.drawings=next.drawings.filter(d=>d.kind!=='horizontal'||d.origin!=='computed');
  else if(action.type==='uncompare')next.compare=null;
  else if(action.type==='interval'&&['1d','4h','15m'].includes(action.value))next.interval=action.value;
  else if(action.type==='focus'&&['recent','drop','all'].includes(action.value)){next.focus=action.value;next.focusToken=(next.focusToken??0)+1;}
  else if(action.type==='clear')next={...next,levels:false,ema:[],sma:[],rsi:false,macd:false,bollinger:false,volume:false,lines:[],drawings:[],compare:null};
  else if(action.type==='reset')next={...initialWorkspace(),focusToken:(current.focusToken??0)+1};
 }
 return next;
}
export function rsiPoints(candles,period=14){
 if(candles.length<=period)return [];
 let gain=0,loss=0;for(let i=1;i<=period;i++){const d=candles[i].close-candles[i-1].close;gain+=Math.max(0,d)/period;loss+=Math.max(0,-d)/period;}
 const value=()=>loss===0?(gain===0?50:100):100-100/(1+gain/loss);
 const out=[{time:candles[period].time,value:value()}];
 for(let i=period+1;i<candles.length;i++){const d=candles[i].close-candles[i-1].close;gain=(gain*(period-1)+Math.max(0,d))/period;loss=(loss*(period-1)+Math.max(0,-d))/period;out.push({time:candles[i].time,value:value()});}
 return out;
}
export function bollingerPoints(candles,period=20){
 return candles.slice(period-1).map((c,index)=>{const slice=candles.slice(index,index+period).map(x=>x.close),middle=slice.reduce((n,p)=>n+p,0)/period,sd=Math.sqrt(slice.reduce((n,p)=>n+(p-middle)**2,0)/period);return {time:c.time,middle,upper:middle+2*sd,lower:middle-2*sd};});
}
export function focusRange(candles,focus){
 if(candles.length<2)return null;
 let start=0,end=candles.length-1;
 if(focus==='recent')start=Math.max(0,end-79);
 if(focus==='drop'){
  let worst=0,index=-1;for(let i=1;i<candles.length;i++){const change=candles[i].close/candles[i-1].close-1;if(change<worst){worst=change;index=i;}}
  if(index<0)return null;
  start=Math.max(0,index-8);end=Math.min(candles.length-1,index+8);
 }
 return {from:candles[start].time,to:candles[end].time};
}
export function safeManualPrice(value){const n=Number(value);return Number.isFinite(n)&&n>0&&n<=1e12?n:null;}
export function smaPoints(candles,period){return candles.slice(period-1).map((c,i)=>({time:c.time,value:candles.slice(i,i+period).reduce((sum,row)=>sum+row.close,0)/period}));}
export function macdPoints(candles){
 const ema=(rows,period)=>{if(rows.length<period)return [];let value=rows.slice(0,period).reduce((s,c)=>s+c.value,0)/period;const out=[{time:rows[period-1].time,value}];for(const row of rows.slice(period)){value=row.value*2/(period+1)+value*(1-2/(period+1));out.push({time:row.time,value});}return out;};
 const rows=candles.map(c=>({time:c.time,value:c.close})),slow=new Map(ema(rows,26).map(c=>[c.time,c.value]));
 const line=ema(rows,12).filter(c=>slow.has(c.time)).map(c=>({...c,value:c.value-slow.get(c.time)}));
 const signal=ema(line,9),map=new Map(signal.map(c=>[c.time,c.value]));
 return {line,signal,histogram:line.filter(c=>map.has(c.time)).map(c=>({...c,value:c.value-map.get(c.time)}))};
}
