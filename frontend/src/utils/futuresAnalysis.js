import {timedCandles} from './timedCandles.js';
import {emaSeries,significantLevels} from './chartLevels.js';
import {atrAdxPoints} from './advancedChartMath.js';
import {rsiPoints} from './chartWorkspace.js';

export const futuresIntervals = {'1h':3600,'4h':14400,'1d':86400};
export const futuresInstruments = [
  {id:'PF_XBTUSD',ticker:'BTC',name:'Bitcoin',market:'perpetual',tick:1},
  {id:'PF_ETHUSD',ticker:'ETH',name:'Ethereum',market:'perpetual',tick:0.1},
  {id:'PF_SOLUSD',ticker:'SOL',name:'Solana',market:'perpetual',tick:0.01},
  {id:'PF_XRPUSD',ticker:'XRP',name:'XRP',market:'perpetual',tick:0.0001},
  {id:'ES=F',ticker:'ES',name:'E-mini S&P 500',market:'continuous',tick:0.25},
  {id:'NQ=F',ticker:'NQ',name:'E-mini Nasdaq-100',market:'continuous',tick:0.25}
];

function suppliedNumber(value) {
  return (typeof value==='number' || (typeof value==='string' && value.trim())) && Number.isFinite(Number(value)) ? Number(value) : null;
}

export function parseFuturesCandles(payload) {
  return timedCandles((Array.isArray(payload?.candles)?payload.candles:[]).map(row=>{
    const time=suppliedNumber(row?.time);
    const prices=Object.fromEntries(['open','high','low','close','volume'].map(key=>[key,suppliedNumber(row?.[key])]));
    return {time:time>0?Math.floor(time/1000):null,...prices,volume:prices.volume>=0?prices.volume:null};
  }));
}

const usableVolume = value => Number.isFinite(value) && value>=0;
function relativeVolume(candles) {
  const last = candles.at(-1).volume;
  const previous = candles.slice(-21,-1).map(c=>c.volume);
  if (!usableVolume(last) || previous.length!==20 || !previous.every(usableVolume)) return null;
  const mean = previous.reduce((sum,volume)=>sum+volume,0)/previous.length;
  return mean>0 ? last/mean : null;
}

export function analyzeFutures(raw,instrument,interval,now=Date.now()) {
  const seconds=futuresIntervals[interval];
  if (!seconds || !instrument || (instrument.market==='continuous' && interval!=='1d')) return null;
  const candles=timedCandles(raw).filter(c=>c.time+seconds<=now/1000).slice(-120);
  if (candles.length<50) return null;

  const last=candles.at(-1);
  const close=last.close;
  const stale=now/1000-last.time>(instrument.market==='continuous'?4*86400:seconds*2.5);
  const hasGap=instrument.market==='perpetual' && candles.slice(-50).some((c,i,tail)=>i>0&&c.time-tail[i-1].time!==seconds);
  const ema20=emaSeries(candles,20).at(-1).value;
  const ema50=emaSeries(candles,50).at(-1).value;
  const atr=atrAdxPoints(candles).atr.at(-1)?.value ?? null;
  const rsi=rsiPoints(candles).at(-1)?.value ?? null;
  const volumeRatio=relativeVolume(candles);
  const trend=close>ema20&&ema20>ema50?'long':close<ema20&&ema20<ema50?'short':'mixed';
  const levels=significantLevels(candles,null,now,seconds,2).flatMap(level=>{
    const low=Math.max(instrument.tick,Math.floor(level.low/instrument.tick)*instrument.tick);
    const high=Math.ceil(level.high/instrument.tick)*instrument.tick;
    return low<high && (level.kind==='support'?low<=close:high>=close) ? [{...level,low,high}] : [];
  });
  const scenarios=levels.map(level=>{
    const direction=level.kind==='support'?'long':'short';
    const inside=close>=level.low&&close<=level.high;
    const aligned=trend===direction;
    const momentum=Number.isFinite(rsi)&&(direction==='long'?rsi>=50&&rsi<=70:rsi<=50&&rsi>=30);
    const invalidation=direction==='long'?level.low:level.high;
    const status=stale||hasGap?'unavailable':inside&&aligned&&momentum&&volumeRatio>=1.2?'observed':'watch';
    return {...level,direction,inside,aligned,momentum,invalidation,status};
  });
  return {candles,close,asOf:last.time,stale,hasGap,ema20,ema50,atr,rsi,volumeRatio,trend,scenarios};
}
