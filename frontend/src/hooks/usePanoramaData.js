import { useEffect, useState } from 'react';
import { getAnalysisType } from '../data/assetCatalog.js';
import { fetchAnalysis, fetchOHLCV, fetchNews, fetchAssetQuote } from '../services/api.js';

const pending = () => ({ loading:true, data:null, error:false, checkedAt:null, analyzing:false, analysisError:false });
const initial = key => ({ key, analysis:pending(), history:pending(), news:pending(), quote:pending() });

// Independent states: optional news/AI must never block prices or technical analysis.
export function usePanoramaData(asset, attempt) {
  const type = getAnalysisType(asset);
  const key = `${type}:${asset.id}:${attempt}`;
  const [state, setState] = useState(() => initial(key));
  useEffect(() => {
    const controller = new AbortController();
    const options = { signal:controller.signal };
    setState(initial(key));
    const tasks = {
      analysis: () => fetchAnalysis(asset.id,type,90,options),
      history: () => fetchOHLCV(asset.id,type,{days:90},options),
      quote: () => fetchAssetQuote({id:asset.id,type:asset.type,analysisType:type},options),
    };
    Object.entries(tasks).forEach(([name, load]) => {
      load().then(data => {
        if (!controller.signal.aborted) setState(current=>current.key===key?{...current,[name]:{loading:false,data,error:false,checkedAt:Date.now()}}:current);
      }).catch(() => {
        if (!controller.signal.aborted) setState(current=>current.key===key?{...current,[name]:{loading:false,data:null,error:true,checkedAt:Date.now()}}:current);
      });
    });
    // Fetch cached RSS first. A slow classifier keeps headlines visible and tone unevaluated.
    fetchNews(asset.id,type,{...options,stage:'headlines'}).then(data=>{
      if(controller.signal.aborted)return;
      const hasNews=Array.isArray(data.news)&&data.news.length>0;
      setState(current=>current.key===key?{...current,news:{loading:false,data,error:false,checkedAt:Date.now(),analyzing:hasNews,analysisError:false}}:current);
      if(!hasNews)return;
      fetchNews(asset.id,type,options).then(enriched=>{
        if(!controller.signal.aborted)setState(current=>current.key===key?{...current,news:{loading:false,data:enriched,error:false,checkedAt:Date.now(),analyzing:false,analysisError:enriched.news?.every(article=>article.analysisStatus==='unavailable')??false}}:current);
      }).catch(()=>{
        if(!controller.signal.aborted)setState(current=>current.key===key?{...current,news:{...current.news,analyzing:false,analysisError:true}}:current);
      });
    }).catch(()=>{
      if(!controller.signal.aborted)setState(current=>current.key===key?{...current,news:{loading:false,data:null,error:true,checkedAt:Date.now(),analyzing:false,analysisError:false}}:current);
    });
    return () => controller.abort();
  }, [key, asset.id, type]);
  return state.key===key?state:initial(key);
}
