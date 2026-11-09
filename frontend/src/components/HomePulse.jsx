import {useEffect,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {ALL_ASSETS,getAnalysisType} from '../data/assetCatalog.js';
import {fetchFearGreed,fetchGlobalMarket,fetchOHLCV} from '../services/api.js';
import {compactNumber} from '../utils/compactNumber.js';
import {homeChart,homeCryptoSnapshot,homeSentiment} from '../utils/homePulse.js';
import {formatQuote} from '../utils/panoramaAnalysis.js';
import {AssetLogo} from './AssetLogo.jsx';

const featured = ['bitcoin','ethereum','NVDA','AAPL','^GSPC'].map(id => ALL_ASSETS.find(asset => asset.id === id));
const results = new Map();
const requests = new Map();
const pct = (value, lang) => value.toLocaleString(lang,{maximumFractionDigits:2,minimumFractionDigits:2,signDisplay:'exceptZero'})+'%';
const percent = (value,lang) => value.toLocaleString(lang,{maximumFractionDigits:2})+'%';
const tone = value => value > 0 ? 'home-up' : value < 0 ? 'home-down' : '';

function read(key, ttl, fetchValue) {
  const cached = results.get(key);
  if (cached && Date.now() - cached.at < ttl) return Promise.resolve(cached.value);
  if (!requests.has(key)) {
    const pending = fetchValue().then(value => {
      if (value) results.set(key,{value,at:Date.now()});
      return value;
    }).finally(() => requests.delete(key));
    requests.set(key,pending);
  }
  return requests.get(key);
}

function usePulseData() {
  const [data,setData] = useState(() => Object.fromEntries([...results].map(([key,entry]) => [key,entry.value])));
  useEffect(() => {
    let active = true;
    const load = (key, ttl, fetchValue) => {
      read(key,ttl,fetchValue).then(value => {
        if (active) setData(previous => ({...previous,[key]:value ?? previous[key] ?? null}));
      }).catch(() => {
        if (active) setData(previous => ({...previous,[key]:previous[key] ?? null}));
      });
    };
    const refresh = () => {
      if (document.visibilityState === 'hidden') return;
      for (const asset of featured) load(asset.id, 60 * 60 * 1000, async () => {
        const history = await fetchOHLCV(asset.id,getAnalysisType(asset),{days:45,interval:'1d',range:'3mo'});
        const chart = homeChart(history.candles);
        return chart ? {...chart,source:history.source,currency:history.currency} : null;
      });
      load('global',5 * 60 * 1000,fetchGlobalMarket);
      load('sentiment',5 * 60 * 1000,async () => homeSentiment((await fetchFearGreed()).current));
    };
    refresh();
    const timer = setInterval(refresh,5 * 60 * 1000);
    document.addEventListener('visibilitychange',refresh);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange',refresh);
    };
  },[]);
  return data;
}

function MiniChart({asset,chart,onSelect}) {
  const {t,i18n} = useTranslation();
  const path = chart?.points.map(([x,y],i) => (i ? 'L' : 'M')+x.toFixed(1)+','+y.toFixed(1)).join(' ');
  const date = chart && new Intl.DateTimeFormat(i18n.language,{day:'numeric',month:'short',timeZone:'UTC'}).format(chart.date);
  return <button className="home-mini-card" type="button" onClick={() => onSelect(asset)} aria-label={t('home_open_asset',{name:asset.name})} aria-describedby={'mini-'+asset.symbol}>
    <span className="home-mini-heading"><AssetLogo asset={asset} size={24}/><span translate="no"><strong>{asset.symbol}</strong><small>{asset.name}</small></span><span aria-hidden="true" className="home-mini-arrow">↗</span></span>
    <span className="home-mini-price">{chart ? asset.type === 'index' ? chart.close.toLocaleString(i18n.language,{maximumFractionDigits:2}) : formatQuote(chart.close,chart.currency,i18n.language) : '—'}</span>
    {chart ? <>
      <svg className={tone(chart.change)} viewBox="0 0 160 48" preserveAspectRatio="none" aria-hidden="true">
        <path d={path+' L158,48 L2,48 Z'} fill="currentColor" opacity=".12"/>
        <path d={path} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
      </svg>
      <span id={'mini-'+asset.symbol} className="home-mini-footer"><span className={tone(chart.change)}>{pct(chart.change,i18n.language)}</span><small title={chart.source}>{t('home_mini_close',{date,count:chart.count})}</small></span>
    </> : <span id={'mini-'+asset.symbol} className="home-mini-missing">{t(chart === undefined ? 'loading' : 'home_mini_missing')}</span>}
  </button>;
}

