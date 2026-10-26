import { useEffect, useState } from 'react';
import { getAnalysisType } from '../data/assetCatalog.js';
import { fetchAnalysis, fetchOHLCV, fetchNews, fetchAssetQuote } from '../services/api.js';

const pending = () => ({ loading:true, data:null, error:false, checkedAt:null });
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
      news: () => fetchNews(asset.id,type,options),
      quote: () => fetchAssetQuote({id:asset.id,type:asset.type,analysisType:type},options),
    };
    Object.entries(tasks).forEach(([name, load]) => {
      load().then(data => {
        if (!controller.signal.aborted) setState(current=>current.key===key?{...current,[name]:{loading:false,data,error:false,checkedAt:Date.now()}}:current);
      }).catch(() => {
        if (!controller.signal.aborted) setState(current=>current.key===key?{...current,[name]:{loading:false,data:null,error:true,checkedAt:Date.now()}}:current);
      });
    });
    return () => controller.abort();
  }, [key, asset.id, type]);
  return state.key===key?state:initial(key);
}
