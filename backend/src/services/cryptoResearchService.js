import axios from 'axios';
import { resolveCoinId } from './cryptoIdentityService.js';
import { createSingleFlight } from './singleFlight.js';
import { universe } from './catalogueService.js';
const once=createSingleFlight(),cache=new Map();
const num=n=>Number.isFinite(n)?n:null;
const url=s=>{try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}};
function excerpt(input){const s=String(input||'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();if(s.length<=440)return s;const end=[...s.slice(0,440).matchAll(/[.!?](?=\s|$)/g)].at(-1)?.index;return end>120?s.slice(0,end+1):`${s.slice(0,430).replace(/\s+\S*$/,'')}…`;}
export function normalizeCryptoResearch(c){
 const m=c.market_data??{},cap=num(m.market_cap?.usd),fdv=num(m.fully_diluted_valuation?.usd),volume=num(m.total_volume?.usd),circulating=num(m.circulating_supply),max=num(m.max_supply);
 return {id:c.id,name:c.name,symbol:c.symbol?.toUpperCase(),description:excerpt(c.description?.en),categories:(c.categories??[]).filter(Boolean).slice(0,6),website:(c.links?.homepage??[]).map(url).find(Boolean)||null,whitepaper:url(c.links?.whitepaper),sourceUrl:`https://www.coingecko.com/en/coins/${encodeURIComponent(c.id)}`,source:'CoinGecko',retrievedAt:new Date().toISOString(),dataAsOf:c.last_updated||m.last_updated||null,price:num(m.current_price?.usd),currency:'USD',marketCap:cap,fdv,volume24h:volume,rank:num(c.market_cap_rank),circulating,totalSupply:num(m.total_supply),maxSupply:max>0?max:null,changes:{day:num(m.price_change_percentage_24h),week:num(m.price_change_percentage_7d),month:num(m.price_change_percentage_30d),year:num(m.price_change_percentage_1y)},ath:num(m.ath?.usd),athDate:m.ath_date?.usd||null,athChange:num(m.ath_change_percentage?.usd),volumeToCap:cap>0&&volume!==null?volume/cap*100:null,fdvToCap:cap>0&&fdv>0?fdv/cap:null,circulatingPercent:max>0&&circulating!==null?circulating/max*100:null,partial:!(cap>0&&volume!==null&&circulating!==null)};
}
export async function getCryptoResearch(id){
 const hit=cache.get(id);if(hit&&Date.now()-hit.at<30*60_000)return hit.data;
 return once(id,async()=>{const coin=await resolveCoinId(id);if(!coin)throw Error('Crypto identity unavailable');
  let normalized;
  try{const {data}=await axios.get(`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coin)}`,{params:{localization:false,tickers:false,market_data:true,community_data:false,developer_data:false},timeout:10000,maxContentLength:1_000_000});
   if(data.id!==coin)throw Error('Crypto identity mismatch');normalized=normalizeCryptoResearch(data);
  }catch{
   const known=universe.crypto.find(c=>c.id===coin),name=known?.name||coin.replaceAll('-',' ');
   const norm=s=>String(s).toLowerCase().replace(/[^a-z0-9]/g,'');
   const {data:search}=await axios.get('https://api.coinpaprika.com/v1/search',{params:{q:name,c:'currencies',limit:10},timeout:5000});
   const matches=(search.currencies??[]).filter(c=>norm(c.name)===norm(name)&&(!known||c.symbol.toUpperCase()===known.symbol));
   if(matches.length!==1)throw Error('Ambiguous crypto identity');const pap=matches[0];
   const [{data:p},{data:q}]=await Promise.all([axios.get(`https://api.coinpaprika.com/v1/coins/${pap.id}`,{timeout:6000}),axios.get(`https://api.coinpaprika.com/v1/tickers/${pap.id}`,{timeout:6000})]);
   const m=q.quotes?.USD??{},maximum=num(q.max_supply)>0?q.max_supply:null;
   normalized=normalizeCryptoResearch({id:coin,name:p.name,symbol:p.symbol,description:{en:p.description},links:{homepage:p.links?.website,whitepaper:p.whitepaper?.link},last_updated:q.last_updated,market_cap_rank:q.rank,market_data:{current_price:{usd:m.price},market_cap:{usd:m.market_cap},fully_diluted_valuation:{usd:maximum&&Number.isFinite(m.price)?maximum*m.price:null},total_volume:{usd:m.volume_24h},circulating_supply:q.circulating_supply,total_supply:q.total_supply,max_supply:maximum,price_change_percentage_24h:m.percent_change_24h,price_change_percentage_7d:m.percent_change_7d,price_change_percentage_30d:m.percent_change_30d,price_change_percentage_1y:m.percent_change_1y}});
   normalized.source='CoinPaprika';normalized.sourceUrl=`https://coinpaprika.com/coin/${pap.id}/`;normalized.fdvMethod='price_times_max_supply';
  }
  if(cache.size>200)cache.delete(cache.keys().next().value);cache.set(id,{at:Date.now(),data:normalized});return normalized;
 });
}
