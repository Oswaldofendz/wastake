import axios from 'axios';
import { createSingleFlight } from './singleFlight.js';
const once=createSingleFlight();let saved=null,at=0;
export function normalizeWhales(transactions,price,now=Date.now()){
 const validPrice=Number.isFinite(price)&&price>0?price:null;
 const byId=new Map();
 for(const tx of transactions){if(tx?.txid&&(!byId.has(tx.txid)||tx.status?.confirmed===true))byId.set(tx.txid,tx);}
 return [...byId.values()].map(tx=>{
  const sats=Number.isFinite(tx.value)?tx.value:Array.isArray(tx.vout)?tx.vout.reduce((s,o)=>s+(Number.isFinite(o.value)?o.value:0),0):null;
  if(!(sats>=500_000_000))return null;
  const confirmed=tx.status?.confirmed===true;
  return {txid:tx.txid,btc:sats/1e8,usd:validPrice===null?null:Math.round(sats/1e8*validPrice),status:confirmed?'confirmed':'pending',time:confirmed?tx.status.block_time??null:tx.firstSeen??null,observedAt:now,url:`https://mempool.space/tx/${tx.txid}`};
 }).filter(Boolean).sort((a,b)=>b.btc-a.btc).slice(0,20);
}
export async function getWhales(){
 if(saved&&Date.now()-at<60_000)return saved;
 return once('whales',async()=>{
  const get=async path=>(await axios.get(`https://mempool.space/api${path}`,{timeout:6500})).data;
  const [p,recent,blocks]=await Promise.allSettled([get('/v1/prices'),get('/mempool/recent'),get('/v1/blocks')]);
  const price=p.status==='fulfilled'&&Number.isFinite(p.value?.USD)&&p.value.USD>0?p.value.USD:null;
  let confirmed=[];
  if(blocks.status==='fulfilled'&&blocks.value?.[0]?.id){try{const ids=await get(`/block/${blocks.value[0].id}/txids`);const txs=await Promise.allSettled(ids.slice(0,12).map(id=>get(`/tx/${id}`)));confirmed=txs.filter(t=>t.status==='fulfilled').map(t=>t.value);}catch{/* Explicit partial sample. */}}
  const now=Date.now();const transactions=[...(recent.status==='fulfilled'&&Array.isArray(recent.value)?recent.value:[]),...confirmed];
  if(!transactions.length)throw Error('Transaction source unavailable');
  saved={whales:normalizeWhales(transactions,price,now),btcPrice:price,priceSource:price===null?null:'mempool.space',priceRetrievedAt:price===null?null:new Date(now).toISOString(),updatedAt:now,partial:recent.status!=='fulfilled'||!confirmed.length,amountMeaning:'Sum of transaction outputs, including possible change; not net investment flows.',sample:'Recent mempool transactions and a sample from the latest block; not an exhaustive whale feed.'};at=now;return saved;
 });
}
