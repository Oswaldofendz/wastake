import fs from 'node:fs';
import axios from 'axios';
import { createSingleFlight } from './singleFlight.js';
export const universe=JSON.parse(fs.readFileSync(new URL('../data/marketUniverse.json',import.meta.url),'utf8'));
// Additional representative instruments; these are not market-cap rankings.
export const extraInstruments=[
 ['IVV','iShares Core S&P 500 ETF','etf'],['IEFA','iShares Core MSCI EAFE ETF','etf'],['IEMG','iShares Core MSCI Emerging Markets ETF','etf'],['ACWI','iShares MSCI ACWI ETF','etf'],['IWF','iShares Russell 1000 Growth ETF','etf'],['IWD','iShares Russell 1000 Value ETF','etf'],['USMV','iShares MSCI USA Min Vol Factor ETF','etf'],['QUAL','iShares MSCI USA Quality Factor ETF','etf'],['MTUM','iShares MSCI USA Momentum Factor ETF','etf'],['IYR','iShares U.S. Real Estate ETF','etf'],
 ['AGG','iShares Core U.S. Aggregate Bond ETF','bond'],['TIP','iShares TIPS Bond ETF','bond'],['STIP','iShares 0-5 Year TIPS Bond ETF','bond'],['IGSB','iShares 1-5 Year Investment Grade Corporate Bond ETF','bond'],['EMB','iShares J.P. Morgan USD Emerging Markets Bond ETF','bond'],['MUB','iShares National Muni Bond ETF','bond'],['IEI','iShares 3-7 Year Treasury Bond ETF','bond'],
 ['USDCHF=X','USD / CHF','forex'],['AUDUSD=X','AUD / USD','forex'],['NZDUSD=X','NZD / USD','forex'],['USDCAD=X','USD / CAD','forex'],['EURGBP=X','EUR / GBP','forex'],['EURJPY=X','EUR / JPY','forex'],['USDCNY=X','USD / CNY','forex'],
 ['^HSI','Hang Seng','index'],['^STOXX50E','EURO STOXX 50','index'],['^FCHI','CAC 40','index'],['^BSESN','S&P BSE SENSEX','index'],['^AXJO','S&P/ASX 200','index'],['^GSPTSE','S&P/TSX Composite','index'],['^BVSP','IBOVESPA','index'],
 ['BZ=F','Brent crude oil futures','commodity'],['PL=F','Platinum futures','commodity'],['PA=F','Palladium futures','commodity'],['ZC=F','Corn futures','commodity'],['ZW=F','Wheat futures','commodity'],['ZS=F','Soybean futures','commodity'],['KC=F','Coffee futures','commodity'],['SB=F','Sugar futures','commodity'],
].map(([id,name,type])=>({id,symbol:id,name,type,analysisType:'stock',sourceUrl:type==='etf'||type==='bond'?'https://www.ishares.com/us/products/etf-investments':`https://finance.yahoo.com/quote/${encodeURIComponent(id)}/`}));
export const catalogueMeta={asOf:universe.asOf,stockCount:universe.stocks.length,cryptoCount:universe.crypto.length,stockSource:universe.stockSource,cryptoSource:universe.cryptoSource};
const once=createSingleFlight();let bulk=null,bulkAt=0;
export function normalizeBulkRows(rows=[]){return Object.fromEntries(rows.filter(r=>r?.symbol).map(r=>{
 const numeric=v=>{if(v==null||String(v).trim()===''||String(v).toLowerCase()==='n/a')return null;const n=Number(String(v).replace(/[$,%]/g,''));return Number.isFinite(n)?n:null;};
 return [r.symbol,{price:numeric(r.lastsale),change:numeric(r.pctchange),marketCap:numeric(r.marketCap),currency:'USD',sector:r.sector||null,source:'Nasdaq screener',quoteAsOf:null,retrievedAt:new Date().toISOString()}];
}));}
export async function getBulkStockQuotes(){
 if(bulk&&Date.now()-bulkAt<15*60_000)return bulk;
 return once('nasdaq',async()=>{try{const {data}=await axios.get('https://api.nasdaq.com/api/screener/stocks',{params:{tableonly:true,download:true,limit:10000},headers:{'User-Agent':'Mozilla/5.0',Accept:'application/json'},timeout:9000,maxContentLength:8_000_000});const rows=data.data?.rows;if(!rows?.length)throw Error('No quotes');bulk=normalizeBulkRows(rows);bulkAt=Date.now();return bulk;}catch{return bulk?Object.fromEntries(Object.entries(bulk).map(([id,q])=>[id,{...q,isStale:true}])):{};}});
}
