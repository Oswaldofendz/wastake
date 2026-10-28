const memory=new Map();
const key=(asset,type,lang)=>JSON.stringify([asset.id,type,lang]);
const STORAGE='wastake-public-news-v1';
function restore(){if(memory.size)return;try{for(const [k,v] of JSON.parse(sessionStorage.getItem(STORAGE)||'[]'))if(v&&Array.isArray(v.news)&&Date.now()-v.storedAt<21600000)memory.set(k,v);}catch{}}
export function cachedPublicNews(asset,type,lang){restore();const k=key(asset,type,lang),v=memory.get(k);if(v&&Date.now()-v.storedAt>=21600000){memory.delete(k);return null;}return v??null;}
export function rememberPublicNews(asset,type,lang,value){if(!Array.isArray(value?.news))return;restore();const k=key(asset,type,lang),old=memory.get(k);if(!value.news.length&&old?.news.length)return;memory.delete(k);memory.set(k,{...value,storedAt:Date.now()});while(memory.size>12)memory.delete(memory.keys().next().value);try{sessionStorage.setItem(STORAGE,JSON.stringify([...memory]));}catch{}}
