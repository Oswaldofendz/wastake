export const CHART_INTERVALS=[
 {id:'1m',label:'1 min',seconds:60,yahoo:'1m',range:'5d'},
 {id:'5m',label:'5 min',seconds:300,yahoo:'5m',range:'1mo'},
 {id:'15m',label:'15 min',seconds:900,yahoo:'15m',range:'1mo'},
 {id:'30m',label:'30 min',seconds:1800,yahoo:'30m',range:'1mo'},
 {id:'1h',label:'1 h',seconds:3600,yahoo:'60m',range:'3mo'},
 {id:'4h',label:'4 h',seconds:14400,yahoo:'60m',range:'3mo'},
 {id:'1d',label:'1D',seconds:86400},
 {id:'1w',label:'1S',seconds:604800,yahoo:'1wk',range:'5y'},
 {id:'1mo',label:'1M',seconds:2592000,yahoo:'1mo',range:'10y'},
];
export const intervalInfo=id=>CHART_INTERVALS.find(x=>x.id===id);
export function calendarBarTime(time,interval){const d=new Date(time*1000);if(interval==='1mo')return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)/1000;const day=Math.floor(time/86400)*86400;return interval==='1w'?day-((d.getUTCDay()+6)%7)*86400:day;}
export function candleEnd(time,interval){if(interval==='1mo'){const d=new Date(time*1000);return Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,1)/1000;}return time+(intervalInfo(interval)?.seconds??86400);}
