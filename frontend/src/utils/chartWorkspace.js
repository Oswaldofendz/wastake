export const initialWorkspace=()=>({interval:'1d',levels:true,ema:[20,50],rsi:false,bollinger:false,volume:true,focus:'recent',focusToken:0,lines:[]});
export function applyChartActions(current,actions=[]){
 let next={...current,ema:[...current.ema],lines:[...current.lines]};
 for(const action of actions.slice(0,8)){
  if(['levels','rsi','bollinger','volume'].includes(action.type)&&typeof action.enabled==='boolean')next[action.type]=action.enabled;
  else if(action.type==='ema'&&[20,50,200].includes(action.period)&&typeof action.enabled==='boolean')next.ema=action.enabled?[...new Set([...next.ema,action.period])].sort((a,b)=>a-b):next.ema.filter(p=>p!==action.period);
  else if(action.type==='interval'&&['1d','4h','15m'].includes(action.value))next.interval=action.value;
  else if(action.type==='focus'&&['recent','drop','all'].includes(action.value)){next.focus=action.value;next.focusToken=(next.focusToken??0)+1;}
  else if(action.type==='clear')next={...next,levels:false,ema:[],rsi:false,bollinger:false,volume:false,lines:[]};
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
