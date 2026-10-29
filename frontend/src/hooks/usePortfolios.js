import {useState,useEffect,useCallback,useRef} from 'react';
import {supabase} from '../services/supabase.js';
import {createPortfolioLoader} from '../services/portfolioLoader.js';
const readPortfolios=createPortfolioLoader(supabase);

export function usePortfolios(user){
 const owner=user?.id??null,current=useRef(owner);current.current=owner;
 const [state,setState]=useState({owner:null,rows:[],loading:false,error:null});
 const [choice,setChoice]=useState({owner:null,value:null});
 const rows=state.owner===owner?state.rows:[];
 const selected=choice.owner===owner?rows.find(p=>p.id===choice.value?.id)??rows[0]??null:null;
 const setSelected=value=>setChoice({owner,value});
 const load=useCallback(async()=>{
  if(!owner){setState({owner:null,rows:[],loading:false,error:null});setChoice({owner:null,value:null});return;}
  setState(s=>({owner,rows:s.owner===owner?s.rows:[],loading:true,error:null}));
  try{const data=await readPortfolios(owner);if(current.current!==owner)return;
   setState({owner,rows:data,loading:false,error:null});
   setChoice(prev=>({owner,value:(prev.owner===owner&&data.find(p=>p.id===prev.value?.id))||data[0]||null}));
  }catch(error){if(current.current===owner)setState({owner,rows:[],loading:false,error:error.message||String(error)});}
 },[owner]);
 useEffect(()=>{load();},[load]);
 const nameValue=name=>{const value=String(name??'').trim();if(!value||value.length>80)throw new Error('Nombre de cartera inválido');return value;};
 async function createPortfolio(name){
  if(!owner)throw new Error('Inicia sesión');
  const {data,error}=await supabase.from('portfolios').insert({user_id:owner,name:nameValue(name),color:'#c0c0c0'}).select().single();
  if(error)throw error;await load();if(current.current===owner)setChoice({owner,value:data});return data;
 }
 async function renamePortfolio(id,name){
  if(!owner||!rows.some(p=>p.id===id&&!p.virtual))throw new Error('Esta vista no se puede renombrar');
  const {error}=await supabase.from('portfolios').update({name:nameValue(name)}).eq('id',id).eq('user_id',owner);if(error)throw error;await load();
 }
 async function deletePortfolio(id){
  if(!owner||!rows.some(p=>p.id===id&&!p.virtual))throw new Error('Esta vista conserva las posiciones sin asignar');
  if(rows.filter(p=>!p.virtual).length<=1)throw new Error('No puedes eliminar la única cartera');
  const {error}=await supabase.from('portfolios').delete().eq('id',id).eq('user_id',owner);if(error)throw error;await load();
 }
 return {portfolios:rows,selected,setSelected,loading:!!owner&&(state.owner!==owner||state.loading),error:state.owner===owner?state.error:null,createPortfolio,renamePortfolio,deletePortfolio,refresh:load};
}
