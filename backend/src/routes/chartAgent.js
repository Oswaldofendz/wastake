import {Router} from 'express';
import rateLimit from 'express-rate-limit';
import {getChartSnapshot,askChartAgent} from '../services/chartAgentService.js';
export const chartAgentRouter=Router();
const valid=(id,type,interval)=>typeof id==='string'&&/^[A-Za-z0-9^=._-]{1,100}$/.test(id)&&['stock','crypto'].includes(type)&&['15m','4h','1d'].includes(interval);
chartAgentRouter.get('/:id',async(req,res)=>{
 const {id}=req.params,{type='crypto',interval='1d'}=req.query;
 if(!valid(id,type,interval))return res.status(400).json({error:'Invalid chart context'});
 try{res.json(await getChartSnapshot(id,type,interval));}catch{res.status(502).json({error:'Verified chart data unavailable'});}
});
chartAgentRouter.post('/ask',rateLimit({windowMs:60000,max:8,standardHeaders:true,legacyHeaders:false}),async(req,res)=>{
 const {id,type='crypto',interval='1d',message,lang='es'}=req.body??{};
 if(!valid(id,type,interval)||!['es','pt','en'].includes(lang)||typeof message!=='string'||!message.trim()||message.length>600)return res.status(400).json({error:'Invalid chart question'});
 const history=Array.isArray(req.body.history)?req.body.history.slice(-4).filter(x=>x&&['user','assistant'].includes(x.role)&&typeof x.text==='string').map(x=>({role:x.role,text:x.text.slice(0,600)})):[];
 try{const snapshot=await getChartSnapshot(id,type,interval);res.json(await askChartAgent(snapshot,message.trim(),lang,history));}catch{res.status(502).json({error:'Chart analysis unavailable'});}
});
