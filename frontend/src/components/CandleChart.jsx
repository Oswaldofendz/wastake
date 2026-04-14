import { useEffect, useRef, useState } from 'react';

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
  '^FTSE':  'SPREADEX:FTSE',
  '^N225':  'INDEX:NKY',
  '^GDAXI': 'XETR:DAX',

  // Materias primas
  'GC=F': 'TVC:GOLD',
  'SI=F': 'TVC:SILVER',

  // Bonos ETFs
  'TLT': 'NASDAQ:TLT',
  'IEF': 'NASDAQ:IEF',
  'SHY': 'NASDAQ:SHY',
  'HYG': 'NYSE:HYG',
  'LQD': 'NYSE:LQD',
};

// Mapeo de timeframe → intervalo de TradingView
const TF_TO_TV_INTERVAL = {
  '1S': '60',   // 1 hora para semana
  '1M': 'D',
  '3M': 'D',
  '6M': 'W',
  '1A': 'W',
};

function getTVSymbol(asset) {
  if (!asset) return 'BINANCE:BTCUSDT';
  if (asset.tvSymbol) return asset.tvSymbol;
  return TV_MAP[asset.id] ?? TV_MAP[asset.symbol] ?? `BINANCE:${asset.symbol ?? asset.id}USDT`;
}

// Carga el script de TradingView una sola vez
let tvScriptPromise = null;
function loadTVScript() {
  if (tvScriptPromise) return tvScriptPromise;
  tvScriptPromise = new Promise((resolve) => {
    if (window.TradingView) { resolve(); return; }
    const script = document.createElement('script');
    script.src   = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = resolve;
    document.head.appendChild(script);
  });
  return tvScriptPromise;
}

let idCounter = 0;

export function CandleChart({ asset, timeframe = '3M' }) {
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

    const containerId = containerIdRef.current;
    const symbol      = getTVSymbol(asset);
    const interval    = TF_TO_TV_INTERVAL[timeframe] ?? 'D';

    // Limpiar widget anterior y crear nuevo contenedor
    wrapperRef.current.innerHTML = '';
    const inner = document.createElement('div');
    inner.id = containerId;
    inner.style.width  = '100%';
    inner.style.height = '100%';
    wrapperRef.current.appendChild(inner);

    loadTVScript().then(() => {
      if (!window.TradingView || !document.getElementById(containerId)) return;

      // eslint-disable-next-line no-new
      new window.TradingView.widget({
        autosize:            true,
        symbol,
        interval,
        timezone:            'Etc/UTC',
        theme:               'dark',
        style:               '1',         // Velas japonesas
        locale:              'es',
        toolbar_bg:          '#0f172a',
        enable_publishing:   false,
        allow_symbol_change: true,
        hide_side_toolbar:   false,
        withdateranges:      true,
        show_popup_button:   true,
        popup_width:         '1000',
        popup_height:        '650',
        container_id:        containerId,
      });
    });

    return () => {
      if (wrapperRef.current) wrapperRef.current.innerHTML = '';
    };
  }, [asset?.id, asset?.tvSymbol, timeframe]);

  return (
    <div
      ref={wrapperRef}
      className="w-full rounded-lg overflow-hidden"
      style={{ height: isMobile ? '300px' : '100%', minHeight: isMobile ? '300px' : '260px' }}
    />
  );
}
