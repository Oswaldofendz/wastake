// Priority describes a public report's potential relevance, never a return forecast.
export const MARKET_NEWS_SOURCES=[
 {id:'fed',name:'Federal Reserve',host:'www.federalreserve.gov',url:'https://www.federalreserve.gov/feeds/press_monetary.xml',official:true},
 {id:'ecb',name:'ECB',host:'www.ecb.europa.eu',url:'https://www.ecb.europa.eu/rss/press.html',official:true},
 {id:'cnbc',name:'CNBC Markets',host:'www.cnbc.com',url:'https://www.cnbc.com/id/100003114/device/rss/rss.html',official:false},
 {id:'cnbc-world',name:'CNBC World',host:'www.cnbc.com',url:'https://www.cnbc.com/id/100727362/device/rss/rss.html',official:false},
 {id:'cnbc-tech',name:'CNBC Technology',host:'www.cnbc.com',url:'https://www.cnbc.com/id/19854910/device/rss/rss.html',official:false},
 {id:'coindesk',name:'CoinDesk',host:'www.coindesk.com',url:'https://www.coindesk.com/arc/outboundfeeds/rss/',official:false},
 {id:'cointelegraph',name:'CoinTelegraph',host:'cointelegraph.com',url:'https://cointelegraph.com/rss',official:false},
 {id:'bbc-world',name:'BBC World',hosts:['www.bbc.co.uk','www.bbc.com'],url:'https://feeds.bbci.co.uk/news/world/rss.xml',official:false},
 {id:'bbc-business',name:'BBC Business',hosts:['www.bbc.co.uk','www.bbc.com'],url:'https://feeds.bbci.co.uk/news/business/rss.xml',official:false},
];
export const cleanNews=value=>String(value??'').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&[lr]squo;|&#39;/g,"'").replace(/\s+/g,' ').trim();
export function broadNewsTopic(title,snippet=''){
 const q=cleanNews(title),body=q+' '+cleanNews(snippet);
 if(/\b(hack(?:ed|ers?)?|cyberattack|security (?:breach|incident|issue)|stolen|crypto theft|exploit|ransomware)\b/i.test(q))return 'security';
 if(/\b(war|wars|missiles?|airstrikes?|ceasefire|sanctions?|invasion|military|strikes? on|drone attack|russian strikes|blockade)\b/i.test(q))return 'geopolitics';
 if(/\b(earnings|revenue|profit|cash flow|results|guidance|capex|layoffs?|merger|acquisition|antitrust|bankruptcy|IPO)\b/i.test(q))return 'corporate';
 if(/\b(stocks?|shares?|markets?|yields?|bonds?|oil|gold|bitcoin|crypto|nasdaq|s&p|dollar|tariffs?|trade deal)\b/i.test(q)&&/\b(sell.?off|plung\w*|tumbles?|falls?|drops?|rises?|surges?|rall\w*|slides?|slumps?|record|jump\w*|halt|crash|cut|deal|tariffs?|spending|inflation)\b/i.test(body))return 'market_moves';
 return null;
}
const ENTITIES=[
 ['AMZN',/\b(amazon|AWS|AMZN)\b/i],['GOOGL',/\b(alphabet|google|GOOGL|GOOG)\b/i],['NVDA',/\b(nvidia|NVDA)\b/i],['AAPL',/\b(apple|AAPL)\b/i],['MSFT',/\b(microsoft|MSFT)\b/i],['META',/\b(meta|facebook)\b/i],['TSLA',/\b(tesla|TSLA)\b/i],['INTC',/\b(intel|INTC)\b/i],['AMD',/\bAMD\b/i],['XOM',/\b(exxon|XOM)\b/i],['CVX',/\b(chevron|CVX)\b/i],['BNB',/\b(binance|BNB)\b/i],['BTC',/\b(bitcoin|BTC)\b/i],['ETH',/\b(ethereum|ether|ETH)\b/i],['SOL',/\b(solana|SOL)\b/i],['XAU',/\bgold\b/i],['WTI',/\b(oil|crude)\b/i],['USD',/\b(dollar|USD)\b/i],['EUR',/\b(euro|EUR)\b/i],
];
export function newsReferences(title,snippet,topic){
 const text=title+' '+snippet,explicit=ENTITIES.filter(([,re])=>re.test(text)).map(([symbol])=>symbol);
 const category=topic==='security'?['BTC','BNB','ETH']:topic==='geopolitics'?['WTI','XAU','USD','SPY']:topic==='corporate'?['SPY','QQQ']:topic==='ecb_decision'?['EUR','USD','SPY','XAU']:['USD','SPY','QQQ','TLT','XAU','BTC'];
 return {explicitAssets:explicit,assets:[...new Set([...explicit,...category])].slice(0,7)};
}
export function preliminaryNewsPriority(topic,title,official,published,now){
 const base=({fed_decision:82,ecb_decision:80,fed_minutes:66,inflation:78,employment:74,emergency:84,security:80,geopolitics:76,corporate:64,market_moves:58})[topic]??45;
 const major=/\b(billion|bankruptcy|trading halt|largest|emergency|record|plung\w*|missile|nuclear|ceasefire)\b/i.test(title)?8:0;
 const opinion=/\b(troll|jokes?|price predictions?|analysts? (?:say|urge)|should you|how to|best|could|might|may|preview|what to watch|expected|forecasts?)\b/i.test(title)?16:0;
 const recent=now-published<2*3600000?8:now-published<6*3600000?4:0;
 return {priority:Math.max(0,Math.min(98,base+major+(official?4:0)+recent-opinion)),priorityFactors:{category:base,eventQualifier:major,recency:recent,official:official?4:0,opinionPenalty:-opinion},reportType:opinion?'outlook':official?'official':'reported'};
}
export function topicGroup(topic){return ['fed_decision','fed_minutes','ecb_decision','inflation','employment','emergency'].includes(topic)?'macro':topic;}

export function prioritizeNewsAnalysis(articles){
 const sorted=[...articles].sort((a,b)=>(b.priority??0)-(a.priority??0)||Date.parse(b.publishedAt)-Date.parse(a.publishedAt));
 const categories=new Set(),first=[],rest=[];
 for(const article of sorted){if(!categories.has(article.category)){categories.add(article.category);first.push(article);}else rest.push(article);}
 return [...first,...rest];
}
