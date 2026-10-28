import crypto from 'node:crypto';

const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function negatesChartAction(message){return /\b(no|not|nao|don't|do not)\s+(?:quiero que |quero que )?(?:add|show|pon|muestr|agreg|adicion|anad|mostr|clear|clean|limp|quit|remov|bor|elimin|hid|delet|reset|restab|reinic|ocult|desactiv|traz|trac|draw|dibuj)/.test(normalize(message));}
export function requestedTools(message){
 const q=normalize(message),tools=[];
 if(negatesChartAction(message))return [];
 const draw=/dibuj|draw|mark|marca|traz|trac|plot|pon |coloca|muestra|mostra|anade|adiciona|\badd\b|\bshow\b|estructura actual|current (setup|structure)|estrutura atual/.test(q);
 if(draw){
  if(/soporte|resistencia|support|resistance|niveles|levels|niveis|estructura actual|current (setup|structure)|estrutura atual/.test(q))tools.push({name:'draw',drawing:'levels'});
  if(/canal|channel/.test(q))tools.push({name:'draw',drawing:'channel'});
  else if(/tendencia|trend|tendencia|estructura actual|current (setup|structure)|estrutura atual/.test(q))tools.push({name:'draw',drawing:'trend'});
  if(/fibonac|retroces|retrac/.test(q))tools.push({name:'draw',drawing:'fib'});
  if(/zona|rango|range|consolidac/.test(q)&&!/fibonac/.test(q))tools.push({name:'draw',drawing:'range'});
 }
 if(/\b(sma|ma)\s*(50|200)\b/.test(q)&&draw)for(const m of q.matchAll(/\b(?:sma|ma)\s*(50|200)\b/g))tools.push({name:'indicator',indicator:'sma',period:Number(m[1]),enabled:true});
 if(draw&&/macd/.test(q))tools.push({name:'indicator',indicator:'macd',enabled:true});
 if(/compar|superpon|overlay|sobrepo|\bvs\b/.test(q)&&!/\bema|\bsma|\brsi|medias|averages/.test(q)){
   const venue=/coinbase/.test(q)?'Coinbase':/kraken/.test(q)?'Kraken':null;
   const query=q.match(/(?:con|with|vs\.?|overlay|superpon|sobrepo[ern]*)\s+(?:el |o |the )?([a-z0-9^=._-]{2,30})/)?.[1];
   if(venue)tools.push({name:'compare',venue});else if(query)tools.push({name:'compare',query});
 }
 if(/quita|remove|elimina|borra|retira|remov/.test(q)&&/compar/.test(q))return [{name:'uncompare'}];
 return tools;
}

export function validateToolPlan(input,context={}){
 if(!Array.isArray(input))return [];
 const tools=[];
 for(const value of input.slice(0,8)){
  if(!value||typeof value!=='object')continue;
  if(value.name==='draw'&&['levels','trend','channel','fib','range'].includes(value.drawing))tools.push({name:'draw',drawing:value.drawing});
  else if(value.name==='indicator'&&['ema','sma','rsi','bollinger','volume','macd'].includes(value.indicator)&&typeof value.enabled==='boolean'){
    if(['ema','sma'].includes(value.indicator)&&![20,50,200].includes(value.period))continue;
    tools.push({name:'indicator',indicator:value.indicator,...(['ema','sma'].includes(value.indicator)?{period:value.period}:{}),enabled:value.enabled});
  }
  else if(value.name==='focus'&&['recent','drop','all'].includes(value.mode))tools.push({name:'focus',mode:value.mode});
  else if(value.name==='interval'&&['1d','4h','15m'].includes(value.value))tools.push({name:'interval',value:value.value});
  else if(value.name==='remove'&&context.drawings?.some(d=>d.id===value.id))tools.push({name:'remove',id:value.id});
  else if(value.name==='clear')tools.push({name:'clear'});
  else if(value.name==='compare'&&['Kraken','Coinbase'].includes(value.venue))tools.push({name:'compare',venue:value.venue});
  else if(value.name==='compare'&&typeof value.query==='string'&&/^[A-Za-z0-9^=._-]{2,30}$/.test(value.query))tools.push({name:'compare',query:value.query});
  else if(value.name==='uncompare')tools.push({name:'uncompare'});
 }
 return tools;
}

export function fitTrend(candles){
 if(candles.length<12)return null;
 const rows=candles.slice(-60),n=rows.length,x=(n-1)/2,y=rows.reduce((s,c)=>s+c.close,0)/n;
 const denominator=rows.reduce((s,_,i)=>s+(i-x)**2,0);
 const slope=rows.reduce((s,c,i)=>s+(i-x)*(c.close-y),0)/denominator;
 const intercept=y-slope*x;
 const residuals=rows.map((c,i)=>c.close-(intercept+slope*i));
 return {rows,first:intercept,last:intercept+slope*(n-1),lower:Math.min(...residuals),upper:Math.max(...residuals)};
}
const copy={
 es:{support:'Soporte observado',resistance:'Resistencia observada',level:'Giro confirmado de estas velas; referencia histórica editable, puede romperse.',trend:'Tendencia del tramo',trendWhy:'Ajuste lineal por mínimos cuadrados sobre los últimos cierres completos (hasta sesenta). Describe la pendiente histórica; no proyecta el precio futuro.',channel:'Canal histórico',channelWhy:'Canal del ajuste lineal: sus límites usan los residuos extremos de los cierres de la muestra. No demuestra un patrón predictivo.',fib:'Fibonacci del tramo',fibWhy:'Retracciones matemáticas entre el mínimo y el máximo observados de las últimas treinta velas cerradas, ordenados en el tiempo. No confirma soportes futuros.',range:'Rango reciente',rangeWhy:'Zona entre el menor mínimo y el mayor máximo de las últimas veinte velas cerradas. No implica por sí sola consolidación ni ruptura.'},
 en:{support:'Observed support',resistance:'Observed resistance',level:'Confirmed swing in these candles; editable historical reference that can break.',trend:'Recent trend',trendWhy:'Least-squares line fitted to up to sixty recent completed closes. Describes historical slope without forecasting future prices.',channel:'Historical channel',channelWhy:'Linear-fit channel bounded by the extreme close residuals in the sample. Does not establish a predictive pattern.',fib:'Swing Fibonacci',fibWhy:'Mathematical retracements between the observed low and high of the last thirty completed candles, ordered in time. Does not confirm future support.',range:'Recent range',rangeWhy:'Zone between the lowest low and highest high of the last twenty completed candles. Alone it establishes neither consolidation nor a breakout.'},
 pt:{support:'Suporte observado',resistance:'Resistência observada',level:'Viragem confirmada destas velas; referência histórica editável que pode romper.',trend:'Tendência recente',trendWhy:'Ajuste linear por mínimos quadrados aos últimos fechos completos, até sessenta. Descreve a inclinação histórica sem prever preços futuros.',channel:'Canal histórico',channelWhy:'Canal do ajuste linear limitado pelos resíduos extremos dos fechos da amostra. Não demonstra um padrão preditivo.',fib:'Fibonacci do movimento',fibWhy:'Retrações matemáticas entre o mínimo e máximo observados das últimas trinta velas fechadas, ordenados no tempo. Não confirma suportes futuros.',range:'Intervalo recente',rangeWhy:'Zona entre o menor mínimo e o maior máximo das últimas vinte velas fechadas. Não implica por si só consolidação ou rutura.'}
};

export function executeTools(snapshot,input,context={},lang='es'){
 const tools=validateToolPlan(input,context),actions=[],annotations=[],w=copy[lang]??copy.es;
 const closed=snapshot.candles.filter(c=>c.time<=snapshot.asOf);let drawingTool=null;
 const add=(kind,points,label,reason,color='#2dd4bf')=>{
  if(points.some(p=>!Number.isFinite(p.price)||p.price<=0||!Number.isFinite(p.time)))return;
  annotations.push({id:crypto.randomUUID(),kind,points,label,reason,color,origin:'computed',tool:drawingTool,snapshotId:snapshot.snapshotId});
 };
 for(const tool of tools){
  if(tool.name==='draw'){
   drawingTool=tool.drawing;
   if(tool.drawing==='levels')for(const level of snapshot.levels)add('horizontal',[{time:level.confirmedAt,price:level.price}],w[level.kind],w.level,level.kind==='support'?'#34d399':'#fb7185');
   if(['trend','channel'].includes(tool.drawing)){
    const fit=fitTrend(closed);if(!fit)continue;
    const point=(last,shift=0)=>({time:last?fit.rows.at(-1).time:fit.rows[0].time,price:(last?fit.last:fit.first)+shift});
    add('trend',[point(false),point(true)],w.trend,w.trendWhy);
    if(tool.drawing==='channel')for(const shift of [fit.lower,fit.upper])add('trend',[point(false,shift),point(true,shift)],w.channel,w.channelWhy,'#a78bfa');
   }
   if(tool.drawing==='fib'){
    const rows=closed.slice(-30);if(rows.length<5)continue;
    const low=rows.reduce((a,b)=>b.low<a.low?b:a),high=rows.reduce((a,b)=>b.high>a.high?b:a);
    if(low.time!==high.time)add('fib',[{time:low.time,price:low.low},{time:high.time,price:high.high}].sort((a,b)=>a.time-b.time),w.fib,w.fibWhy,'#fbbf24');
   }
   if(tool.drawing==='range'){
    const rows=closed.slice(-20);if(rows.length<5)continue;
    add('box',[{time:rows[0].time,price:Math.min(...rows.map(c=>c.low))},{time:rows.at(-1).time,price:Math.max(...rows.map(c=>c.high))}],w.range,w.rangeWhy,'#38bdf8');
   }
  }else if(tool.name==='indicator')actions.push({type:tool.indicator,...(tool.period?{period:tool.period}:{}),enabled:tool.enabled});
  else if(tool.name==='focus')actions.push({type:'focus',value:tool.mode});
  else if(tool.name==='interval')actions.push({type:'interval',value:tool.value});
  else if(tool.name==='remove')actions.push({type:'removeDrawing',id:tool.id});
  else if(tool.name==='clear')actions.push({type:'clear'});
  else if(tool.name==='compare')actions.push({type:'compare',...(tool.query?{query:tool.query}:{venue:tool.venue})});
  else if(tool.name==='uncompare')actions.push({type:'uncompare'});
 }
 if(annotations.length)actions.push({type:'draw',drawings:annotations});
 return {actions,annotations,partial:tools.some(t=>t.name==='draw'&&!annotations.some(a=>a.tool===t.drawing))};
}
