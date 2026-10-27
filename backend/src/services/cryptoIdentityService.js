import axios from 'axios';
import { universe } from './catalogueService.js';
import { createSingleFlight } from './singleFlight.js';
const once=createSingleFlight(),cache=new Map();
const names=s=>String(s||'').toLowerCase().replace(/\busd\b/g,'').replace(/[^a-z0-9]/g,'');
export function matchingYahooCrypto(quotes,coin){
 const expected=names(coin?.name);if(!expected)return null;
 return quotes.find(q=>q.quoteType==='CRYPTOCURRENCY'&&/-USD$/.test(q.symbol||'')&&[q.longname,q.shortname].some(n=>names(n)===expected))?.symbol??null;
}
export async function resolveYahooCrypto(id,meta,knownSymbol){
 if(id==='hyperliquid')return 'HYPE32196-USD'; // Yahoo's disambiguated Hyperliquid listing, verified by search.
 if(knownSymbol)return `${knownSymbol}-USD`;
 if(cache.has(id))return cache.get(id);
 return once(id,async()=>{try{
  let coin=meta||universe.crypto.find(c=>c.id===id);
  if(!coin){try{const {data}=await axios.get(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(id)}`,{params:{localization:false,tickers:false,market_data:false,community_data:false,developer_data:false},timeout:5000});if(data.id===id)coin={name:data.name,symbol:data.symbol};}catch{/* Try an exact name match only, never a ticker guess. */}}
  coin??={name:id.replaceAll('-',' ')};
  const {data}=await axios.get('https://query1.finance.yahoo.com/v1/finance/search',{params:{q:coin.name,quotesCount:10,newsCount:0},headers:{'User-Agent':'Mozilla/5.0'},timeout:5000});
  const match=matchingYahooCrypto(data.quotes??[],coin);cache.set(id,match);return match;
 }catch{return null;}});
}
export async function resolveCoinId(id){
 if(!id.endsWith('-USD'))return /^[a-z0-9-]{1,100}$/.test(id)?id:null;
 if(id==='HYPE32196-USD')return 'hyperliquid';
 const {data}=await axios.get('https://query1.finance.yahoo.com/v1/finance/search',{params:{q:id,quotesCount:3,newsCount:0},headers:{'User-Agent':'Mozilla/5.0'},timeout:5000});
 const exact=(data.quotes??[]).find(q=>q.symbol===id&&q.quoteType==='CRYPTOCURRENCY');if(!exact)return null;
 const name=String(exact.longname||exact.shortname).replace(/\s+USD$/i,'');
 const {data:cg}=await axios.get('https://api.coingecko.com/api/v3/search',{params:{query:name},timeout:5000});
 const matches=(cg.coins??[]).filter(c=>names(c.name)===names(name));return matches.length===1?matches[0].id:null;
}
