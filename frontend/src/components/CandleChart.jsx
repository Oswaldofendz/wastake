import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

// ── TradingView symbol map — cubre todos los activos del catálogo ─────────────
const TV_MAP = {
  // Crypto
  bitcoin:             'BINANCE:BTCUSDT',
  ethereum:            'BINANCE:ETHUSDT',
  solana:              'BINANCE:SOLUSDT',
  ripple:              'BINANCE:XRPUSDT',
  binancecoin:         'BINANCE:BNBUSDT',
  cardano:             'BINANCE:ADAUSDT',
  dogecoin:            'BINANCE:DOGEUSDT',
  'avalanche-2':       'BINANCE:AVAXUSDT',
  chainlink:           'BINANCE:LINKUSDT',
  polkadot:            'BINANCE:DOTUSDT',
  'shiba-inu':         'BINANCE:SHIBUSDT',
  litecoin:            'BINANCE:LTCUSDT',
  uniswap:             'BINANCE:UNIUSDT',
  'bitcoin-cash':      'BINANCE:BCHUSDT',
  stellar:             'BINANCE:XLMUSDT',
  cosmos:              'BINANCE:ATOMUSDT',
  near:                'BINANCE:NEARUSDT',
  'internet-computer': 'BINANCE:ICPUSDT',

  // ETFs
  'SPY':  'AMEX:SPY',
  'QQQ':  'NASDAQ:QQQ',
  'DIA':  'AMEX:DIA',
  'IWM':  'AMEX:IWM',
  'URTH': 'AMEX:URTH',
  'EEM':  'AMEX:EEM',
  'VTI':  'AMEX:VTI',
  'ARKK': 'AMEX:ARKK',
  'XLK':  'AMEX:XLK',
  'XLF':  'AMEX:XLF',
  'XLE':  'AMEX:XLE',

  // Acciones
  'AAPL':  'NASDAQ:AAPL',
  'MSFT':  'NASDAQ:MSFT',
  'NVDA':  'NASDAQ:NVDA',
  'TSLA':  'NASDAQ:TSLA',
  'AMZN':  'NASDAQ:AMZN',
  'GOOGL': 'NASDAQ:GOOGL',
  'META':  'NASDAQ:META',
  'NFLX':  'NASDAQ:NFLX',
  'JPM':   'NYSE:JPM',
  'V':     'NYSE:V',
  'AMD':   'NASDAQ:AMD',
  'INTC':  'NASDAQ:INTC',
  'ORCL':  'NYSE:ORCL',
  'CRM':   'NYSE:CRM',
  'ADBE':  'NASDAQ:ADBE',
  'PYPL':  'NASDAQ:PYPL',
  'UBER':  'NYSE:UBER',
  'SHOP':  'NYSE:SHOP',
  'DIS':   'NYSE:DIS',
  'BA':    'NYSE:BA',
  'GS':    'NYSE:GS',
  'MS':    'NYSE:MS',
  'WMT':   'NYSE:WMT',
  'KO':    'NYSE:KO',
  'PEP':   'NASDAQ:PEP',
  'MCD':   'NYSE:MCD',
  'NKE':   'NYSE:NKE',
  'PFE':   'NYSE:PFE',
  'JNJ':   'NYSE:JNJ',
  'XOM':   'NYSE:XOM',

  // Forex (Yahoo ID → TradingView FX)
  'EURUSD=X': 'FX:EURUSD',
  'GBPUSD=X': 'FX:GBPUSD',
  'USDJPY=X': 'FX:USDJPY',
  'USDMXN=X': 'FX:USDMXN',
  'USDBRL=X': 'FX:USDBRL',

  // Índices
  '^GSPC':  'SP:SPX',
  '^NDX':   'NASDAQ:NDX',
  '^DJI':   'DJ:DJI',
  '^FTSE':  'FTSE:UKX',
  '^N225':  'INDEX:NKY',
  '^GDAXI': 'XETR:DAX',

  // Materias primas
  'GC=F': 'COMEX:GC1!',
  'SI=F': 'COMEX:SI1!',
  'CL=F': 'NYMEX:CL1!',
  'NG=F': 'NYMEX:NG1!',
  'HG=F': 'COMEX:HG1!',

  // Bonos ETFs
  'TLT': 'NASDAQ:TLT',
  'IEF': 'NASDAQ:IEF',
  'SHY': 'NASDAQ:SHY',
  'HYG': 'NYSE:HYG',
  'LQD': 'NYSE:LQD',
};

