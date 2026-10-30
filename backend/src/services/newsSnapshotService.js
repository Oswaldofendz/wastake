import crypto from 'node:crypto';
import {prioritizeNewsAnalysis} from './marketNewsRules.js';
import {getMarketImpactAlerts} from './marketImpactService.js';
import {getRawNewsForAsset} from './newsService.js';
import {scoreHeadline} from './fundamentalScoringService.js';
import {enrichFundamentalsNews} from './fundamentalsAnalysisService.js';
async function readMarketNews(){
 const result=await getMarketImpactAlerts();
 return Object.assign(prioritizeNewsAnalysis(result.alerts).map(a=>({...a,marketCategory:a.category,link:a.url,pubDate:a.publishedAt,sourceFetchedAt:a.sourceCheckedAt,sourceStale:a.feedStale})),{sourceStatus:result.status,sourceCheckedAt:result.checkedAt,dataAsOf:result.sources.map(s=>s.checkedAt).filter(Boolean).sort()[0]??null,stale:result.alerts.some(a=>a.feedStale),refreshing:false,sources:result.sources});
}
const signature=a=>JSON.stringify([a.link,a.title,a.pubDate,a.snippet]);
export function createNewsSnapshotService({read=getRawNewsForAsset,readGlobal=readMarketNews,analyze=enrichFundamentalsNews,now=Date.now}={}){
 const entries=new Map();let busy=0;
 return async function get(target,lang='es',analyzeRequested=true){
  const key=JSON.stringify([target.id,target.type,[...(target.aliases??[])].sort(),lang]);
  let entry=entries.get(key);
  if(!entry){if(entries.size>=120){const idle=[...entries].find(([,e])=>!e.sourceJob&&!e.analysisJob);if(idle)entries.delete(idle[0]);}entry={news:[],checkedAt:null,revision:null,analysisRevision:null,nextAnalysis:0,sourceStatus:'pending',aiStatus:'pending'};entries.set(key,entry);}
  const refresh=()=>{
   if(entry.sourceJob)return entry.sourceJob;
   entry.sourceJob=(async()=>{try{
    const raw=target.type==='market'?await readGlobal():await read(target.id,target.type,target.aliases),fresh=raw.map(scoreHeadline),revision=crypto.createHash('sha256').update(fresh.map(signature).join('|')).digest('hex');
    const old=new Map(entry.news.map(a=>[signature(a),a]));entry.news=fresh.map(a=>({...a,...old.get(signature(a)),sourceStale:a.sourceStale,sourceFetchedAt:a.sourceFetchedAt,priority:a.priority,priorityFactors:a.priorityFactors,marketCategory:a.marketCategory,assets:a.assets,explicitAssets:a.explicitAssets}));entry.revision=revision;entry.checkedAt=raw.sourceCheckedAt??new Date(now()).toISOString();entry.sourceStatus=raw.sourceStatus??'ok';entry.sourceStale=Boolean(raw.stale);entry.dataAsOf=raw.dataAsOf??entry.checkedAt;entry.feedRefreshing=Boolean(raw.refreshing);entry.lastRead=now();entry.sources=raw.sources??[];
    if(entry.analysisRevision!==revision)entry.nextAnalysis=0;
   }catch{entry.sourceStatus='unavailable';entry.sourceStale=true;entry.feedRefreshing=false;entry.sourceRetry=now()+15000;}finally{entry.sourceJob=null;}})();
   return entry.sourceJob;
  };
  if(!entry.checkedAt){await refresh();}
  else if((now()-Date.parse(entry.checkedAt)>(target.type==='market'?60000:120000)||(entry.feedRefreshing&&now()-(entry.lastRead??0)>=5000))&&now()>=(entry.sourceRetry??0))void refresh();
  const needsAnalysis=analyzeRequested&&entry.news.length>0&&now()>=entry.nextAnalysis;
  entry.queued=Boolean(needsAnalysis&&!entry.analysisJob&&busy>=2);
  if(needsAnalysis&&!entry.analysisJob&&busy<2){
   const revision=entry.revision,input=entry.news.map(a=>({...a}));busy++;entry.aiStatus='pending';
   entry.analysisJob=Promise.resolve().then(()=>analyze(input,lang,target)).then(result=>{
    if(!Array.isArray(result?.news))throw new Error('Invalid news analysis');
    if(entry.revision===revision){const latest=new Map(entry.news.map(a=>[signature(a),a]));entry.news=result.news.map(a=>({...a,sourceStale:latest.get(signature(a))?.sourceStale,sourceFetchedAt:latest.get(signature(a))?.sourceFetchedAt,priority:latest.get(signature(a))?.priority,priorityFactors:latest.get(signature(a))?.priorityFactors,marketCategory:latest.get(signature(a))?.marketCategory}));entry.aiStatus=result.aiStatus;entry.analysisRevision=revision;entry.analysisAsOf=new Date(now()).toISOString();entry.nextAnalysis=now()+(result.analyzedCount?300000:60000);}
   }).catch(()=>{entry.aiStatus='unavailable';entry.nextAnalysis=now()+60000;}).finally(()=>{busy--;entry.analysisJob=null;});
  }
  return {id:target.id,type:target.type,lang,news:entry.news,count:entry.news.length,analyzedCount:entry.news.filter(a=>a.analysisProvider).length,aiStatus:entry.aiStatus,revalidating:Boolean(entry.sourceJob||entry.analysisJob||entry.queued||entry.feedRefreshing),checkedAt:entry.checkedAt,analysisAsOf:entry.analysisAsOf??null,sourceStatus:entry.sourceStatus,sources:entry.sources??[],dataAsOf:entry.dataAsOf??null,stale:Boolean(entry.sourceStale)||!entry.checkedAt||now()-Date.parse(entry.checkedAt)>(target.type==='market'?60000:120000),scoringVersion:'keyword-rules-v1'};
 };
}
export const getNewsSnapshot=createNewsSnapshotService();
