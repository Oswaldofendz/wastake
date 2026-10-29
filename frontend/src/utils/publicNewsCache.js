export function createPublicNewsCache(getStorage=()=>sessionStorage,now=Date.now){
 const memory=new Map(),storageKey='wastake-public-news-v1',key=(asset,type,lang)=>JSON.stringify([asset.id,type,lang]);let restored=false;
 const valid=value=>value&&Array.isArray(value.news)&&Number.isFinite(value.storedAt)&&value.storedAt<=now()&&now()-value.storedAt<21600000;
 function restore(){if(restored)return;restored=true;try{const rows=JSON.parse(getStorage().getItem(storageKey)||'[]');if(Array.isArray(rows))for(const [k,v] of rows.slice(-12))if(valid(v))memory.set(k,v);}catch{}}
 function persist(){try{getStorage().setItem(storageKey,JSON.stringify([...memory]));}catch{}}
 return {
  read(asset,type,lang){restore();const k=key(asset,type,lang),v=memory.get(k);if(v&&!valid(v)){memory.delete(k);persist();return null;}return v??null;},
  remember(asset,type,lang,value){
   if(!Array.isArray(value?.news))return;restore();const k=key(asset,type,lang),old=memory.get(k);memory.delete(k);
   const retained=!value.news.length&&value.sourceStatus==='unavailable'&&valid(old)?{...old,stale:true,sourceStatus:'unavailable'}:{...value,storedAt:now()};
   memory.set(k,retained);while(memory.size>12)memory.delete(memory.keys().next().value);persist();
  }
 };
}
const cache=createPublicNewsCache();
export const cachedPublicNews=(asset,type,lang)=>cache.read(asset,type,lang);
export const rememberPublicNews=(asset,type,lang,value)=>cache.remember(asset,type,lang,value);
