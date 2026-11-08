import {assetDescriptor} from './assetRoute.js';

// Known share classes share an issuer, but their market caps must never be added.
// Unknown issuers retain separate instrument identities rather than fuzzy merging.
export function issuerKey(asset) {
  if (asset.type !== 'stock') return `${asset.type}:${asset.id}`;
  const symbol=String(asset.symbol??asset.id).toUpperCase();
  const known={GOOG:'alphabet',GOOGL:'alphabet','BRK-A':'berkshire','BRK-B':'berkshire','BRK.A':'berkshire','BRK.B':'berkshire'};
  return `stock:${asset.issuerId??asset.cik??known[symbol]??asset.id}`;
}

export function distinctIssuers(assets=[]) {
  const seen=new Set();
  return assets.filter(asset=>{const key=issuerKey(asset);if(seen.has(key))return false;seen.add(key);return true;});
}

export function homeAssets(assets=[],type='all',limit=8) {
  const valid=assets.filter(a=>a?.id&&a.type&&Number.isFinite(a.price)&&a.price>0);
  const sorted=rows=>[...rows].sort((a,b)=>(Number.isFinite(b.marketCap)?b.marketCap:0)-(Number.isFinite(a.marketCap)?a.marketCap:0)||String(a.symbol??a.id).localeCompare(String(b.symbol??b.id)));
  if(type!=='all')return distinctIssuers(sorted(valid.filter(a=>type==='other'?['forex','commodity','index'].includes(a.type):type==='funds'?['etf','bond'].includes(a.type):a.type===type))).slice(0,limit);
  // Interleave classes. Never compare or sum their unrelated market-cap universes.
  const groups=['stock','crypto','etf','bond','commodity','forex','index'].map(kind=>distinctIssuers(sorted(valid.filter(a=>a.type===kind))));
  const output=[];
  for(let row=0;output.length<limit&&groups.some(group=>group[row]);row++)for(const group of groups)if(group[row]&&output.length<limit)output.push(group[row]);
  return output;
}

export function safeSource(url) {try{const u=new URL(url);return ['https:','http:'].includes(u.protocol)?u.href:null;}catch{return null;}}

// A generic cyber headline does not establish exposure for Bitcoin or equities.
// A direct asset mention or a financial/business subject must support that link.
export function marketStoryEligible(article={}) {
  if((article.marketCategory??article.category)!=='security')return true;
  const text=[article.title,article.snippet].filter(Boolean).join(' ');
  return Boolean(article.explicitAssets?.length)||/\b(?:bank|banco|exchange|crypto|bitcoin|ethereum|blockchain|wallet|funds?|financ\w*|payment|ransomware|stock|listed company|data cent(?:er|re)|cloud|microsoft|google|amazon|apple|meta|nvidia|binance|coinbase|mexc)\b/i.test(text);
}

export function homeBreakingAlerts(alerts=[],now=Date.now()) {
  return alerts.filter(a=>marketStoryEligible(a)&&(a.priority??0)>=85&&Date.parse(a.publishedAt)<=now&&now-Date.parse(a.publishedAt)<=6*3600000);
}

export function homeStories(news=[],now=Date.now(),excluded=[],limit=2) {
  const seen=new Set(),omit=new Set(excluded);
  return [...news].filter(a=>{
    const stamp=Date.parse(a.pubDate),url=safeSource(a.link),key=a.eventId??a.clusterId??String(a.title??'').trim().toLowerCase();
    const category=a.marketCategory??a.category;
    if(!url||!key||omit.has(url)||!Number.isFinite(stamp)||stamp>now||now-stamp>72*3600000||!marketStoryEligible(a)||!['security','geopolitics','corporate','macro','market_moves'].includes(category)||seen.has(key))return false;
    seen.add(key);return true;
  }).sort((a,b)=>{
    // Current-day reporting precedes older material; priority is magnitude, not tone.
    const recent=a=>now-Date.parse(a.pubDate)<=86400000?1:0;
    return recent(b)-recent(a)||(b.priority??0)-(a.priority??0)||Date.parse(b.pubDate)-Date.parse(a.pubDate);
  }).slice(0,limit);
}

export function nextCalendarEvents(events=[],now=Date.now(),limit=2) {
  const today=new Date(now),day=[today.getFullYear(),String(today.getMonth()+1).padStart(2,'0'),String(today.getDate()).padStart(2,'0')].join('-');
  const seen=new Set();
  return [...events].filter(e=>{
    const scheduled=Date.parse(e.scheduledAt),date=String(e.date??'');
    const valid=Number.isFinite(scheduled)?scheduled>=now:/^\d{4}-\d{2}-\d{2}$/.test(date)&&date>=day;
    const key=`${e.titleKey??e.title}:${e.scheduledAt??date}`;
    if(!valid||seen.has(key))return false;seen.add(key);return true;
  }).sort((a,b)=>(Date.parse(a.scheduledAt)||Date.parse(a.date+'T23:59:59'))-(Date.parse(b.scheduledAt)||Date.parse(b.date+'T23:59:59'))).slice(0,limit);
}

export function initialPage(hash,search='') {
  const page=String(hash??'').replace(/^#/,'');
  return page==='dashboard'&&assetDescriptor(search)?'panorama':page;
}
