import {useEffect,useState} from 'react';import {useTranslation} from 'react-i18next';
export function ReleaseNotice(){
 const {i18n}=useTranslation(),[available,setAvailable]=useState(false);
 useEffect(()=>{
  if(!import.meta.env.PROD)return;
  let active=true,last=0;
  const check=async()=>{if(document.visibilityState==='hidden'||Date.now()-last<60000)return;last=Date.now();try{const r=await fetch('/version.json',{cache:'no-store'});if(!r.ok)return;const d=await r.json();if(active&&typeof d.revision==='string'&&d.revision!==__APP_REVISION__)setAvailable(true);}catch{/* Offline browsing remains usable. */}};
  check();const timer=setInterval(check,300000);window.addEventListener('focus',check);document.addEventListener('visibilitychange',check);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',check);document.removeEventListener('visibilitychange',check);};
 },[]);
 const copy={es:['Hay una nueva versión de WaStake. Recarga para ver los cambios.','Actualizar página'],en:['A new WaStake version is available. Reload to see the changes.','Reload page'],pt:['Existe uma nova versão do WaStake. Atualize para ver as alterações.','Atualizar página']}[i18n.language.split('-')[0]]??['A new WaStake version is available.','Reload page'];
 return available?<aside role="status" className="flex flex-wrap items-center justify-center gap-3 border-b border-sky-700 bg-sky-950 px-4 py-3 text-sm text-sky-100"><p>{copy[0]}</p><button type="button" onClick={()=>location.reload()} className="min-h-10 rounded border border-sky-400 px-3 font-semibold">{copy[1]}</button></aside>:null;
}