// Mapeo de timeframe → intervalo de TradingView
const TF_TO_TV_RANGE = {
  '1D': '1D',
  '1S': '5D',
  '1M': '1M',
  '3M': '3M',
  '6M': '6M',
  '1A': '12M',
};

export function getTVSymbol(asset) {
  if (!asset) return 'BINANCE:BTCUSDT';
  if (asset.tvSymbol) return asset.tvSymbol;
  return TV_MAP[asset.id] ?? TV_MAP[asset.symbol] ?? (asset.type === 'crypto' && asset.analysisType !== 'stock' ? `BINANCE:${asset.symbol ?? asset.id}USDT` : asset.id);
}

// Carga el script de TradingView una sola vez
let tvScriptPromise = null;
function loadTVScript() {
  if (tvScriptPromise) return tvScriptPromise;
  tvScriptPromise = new Promise((resolve, reject) => {
    if (window.TradingView) { resolve(); return; }
    const script = document.createElement('script');
    script.src   = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => { tvScriptPromise = null; reject(new Error('TradingView unavailable')); };
    document.head.appendChild(script);
  });
  return tvScriptPromise;
}

let idCounter = 0;

export function TradingViewChart({ asset, timeframe = '3M',interval='1d' }) {
  const { i18n, t } = useTranslation();
  const [unavailable, setUnavailable] = useState(false);
  const wrapperRef     = useRef(null);
  const containerIdRef = useRef(`tv_widget_${++idCounter}`);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);

  useEffect(() => {
    if (!wrapperRef.current) return;
    let alive = true;
    setUnavailable(false);

    const containerId = containerIdRef.current;
    const symbol      = getTVSymbol(asset);
    const range = TF_TO_TV_RANGE[timeframe] ?? '3M';

    // Limpiar widget anterior y crear nuevo contenedor
    wrapperRef.current.innerHTML = '';
    const inner = document.createElement('div');
    inner.id = containerId;
    inner.style.width  = '100%';
    inner.style.height = '100%';
    wrapperRef.current.appendChild(inner);

    loadTVScript().then(() => {
      if (!alive || !window.TradingView || !document.getElementById(containerId)) return;

      // eslint-disable-next-line no-new
      new window.TradingView.widget({
        autosize:            true,
        symbol,
        interval: interval==='4h'?'240':interval==='15m'?'15':'D',
        range,
        timezone:            'Etc/UTC',
        theme:               'dark',
        style:               '1',         // Velas japonesas
        studies:             ['MAExp@tv-basicstudies'],
        locale:              i18n.language.split('-')[0],
        toolbar_bg:          '#0f172a',
        enable_publishing:   false,
        allow_symbol_change: false,
        hide_side_toolbar:   false,
        withdateranges:      true,
        show_popup_button:   true,
        popup_width:         '1000',
        popup_height:        '650',
        container_id:        containerId,
      });
    }).catch(() => { if(alive)setUnavailable(true); });

    return () => {
      alive = false;
      if (wrapperRef.current) wrapperRef.current.innerHTML = '';
    };
  }, [asset?.id, asset?.tvSymbol, timeframe, interval, i18n.language]);

  return (
    <>
    <p className="mb-2 text-xs leading-5 text-slate-400">{t('audit_external_chart')}</p>
    {unavailable && <p role="status" className="p-4 text-sm text-amber-300">{t('chart_advanced_error')}</p>}
    <div
      ref={wrapperRef}
      className="w-full rounded-lg overflow-hidden"
      style={{ height: isMobile ? '300px' : '100%', minHeight: isMobile ? '300px' : '260px' }}
    />
    </>
  );
}
