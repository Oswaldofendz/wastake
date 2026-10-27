// Rankings describe only the quoted catalogue, never the whole market.
export function marketLeaders(assets = [], limit = 3) {
  const unique=[...new Map(assets.filter(a=>a?.id).map(a=>[`${a.type}:${a.id}`,a])).values()];
  const cap=type=>unique.filter(a=>a.type===type&&Number.isFinite(a.marketCap)&&a.marketCap>0&&(a.currency==='USD'||a.type==='crypto')).sort((a,b)=>b.marketCap-a.marketCap).slice(0,limit);
  // Do not mix forex, yields and indices with investable company/token moves.
  const movers=cryptoOnly=>unique.filter(a=>(cryptoOnly?a.type==='crypto':['stock','crypto'].includes(a.type))&&Number.isFinite(a.price)&&a.price>0&&Number.isFinite(a.change24h)&&a.change24h>0).sort((a,b)=>b.change24h-a.change24h).slice(0,limit);
  return {cryptoCap:cap('crypto'),stockCap:cap('stock'),gainers:movers(false),cryptoGainers:movers(true)};
}

export function contextualArticle(a) {
  return Number.isFinite(a?.relevance)&&Boolean(a.analysisProvider&&a.summary&&a.mechanism&&a.watch);
}
export function importantArticles(articles=[], now=Date.now(), limit=5) {
  const seen=new Set();
  return articles.filter(a=>{
    const time=Date.parse(a.pubDate),key=String(a.title??'').trim().toLowerCase();
    if(!key||seen.has(key)||!/^https?:\/\//i.test(a.link??'')||!Number.isFinite(time)||time>now||time<now-30*86400000)return false;
    seen.add(key);return true;
  }).sort((a,b)=>{
    const aScore=contextualArticle(a)?Math.max(0,Math.min(100,a.relevance)):null;
    const bScore=contextualArticle(b)?Math.max(0,Math.min(100,b.relevance)):null;
    if(aScore!==null&&bScore!==null)return bScore-aScore||Date.parse(b.pubDate)-Date.parse(a.pubDate);
    if(aScore!==null)return -1;if(bScore!==null)return 1;
    return Date.parse(b.pubDate)-Date.parse(a.pubDate);
  }).slice(0,limit);
}
