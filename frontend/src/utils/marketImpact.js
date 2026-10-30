export function visibleMarketAlerts(data,dismissed=[],now=Date.now()){
  return (Array.isArray(data?.alerts)?data.alerts:[]).filter(a=>{
    const published=Date.parse(a.publishedAt),expires=Date.parse(a.expiresAt);
    return Number.isFinite(published)&&Number.isFinite(expires)&&published<=now&&expires>now&&!dismissed.includes(a.id);
  });
}

export function tickerMarketAlerts(alerts,limit=12){
 const sorted=[...alerts].filter(a=>a.reportType!=='outlook').sort((a,b)=>(b.priority??70)-(a.priority??70)||Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 const chosen=[],ids=new Set(),categories=new Set(),entities=new Map();
 for(const item of sorted){const category=item.category??item.topic;if(categories.has(category))continue;categories.add(category);chosen.push(item);ids.add(item.id);if(chosen.length>=limit)break;}
 for(const item of sorted){if(chosen.length>=limit)break;if(ids.has(item.id))continue;const entity=(item.explicitAssets??[])[0]??item.category??item.topic;if((entities.get(entity)??0)>=3)continue;entities.set(entity,(entities.get(entity)??0)+1);chosen.push(item);ids.add(item.id);}
 return chosen.sort((a,b)=>Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
}
export function tickerDuration(width,speed=82){return Math.max(12,Math.min(300,(Number.isFinite(width)&&width>0?width:1640)/speed));}
