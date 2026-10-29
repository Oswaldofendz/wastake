import {useCallback,useEffect,useState} from 'react';
import {ALL_ASSETS} from '../data/assetCatalog.js';
import {searchAssets} from '../services/api.js';
import {assetDescriptor,routeSelection,sameAsset,assetSearchParams} from '../utils/assetRoute.js';
const storage='wastake-public-selection-v1',event='wastake-asset-selection';
function saved(){try{const rows=JSON.parse(sessionStorage.getItem(storage)||'[]');return Array.isArray(rows)?rows.filter(a=>a&&typeof a.name==='string'&&typeof a.symbol==='string').slice(-20):[];}catch{return [];}}
function remember(asset){
 if(!asset)return;
 const {id,type,name,symbol,analysisType,currency,image}=asset;
 const rows=saved().filter(a=>!sameAsset(a,asset));rows.push({id,type,name,symbol,analysisType,currency,image:typeof image==='string'&&image.startsWith('https://')?image:null});
 try{sessionStorage.setItem(storage,JSON.stringify(rows.slice(-20)));}catch{}
}
export function useAssetRoute(fallback=null,assets=ALL_ASSETS){
 const [search,setSearch]=useState(()=>window.location.search);
 const [asset,setAsset]=useState(()=>routeSelection(window.location.search,[...assets,...ALL_ASSETS],saved())??fallback);
 useEffect(()=>{const read=()=>setSearch(window.location.search);window.addEventListener('popstate',read);window.addEventListener('hashchange',read);window.addEventListener(event,read);return()=>{window.removeEventListener('popstate',read);window.removeEventListener('hashchange',read);window.removeEventListener(event,read);};},[]);
 useEffect(()=>{
  let active=true;const descriptor=assetDescriptor(search),next=routeSelection(search,[...assets,...ALL_ASSETS],saved());
  if(!descriptor){setAsset(fallback);return;}
  setAsset(current=>sameAsset(current,next)&&!current.unresolved?current:next);
  if(next?.unresolved)searchAssets(descriptor.id).then(result=>{const exact=result.results?.find(a=>sameAsset(a,descriptor));if(active&&exact&&sameAsset(assetDescriptor(window.location.search),descriptor)){remember(exact);setAsset(exact);}}).catch(()=>{});
  return()=>{active=false;};
 },[search,assets,fallback]);
 const choose=useCallback(next=>{
  remember(next);setAsset(next);
  const params=assetSearchParams(window.location.search,next),url=`${window.location.pathname}${params?'?'+params:''}${window.location.hash}`;
  window.history.replaceState(null,'',url);setSearch(window.location.search);window.dispatchEvent(new Event(event));
 },[]);
 return [asset,choose];
}
