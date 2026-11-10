import {useEffect,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {fetchOHLCV} from '../services/api.js';
import {analyzeFutures,futuresInstruments,futuresIntervals,parseFuturesCandles} from '../utils/futuresAnalysis.js';
import '../futures.css';

const kraken='https://docs.kraken.com/api/docs/futures-api/charts/candles';
const cme={ 'ES=F':'https://www.cmegroup.com/markets/equities/sp/e-mini-sandp500.html', 'NQ=F':'https://www.cmegroup.com/markets/equities/nasdaq/e-mini-nasdaq-100.html' };
const prices=new Map();
const chartWidth=642, chartBottom=192;

function StudyChart({analysis,format,t}) {
  const bars=analysis.candles.slice(-64);
  const lows=[...bars.map(bar=>bar.low),...analysis.scenarios.map(zone=>zone.low)];
  const highs=[...bars.map(bar=>bar.high),...analysis.scenarios.map(zone=>zone.high)];
  const floor=Math.min(...lows), ceiling=Math.max(...highs), spread=ceiling-floor||1;
  const y=price=>15+(ceiling-price)/spread*(chartBottom-15);
  const step=chartWidth/bars.length;
  const x=i=>(i+.5)*step;
  const line=bars.map((bar,i)=>(i?'L':'M')+x(i)+','+y(bar.close)).join(' ');
  const maxVolume=Math.max(1,...bars.map(bar=>Number.isFinite(bar.volume)?bar.volume:0));
  return <figure className="futures-chart">
    <figcaption>{t('fut_chart')}</figcaption>
    <svg viewBox="0 0 720 244" role="img" aria-label={t('fut_chart')}>
      {[0,.25,.5,.75,1].map(fraction=><line key={fraction} x1="0" x2={chartWidth} y1={y(ceiling-spread*fraction)} y2={y(ceiling-spread*fraction)} className="futures-guide"/>)}
      {analysis.scenarios.map(zone=><rect key={zone.kind} x="0" y={y(zone.high)} width={chartWidth} height={Math.max(1,y(zone.low)-y(zone.high))} className={zone.direction==='long'?'futures-band-long':'futures-band-short'}/>)}
      {[0,.5,1].map(fraction=>{
        const value=ceiling-spread*fraction;
        return <text key={fraction} x={chartWidth+6} y={y(value)+4} className="futures-axis">{format(value)}</text>;
      })}
      <path d={line} className="futures-close-line" fill="none" vectorEffect="non-scaling-stroke"/>
      {bars.map((bar,i)=>Number.isFinite(bar.volume)&&bar.volume>0&&<rect key={bar.time} x={x(i)-step*.34} y={238-bar.volume/maxVolume*35} width={step*.68} height={bar.volume/maxVolume*35} className={bar.close>=bar.open?'futures-volume-up':'futures-volume-down'}/>)}
    </svg>
    <div className="futures-legend"><span>{t('fut_chart_close')} · {format(analysis.close)}</span><span className="futures-long">● {t('fut_support')}</span><span className="futures-short">● {t('fut_resistance')}</span><span>{t('fut_chart_volume')}</span></div>
  </figure>;
}

export default function Futures() {
  const {t,i18n}=useTranslation();
  const [search,setSearch]=useState('');
  const [instrument,setInstrument]=useState(futuresInstruments[0]);
  const [cryptoInterval,setCryptoInterval]=useState('4h');
  const [response,setResponse]=useState(null);
  const [attempt,setAttempt]=useState(0);
  const interval=instrument.market==='continuous'?'1d':cryptoInterval;
  const identity=instrument.id+'|'+interval;
  const results=futuresInstruments.filter(item=>[item.id,item.ticker,item.name].some(value=>value.toLowerCase().includes(search.trim().toLowerCase())));
  useEffect(()=>{
    let active=true;
    const controller=new AbortController();
    const load=async()=>{
      const cached=prices.get(identity);
      if(cached&&Date.now()-cached.at<60000){if(active)setResponse(cached);return;}
      try {
        let candles, source;
        if(instrument.market==='perpetual'){
          const url='/api/futures-candles/'+encodeURIComponent(instrument.id)+'/'+interval;
          const request=await fetch(url,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(14000)])});
          if(!request.ok)throw new Error('Futures history unavailable');
          candles=parseFuturesCandles(await request.json());
          source='Kraken Futures';
        }else{
          const data=await fetchOHLCV(instrument.id,'stock',{range:'1y',interval:'1d'},{signal:controller.signal});
          if(data.source!=='Yahoo Finance'||data.id!==instrument.id)throw new Error('Continuous series unavailable');
          candles=data.candles;
          source=data.source;
        }
        const entry={identity,candles,source,at:Date.now()};
        if(active){prices.set(identity,entry);setResponse(entry);}
      }catch{if(active)setResponse({identity,error:true});}
    };
    void load();
    return()=>{active=false;controller.abort();};
  },[identity,attempt,instrument,interval]);

  const result=response?.identity===identity?response:null;
  const analysis=result&&!result.error?analyzeFutures(result.candles,instrument,interval):null;
  const unit=t(instrument.market==='continuous'?'fut_points':'fut_usd');
  const digits=instrument.tick===.0001?4:2;
  const format=value=>Number.isFinite(value)?value.toLocaleString(i18n.language,{minimumFractionDigits:digits,maximumFractionDigits:digits}):'—';
  const date=value=>new Intl.DateTimeFormat(i18n.language,{dateStyle:'medium',...(instrument.market==='perpetual'?{timeStyle:'short'}:{}),timeZone:'UTC'}).format(value*1000);
  const observed=analysis?.scenarios.find(zone=>zone.status==='observed');

  return <main className="futures-page">
    <header className="futures-hero">
      <p className="futures-eyebrow"><span aria-hidden="true">⚡</span> WASTAKE · {t('fut_label')}</p>
      <h1>{t('fut_title')}</h1><p>{t('fut_intro')}</p>
    </header>
    <section className="futures-panel futures-controls" aria-label={t('fut_label')}>
      <label>{t('fut_search')}<input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="BTC, ETH, ES, Nasdaq…"/></label>
      <label>{t('fut_contract')}<select value={results.some(item=>item.id===instrument.id)?instrument.id:''} onChange={e=>setInstrument(futuresInstruments.find(item=>item.id===e.target.value))}>
        {!results.some(item=>item.id===instrument.id)&&<option value="" disabled>{t(results.length?'fut_select':'fut_no_matches')}</option>}
        {results.map(item=><option key={item.id} value={item.id}>{item.ticker} · {item.name} · {t('fut_'+item.market)}</option>)}
      </select></label>
      <label>{t('fut_interval')}<select value={interval} onChange={e=>setCryptoInterval(e.target.value)} disabled={instrument.market==='continuous'}>
        {Object.keys(futuresIntervals).filter(key=>instrument.market==='perpetual'||key==='1d').map(key=><option key={key} value={key}>{t('fut_'+key)}</option>)}
      </select></label>
      <button type="button" className="futures-refresh" onClick={()=>{prices.delete(identity);setResponse(null);setAttempt(n=>n+1);}} disabled={!result}>{t('uni_refresh')}</button>
      {!!search&&!results.length&&<p className="futures-wide" role="status">{t('fut_coverage')} <a href="#panorama">{t('home_open_panorama')} ↗</a></p>}
    </section>
    <section className="futures-panel futures-readout" aria-labelledby="futures-study">
      <div className="futures-study-heading">
        <div><p className="futures-eyebrow" translate="no">{instrument.id} · {t('fut_'+instrument.market)}</p><h2 id="futures-study" translate="no">{instrument.name}</h2></div>
        {analysis&&<div><strong>{format(analysis.close)} {unit}</strong><p>{t('fut_last_bar')} · {date(analysis.asOf)} UTC</p></div>}
      </div>
      {instrument.market==='continuous'&&<p className="futures-notice">{t('fut_roll')}</p>}
      {!result?<p role="status">{t('loading')}</p>:!analysis?<p role="status">{t(result.error?'fut_unavailable':'fut_insufficient')}</p>:<>
        {(analysis.stale||analysis.hasGap)&&<p className="futures-notice" role="status">{t(analysis.stale?'fut_stale':'fut_gap')}</p>}
        <div className="futures-kpis">
          <div><span>{t('fut_trend')}</span><strong>{t('fut_'+analysis.trend)}</strong><small>EMA20 {format(analysis.ema20)} · EMA50 {format(analysis.ema50)}</small></div>
          <div><span>{t('fut_relative')}</span><strong>{Number.isFinite(analysis.volumeRatio)?format(analysis.volumeRatio)+'×':'—'}</strong><small>{t('fut_relative_base')}</small></div>
          <div><span>{t('fut_momentum')}</span><strong>{format(analysis.rsi)}</strong><small>RSI 14</small></div>
          <div><span>{t('fut_volatility')}</span><strong>{format(analysis.atr)} {unit}</strong><small>ATR 14</small></div>
        </div>
        <div className="futures-scenario-head"><h3>{t('fut_zones')}</h3><p>{t(observed?'fut_confirmed_summary':'fut_watch_summary')}</p></div>
        <div className="futures-zones">
          {['support','resistance'].map(kind=>{
            const zone=analysis.scenarios.find(item=>item.kind===kind);
            const direction=kind==='support'?'long':'short';
            return <article key={kind} className={'futures-zone futures-'+direction}>
              <h4>{t('fut_'+kind)} · {t('fut_case_'+direction)}</h4>
              {zone?<><p className="futures-zone-price">{format(zone.low)} – {format(zone.high)} <small>{unit}</small></p>
                <p className="futures-zone-state">{t('fut_state_'+zone.status)} · {zone.inside?t('fut_inside'):t('fut_distance',{distance:(100*Math.min(Math.abs(zone.low-analysis.close),Math.abs(zone.high-analysis.close))/analysis.close).toLocaleString(i18n.language,{maximumFractionDigits:2})})}</p>
                <p>{t('fut_touches',{count:zone.touches})} · {t('fut_last_pivot')} {date(zone.confirmedAt)}</p>
                <p>{t('fut_invalidate_'+direction,{price:format(zone.invalidation),unit})}</p>
                <p>{t('fut_trigger_'+direction)}</p></>:<p>{t('fut_no_zone')}</p>}
            </article>;
          })}
        </div>
        <StudyChart analysis={analysis} format={format} t={t}/>
      </>}
      <p className="futures-source">{t('home_source')} · <a href={instrument.market==='continuous'?cme[instrument.id]:kraken} target="_blank" rel="noreferrer">{result?.source??(instrument.market==='continuous'?'Yahoo Finance':'Kraken Futures')} ↗</a>{instrument.market==='continuous'&&<> · <a href={'https://finance.yahoo.com/quote/'+encodeURIComponent(instrument.id)+'/history/'} target="_blank" rel="noreferrer">{t('fut_history')} ↗</a></>}</p>
    </section>
    <section className="futures-panel futures-method">
      <details><summary>{t('fut_method')}</summary><p>{t('fut_method_text')}</p><p>{t('fut_confirm_text')}</p></details>
      <p>{t('fut_risk')}</p>
    </section>
  </main>;
}
