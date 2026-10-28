import {intervalInfo} from '../../../frontend/src/utils/chartIntervals.js';
import {Router} from 'express';
import rateLimit from 'express-rate-limit';
import {getChartSnapshot,askChartAgent} from '../services/chartAgentService.js';
export const chartAgentRouter=Router();
const valid=(id,type,interval)=>typeof id==='string'&&/^[A-Za-z0-9^=._-]{1,100}$/.test(id)&&['stock','crypto'].includes(type)&&Boolean(intervalInfo(interval));
chartAgentRouter.get('/:id',async(req,res)=>{
 const {id}=req.params,{type='crypto',interval='1d',venue='auto'}=req.query;
 if(!valid(id,type,interval)||!['auto','Kraken','Coinbase'].includes(venue)||(type!=='crypto'&&venue!=='auto'))return res.status(400).json({error:'Invalid chart context'});
 try{res.json(await getChartSnapshot(id,type,interval,venue));}catch{res.status(502).json({error:'Verified chart data unavailable'});}
});
chartAgentRouter.post('/ask',rateLimit({windowMs:60000,max:8,standardHeaders:true,legacyHeaders:false}),async(req,res)=>{
 const {id,type='crypto',interval='1d',venue='auto',message,lang='es'}=req.body??{};
 if(!valid(id,type,interval)||!['auto','Kraken','Coinbase'].includes(venue)||(type!=='crypto'&&venue!=='auto')||!['es','pt','en'].includes(lang)||typeof message!=='string'||!message.trim()||message.length>600)return res.status(400).json({error:'Invalid chart question'});
 const history=Array.isArray(req.body.history)?req.body.history.slice(-4).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.text==='string').map(x=>({role:x.role,text:x.text.slice(0,600)})):[];
 const raw=req.body.context??{};
 const context={drawings:Array.isArray(raw.drawings)?raw.drawings.slice(-30).filter(d=>d&&typeof d.id==='string').map(d=>({id:d.id.slice(0,80),kind:String(d.kind??'').slice(0,20),label:String(d.label??'').slice(0,80),origin:d.origin==='manual'?'manual':'computed',reason:d.origin==='manual'?'User-edited reference; the original computed justification no longer applies.':String(d.reason??'').slice(0,600)})):[],selectedId:typeof raw.selectedId==='string'?raw.selectedId.slice(0,80):null};
 try{const snapshot=await getChartSnapshot(id,type,interval,venue);res.json(await askChartAgent(snapshot,message.trim(),lang,history,context));}catch{res.status(502).json({error:'Chart analysis unavailable'});}
});
