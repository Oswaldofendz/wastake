import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs/promises';

const source=await fs.readFile(new URL('../../frontend/public/sw.js',import.meta.url),'utf8');
function worker({cache=new Map(),offline=false}={}){
  const handlers={},deleted=[];let network=0;
  const context={URL,Response,self:{location:{origin:'https://wastake.test'},addEventListener:(name,handler)=>{handlers[name]=handler;},skipWaiting:()=>{},clients:{claim:()=>{}}},
    caches:{keys:async()=>['wastake-v5','wastake-v6','another-app'],delete:async key=>{deleted.push(key);},match:async request=>cache.get(typeof request==='string'?request:new URL(request.url).pathname)?.clone(),open:async()=>({put:async()=>{},addAll:async()=>{}})},
    fetch:async()=>{network++;if(offline)throw new Error('offline');return new Response('fresh');}};
  vm.runInNewContext(source,context);
  return {handlers,deleted,network:()=>network,load(path,mode='cors'){
    let response;
    handlers.fetch({request:{url:`https://wastake.test${path}`,method:'GET',mode},respondWith:p=>{response=p;}});
    return response;
  }};
}
test('service worker never intercepts development source modules',()=>{
  const w=worker();assert.equal(w.load('/src/main.jsx'),undefined);assert.equal(w.load('/@vite/client'),undefined);assert.equal(w.load('/node_modules/.vite/deps/react.js'),undefined);
});
test('unversioned assets use the network instead of pinning a cached release',async()=>{
  const w=worker({cache:new Map([['/logo-icon.png',new Response('old')]])});assert.equal(await(await w.load('/logo-icon.png')).text(),'fresh');assert.equal(w.network(),1);
});
test('fingerprinted built scripts retain their offline cache-first behavior',async()=>{
  const w=worker({cache:new Map([['/assets/index-AbC_123.js',new Response('versioned')]])});assert.equal(await(await w.load('/assets/index-AbC_123.js')).text(),'versioned');assert.equal(w.network(),0);
});
test('offline HTML fallback applies to navigation, never to scripts or manifests',async()=>{
  const w=worker({offline:true,cache:new Map([['/index.html',new Response('<html>offline</html>')]])});
  assert.equal(await(await w.load('/','navigate')).text(),'<html>offline</html>');assert.equal((await w.load('/manifest.json')).type,'error');
});
test('cache activation removes only old WaStake cache entries',async()=>{
  const w=worker();let done;w.handlers.activate({waitUntil:p=>{done=p;}});await done;assert.deepEqual(w.deleted,['wastake-v5']);
});
