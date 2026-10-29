const kinds=new Set(['stock','crypto','etf','bond','forex','commodity','index']);
export function assetDescriptor(search=''){
  const p=new URLSearchParams(search),id=p.get('inspect'),type=p.get('kind');
  return id&&/^[A-Za-z0-9^=._-]{1,100}$/.test(id)&&kinds.has(type)?{id,type}:null;
}
export function sameAsset(a,b){return !!a&&!!b&&a.id===b.id&&a.type===b.type;}
export function routeSelection(search,assets=[],saved=[]){
  const descriptor=assetDescriptor(search);if(!descriptor)return null;
  return [...assets,...saved].find(a=>sameAsset(a,descriptor))??{...descriptor,name:descriptor.id,symbol:descriptor.id,analysisType:descriptor.type==='crypto'?'crypto':'stock',external:true,unresolved:true};
}
export function assetSearchParams(search,asset){
  const p=new URLSearchParams(search);p.delete('from');
  if(asset&&assetDescriptor(`?inspect=${encodeURIComponent(asset.id)}&kind=${encodeURIComponent(asset.type)}`)){p.set('inspect',asset.id);p.set('kind',asset.type);}
  else{p.delete('inspect');p.delete('kind');}
  return p.toString();
}
