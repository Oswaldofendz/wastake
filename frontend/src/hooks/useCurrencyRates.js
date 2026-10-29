import {useEffect,useState} from 'react';
import {normalizeUsdRates} from '../utils/portfolioCurrency.js';

let cached=null,pending=null;
function readRates(){
  if(cached&&Date.now()-cached.at<3600000)return Promise.resolve(cached.value);
  if(pending)return pending;
  pending=fetch('https://open.er-api.com/v6/latest/USD',{signal:AbortSignal.timeout(12000)})
    .then(r=>{if(!r.ok)throw new Error('FX unavailable');return r.json();})
    .then(data=>{const value=normalizeUsdRates(data);if(!value)throw new Error('Invalid FX reference');cached={value,at:Date.now()};return value;})
    .finally(()=>{pending=null;});
  return pending;
}
export function useCurrencyRates(allAssets=[]){
  const [fx,setFx]=useState(null);
  useEffect(()=>{let alive=true;const read=()=>readRates().then(value=>{if(alive)setFx(value);}).catch(()=>{if(alive)setFx(null);});read();const timer=setInterval(read,3600000);return()=>{alive=false;clearInterval(timer);};},[]);
  const btc=allAssets.find(a=>a.id==='bitcoin'&&a.type==='crypto');
  return {...fx,EUR:fx?.rates.EUR??null,BTC:btc?.price>0?1/btc.price:null};
}
