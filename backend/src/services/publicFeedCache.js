// A successful empty feed replaces old headlines. Failed feeds may expose a
// bounded, explicitly stale copy; their successful-fetch date never advances.
export function createPublicFeedCache(load,{now=Date.now,ttl=120000,maxStale=1800000,limit=500}={}){
 const entries=new Map(),pending=new Map();
 const snapshot=(feed,e)=>{
  const usable=e.asOf!==null&&now()-e.asOf<=maxStale;
  const stale=e.status!=='ok'||e.asOf===null||now()-e.asOf>=ttl;
  return {articles:usable?e.data.map(a=>({...a,sourceFetchedAt:new Date(e.asOf).toISOString(),sourceStale:stale})):[],status:!stale?'ok':usable?'stale':'unavailable',checkedAt:e.attempt==null?null:new Date(e.attempt).toISOString(),dataAsOf:e.asOf===null?null:new Date(e.asOf).toISOString(),refreshing:pending.has(feed.url)};
 };
 return async feed=>{
  let e=entries.get(feed.url);
  if(!e){if(entries.size>=limit){const idle=[...entries.keys()].find(key=>!pending.has(key));if(idle)entries.delete(idle);}e={data:[],asOf:null,attempt:null,retryAt:0,status:'pending'};entries.set(feed.url,e);}
  if(now()<e.retryAt)return snapshot(feed,e);
  if(!pending.has(feed.url)){
   e.attempt=now();
   const job=Promise.resolve().then(()=>load(feed)).then(data=>{if(!Array.isArray(data))throw new Error('Invalid feed');e.data=data;e.asOf=now();e.status='ok';e.retryAt=now()+ttl;}).catch(()=>{e.status='unavailable';e.retryAt=now()+15000;}).finally(()=>pending.delete(feed.url));
   pending.set(feed.url,job);
  }
  if(e.asOf===null||now()-e.asOf>maxStale)await pending.get(feed.url);
  return snapshot(feed,e);
 };
}
