import crypto from 'node:crypto';
import {getRawNewsForAsset} from './newsService.js';
import {scoreHeadline} from './fundamentalScoringService.js';
import {enrichFundamentalsNews} from './fundamentalsAnalysisService.js';
const signature=a=>JSON.stringify([a.link,a.title,a.pubDate,a.snippet]);
export function createNewsSnapshotService({read=getRawNewsForAsset,analyze=enrichFundamentalsNews,now=Date.now}={}){
 const entries=new Map();let busy=0;
 return async function get(target,lang='es',analyzeRequested=true){
  const key=JSON.stringify([target.id,target.type,[...target.aliases].sort(),lang]);
  let entry=entries.get(key);
  if(!entry){if(entries.size>=120){const idle=[...entries].find(([,e])=>!e.sourceJob&&!e.analysisJob);if(idle)entries.delete(idle[0]);}entry={news:[],checkedAt:null,revision:null,analysisRevision:null,nextAnalysis:0,sourceStatus:'pending',aiStatus:'pending'};entries.set(key,entry);}
  const refresh=()=>{
   if(entry.sourceJob)return entry.sourceJob;
   entry.sourceJob=(async()=>{try{
    const fresh=(await read(target.id,target.type,target.aliases)).map(scoreHeadline),revision=crypto.createHash('sha256').update(fresh.map(signature).join('|')).digest('hex');
    const old=new Map(entry.news.map(a=>[signature(a),a]));entry.news=fresh.map(a=>({...a,...old.get(signature(a))}));entry.revision=revision;entry.checkedAt=new Date(now()).toISOString();entry.sourceStatus='ok';
    if(entry.analysisRevision!==revision)entry.nextAnalysis=0;
   }catch{entry.sourceStatus='unavailable';entry.sourceRetry=now()+15000;}finally{entry.sourceJob=null;}})();
   return entry.sourceJob;
  };
  if(!entry.checkedAt){await refresh();}
  else if(now()-Date.parse(entry.checkedAt)>120000&&now()>=(entry.sourceRetry??0))void refresh();
  const needsAnalysis=analyzeRequested&&entry.news.length>0&&now()>=entry.nextAnalysis;
  entry.queued=Boolean(needsAnalysis&&!entry.analysisJob&&busy>=2);
  if(needsAnalysis&&!entry.analysisJob&&busy<2){
   const revision=entry.revision,input=entry.news.map(a=>({...a}));busy++;entry.aiStatus='pending';
   entry.analysisJob=Promise.resolve().then(()=>analyze(input,lang,target)).then(result=>{
    if(entry.revision===revision){entry.news=result.news;entry.aiStatus=result.aiStatus;entry.analysisRevision=revision;entry.analysisAsOf=new Date(now()).toISOString();entry.nextAnalysis=now()+(result.analyzedCount?300000:60000);}
   }).catch(()=>{entry.aiStatus='unavailable';entry.nextAnalysis=now()+60000;}).finally(()=>{busy--;entry.analysisJob=null;});
  }
  return {id:target.id,type:target.type,lang,news:entry.news,count:entry.news.length,analyzedCount:entry.news.filter(a=>a.analysisProvider).length,aiStatus:entry.aiStatus,revalidating:Boolean(entry.sourceJob||entry.analysisJob||entry.queued),checkedAt:entry.checkedAt,analysisAsOf:entry.analysisAsOf??null,sourceStatus:entry.sourceStatus,stale:!entry.checkedAt||now()-Date.parse(entry.checkedAt)>120000,scoringVersion:'keyword-rules-v1'};
 };
}
export const getNewsSnapshot=createNewsSnapshotService();
