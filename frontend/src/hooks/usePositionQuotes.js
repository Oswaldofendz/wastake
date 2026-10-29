import {useEffect,useState} from 'react';
import {fetchAssetQuote,searchAssets} from '../services/api.js';

// Only public instrument IDs leave this hook, never holdings, costs or user IDs.
// Refresh held instruments, including external ones absent from the catalogue.
export function usePositionQuotes(positions){
 const keys=JSON.stringify([...new Map(positions.map(p=>[`${p.asset_type}:${p.asset_id}`,{id:p.asset_id,type:p.asset_type}])).values()].filter(a=>a.type&&/^[A-Za-z0-9^=._-]{1,100}$/.test(a.id)).sort((a,b)=>a.id.localeCompare(b.id)));
 const [quotes,setQuotes]=useState({key:null,values:{}});
 useEffect(()=>{
  const assets=JSON.parse(keys),controller=new AbortController();let running=false;
  setQuotes({key:keys,values:{}});
  const load=async()=>{
   if(running||!assets.length||document.visibilityState==='hidden')return;running=true;
   try{for(let i=0;i<assets.length&&!controller.signal.aborted;i+=4){await Promise.all(assets.slice(i,i+4).map(async asset=>{
    let q=null;
    try{q=await fetchAssetQuote(asset,{signal:controller.signal});}
    catch{if(asset.type==='crypto'&&!controller.signal.aborted){try{const result=await searchAssets(asset.id),exact=result.results?.find(a=>a.id===asset.id&&a.type===asset.type);if(exact)q=await fetchAssetQuote(exact,{signal:controller.signal});}catch{}}}
    if(!controller.signal.aborted)setQuotes(old=>old.key===keys?{key:keys,values:{...old.values,[`${asset.type}:${asset.id}`]:q}}:old);
   }));}}finally{running=false;}
  };
  load();const timer=setInterval(load,60000);return()=>{controller.abort();clearInterval(timer);};
 },[keys]);
 return quotes.key===keys?quotes.values:{};
}
