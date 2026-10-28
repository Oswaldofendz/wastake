import {useEffect,useState} from 'react';
export function AssetLogo({asset,size=32}){
 const [failed,setFailed]=useState(false);
 const image=asset.image&&!asset.image.includes('logo.clearbit.com')?asset.image:['stock','etf','bond'].includes(asset.type)&&asset.symbol?`https://financialmodelingprep.com/image-stock/${encodeURIComponent(asset.symbol)}.png`:null;
 useEffect(()=>setFailed(false),[image]);
 const fallback=({forex:'🌐',commodity:'🥇',index:'📊',bond:'🏛️'})[asset.type]||(asset.symbol||asset.name||'?').slice(0,2);
 return <span className="asset-logo" aria-hidden="true" style={{width:size,height:size,fontSize:Math.max(10,size*.32)}}><span translate="no">{fallback}</span>{image&&!failed&&<img src={image} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>}</span>;
}
