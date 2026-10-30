import {chartPriceFormat} from '../utils/numberFormat.js';
import {expandedStudies} from '../utils/expandedChartMath.js';
import {atrAdxPoints,stochasticPoints,obvPoints,vwapPoints} from '../utils/advancedChartMath.js';
import {forwardRef,useEffect,useMemo,useImperativeHandle,useRef,useState} from 'react';
import {createChart,ColorType,LineStyle} from 'lightweight-charts';
import {useTranslation} from 'react-i18next';
import {emaSeries} from '../utils/chartLevels.js';
import {rsiPoints,bollingerPoints,focusRange,smaPoints,macdPoints} from '../utils/chartWorkspace.js';
import {sharedPerformance} from '../utils/chartDrawings.js';
import {DrawingOverlay} from './ChartDrawings.jsx';

export const AgentCanvas=forwardRef(function AgentCanvas({snapshot,asset,workspace,comparison,tool,setTool,onDrawings,selectedId,onSelect},ref){
 const main=useRef(null),surface=useRef(null),rsi=useRef(null),macd=useRef(null),api=useRef(null),panes=useRef([]),saved=useRef(null);
 const advancedNodes=useRef({});
 const advanced=useMemo(()=>{const closed=snapshot.candles.filter(c=>c.time<=snapshot.asOf),a=atrAdxPoints(closed);return {...a,...expandedStudies(closed),stoch:stochasticPoints(closed),obv:obvPoints(closed),vwap:vwapPoints(closed,snapshot.intervalSeconds)};},[snapshot]);
 const [handle,setHandle]=useState(null);
 const {t,i18n}=useTranslation();
 const performance=comparison?sharedPerformance(snapshot.candles.filter(c=>c.time<=snapshot.asOf),comparison.candles.filter(c=>c.time<=comparison.asOf)):null;
 const compareMode=!!performance;
 useImperativeHandle(ref,()=>({async exportImage(){
   if(!api.current)return;
   const raw=api.current.takeScreenshot(),scale=raw.width/Math.max(1,main.current.clientWidth),margin=Math.round(42*scale);
   const extra=panes.current.map(p=>({label:p.label,image:p.chart.takeScreenshot()}));
   const canvas=document.createElement('canvas');canvas.width=raw.width;canvas.height=raw.height+margin*2+extra.reduce((sum,p)=>sum+p.image.height+24*scale,0);
   const ctx=canvas.getContext('2d');ctx.fillStyle='#101416';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(raw,0,margin);
   const svg=surface.current?.querySelector('svg[aria-label]');
   if(svg&&!compareMode){
     const clone=svg.cloneNode(true);clone.setAttribute('width',String(main.current.clientWidth));clone.setAttribute('height',String(main.current.clientHeight));
     const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));
     try{const image=new Image();image.src=url;await image.decode();ctx.drawImage(image,0,margin,raw.width,raw.height);}finally{URL.revokeObjectURL(url);}
   }
   ctx.fillStyle='#e2e8f0';ctx.font=`${14*scale}px system-ui`;ctx.fillText(`WaStake · ${asset.symbol} · ${snapshot.interval} · ${compareMode?'%':snapshot.currency??'—'}`,16*scale,26*scale);
   let y=margin+raw.height;
   for(const pane of extra){ctx.font=`${11*scale}px system-ui`;ctx.fillText(pane.label,16*scale,y+17*scale);ctx.drawImage(pane.image,0,y+24*scale);y+=pane.image.height+24*scale;}
   ctx.fillStyle='#94a3b8';ctx.font=`${10*scale}px system-ui`;ctx.fillText(`${snapshot.source} · ${new Date(snapshot.asOf*1000).toISOString()} · ${t('agent_limits')}`,16*scale,canvas.height-16*scale,canvas.width-32*scale);
   canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.download=`WaStake-${asset.symbol}-${snapshot.interval}.png`;a.href=url;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);},'image/png');
 }}),[snapshot,asset,i18n.language,compareMode]);
 const studiesKey=JSON.stringify([workspace.ema,workspace.sma,workspace.rsi,workspace.macd,workspace.volume,workspace.bollinger,workspace.focus,workspace.focusToken,workspace.atr,workspace.adx,workspace.stoch,workspace.obv,workspace.vwap,workspace.cci,workspace.mfi,workspace.williams,workspace.roc,workspace.cmf,workspace.donchian,workspace.keltner]);
 useEffect(()=>{
   if(!main.current||!snapshot?.candles?.length)return;
   const all=snapshot.candles,closed=all.filter(c=>c.time<=snapshot.asOf);
   const text=getComputedStyle(main.current).getPropertyValue('--text-primary').trim()||'#cbd5e1',background=getComputedStyle(main.current).getPropertyValue('--bg-card').trim()||'#111318';
   const common={autoSize:false,layout:{background:{type:ColorType.Solid,color:background},textColor:text,fontFamily:'Inter, system-ui, sans-serif',fontSize:11},grid:{vertLines:{color:'#64748b0b'},horzLines:{color:'#64748b12'}},timeScale:{borderVisible:false,timeVisible:snapshot.intervalSeconds<86400,secondsVisible:false},localization:{locale:i18n.language}};
   const observers=[];
   const makeChart=(node,options)=>{const instance=createChart(node,{...common,width:node.clientWidth,height:node.clientHeight,...options});const observer=new ResizeObserver(()=>{const range=instance.timeScale().getVisibleLogicalRange();instance.resize(node.clientWidth,node.clientHeight);if(range)instance.timeScale().setVisibleLogicalRange(range);});observer.observe(node);observers.push(observer);return instance;};
   const chart=makeChart(main.current,{rightPriceScale:{borderVisible:false,scaleMargins:{top:.10,bottom:workspace.volume&&!compareMode ? .22 : .10}}});api.current=chart;
   let series;
   if(compareMode){
     const format={type:'custom',formatter:n=>`${n.toFixed(2)}%`,minMove:.01};
     series=chart.addLineSeries({color:'#2dd4bf',lineWidth:2,title:`${asset.symbol} · ${snapshot.source}`,priceFormat:format});series.setData(performance.left);
     chart.addLineSeries({color:'#c084fc',lineWidth:2,title:`${workspace.compare?.asset.symbol??asset.symbol} · ${comparison.source}`,priceFormat:format}).setData(performance.right);
     setHandle(null);
   }else{
     const close=all.at(-1).close,priceFormat=chartPriceFormat(close,i18n.language);
     series=chart.addCandlestickSeries({upColor:'#20c997',downColor:'#f16d83',borderVisible:false,wickUpColor:'#20c997',wickDownColor:'#f16d83',priceFormat});series.setData(all);
     for(const period of workspace.ema){const line=chart.addLineSeries({color:({20:'#38bdf8',50:'#a78bfa',200:'#fbbf24'})[period],lineWidth:1,title:`EMA ${period}`,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false,priceFormat});line.setData(emaSeries(closed,period));}
     for(const period of workspace.sma??[]){const line=chart.addLineSeries({color:'#fb923c',lineWidth:1,lineStyle:LineStyle.Dashed,title:`SMA ${period}`,priceLineVisible:false,lastValueVisible:false,priceFormat});line.setData(smaPoints(closed,period));}
     if(workspace.bollinger)for(const key of ['upper','middle','lower']){const line=chart.addLineSeries({color:key==='middle'?'#94a3b8':'#38bdf85c',lineWidth:1,lineStyle:LineStyle.Dotted,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false,priceFormat});line.setData(bollingerPoints(closed).map(b=>({time:b.time,value:b[key]})));}
     for(const kind of ['donchian','keltner'])if(workspace[kind])for(const field of ['upper','middle','lower']){const line=chart.addLineSeries({color:kind==='donchian'?'#fbbf24aa':'#fb923caa',lineWidth:1,lineStyle:LineStyle.Dashed,title:kind==='donchian'?'Donchian 20':'Keltner 20/10/2',priceLineVisible:false,lastValueVisible:false,priceFormat});line.setData(advanced[kind].map(p=>({time:p.time,value:p[field]})));}
     if(workspace.vwap&&advanced.vwap.length){const v=chart.addLineSeries({color:'#fbbf24',lineWidth:2,title:'VWAP · UTC',priceLineVisible:false,priceFormat});v.setData(advanced.vwap);}
     if(workspace.volume){const volume=chart.addHistogramSeries({priceScaleId:'volume',priceFormat:{type:'volume'},priceLineVisible:false,lastValueVisible:false});volume.priceScale().applyOptions({scaleMargins:{top:.84,bottom:0}});volume.setData(all.filter(c=>Number.isFinite(c.volume)).map(c=>({time:c.time,value:c.volume,color:c.close>=c.open?'#20c99738':'#fb718538'})));}
     setHandle({id:crypto.randomUUID(),chart,series,candles:all});
   }
   const view=compareMode?performance.left:all,key=`${snapshot.id}:${snapshot.interval}:${snapshot.source}:${compareMode}:${workspace.focus}:${workspace.focusToken??0}`;
   const range=focusRange(compareMode?view.map(c=>({...c,close:c.value+100})):workspace.focus==='drop'?closed:all,workspace.focus);
   if(saved.current?.key===key&&saved.current.range)chart.timeScale().setVisibleLogicalRange(saved.current.range);else if(workspace.focus==='recent')chart.timeScale().setVisibleLogicalRange({from:Math.max(0,view.length-80),to:view.length+3});else if(range)chart.timeScale().setVisibleRange(range);else chart.timeScale().fitContent();
   const oscillators=[];
   if(!compareMode&&workspace.rsi&&rsi.current){
     const pane=makeChart(rsi.current,{handleScroll:false,handleScale:false,rightPriceScale:{borderVisible:false,scaleMargins:{top:.12,bottom:.12}}});
     const line=pane.addLineSeries({color:'#c4b5fd',lineWidth:1,title:'RSI 14',priceLineVisible:false,autoscaleInfoProvider:()=>({priceRange:{minValue:0,maxValue:100}})});line.setData(rsiPoints(closed));
     [30,70].forEach(price=>line.createPriceLine({price,color:'#94a3b855',lineStyle:LineStyle.Dashed,axisLabelVisible:true}));oscillators.push({chart:pane,label:'RSI 14'});
   }
   if(!compareMode&&workspace.macd&&macd.current){
     const pane=makeChart(macd.current,{handleScroll:false,handleScale:false,rightPriceScale:{borderVisible:false,scaleMargins:{top:.1,bottom:.1}}}),data=macdPoints(closed);
     pane.addHistogramSeries({priceLineVisible:false,lastValueVisible:false,priceFormat:chartPriceFormat(data.histogram.at(-1)?.value??all.at(-1).close,i18n.language)}).setData(data.histogram.map(p=>({...p,color:p.value>=0?'#20c99766':'#fb718566'})));
     pane.addLineSeries({color:'#38bdf8',lineWidth:1,priceLineVisible:false,lastValueVisible:false,priceFormat:chartPriceFormat(data.line.at(-1)?.value??all.at(-1).close,i18n.language)}).setData(data.line);
     pane.addLineSeries({color:'#fbbf24',lineWidth:1,priceLineVisible:false,lastValueVisible:false,priceFormat:chartPriceFormat(data.signal.at(-1)?.value??all.at(-1).close,i18n.language)}).setData(data.signal);oscillators.push({chart:pane,label:'MACD 12/26/9'});
   }
   for(const key of ['atr','adx','stoch','obv','cci','mfi','williams','roc','cmf'])if(!compareMode&&workspace[key]&&advancedNodes.current[key]&&advanced[key].length){
     const pane=makeChart(advancedNodes.current[key],{handleScroll:false,handleScale:false,rightPriceScale:{borderVisible:false,scaleMargins:{top:.15,bottom:.15}}});
     const bounded=['stoch','adx','mfi','williams','cmf'].includes(key),opts={priceLineVisible:false,lastValueVisible:true,lineWidth:1,...(bounded?{autoscaleInfoProvider:()=>({priceRange:{minValue:key==='williams'?-100:key==='cmf'?-1:0,maxValue:key==='williams'?0:key==='cmf'?1:100}})}:{}),...(key==='obv'?{priceFormat:{type:'volume'}}:key==='atr'?{priceFormat:chartPriceFormat(advanced.atr.at(-1)?.value??all.at(-1).close,i18n.language)}:{})};
     pane.addLineSeries({...opts,color:'#38bdf8',title:key.toUpperCase()}).setData(advanced[key].map(p=>({time:p.time,value:p.value})));
     if(key==='adx')for(const [field,color] of [['pdi','#34d399'],['mdi','#fb7185']])pane.addLineSeries({...opts,color,title:field==='pdi'?'+DI':'−DI',lastValueVisible:false}).setData(advanced.adx.map(p=>({time:p.time,value:p[field]})));
     if(key==='stoch')pane.addLineSeries({...opts,color:'#fbbf24',title:'%D',lastValueVisible:false}).setData(advanced.stoch.filter(p=>Number.isFinite(p.signal)).map(p=>({time:p.time,value:p.signal})));
     for(const price of (key==='mfi'?[20,80]:key==='williams'?[-80,-20]:key==='cci'?[-100,100]:[]))pane.addLineSeries({color:'#64748b66',lineWidth:1,lineStyle:LineStyle.Dotted,priceLineVisible:false,lastValueVisible:false}).setData([{time:closed[0].time,value:price},{time:closed.at(-1).time,value:price}]);
     oscillators.push({chart:pane,label:key.toUpperCase()});
   }
   panes.current=oscillators;
   const sync=range=>{if(range)for(const pane of oscillators)try{pane.chart.timeScale().setVisibleRange(range);}catch{}};
   sync(chart.timeScale().getVisibleRange());chart.timeScale().subscribeVisibleTimeRangeChange(sync);
   return()=>{saved.current={key,range:chart.timeScale().getVisibleLogicalRange()};observers.forEach(o=>o.disconnect());api.current=null;panes.current=[];setHandle(null);chart.remove();oscillators.forEach(p=>p.chart.remove());};
 },[snapshot,studiesKey,i18n.language,comparison]);
 return <div className="flex min-h-0 flex-1 flex-col">
   <div ref={surface} className="relative min-h-[230px] flex-1"><div ref={main} role="img" aria-label={`${asset.symbol} · ${snapshot.interval} · ${t('chart_ai')}`} className="absolute inset-0"/>{!compareMode&&<DrawingOverlay handle={handle} drawings={workspace.drawings??[]} onChange={onDrawings} tool={tool} setTool={setTool} selectedId={selectedId} onSelect={onSelect}/>}</div>
   {!compareMode&&workspace.rsi&&<div className="shrink-0 border-t border-slate-700/40"><p className="px-2 pt-1 text-[10px] text-violet-300">RSI 14 · 30 / 70</p><div ref={rsi} role="img" aria-label={`RSI · ${asset.symbol}`} style={{height:95}}/></div>}
   {!compareMode&&workspace.macd&&<div className="shrink-0 border-t border-slate-700/40"><p className="px-2 pt-1 text-[10px] text-sky-300">MACD 12/26/9</p><div ref={macd} role="img" aria-label={`MACD · ${asset.symbol}`} style={{height:95}}/></div>}
   {!compareMode&&['atr','adx','stoch','obv','cci','mfi','williams','roc','cmf'].filter(key=>workspace[key]).map(key=><div key={key} className="shrink-0 border-t border-slate-700/40"><p className="px-2 pt-1 text-[10px] text-sky-300">{key.toUpperCase()}{key==='atr'?` · ${snapshot.currency??''}`:key==='adx'?' / +DI / −DI':key==='stoch'?' 14 / 3':''}</p>{advanced[key].length?<div ref={node=>{advancedNodes.current[key]=node;}} role="img" aria-label={`${key.toUpperCase()} · ${asset.symbol}`} style={{height:95}}/>:<p role="status" className="p-2 text-xs text-amber-200">{t('ui_indicator_missing')}</p>}</div>)}
   {!compareMode&&workspace.vwap&&<p className="px-2 py-1 text-[10px] text-amber-200">{t(advanced.vwap.length?'ui_vwap_method':'ui_vwap_missing')}</p>}
   {comparison&&<p role="status" className="shrink-0 px-2 py-1 text-[10px] leading-4 text-slate-400">{t(compareMode?'studio_compare_note':'studio_compare_missing')}{compareMode&&` · ${performance.count} · ${new Date(performance.from*1000).toISOString().slice(0,10)}`}</p>}
   <p className="shrink-0 px-2 py-1 text-[9px] text-slate-500">TradingView Lightweight Charts™ · <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="underline">TradingView</a></p>
 </div>;
});
