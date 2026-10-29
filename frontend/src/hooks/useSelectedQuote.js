import {useEffect,useState} from 'react';
import {fetchAssetQuote} from '../services/api.js';
// Refresh only the selected instrument, not every company in the catalogue.
export function useSelectedQuote(asset){
 const [live,setLive]=useState(null);
 useEffect(()=>{
  let active=true;setLive(null);if(!asset?.id)return;
  const load=()=>fetchAssetQuote(asset).then(q=>{if(active&&Number.isFinite(q.price)&&q.price>0)setLive({...q,id:asset.id,type:asset.type});}).catch(()=>{});
  load();const timer=setInterval(()=>{if(document.visibilityState==='visible')load();},60000);
  return()=>{active=false;clearInterval(timer);};
 },[asset?.id,asset?.type,asset?.analysisType]);
 return asset&&live?.id===asset.id&&live?.type===asset.type?{...asset,...live,name:asset.name,symbol:asset.symbol,volume24h:live.volume??live.volume24h??asset.volume24h}:asset;
}
