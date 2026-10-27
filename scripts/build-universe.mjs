// Rebuild membership from downloaded public source snapshots, never synthetic quotes.
import fs from 'node:fs';
import path from 'node:path';
const [first,second,coinsFile,nasdaqFile]=process.argv.slice(2);
const decode=s=>s.replace(/<[^>]+>/g,'').replace(/&amp;/g,'&').replace(/&#39;/g,"'").trim();
const nasdaq=JSON.parse(fs.readFileSync(nasdaqFile,'utf8').replace(/^\uFEFF/,''));
const sectors=new Map((nasdaq.data?.rows??[]).map(r=>[r.symbol,r.sector]));
const rows=[first,second].flatMap(f=>[...fs.readFileSync(f,'utf8').matchAll(/<tr><td class="fav"[\s\S]*?<\/tr>/g)].map(m=>m[0]));
const stocks=rows.map(row=>{
 const id=decode(row.match(/company-code">([\s\S]*?)<\/div>/)?.[1]??'');
 const name=decode(row.match(/company-name">([\s\S]*?)<\/div>/)?.[1]??'');
 const sourcePath=row.match(/href="([^\"]+\/marketcap\/)"/)?.[1];
 return {id,symbol:id,name,type:'stock',analysisType:'stock',sector:sectors.get(id)||null,rank:Number(row.match(/rank-td td-right" data-sort="(\d+)"/)?.[1]),sourceUrl:`https://companiesmarketcap.com${sourcePath}`,currency:null};
});
if(stocks.length!==200||new Set(stocks.map(s=>s.id)).size!==200||stocks.some(s=>!s.id||!s.name))throw Error('Expected 200 distinct companies');
const coins=JSON.parse(fs.readFileSync(coinsFile,'utf8').replace(/^\uFEFF/,''));
if(coins.length!==100)throw Error('Expected 100 coins');
const crypto=coins.map(c=>({id:c.id,symbol:c.symbol.toUpperCase(),name:c.name,type:'crypto',analysisType:'crypto',image:c.image,rank:c.market_cap_rank,currency:'USD',sourceUrl:`https://www.coingecko.com/en/coins/${c.id}`}));
const out={asOf:new Date().toISOString(),stockSource:'https://companiesmarketcap.com/',cryptoSource:'https://api.coingecko.com/api/v3/coins/markets',method:'Public listed companies and crypto assets ranked by USD market capitalization; dated membership snapshot, not investment recommendations or live prices.',stocks,crypto};
fs.mkdirSync('backend/src/data',{recursive:true});
fs.writeFileSync('backend/src/data/marketUniverse.json',JSON.stringify(out,null,2)+'\n');
console.log({stocks:stocks.length,crypto:crypto.length,sectors:stocks.filter(s=>s.sector).length,asOf:out.asOf});
