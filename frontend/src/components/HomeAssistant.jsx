import {useEffect,useRef,useState} from 'react';
import {useTranslation} from 'react-i18next';
import {askHomeAssistant} from '../services/api.js';
import {helpTopic} from '../utils/albertoHelp.js';
import {AlbertoIcon} from './AlbertoIcon.jsx';

const suggestions=['asset','futures','alerts'];
const topics = {
  asset:'#panorama',
  alerts:'#alerts',
  charts:'#chart-ai',futures:'#futures',news:'#fundamentals',rsi:'#chart-ai',trend:'#chart-ai',volume:'#chart-ai',atr:'#chart-ai',levels:'#futures',portfolio:'#portfolio'
};

export function HomeAssistant() {
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
    const localTopic=topic??helpTopic(text);
    const answerLocally=key=>setMessages(previous => [...previous,{
      role:'assistant',text:t('alberto_answer_'+key),topic:topics[key]?key:null
    }]);
    if (topic || (localTopic && text.split(/\s+/).length<=12)) {
      answerLocally(localTopic);
      return;
    }
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    try {
      const {reply} = await askHomeAssistant({message:text,lang,history:messages.filter(item=>!item.error).slice(-4).map(({role,text})=>({role,text}))},controller.signal);
      if (!controller.signal.aborted && typeof reply === 'string' && reply.trim()) {
        setMessages(previous => [...previous,{role:'assistant',text:reply}]);
      } else if (!controller.signal.aborted) {
        throw new Error('Empty assistant reply');
      }
    } catch {
      if (!controller.signal.aborted && localTopic) answerLocally(localTopic);
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
        {messages.map(({role,text,topic},index) => <div key={index} className={`alberto-message is-${role}`}>
          <p>{text}</p>
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
