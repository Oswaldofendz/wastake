import {getTraditionalPrices,getCryptoPrices} from './priceService.js';
import {getChartSnapshot} from './chartAgentService.js';
import {getCompanyResearch} from './companyResearchService.js';
import {getCryptoResearch} from './cryptoResearchService.js';
import {companyRatios} from '../../../frontend/src/utils/companyValuation.js';
export const OPPORTUNITY_VERSION='entry-screen-v1';
const day=86400000;
export function evaluateCandidate(asset,snapshot,research,now=Date.now()){
 const reject=reason=>({eligible:false,reason});
 if(!['stock','crypto','etf'].includes(asset.type))return reject('type');
 if(!snapshot||snapshot.id!==asset.id||snapshot.interval!=='1d'||snapshot.type!==(asset.type==='crypto'?'crypto':'stock'))return reject('identity');
 const f=snapshot.facts??{},age=now-snapshot.asOf*1000;
 if(!snapshot.source||!snapshot.currency||!Number.isFinite(age)||age<0||age>(asset.type==='crypto'?3:5)*day)return reject('stale');
 if(snapshot.closedCount<60||snapshot.coverage!==100||!['score','close','ema20','ema50','rsi','macd','atrPercent','volumeRatio'].every(k=>Number.isFinite(f[k])))return reject('technical_data');
 if(!(f.close>0&&f.ema20>0&&f.ema50>0&&f.atrPercent>0))return reject('technical_data');
 if(f.score<6||f.rsi<45||f.rsi>68||f.close<f.ema20||f.ema20<f.ema50||f.macd<0)return reject('alignment');
 const extensionATR=(f.close/f.ema20-1)*100/f.atrPercent;
 if(extensionATR>3||f.atrPercent>(asset.type==='crypto'?12:8)||f.volumeRatio<.7||f.volumeRatio>3)return reject('extension_volume');
 let fundamentals={};
 if(asset.type==='stock'){
  if(research?.symbol!==asset.id||/financ|bank|insurance|real estate/i.test(research?.company?.sector??''))return reject('specialist');
  const r=companyRatios(research),flows=research?.flows??{};
  const age=now-Date.parse(research?.yearEnd);
  if(!research?.company?.sector||!Number.isFinite(age)||age<0||age>550*day||!Number.isFinite(flows.earnings?.value)||!Number.isFinite(r.fcf)||!flows.earnings?.currency||flows.earnings.currency!==flows.operatingCashFlow?.currency)return reject('fundamental_data');
  if(flows.earnings.value<=0||r.fcf<=0)return reject('fundamental_risk');
  fundamentals={earnings:flows.earnings.value,fcf:r.fcf,period:research.yearEnd,currency:flows.earnings.currency,source:research.financialSource,url:research.financialSourceUrl};
 }else if(asset.type==='crypto'){
  if(research?.id!==asset.id)return reject('identity');
  if(/stablecoin|wrapped|pegged|rebasing/i.test([research.name,...research.categories??[]].join(' '))||/^(tether|usd-coin|dai|ethena-usde|usds|usdd|first-digital-usd|paypal-usd|pax-dollar|true-usd|frax|usd1|usdd-2)$/.test(asset.id))return reject('pegged');
  const age=now-Date.parse(research.dataAsOf),fdvToCap=research.fdv/research.marketCap;
  if(!Number.isFinite(age)||age<0||age>36*3600000||!(research.marketCap>=100e6)||!(research.volume24h>=5e6)||!(research.circulating>0)||!(research.totalSupply>0||research.maxSupply>0)||!Number.isFinite(fdvToCap)||fdvToCap<.9||fdvToCap>3)return reject('crypto_data_risk');
  fundamentals={marketCap:research.marketCap,volume24h:research.volume24h,fdvToCap,period:research.dataAsOf,currency:'USD',source:research.source,url:research.sourceUrl};
 }
 return {eligible:true,asset:{id:asset.id,type:asset.type,name:asset.name,symbol:asset.symbol,image:asset.image},score:f.score,
  facts:{close:f.close,ema20:f.ema20,ema50:f.ema50,rsi:f.rsi,macd:f.macd,atrPercent:f.atrPercent,volumeRatio:f.volumeRatio,extensionATR},
  asOf:snapshot.asOf,source:snapshot.source,currency:snapshot.currency,snapshotId:snapshot.snapshotId,fundamentals,version:OPPORTUNITY_VERSION};
}
let state={status:'idle',candidates:[],tested:0,total:0,exclusions:{},generatedAt:null,version:OPPORTUNITY_VERSION},running=null;
// One process-wide job, two workers, a bounded universe, cached 30 minutes.
// No model calls, personal holdings or paid providers are used by this screen.
async function build(){
 state={...state,status:'building',candidates:[],generatedAt:null,attemptedAt:new Date().toISOString(),tested:0,total:0,exclusions:{}};
 try{
  const data=await Promise.allSettled([getTraditionalPrices(),getCryptoPrices()]);
  const traditional=data[0].status==='fulfilled'?Object.values(data[0].value):[],crypto=data[1].status==='fulfilled'?Object.values(data[1].value):[];
  const valid=a=>a&&a.id&&a.price>0&&!a.isStale&&a.source;
  const capSort=(a,b)=>b.marketCap-a.marketCap;
  const stocks=traditional.filter(a=>valid(a)&&a.type==='stock'&&a.currency==='USD'&&a.marketCap>0).sort(capSort).slice(0,16);
  const coins=crypto.filter(a=>valid(a)&&a.type==='crypto'&&a.marketCap>0).sort(capSort).slice(0,12);
  const funds=traditional.filter(a=>valid(a)&&a.type==='etf'&&['SPY','QQQ','VTI','IVV'].includes(a.id));
  const pool=[...stocks,...coins,...funds],candidates=[],exclusions={};let cursor=0;
  state={...state,total:pool.length,pool:pool.map(a=>({id:a.id,type:a.type})),sourceFailures:data.filter(r=>r.status==='rejected').length};
  if(!pool.length)throw Error('No verified quote pool');
  const worker=async()=>{while(cursor<pool.length){const a=pool[cursor++];let result;
   try{const snapshot=await getChartSnapshot(a.id,a.type==='crypto'?'crypto':'stock','1d');
    // Do not fetch financial data if the technical gates already fail.
    const preview=evaluateCandidate({...a,type:'etf'},snapshot,null);
    if(!preview.eligible&&a.type!=='crypto')result=preview;
    else if(a.type==='crypto'){
      const f=snapshot.facts;
      if(!(f.score>=6&&f.rsi>=45&&f.rsi<=68&&f.close>=f.ema20&&f.ema20>=f.ema50&&f.macd>=0))result={eligible:false,reason:'alignment'};
      else result=evaluateCandidate(a,snapshot,await getCryptoResearch(a.id));
    }else result=evaluateCandidate(a,snapshot,a.type==='stock'?await getCompanyResearch(a.id):null);
   }catch{result={eligible:false,reason:'source_unavailable'};}
   if(result.eligible)candidates.push(result);else exclusions[result.reason]=(exclusions[result.reason]??0)+1;
   state={...state,tested:state.tested+1,exclusions:{...exclusions}};
  }};
  await Promise.all([worker(),worker()]);
  state={...state,status:'ready',candidates:candidates.sort((a,b)=>b.score-a.score||a.asset.id.localeCompare(b.asset.id)).slice(0,5),eligibleCount:candidates.length,generatedAt:new Date().toISOString(),exclusions};
 }catch{state={...state,status:'unavailable'};}
}
export function getOpportunityScreen(){
 if(!running&&(!state.attemptedAt||Date.now()-Date.parse(state.attemptedAt)>(state.status==='unavailable'?120000:30*60000)))running=build().finally(()=>{running=null;});
 return {...state,refreshMinutes:30};
}
