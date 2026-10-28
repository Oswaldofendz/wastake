import axios from 'axios';
import Parser from 'rss-parser';
import crypto from 'node:crypto';

export const IMPACT_WINDOW_MS = 24 * 60 * 60_000;
const TTL = 60_000;
const SOURCES = [
  {id:'fed',name:'Federal Reserve',host:'www.federalreserve.gov',url:'https://www.federalreserve.gov/feeds/press_monetary.xml',official:true},
  {id:'ecb',name:'ECB',host:'www.ecb.europa.eu',url:'https://www.ecb.europa.eu/rss/press.html',official:true},
  {id:'cnbc',name:'CNBC',host:'www.cnbc.com',url:'https://www.cnbc.com/id/100003114/device/rss/rss.html',official:false},
];
const clean=value=>String(value??'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&[lr]squo;|&#39;/g,"'").replace(/\s+/g,' ').trim();
export function impactTopic(title,source){
  const q=clean(title);
  if(source==='fed')return /issues FOMC statement/i.test(q)?'fed_decision':/Minutes of the Federal Open Market Committee/i.test(q)?'fed_minutes':null;
  if(source==='ecb')return /^monetary policy decisions$/i.test(q)?'ecb_decision':null;
  // A preview is not a released decision. Editorial classifications remain labelled as rules.
  if(/\b(expected?|expects?|forecast|preview|could|may|likely|what to watch|set to|will|would)\b/i.test(q))return null;
  if(/\bFed(?:eral Reserve)?\b.{0,45}\b(holds?|keeps?|leaves?|raises?|hikes?|cuts?|lowers?|maintains?)\b.{0,45}\b(rates?|interest)\b/i.test(q))return 'fed_decision';
  if(/\bECB\b.{0,45}\b(holds?|raises?|cuts?|lowers?|keeps?)\b.{0,35}\brates?\b/i.test(q))return 'ecb_decision';
  if(/\b(CPI|consumer prices?|inflation)\b/i.test(q)&&/\b(report|rises?|rose|falls?|fell|cools?|accelerates?|slows?|jump|higher than|lower than)\b/i.test(q))return 'inflation';
  if(/\b(payrolls|jobs report|unemployment rate)\b/i.test(q)&&/\b(report|rises?|rose|falls?|fell|added?|adds?|unexpected|surge|drops?)\b/i.test(q))return 'employment';
  if(/\b(emergency rate|emergency meeting|trading halt|bank failure|bank collapses)\b/i.test(q))return 'emergency';
  return null;
}
function safeLink(value,host){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname===host&&!u.username&&!u.password&&(!u.port||u.port==='443')?u.href:null;}catch{return null;}}
export function normalizeImpactItems(items,source,now=Date.now()){
  return (Array.isArray(items)?items:[]).flatMap(item=>{
    const title=clean(item.title).slice(0,300),published=Date.parse(item.isoDate??item.pubDate??''),url=safeLink(item.link,source.host),topic=impactTopic(title,source.id);
    if(!topic||!url||!Number.isFinite(published)||published>now||now-published>=IMPACT_WINDOW_MS)return [];
    const publishedAt=new Date(published).toISOString();
    return [{topic,title,url,publishedAt,expiresAt:new Date(published+IMPACT_WINDOW_MS).toISOString(),source:source.name,sourceId:source.id,official:source.official,classification:'wastake-topic-rule',eventKey:`${topic}:${publishedAt.slice(0,10)}`,decision:null}];
  });
}
export function selectImpactAlerts(items,now=Date.now()){
  const groups=new Map();
  for(const item of items){
    if(!Number.isFinite(Date.parse(item.publishedAt))||!Number.isFinite(Date.parse(item.expiresAt))||Date.parse(item.publishedAt)>now||Date.parse(item.expiresAt)<=now)continue;
    const previous=groups.get(item.eventKey);
    if(!previous||Number(item.official)>Number(previous.official)||(item.official===previous.official&&Date.parse(item.publishedAt)>Date.parse(previous.publishedAt)))groups.set(item.eventKey,item);
  }
  return [...groups.values()].sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt)).slice(0,3).map(item=>({...item,id:crypto.createHash('sha256').update(JSON.stringify([item.eventKey,item.title,item.decision])).digest('hex').slice(0,20),assets:['fed_decision','fed_minutes','inflation','employment','emergency'].includes(item.topic)?['USD','SPY','QQQ','TLT','XAU','BTC']:['EUR','USD','SPY','XAU']}));
}
function rate(value){
  const s=value.trim().replace(/[–—‑]/g,'-'),mixed=s.match(/^(\d+)\s*[- ]\s*(\d)\/(\d)$/),fraction=s.match(/^(\d*)\s*([¼½¾])$/),simple=s.match(/^(\d)\/(\d)$/);
  if(mixed)return Number(mixed[1])+Number(mixed[2])/Number(mixed[3]);
  if(simple)return Number(simple[1])/Number(simple[2]);
  if(fraction)return Number(fraction[1]||0)+({'¼':.25,'½':.5,'¾':.75}[fraction[2]]);
  return /^\d+(?:\.\d+)?$/.test(s)?Number(s):null;
}
export function extractFedDecision(html){
  const document=String(html).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ');
  const paragraphs=[...document.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(m=>clean(m[1]));
  for(const p of paragraphs){
    const m=p.match(/The Committee decided to (maintain|raise|lower|reduce) the target range for the federal funds rate (?:at|to) ([\d.¼½¾/\s–—‑-]+?) to ([\d.¼½¾/\s–—‑-]+?) percent\b/i);
    if(!m)continue;
    const lower=rate(m[2]),upper=rate(m[3]);
    if(lower===null||upper===null||!Number.isFinite(lower)||!Number.isFinite(upper)||lower<0||upper>25||upper<lower||upper-lower>1)return null;
    return {action:/maintain/i.test(m[1])?'hold':/raise/i.test(m[1])?'raise':'cut',lower,upper,unit:'percent',basis:'official-statement'};
  }
  return null;
}

// Factory keeps network and cache behaviour testable without credentials or seeded news.
export function createMarketImpactService({fetchFeed,fetchStatement,now=Date.now,sources=SOURCES}={}){
  const parser=new Parser({timeout:7000}),getFeed=fetchFeed??(async source=>(await parser.parseURL(source.url)).items);
  const getStatement=fetchStatement??(async url=>(await axios.get(url,{timeout:5000,maxContentLength:1_000_000,headers:{'User-Agent':'WaStake/1.0 (public market alerts)'}})).data);
  let cached=null,pending=null;
  const lastGood=new Map(),statements=new Map();
  return async function getAlerts(){
    const instant=now();
    if(cached&&instant-Date.parse(cached.checkedAt)<TTL)return {...cached,alerts:selectImpactAlerts(cached.alerts,instant)};
    if(pending)return pending;
    pending=(async()=>{
      const observations=await Promise.all(sources.map(async source=>{
        try{const items=normalizeImpactItems(await getFeed(source),source,now());lastGood.set(source.id,{items,checkedAt:new Date(now()).toISOString()});return {source,items,status:'ok',checkedAt:new Date(now()).toISOString()};}
        catch{const prior=lastGood.get(source.id);return {source,items:prior?.items??[],status:'unavailable',checkedAt:prior?.checkedAt??null};}
      }));
      let alerts=selectImpactAlerts(observations.flatMap(r=>r.items.map(item=>({...item,feedStale:r.status!=='ok',sourceCheckedAt:r.checkedAt}))),now());
      for(const item of alerts.filter(a=>a.sourceId==='fed'&&a.topic==='fed_decision')){
        try{
          const prior=statements.get(item.url);
          item.decision=prior?.decision??null;
          if(!prior||now()-prior.checkedAt>=5*60_000){const decision=extractFedDecision(await getStatement(item.url));if(decision){statements.set(item.url,{decision,checkedAt:now()});item.decision=decision;}}
          if(statements.size>30)statements.delete(statements.keys().next().value);
        }catch{/* Publication remains visible even if detail cannot be fetched yet. */}
      }
      alerts=selectImpactAlerts(alerts,now());
      const successful=observations.filter(r=>r.status==='ok').length;
      cached={alerts,checkedAt:new Date(now()).toISOString(),status:successful===sources.length?'ok':successful?'partial':'unavailable',sources:observations.map(({source,status,checkedAt})=>({name:source.name,status,checkedAt,url:source.url})),pollSeconds:60,windowHours:24};
      return cached;
    })().finally(()=>{pending=null;});
    return pending;
  };
}
export const getMarketImpactAlerts=createMarketImpactService();
