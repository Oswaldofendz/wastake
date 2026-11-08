import {useState} from 'react';
import {useTranslation} from 'react-i18next';
import {Fundamentals} from './Fundamentals.jsx';
import {Markets} from './Markets.jsx';

// Preserve both historical URLs while giving news and the calendar one home.
export function NewsMacro({page,allAssets}) {
  const {t}=useTranslation();
  const [view,setView]=useState(()=>new URLSearchParams(window.location.search).get('macro')==='heatmap'?'heatmap':'overview');
  const select=next=>{
    setView(next);const url=new URL(window.location.href);
    if(next==='heatmap')url.searchParams.set('macro','heatmap');else url.searchParams.delete('macro');
    url.hash='markets';window.history.replaceState(null,'',url);window.dispatchEvent(new HashChangeEvent('hashchange'));
  };
  return <div className="section-hub">{page==='markets'&&<h1 className="sr-only">{t('home_news_nav')}</h1>}<nav className="hub-navigation" aria-label={t('home_news_nav')}>
    <a href="#fundamentals" aria-current={page==='fundamentals'?'page':undefined}>🗞️ {t('home_news_tab')}</a>
    <button type="button" aria-pressed={page==='markets'&&view==='overview'} onClick={()=>select('overview')}>◷ {t('home_events_tab')}</button>
    <button type="button" aria-pressed={page==='markets'&&view==='heatmap'} onClick={()=>select('heatmap')}>▦ {t('home_tools_tab')}</button>
  </nav>{page==='fundamentals'?<Fundamentals/>:<Markets allAssets={allAssets} embedded view={view}/>}</div>;
}
