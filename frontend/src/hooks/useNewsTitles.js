import {useEffect,useState} from 'react';
import {translateText} from '../services/api.js';
const cache=new Map(),pending=new Map();
const names=['Apple','Amazon','Alphabet','Google','NVIDIA','Microsoft','Meta','Binance','Bitcoin','Ethereum','CoinDesk','CoinTelegraph','Intel','BBC','CNBC'];
export const newsTitleKey=a=>a.url??a.link??a.title;
function translate(title,lang){
 const key=JSON.stringify([lang,title]);if(cache.has(key))return Promise.resolve(cache.get(key));if(pending.has(key))return pending.get(key);
 const job=translateText(title,lang,'en',names).then(result=>{if(!result.translated||!result.translatedText)return null;cache.set(key,result.translatedText);while(cache.size>350)cache.delete(cache.keys().next().value);return result.translatedText;}).finally(()=>pending.delete(key));
 pending.set(key,job);return job;
}
export function useNewsTitles(articles,language,limit=12){
 const lang=language.split('-')[0],[titles,setTitles]=useState({});
 const selected=articles.slice(0,limit),identity=JSON.stringify(selected.map(a=>[newsTitleKey(a),a.title,a.localizedTitle]));
 useEffect(()=>{
  let alive=true;if(lang==='en')return;
  const rows=JSON.parse(identity).filter(([,title,localized])=>title&&(!localized||localized===title));
  (async()=>{for(let i=0;i<rows.length&&alive;i+=3){await Promise.allSettled(rows.slice(i,i+3).map(async([key,title])=>{const text=await translate(title,lang);if(text&&alive)setTitles(old=>({...old,[lang+':'+key]:text}));}));}})();
  return()=>{alive=false;};
 },[identity,lang]);
 return article=>lang==='en'?article.title:article.localizedTitle&&article.localizedTitle!==article.title?article.localizedTitle:titles[lang+':'+newsTitleKey(article)]??article.title;
}
