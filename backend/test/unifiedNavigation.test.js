import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalPage} from '../../frontend/src/utils/navigation.js';
import {assetDescriptor} from '../../frontend/src/utils/assetRoute.js';

test('legacy Explore links converge on Panorama without losing an external asset or entry origin',()=>{
 const url=new URL('https://wastake.vercel.app/?inspect=ASML.AS&kind=stock&from=entry#screener');
 url.hash=canonicalPage(url.hash);
 assert.equal(url.hash,'#panorama');
 assert.deepEqual(assetDescriptor(url.search),{id:'ASML.AS',type:'stock'});
 assert.equal(url.searchParams.get('from'),'entry');
 assert.equal(canonicalPage('panorama'),'panorama');
});
test('other pages retain their own destinations and an unknown hash falls back to the dashboard',()=>{
 for(const page of ['dashboard','markets','portfolio','alerts','fundamentals','chart-ai'])assert.equal(canonicalPage('#'+page),page);
 for(const page of ['',null,'not-a-route','constructor'])assert.equal(canonicalPage(page),'dashboard');
});