function SentimentArc({score}) {
  const angle = Math.PI * (1 - score/100);
  return <svg className="home-pulse-arc" viewBox="0 0 54 31" aria-hidden="true">
    <path d="M4 27A23 23 0 0 1 50 27" fill="none" stroke="var(--home-border)" strokeWidth="5"/>
    <path d="M4 27A23 23 0 0 1 50 27" fill="none" stroke={score < 45 ? '#f47785' : score > 55 ? '#32b890' : '#d8a745'} strokeWidth="5" pathLength="100" strokeDasharray={score+' 100'}/>
    <path d={'M27 27L'+(27+18*Math.cos(angle))+' '+(27-18*Math.sin(angle))} stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

export function HomePulse({assets,filters,filterKey,type,onFilter,onSelect,onSimple,calendarLink}) {
  const {t,i18n} = useTranslation();
  const data = usePulseData(), global = data.global, sentiment = data.sentiment, lang = i18n.language;
  const usd = value => Number.isFinite(value) && value > 0 ? '$'+compactNumber(value,lang) : '—';
  const sample = homeCryptoSnapshot(assets);
  const globalCap = Number.isFinite(global?.totalMarketCap) && global.totalMarketCap > 0;
  const globalVolume = Number.isFinite(global?.totalVolume) && global.totalVolume > 0;
  const globalShare = Number.isFinite(global?.btcDominance) && global.btcDominance > 0 && global.btcDominance <= 100;
  const share = globalShare ? global.btcDominance : sample.share;
  const sampleLabel = count => count ? t('home_pulse_sample',{count}) : t('home_pulse_missing');
  const change = global?.marketCapChange24h;
  return <>
    <section className="home-featured" aria-labelledby="home-featured-title">
      <div className="home-featured-head"><div><h1 id="home-featured-title"><span aria-hidden="true">📈</span>{t('home_featured')}</h1><p>{t('home_mini_help')}</p></div><button type="button" className="home-easy" onClick={onSimple}>🌱 {t('easy_switch')} <span>Beta ↗</span></button></div>
      <div className="home-mini-grid">{featured.map(asset => <MiniChart key={asset.id} asset={assets.find(row=>row.id===asset.id && row.type===asset.type) ?? asset} chart={data[asset.id]} onSelect={onSelect}/>)}</div>
    </section>
    <section className="home-pulse" aria-label={t('home_pulse')}>
      <div className="home-pulse-tabs" role="group" aria-label={t('home_types')}>{filters.map(key => <button type="button" key={key} aria-pressed={type===key} aria-controls="home-market-assets" onClick={() => onFilter(key)}>{t(filterKey[key])}</button>)}</div>
      <div className="home-pulse-grid">
        <div><span className="home-pulse-label">{t('home_pulse_cap')}</span><strong>{usd(globalCap ? global.totalMarketCap : sample.cap)}</strong><small>{globalCap ? <><span translate="no">CoinGecko</span>{Number.isFinite(change)&&<> · <span className={tone(change)}>{pct(change,lang)} · 24 h</span></>}</> : sampleLabel(sample.capCount)}</small></div>
        <div><span className="home-pulse-label">{t('home_pulse_volume')}</span><strong>{usd(globalVolume ? global.totalVolume : sample.volume)}</strong><small>{globalVolume ? <span translate="no">CoinGecko</span> : sampleLabel(sample.volumeCount)}</small></div>
        <div><span className="home-pulse-label">{t(globalShare?'home_pulse_dominance':'home_pulse_btc_share')}</span><strong>{Number.isFinite(share)&&share>0&&share<=100?percent(share,lang):'—'}</strong><small>{globalShare ? <span translate="no">CoinGecko</span> : sampleLabel(sample.capCount)}</small></div>
        <div className="home-pulse-sentiment"><div><span className="home-pulse-label">{t('home_pulse_sentiment')}</span><strong>{sentiment ? sentiment.score+' / 100' : '—'}</strong><small><span translate="no">Alternative.me</span>{sentiment&&' · '+new Intl.DateTimeFormat(lang,{day:'numeric',month:'short',timeZone:'UTC'}).format(sentiment.at)}</small></div>{sentiment&&<SentimentArc score={sentiment.score}/>}</div>
      </div>
      <nav className="home-quick" aria-label={t('home_quick')}>
        <a href="#chart-ai"><span aria-hidden="true">🤖</span> {t('home_quick_charts')}</a>
        <a href="#fundamentals"><span aria-hidden="true">🗞️</span> {t('home_news_all')}</a>
        <a href={calendarLink}><span aria-hidden="true">📅</span> {t('home_calendar')}</a>
        <a href="#alerts"><span aria-hidden="true">🔔</span> {t('home_quick_alerts')}</a>
      </nav>
    </section>
  </>;
}
