import {forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import {createChart,ColorType,LineStyle} from 'lightweight-charts';
import {useTranslation} from 'react-i18next';
import {emaSeries} from '../utils/chartLevels.js';
import {rsiPoints,bollingerPoints,focusRange} from '../utils/chartWorkspace.js';

export const AgentCanvas=forwardRef(function AgentCanvas({snapshot,asset,workspace},ref){
 const main=useRef(null),rsi=useRef(null),api=useRef(null),saved=useRef(null);
 const {t,i18n}=useTranslation();
 useImperativeHandle(ref,()=>({exportImage(){
  if(!api.current)return;
  const raw=api.current.takeScreenshot(),scale=raw.width/Math.max(1,main.current.clientWidth),margin=Math.round(52*scale);
  const canvas=document.createElement('canvas');canvas.width=raw.width;canvas.height=raw.height+margin*2;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#101416';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(raw,0,margin);
  ctx.fillStyle='#e2e8f0';ctx.font=`${Math.round(14*scale)}px system-ui`;
  ctx.fillText(`WaStake · ${asset.symbol} · ${snapshot.interval} · ${snapshot.currency??'—'}`,16*scale,25*scale);
  ctx.font=`${Math.round(11*scale)}px system-ui`;ctx.fillStyle='#94a3b8';
  ctx.fillText(`${snapshot.source??'—'} · ${new Date(snapshot.asOf*1000).toISOString()} · UTC · ${t('agent_limits')}`,16*scale,canvas.height-25*scale,canvas.width-32*scale);
  canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.download=`WaStake-${asset.symbol}-${snapshot.interval}.png`;a.href=url;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);},'image/png');
 }}),[snapshot,asset,i18n.language]);
 useEffect(()=>{
  if(!main.current||!snapshot?.candles?.length)return;
  const all=snapshot.candles,text=getComputedStyle(main.current).getPropertyValue('--text-primary').trim()||'#cbd5e1',background=getComputedStyle(main.current).getPropertyValue('--bg-card').trim()||'#111318';
  const analysisBars=all.filter(c=>c.time<=snapshot.asOf);
  const common={autoSize:true,layout:{background:{type:ColorType.Solid,color:background},textColor:text,fontFamily:'Inter, system-ui, sans-serif'},grid:{vertLines:{visible:false},horzLines:{color:'#64748b18'}},timeScale:{borderVisible:false,timeVisible:snapshot.interval!=='1d',secondsVisible:false},localization:{locale:i18n.language}};
  const chart=createChart(main.current,{...common,rightPriceScale:{borderVisible:false,scaleMargins:{top:.12,bottom:workspace.volume ? .24 : .10}}});api.current=chart;
  const price=all.at(-1).close,precision=price>=1?2:Math.min(10,Math.max(4,-Math.floor(Math.log10(price))+2)),priceFormat={type:'price',precision,minMove:10**-precision};
  const candle=chart.addCandlestickSeries({upColor:'#20c997',downColor:'#fb7185',borderVisible:false,wickUpColor:'#20c997',wickDownColor:'#fb7185',priceFormat});candle.setData(all);
  const colors={20:'#38bdf8',50:'#a78bfa',200:'#fbbf24'};
  for(const period of workspace.ema){const line=chart.addLineSeries({color:colors[period],lineWidth:1,title:`EMA ${period}`,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false,priceFormat});line.setData(emaSeries(analysisBars,period));}
  if(workspace.bollinger){const bands=bollingerPoints(analysisBars);for(const key of ['upper','middle','lower']){const line=chart.addLineSeries({color:key==='middle'?'#94a3b8':'#38bdf85c',lineWidth:1,lineStyle:LineStyle.Dotted,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false});line.setData(bands.map(b=>({time:b.time,value:b[key]})));}}
  if(workspace.volume){const series=chart.addHistogramSeries({priceScaleId:'volume',priceFormat:{type:'volume'},priceLineVisible:false,lastValueVisible:false});series.priceScale().applyOptions({scaleMargins:{top:.83,bottom:0}});series.setData(all.filter(c=>Number.isFinite(c.volume)).map(c=>({time:c.time,value:c.volume,color:c.close>=c.open?'#20c99744':'#fb718544'})));}
  if(workspace.levels)for(const level of snapshot.levels){const color=level.kind==='support'?'#34d399':'#fb7185';for(const [index,value] of [level.low,level.price,level.high].entries()){const centre=index===1,line=chart.addLineSeries({color:centre?color:color+'44',lineWidth:1,lineStyle:LineStyle.Dashed,title:centre?t(`chart_${level.kind}`):'',lastValueVisible:centre,priceLineVisible:false,crosshairMarkerVisible:false,priceFormat});line.setData([{time:level.confirmedAt,value},{time:Math.max(all.at(-1).time,level.confirmedAt+snapshot.intervalSeconds),value}]);}}
  for(const mark of workspace.lines)candle.createPriceLine({price:mark.price,color:'#fbbf24',lineStyle:LineStyle.Dashed,lineWidth:1,axisLabelVisible:true,title:t('agent_manual')});
  const key=`${snapshot.id}:${snapshot.interval}:${workspace.focus}:${workspace.focusToken??0}`;
  const range=focusRange(all,workspace.focus);
  if(saved.current?.key===key&&saved.current.range)chart.timeScale().setVisibleLogicalRange(saved.current.range);else if(range)chart.timeScale().setVisibleRange(range);else chart.timeScale().fitContent();
  let oscillator;
  if(workspace.rsi&&rsi.current){
   oscillator=createChart(rsi.current,{...common,handleScroll:false,handleScale:false,rightPriceScale:{borderVisible:false,scaleMargins:{top:.12,bottom:.12}}});
   const line=oscillator.addLineSeries({color:'#c4b5fd',lineWidth:2,title:'RSI 14',priceLineVisible:false,lastValueVisible:true,autoscaleInfoProvider:()=>({priceRange:{minValue:0,maxValue:100}})});line.setData(rsiPoints(analysisBars));
   [30,70].forEach(price=>line.createPriceLine({price,color:'#94a3b888',lineStyle:LineStyle.Dashed,axisLabelVisible:true}));
   const sync=range=>{if(range)try{oscillator.timeScale().setVisibleRange(range);}catch{/* Empty panes have no scale yet. */}};
   sync(chart.timeScale().getVisibleRange());chart.timeScale().subscribeVisibleTimeRangeChange(sync);
  }
  return()=>{saved.current={key,range:chart.timeScale().getVisibleLogicalRange()};api.current=null;chart.remove();oscillator?.remove();};
 },[snapshot,workspace,i18n.language]);
 return <div className="min-w-0"><div ref={main} role="img" aria-label={`${asset.symbol} · ${snapshot.interval} · ${t('chart_ai')}`} style={{height:'clamp(360px, 42vw, 540px)',width:'100%'}}/>{workspace.rsi&&<div className="mt-2 border-t border-slate-700/60 pt-2"><p className="text-xs text-violet-300">RSI (14) · 30 / 70</p><div ref={rsi} role="img" aria-label={`RSI · ${asset.symbol}`} style={{height:132,width:'100%'}}/></div>}<p className="mt-2 text-[10px] text-slate-500">TradingView Lightweight Charts™ · <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer" className="underline">TradingView</a></p></div>;
});
