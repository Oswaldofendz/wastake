import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {advanceBull,jumpBull,newRun,runnerWidth,runnerX} from '../utils/bullRun.js';
import {AlbertoIcon} from './AlbertoIcon.jsx';

const bestKey = 'wastake-bull-record-v1';
function readBest() {
  try {return Math.max(0,Number.parseInt(localStorage.getItem(bestKey),10)||0);}
  catch {return 0;}
}

function Track({run}) {
  return <svg className="bull-track" viewBox={`0 0 ${runnerWidth} 204`} aria-hidden="true">
    <path d="M0 146l46-27 46 8 63-57 51 19 54-27 67 48 65-54 64 35 84-56V167H0Z" fill="#113248"/>
    <path d="M0 146l46-27 46 8 63-57 51 19 54-27 67 48 65-54 64 35 84-56" fill="none" stroke="#28646c" strokeWidth="2"/>
    <path d="M0 166H540V204H0Z" fill="#0a222b"/>
    <path d="M0 166H540" stroke="#52988d" strokeWidth="2"/>
    <path d={Array.from({length:10},(_,i)=>`M${i*64-(run.meters*10)%64} 185h26`).join(' ')} stroke="#295560" strokeWidth="2"/>
    {run.items.map(({id,x,kind}) => <g key={id} transform={`translate(${x} 166)`}>
      {kind==='barrier' && <path d="M-13 0l5-24h16l5 24Z" fill="#fa8b83" stroke="#682b46" strokeWidth="2"/>}
      {kind==='beam' && <><rect x="-16" y="-56" width="32" height="22" rx="4" fill="#f79c71"/><path d="m-9-42 6-7 6 7 6-7" fill="none" stroke="#722e4c" strokeWidth="2"/></>}
      {kind==='coin' && <><circle cy="-29" r="9" fill="#ffe182"/><path d="M0-34v10m-3-7h5" stroke="#865110" strokeWidth="2"/></>}
      {kind==='bird' && <><path d="M-15-96q5-18 14-9 9-13 17 2L4-99l-6 11Z" fill="#ffd072"/><circle cx="8" cy="-105" r="2" fill="#192c39"/></>}
    </g>)}
    <g transform={`translate(${runnerX-30} ${122-run.height+(run.duck&&!run.height?18:0)})`}>
      <svg width="60" height={run.duck&&!run.height?'28':'48'} viewBox="0 0 96 80" preserveAspectRatio="none"><AlbertoIcon className="bull-run-sprite"/></svg>
    </g>
  </svg>;
}

export function BullRun() {
  const {t} = useTranslation();
  const launcher = useRef(null), dialog = useRef(null), field = useRef(null);
  const [open,setOpen] = useState(false), [phase,setPhase] = useState('ready');
  const [mode,setMode] = useState('levels'), [pace,setPace] = useState('normal');
  const [best,setBest] = useState(readBest), [run,setRun] = useState(newRun);
  const current = useRef(run);
  const update = value => {current.current=value;setRun(value);};
  const start = () => {update(newRun(mode,pace));setPhase('running');};
  const jump = () => {if (phase==='running') update(jumpBull(current.current));};
  const duck = () => {if (phase==='running') update({...current.current,duck:!current.current.duck});};
  const close = () => dialog.current?.close();

  useEffect(() => {
    if (open && !dialog.current.open) dialog.current.showModal();
  },[open]);

  useEffect(() => {
    if (phase !== 'running') return;
    field.current?.focus();
    let frame, last;
    const tick = now => {
      const dt = last === undefined ? 0 : Math.min(.033,(now-last)/1000);
      last = now;
      const next = advanceBull(current.current,dt);
      update(next);
      if (next.result) {
        const score = Math.floor(next.meters);
        const record = Math.max(readBest(),score);
        try {localStorage.setItem(bestKey,String(record));} catch {}
        setBest(previous => Math.max(previous,record));
        setPhase(next.result);
      } else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const background = () => {if (document.hidden) setPhase('paused');};
    document.addEventListener('visibilitychange',background);
    return () => {cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',background);};
  },[phase]);

  const onKeyDown = event => {
    if (phase!=='running' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key===' ' && event.target.closest('button, select')) return;
    if ([' ','ArrowUp','ArrowDown'].includes(event.key)) {
      event.preventDefault();
      if (event.key==='ArrowDown') duck(); else jump();
    }
  };
  return <>
    <button ref={launcher} className="bull-launcher" type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label={t('bull_open')} title={t('bull_open')}><AlbertoIcon/><span>{t('bull_play')}</span></button>
    <dialog ref={dialog} className="bull-dialog" aria-labelledby="bull-title" onKeyDown={onKeyDown} onClose={() => {setOpen(false);setPhase('ready');update(newRun(mode,pace));launcher.current?.focus();}}>
      <header className="bull-header"><div><p className="home-eyebrow">WASTAKE ARCADE</p><h2 id="bull-title">{t('bull_title')}</h2></div><button type="button" onClick={close} aria-label={t('bull_close')} autoFocus>×</button></header>
      <div className="bull-body">
        <p className="bull-help">{t('bull_rules')}</p>
        <div className="bull-hud"><span>{t('bull_distance')} <strong>{Math.floor(run.meters)} m</strong></span><span>{t('bull_best')} <strong>{best} m</strong></span><span>🪙 <strong>{run.coins}</strong></span><span>🐦 <strong>{run.catches}</strong></span>{run.mode==='levels'&&<span>{t('bull_stage',{n:Math.min(3,Math.floor(run.meters/300)+1)})}</span>}</div>
        <div className="bull-field" ref={field} tabIndex={-1} onPointerDown={jump}><Track run={run}/>{phase!=='running'&&<span className="bull-field-badge" role="status">{t('bull_'+phase)}</span>}</div>
        {phase==='ready'||phase==='over'||phase==='won' ? <div className="bull-controls">
          <label>{t('bull_mode')}<select value={mode} onChange={e=>setMode(e.target.value)}><option value="levels">{t('bull_levels')}</option><option value="endless">{t('bull_endless')}</option></select></label>
          <label>{t('bull_pace')}<select value={pace} onChange={e=>setPace(e.target.value)}>{['calm','normal','fast'].map(value=><option key={value} value={value}>{t('bull_'+value)}</option>)}</select></label>
          <button type="button" className="bull-primary" onClick={start}>{t(phase==='ready'?'bull_start':'bull_retry')}</button>
        </div> : <div className="bull-controls">
          <button type="button" onClick={jump} disabled={phase==='paused'}>{t('bull_jump')}</button>
          <button type="button" onClick={duck} disabled={phase==='paused'} aria-pressed={run.duck}>{t('bull_duck')}</button>
          <button type="button" className="bull-primary" onClick={()=>setPhase(phase==='paused'?'running':'paused')}>{t(phase==='paused'?'bull_resume':'bull_pause')}</button>
        </div>}
        <p className="bull-local">{t('bull_local')}</p>
      </div>
    </dialog>
  </>;
}
