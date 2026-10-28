export function visibleMarketAlerts(data,dismissed=[],now=Date.now()){
  return (Array.isArray(data?.alerts)?data.alerts:[]).filter(a=>{
    const published=Date.parse(a.publishedAt),expires=Date.parse(a.expiresAt);
    return Number.isFinite(published)&&Number.isFinite(expires)&&published<=now&&expires>now&&!dismissed.includes(a.id);
  });
}
