import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {askHomeAssistant,searchAssets} from '../services/api.js';
import {ALL_ASSETS} from '../data/assetCatalog.js';
import {exactMarketMatches,marketQuestion,mentionedMarkets} from '../utils/albertoMarket.js';
import {assetSearchParams} from '../utils/assetRoute.js';
import {formatQuote} from '../utils/panoramaAnalysis.js';
import {AlbertoIcon} from './AlbertoIcon.jsx';

const suggestions=['bitcoin','asset','futures'];
async function resolveMarkets(question, mentioned, previous, signal) {
  if (question?.matches.length===1) return question.matches;
  if (question?.matches.length>1) return [];
  if (mentioned.length) return mentioned;
  if (!question) return previous;
  const result=await searchAssets(question.target,{signal}).catch(()=>null);
  const matches=exactMarketMatches(question.target,result?.results);
  return matches.length===1?matches:[];
}

export function HomeAssistant({assets=[],onSelect}) {
  const {t,i18n} = useTranslation();
  const [open,setOpen] = useState(false);
  const [messages,setMessages] = useState([]);
  const [input,setInput] = useState('');
  const [busy,setBusy] = useState(false);
  const dialog = useRef(null), launcher = useRef(null), log = useRef(null), request = useRef(null);
  const lastMarkets = useRef([]);
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

  const send = async raw => {
    const text = raw.trim();
    if (!text || text.length > 600 || request.current) return;
    setInput('');
    setMessages(previous => [...previous,{role:'user',text}]);
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const catalogue=[...assets,...ALL_ASSETS];
      const question=marketQuestion(text.replace(/^₿\s*/,''),catalogue);
      const markets=await resolveMarkets(question,mentionedMarkets(text,catalogue),lastMarkets.current,controller.signal);
      if (controller.signal.aborted) return;
      const history=messages.filter(item=>!item.error).slice(-8).map(({role,text})=>({role,text}));
      const {reply,provider,sources=[]} = await askHomeAssistant({
        message:text,lang,history,assets:markets.map(({id,type})=>({id,type})),wantQuote:question?.price===true
      },controller.signal);
      if (!controller.signal.aborted && typeof reply === 'string' && reply.trim()) {
        lastMarkets.current=markets;
        setMessages(previous => [...previous,{role:'assistant',text:reply,provider,markets,sources}]);
      } else if (!controller.signal.aborted) {
        throw new Error('Empty assistant reply');
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessages(previous => [...previous,{role:'assistant',text:t(error.status===429?'alberto_rate_limit':'alberto_unavailable'),error:true}]);
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
        {messages.map(({role,text,provider,markets=[],sources=[]},index) => <div key={index} className={`alberto-message is-${role}`}>
          {provider&&<small className="alberto-source">{t('alberto_generated',{provider:provider==='groq'?'Groq':'Gemini'})}</small>}
          <p>{text}</p>
          {sources.map(source=>{
            const asset=markets.find(a=>a.id===source.id&&a.type===source.type);
            if (!asset) return null;
            const date=new Date(source.asOf).toLocaleString(lang,{
              dateStyle:'medium',...(source.kind==='quote'?{timeStyle:'short'}:{}),timeZone:'UTC'
            });
            return <div className="alberto-source" key={`${source.type}:${source.id}`}>
              <small>{asset.symbol} · {t(source.kind==='quote'?'alberto_quote_label':'alberto_close_label')} {formatQuote(source.price,source.currency,lang)} · {source.source} · {date} UTC</small>
              <a href={`?${assetSearchParams(window.location.search,asset)}#panorama`} onClick={event=>{
                if (event.metaKey||event.ctrlKey||event.shiftKey||event.altKey) return;
                event.preventDefault();
                dialog.current.close();
                onSelect(asset);
              }}>{t('alberto_market_open',{symbol:asset.symbol})} ↗</a>
            </div>;
          })}
        </div>)}
        {busy&&<p role="status" className="alberto-wait">{t('alberto_thinking')}</p>}
      </div>
      <div className="alberto-suggestions">
        {suggestions.map(topic=><button key={topic} type="button" disabled={busy} onClick={()=>send(t('alberto_question_'+topic))}>{t('alberto_question_'+topic)}</button>)}
      </div>
      <form className="alberto-form" onSubmit={event=>{event.preventDefault();void send(input);}}>
        <label htmlFor="alberto-question" className="sr-only">{t('alberto_question')}</label>
        <input id="alberto-question" value={input} onChange={event=>setInput(event.target.value)} placeholder={t('alberto_question')} maxLength={600} autoComplete="off"/>
        <button type="submit" disabled={busy||!input.trim()}>{t('alberto_send')}</button>
      </form>
    </dialog>
  </>;
}
