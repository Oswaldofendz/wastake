import {useEffect,useState} from 'react';
import {fetchAssetQuote} from '../services/api.js';
const cached=new Map(),ttl=120000;
const identity=a=>`${a.type}:${a.id}`;
const dated=a=>a?.quoteAsOf&&Number.isFinite(Date.parse(a.quoteAsOf))&&Date.parse(a.quoteAsOf)<=Date.now();

// Only visible rows without a dated quote need an extra lightweight request.
// The catalogue market cap is retained; its timestamp is never borrowed for price.
export function useHomeQuotes(rows,revision=0) {
  const [quotes,setQuotes]=useState({});
  const key=rows.filter(a=>!dated(a)).map(identity).join('|');
  useEffect(()=>{
    let active=true;const controller=new AbortController();
    for(const asset of rows.filter(a=>!dated(a)).slice(0,8)){
      const id=identity(asset),stored=cached.get(id);
      if(stored&&Date.now()-stored.at<ttl){setQuotes(old=>({...old,[id]:stored.quote}));continue;}
      fetchAssetQuote(asset,{signal:controller.signal}).then(quote=>{
        if(!active||quote.id!==asset.id||!dated(quote)||!Number.isFinite(quote.price)||quote.price<=0)return;
        cached.set(id,{quote,at:Date.now()});while(cached.size>40)cached.delete(cached.keys().next().value);
        setQuotes(old=>({...old,[id]:quote}));
      }).catch(()=>{/* A missing quote remains missing in the table. */});
    }
    return()=>{active=false;controller.abort();};
  },[key,revision]);
  return rows.map(asset=>!dated(asset)&&quotes[identity(asset)]?{...asset,...quotes[identity(asset)],name:asset.name,symbol:asset.symbol}:asset);
}
