import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {askHomeAssistant,fetchAnalysis,fetchAssetQuote,searchAssets} from '../services/api.js';
import {ALL_ASSETS,getAnalysisType} from '../data/assetCatalog.js';
import {helpTopic} from '../utils/albertoHelp.js';
import {exactMarketMatches,marketQuestion,marketReply,verifiedClose,verifiedQuote} from '../utils/albertoMarket.js';
import {assetSearchParams} from '../utils/assetRoute.js';
import {AlbertoIcon} from './AlbertoIcon.jsx';

const suggestions=['bitcoin','asset','futures'];
const topics = {
  asset:'#panorama',
  alerts:'#alerts',
  charts:'#chart-ai',futures:'#futures',news:'#fundamentals',rsi:'#chart-ai',trend:'#chart-ai',volume:'#chart-ai',atr:'#chart-ai',levels:'#futures',portfolio:'#portfolio'
};

async function readMarket(question, signal, lang, t) {
  const matches=question.matches.length?question.matches:exactMarketMatches(question.target,(await searchAssets(question.target,{signal})).results);
  if (!matches.length) return {text:t('alberto_market_not_found')};
  if (matches.length>1) return {text:t('alberto_market_ambiguous',{choices:matches.slice(0,4).map(a=>`${a.name} (${a.symbol})`).join(' · ')})};
  const asset=matches[0],type=getAnalysisType(asset);
  const quote=()=>fetchAssetQuote({...asset,analysisType:type},{signal}).catch(()=>null);
  const analysis=()=>fetchAnalysis(asset.id,type,undefined,{signal}).then(result=>result.analysis).catch(()=>null);
  let daily=null,latest=null;
  if (question.price) {
    latest=await quote();
    if (!verifiedQuote(latest) && !signal.aborted) daily=await analysis();
  } else {
    daily=await analysis();
    if (!verifiedClose(daily?.meta) && !signal.aborted) latest=await quote();
  }
  return {asset,text:marketReply(asset,daily,latest,lang,t,{priceOnly:question.price})};
}

export function HomeAssistant({assets=[],onSelect}) {
  const {t,i18n} = useTranslation();
  const [open,setOpen] = useState(false);
  const [messages,setMessages] = useState([]);
  const [input,setInput] = useState('');
  const [busy,setBusy] = useState(false);
  const dialog = useRef(null), launcher = useRef(null), log = useRef(null), request = useRef(null);
  const lang = (i18n.resolvedLanguage || i18n.language).split('-')[0];

  useEffect(() => {
    if (open && !dialog.current.open) {
      dialog.current.showModal();
    }
  },[open]);
  useEffect(() => {
    if (open && log.current) log.current.scrollTop = log.current.scrollHeight;
  },[messages,busy,open]);
  useEffect(() => () => request.current?.abort(),[]);

  const send = async (raw, topic) => {
    const text = raw.trim();
    if (!text || text.length > 600 || request.current) return;
    setInput('');
    setMessages(previous => [...previous,{role:'user',text}]);
    const question=topic==='bitcoin'?marketQuestion('Bitcoin',[...assets,...ALL_ASSETS])
      : topic?null:marketQuestion(text,[...assets,...ALL_ASSETS]);
    const localTopic=topic==='bitcoin'?null:topic??helpTopic(text);
    const answerLocally=key=>setMessages(previous => [...previous,{
      role:'assistant',text:t('alberto_answer_'+key),topic:topics[key]?key:null
    }]);
    if (localTopic && !question?.matches.length && (topic || text.split(/\s+/).length<=12)) {
      answerLocally(localTopic);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      if (question) {
        const reading=await readMarket(question,controller.signal,lang,t);
        if (controller.signal.aborted) return;
        setMessages(previous => [...previous,{role:'assistant',...reading}]);
        return;
      }
      const {reply} = await askHomeAssistant({message:text,lang,history:messages.filter(item=>!item.error&&!item.asset).slice(-4).map(({role,text})=>({role,text}))},controller.signal);
      if (!controller.signal.aborted && typeof reply === 'string' && reply.trim()) {
        setMessages(previous => [...previous,{role:'assistant',text:reply}]);
      } else if (!controller.signal.aborted) {
        throw new Error('Empty assistant reply');
      }
    } catch {
      if (!controller.signal.aborted && localTopic && !question) answerLocally(localTopic);
      else if (!controller.signal.aborted) {
        setMessages(previous => [...previous,{role:'assistant',text:t('alberto_unavailable'),error:true}]);
        setInput(text);
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        setBusy(false);
      }
    }
  };

  function close() {
    request.current?.abort();
    request.current = null;
    setBusy(false);
    setOpen(false);
    launcher.current?.focus({preventScroll:true});
  }

  return <>
    <button ref={launcher} type="button" className="alberto-launcher" onClick={()=>setOpen(true)} aria-haspopup="dialog" aria-expanded={open} aria-label={t('alberto_open')}>
      <AlbertoIcon/><span className="alberto-short">Alberto</span><span className="alberto-mobile-label">{t('alberto_mobile')}</span>
    </button>
    <dialog ref={dialog} className="alberto-dialog" aria-labelledby="alberto-title" onClose={close}>
      <header className="alberto-header">
        <AlbertoIcon busy={busy}/>
        <div><h2 id="alberto-title">Alberto</h2><p>{t('alberto_subtitle')}</p></div>
        <button type="button" onClick={()=>dialog.current.close()} aria-label={t('alberto_close')}>×</button>
      </header>
      <div ref={log} className="alberto-log" role="log" aria-label={t('alberto_conversation')}>
        <p className="alberto-message">{t('alberto_intro')}</p>
        {messages.map(({role,text,topic,asset},index) => <div key={index} className={`alberto-message is-${role}`}>
          <p>{text}</p>
          {asset&&<a href={`?${assetSearchParams(window.location.search,asset)}#panorama`} onClick={event=>{
            if (event.metaKey||event.ctrlKey||event.shiftKey||event.altKey) return;
            event.preventDefault();
            dialog.current.close();
            onSelect(asset);
          }}>{t('alberto_market_open',{symbol:asset.symbol})} ↗</a>}
          {topic&&<a href={topics[topic]} onClick={()=>dialog.current.close()}>{t('alberto_link_'+({rsi:'charts',trend:'charts',volume:'charts',atr:'charts',levels:'futures'}[topic]??topic))} ↗</a>}
        </div>)}
        {busy&&<p role="status" className="alberto-wait">{t('alberto_thinking')}</p>}
      </div>
      <div className="alberto-suggestions">
        {suggestions.map(topic=><button key={topic} type="button" disabled={busy} onClick={()=>send(t('alberto_question_'+topic),topic)}>{t('alberto_question_'+topic)}</button>)}
      </div>
      <form className="alberto-form" onSubmit={event=>{event.preventDefault();void send(input);}}>
        <label htmlFor="alberto-question" className="sr-only">{t('alberto_question')}</label>
        <input id="alberto-question" value={input} onChange={event=>setInput(event.target.value)} placeholder={t('alberto_question')} maxLength={600} autoComplete="off"/>
        <button type="submit" disabled={busy||!input.trim()}>{t('alberto_send')}</button>
      </form>
    </dialog>
  </>;
}
