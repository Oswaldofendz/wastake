import {useCallback,useEffect,useMemo,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {AssetSearch} from '../components/AssetSearch.jsx';
import {AssetLogo} from '../components/AssetLogo.jsx';
import {MarketLeaders} from '../components/MarketLeaders.jsx';
import {HomePulse} from '../components/HomePulse.jsx';
import {HomeAssistant} from '../components/HomeAssistant.jsx';
import {MarketImpactAlert} from '../components/MarketImpactAlert.jsx';
import {useAssetRoute} from '../hooks/useAssetRoute.js';
import {useNewsTitles} from '../hooks/useNewsTitles.js';
import {useHomeQuotes} from '../hooks/useHomeQuotes.js';
import {fetchCalendar,fetchGlobalNews} from '../services/api.js';
import {cachedPublicNews} from '../utils/publicNewsCache.js';
import {homeAssets,homeStories,nextCalendarEvents,safeSource} from '../utils/homeDiscovery.js';
import {calendarTitle} from '../utils/calendar.js';
import {displayPriceUnit,formatQuote} from '../utils/panoramaAnalysis.js';
import '../home.css';

const filters=['all','stock','crypto','funds','other'];
const filterKey={all:'home_all',stock:'home_stocks',crypto:'home_crypto',funds:'home_funds',other:'home_other'};
const typeKey={stock:'screener_type_stock',crypto:'screener_type_crypto',etf:'screener_type_etf',bond:'screener_type_bond',forex:'screener_type_forex',commodity:'screener_type_commodity',index:'screener_type_index'};
const stamp=value=>value!=null&&Number.isFinite(Date.parse(value))?new Date(value):null;

function homeCalendarLink() {
  const params = new URLSearchParams(window.location.search);
  params.delete('macro');
  return window.location.pathname+(params.size?'?'+params:'')+'#markets';
}

function HomeContext({excluded,calendarLink}) {
  const {t,i18n}=useTranslation(),lang=i18n.language.split('-')[0];
  const [news,setNews]=useState(()=>cachedPublicNews({id:'global'},'market',lang)),[calendar,setCalendar]=useState(null),[newsError,setNewsError]=useState(false),[calendarError,setCalendarError]=useState(false),[newsLoading,setNewsLoading]=useState(true),[calendarLoading,setCalendarLoading]=useState(true);
  useEffect(()=>{
    let active=true,running=false;
    setNews(cachedPublicNews({id:'global'},'market',lang));setNewsError(false);setNewsLoading(true);
    const read=async()=>{
      if(running||document.visibilityState==='hidden')return;running=true;
      try{const result=await fetchGlobalNews(lang,'snapshot');if(active){setNews(previous=>result.sourceStatus==='unavailable'&&!result.news?.length?previous:result);setNewsError(result.sourceStatus==='unavailable');}}
      catch{if(active)setNewsError(true);}finally{running=false;if(active)setNewsLoading(false);}
    };
    void read();const timer=setInterval(read,60000),visible=()=>{if(document.visibilityState==='visible')void read();};document.addEventListener('visibilitychange',visible);
    return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[lang]);
  useEffect(()=>{
    let active=true,running=false;
    const read=async()=>{if(running||document.visibilityState==='hidden')return;running=true;try{const result=await fetchCalendar();if(active){setCalendar(result);setCalendarError(false);}}catch{if(active)setCalendarError(true);}finally{running=false;if(active)setCalendarLoading(false);}};
    void read();const timer=setInterval(read,300000),visible=()=>{if(document.visibilityState==='visible')void read();};document.addEventListener('visibilitychange',visible);
    return()=>{active=false;clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[]);
  const articles=homeStories(news?.news??[],Date.now(),excluded),titleFor=useNewsTitles(articles,lang,2),events=nextCalendarEvents(Array.isArray(calendar)?calendar:calendar?.events??[]);
  const date=value=>stamp(value)?.toLocaleString(i18n.language,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})??'—';
  const fallback=calendar?.source==='fallback';
  return <section className="home-context" aria-labelledby="home-context-title">
    <div className="home-section-title"><div><p className="home-eyebrow">02 · {t('home_context')}</p><h2 id="home-context-title"><span aria-hidden="true">📰</span>{t('home_news')}</h2><p>{t('home_context_help')}</p></div><a className="home-text-link" href="#fundamentals">{t('home_news_all')} ↗</a></div>
    <div className="home-context-grid"><div className="home-news-list">
      {newsError&&<p className="home-notice" role="status">{t('home_news_error')}</p>}
      {!articles.length&&!newsError&&<p className="home-empty" role="status">{t(newsLoading?'loading':'home_news_empty')}</p>}
      {articles.map(article=><article className="home-story" key={article.link}>
        <p className="home-story-meta"><span className="home-chip">{t('world_'+(article.marketCategory??article.category))}</span><span translate="no">{article.source}</span><time dateTime={article.pubDate}>{date(article.pubDate)}</time></p>
        <h3><a href={safeSource(article.link)} target="_blank" rel="noopener noreferrer">{titleFor(article)} ↗</a></h3>
        {lang!=='en'&&titleFor(article)===article.title&&<p className="home-caption">{t('home_news_original')}</p>}
        {article.analysisProvider&&article.summary?<p className="home-story-summary">{article.summary}</p>:<p className="home-caption">{t('home_news_preliminary')}</p>}
      </article>)}
    </div><aside className="home-agenda" aria-label={t('home_agenda')}><span className="home-agenda-icon" aria-hidden="true">📅</span><h3>{t('home_agenda')}</h3>
      {calendarError&&<p role="status" className="home-notice">{t('home_agenda_error')}</p>}
      {fallback&&<p className="home-caption">{t('home_calendar_reference')}</p>}
      {!events.length&&!calendarError&&<p role="status" className="home-caption">{t(calendarLoading?'loading':'home_agenda_empty')}</p>}
      {events.map(event=><article key={`${event.titleKey??event.title}:${event.scheduledAt??event.date}`}><time dateTime={event.scheduledAt??event.date}>{event.scheduledAt?date(event.scheduledAt):new Date(event.date+'T12:00:00').toLocaleDateString(i18n.language,{day:'numeric',month:'long'})}</time><h4>{calendarTitle(event,t,i18n.language)}</h4><p className="home-caption">{event.currency} · {!event.scheduledAt?t('home_event_date_only'):Intl.DateTimeFormat().resolvedOptions().timeZone}</p>{safeSource(event.sourceUrl)&&<a className="home-text-link" href={safeSource(event.sourceUrl)} target="_blank" rel="noopener noreferrer">{t('home_event_source')} ↗</a>}</article>)}
      <a href={calendarLink} className="home-text-link">{t('home_calendar')} →</a>
    </aside></div>
  </section>;
}

export function Dashboard({marketData,onSimple}) {
  const {t,i18n}=useTranslation(),[type,setType]=useState('all'),[,chooseAsset]=useAssetRoute(null,marketData.allAssets),[excluded,setExcluded]=useState([]);
  const onAlerts=useCallback(alerts=>setExcluded(alerts.map(a=>a.url)),[]);
  const openAsset=asset=>{chooseAsset(asset);window.location.hash='panorama';};
  const calendarLink = homeCalendarLink();
  const filterMarket = key => {
    setType(key);
    const table = document.getElementById('home-market-assets');
    table?.focus({preventScroll:true});
    table?.scrollIntoView({block:'start'});
  };
  const selectedRows=useMemo(()=>homeAssets(marketData.allAssets,type),[marketData.allAssets,type]);
  const rows=useHomeQuotes(selectedRows,marketData.lastUpdated?.getTime());
  const date=value=>stamp(value)?.toLocaleString(i18n.language,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})??t('home_date_missing');
  return <main className="home-page">
    <MarketImpactAlert hideWhenEmpty onAlertsChange={onAlerts}/>
    <HomePulse assets={marketData.allAssets} filters={filters} filterKey={filterKey} type={type} onFilter={filterMarket} onSelect={openAsset} onSimple={onSimple} calendarLink={calendarLink} assistant={<HomeAssistant assets={marketData.allAssets} onSelect={openAsset}/>}/>
    <MarketLeaders home marketData={marketData} onSelect={openAsset}/>
    <div className="home-search"><AssetSearch catalogueAssets={marketData.allAssets} onSelect={openAsset}/></div>
    <div className="home-status"><span className="home-status-dot" aria-hidden="true"/><span>{marketData.lastUpdated?t('home_updated',{date:date(marketData.lastUpdated)}):t(marketData.loading?'loading':'home_no_quotes')}</span>{(marketData.error||marketData.isStale)&&<span className="home-notice" role="status">{t('home_partial')}</span>}<button type="button" onClick={marketData.refresh} disabled={marketData.loading} aria-label={t('home_quotes_refresh')}>↻</button></div>
    <section id="home-market-assets" className="home-market" aria-labelledby="home-market-title" tabIndex={-1}>
      <div className="home-section-title"><div><p className="home-eyebrow">01 · {t('home_discover')}</p><h2 id="home-market-title"><span aria-hidden="true">🧭</span>{t('home_table')}</h2><p>{t('home_table_help')}</p></div><a className="home-text-link" href="#panorama">{t('home_open_panorama')} ↗</a></div>
    {type!=='all'&&<button className="home-reset-filter" type="button" onClick={()=>setType('all')}>{t(filterKey[type])} · {t('home_show_all')} ↗</button>}
        {!rows.length?<p className="home-empty" role="status">{t(marketData.loading?'loading':'home_no_quotes')}</p>:<table className="home-table"><caption className="sr-only">{t('home_table_help')}</caption><thead><tr><th scope="col">{t('home_asset')}</th><th scope="col" className="home-class-col">{t('home_class')}</th><th scope="col">{t('price')}</th><th scope="col">{t('home_move')}</th><th scope="col" className="home-source-col">{t('home_source')}</th></tr></thead><tbody>{rows.map(asset=>{
        const hasDate=stamp(asset.quoteAsOf)&&stamp(asset.quoteAsOf).getTime()<=Date.now(),up=Number.isFinite(asset.change24h)?asset.change24h>=0:null;
        return <tr key={`${asset.type}:${asset.id}`}><th scope="row"><button className="home-asset-button" type="button" onClick={()=>openAsset(asset)} aria-label={t('home_open_asset',{name:asset.name})}><AssetLogo asset={asset} size={32}/><span><strong translate="no">{asset.name}</strong><small translate="no">{asset.symbol}</small></span></button></th><td className="home-class-col"><span className="home-type">{t(typeKey[asset.type]??'home_other')}</span></td><td className="home-number"><span title={!hasDate?t('home_price_unverified'):undefined}>{hasDate?formatQuote(asset.price,displayPriceUnit(asset,asset.currency),i18n.language):'—'}</span><small className="home-mobile-date">{date(asset.quoteAsOf)}</small></td><td className="home-number"><span className={hasDate&&up!==null?up?'home-up':'home-down':''}>{hasDate&&up!==null?asset.change24h.toLocaleString(i18n.language,{minimumFractionDigits:2,maximumFractionDigits:2,signDisplay:'exceptZero'})+'%':'—'}</span><small>{t(asset.type==='crypto'?'home_change_crypto':'home_change_session')}</small></td><td className="home-source-col"><span translate="no">{asset.source??'—'}</span><small>{date(asset.quoteAsOf)}</small></td></tr>;
      })}</tbody></table>}
      <p className="home-caption home-table-note">{t('highlights_moves')}</p>
    </section>
    <HomeContext excluded={excluded} calendarLink={calendarLink}/>
    <section className="home-next"><div><p className="home-eyebrow">WASTAKE · PANORAMA</p><h2><span aria-hidden="true">🔎</span>{t('home_next')}</h2><p>{t('home_next_help')}</p></div><a className="home-primary" href="#panorama">{t('home_open_panorama')} →</a></section>
    <footer className="home-footer"><details><summary>{t('home_method')}</summary><p>{t('home_method_text')}</p><p>{t('home_company_note')}</p><p>{t('audit_compact_legend')}</p></details><p>{t('home_risk')}</p></footer>
  </main>;
}
