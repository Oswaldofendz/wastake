import { useEffect, useRef, useState } from 'react';

// ── Mapping asset IDs → TradingView symbols ───────────────────
const TV_MAP = {
  bitcoin:   'BINANCE:BTCUSDT',
  ethereum:  'BINANCE:ETHUSDT',
  solana:    'BINANCE:SOLUSDT',
  SPY:       'AMEX:SPY',
  URTH:      'AMEX:URTH',
  EEM:       'AMEX:EEM',
  'GC=F':    'TVC:GOLD',
  'SI=F':    'TVC:SILVER',
  // from categorized browser
  QQQ:       'NASDAQ:QQQ',
  SPX:       'CBOE:SPX',
  IXIC:      'NASDAQ:IXIC',
  DJI:       'DJ:DJI',
  DAX:       'XETR:DAX',
  'CL=F':    'TVC:USOIL',
  'NG=F':    'TVC:NATGAS',
  EURUSD:    'FX:EURUSD',
  GBPUSD:    'FX:GBPUSD',
  USDJPY:    'FX:USDJPY',
  USDMXN:   'FX:USDMXN',
  binancecoin: 'BINANCE:BNBUSDT',
  ripple:    'BINANCE:XRPUSDT',
  cardano:   'BINANCE:ADAUSDT',
};

function getTVSymbol(asset) {
  if (!asset) return 'BINANCE:BTCUSDT';
  // Asset from the new browser already has tvSymbol set
  if (asset.tvSymbol) return asset.tvSymbol;
  return TV_MAP[asset.id] ?? `BINANCE:${asset.symbol ?? asset.id}USDT`;
}

// Load the TradingView script once globally
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

export function CandleChart({ asset }) {
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

    // Clear previous widget and create fresh container div
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
        interval:            'D',
        timezone:            'Etc/UTC',
        theme:               'dark',
        style:               '1',          // Candlestick
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
  }, [asset?.id, asset?.tvSymbol]);

  return (
    <div
      ref={wrapperRef}
      className="w-full rounded-lg overflow-hidden"
      style={{ height: isMobile ? '300px' : '100%', minHeight: isMobile ? '300px' : '260px' }}
    />
  );
}
