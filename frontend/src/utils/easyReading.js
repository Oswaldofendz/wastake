export function easyBias(score){return !Number.isFinite(score)?'unknown':score<=4?'weak':score>=6?'strong':'mixed';}
export function easyHistory(candles,now=Date.now()){const today=Math.floor(now/86400000)*86400;return (candles??[]).filter(c=>Number.isFinite(c.time)&&c.time<today&&Number.isFinite(c.close)&&c.close>0).sort((a,b)=>a.time-b.time);}
export function easyVolatility(analysis){const atr=analysis?.indicators?.atr?.current,price=analysis?.meta?.lastPrice;return Number.isFinite(atr)&&atr>=0&&price>0?atr/price*100:null;}
