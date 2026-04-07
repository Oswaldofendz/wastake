// ─── Catálogo global de activos ────────────────────────────────────────────────
// analysisType: 'crypto' | 'stock' | null  (null = solo gráfico TradingView)
// image: URL de CoinGecko (crypto) o null (usa iniciales)

export const ASSET_CATEGORIES = [
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'crypto', label: 'Crypto', icon: '₿',
    color: 'text-orange-400', bg: 'bg-orange-900/20',
    border: 'border-orange-700/40', dot: 'bg-orange-400',
    assets: [
      { id: 'bitcoin',          name: 'Bitcoin',       symbol: 'BTC',  type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:BTCUSDT', image: 'https://assets.coingecko.com/coins/images/1/thumb/bitcoin.png'       },
      { id: 'ethereum',         name: 'Ethereum',      symbol: 'ETH',  type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:ETHUSDT', image: 'https://assets.coingecko.com/coins/images/279/thumb/ethereum.png'    },
      { id: 'solana',           name: 'Solana',        symbol: 'SOL',  type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:SOLUSDT', image: 'https://assets.coingecko.com/coins/images/4128/thumb/solana.png'     },
      { id: 'ripple',           name: 'XRP',           symbol: 'XRP',  type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:XRPUSDT', image: 'https://assets.coingecko.com/coins/images/44/thumb/xrp-symbol-white-128.png' },
      { id: 'binancecoin',      name: 'BNB',           symbol: 'BNB',  type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:BNBUSDT', image: 'https://assets.coingecko.com/coins/images/825/thumb/bnb-icon2_2x.png' },
      { id: 'cardano',          name: 'Cardano',       symbol: 'ADA',  type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:ADAUSDT', image: 'https://assets.coingecko.com/coins/images/975/thumb/cardano.png'     },
      { id: 'dogecoin',         name: 'Dogecoin',      symbol: 'DOGE', type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:DOGEUSDT',image: 'https://assets.coingecko.com/coins/images/5/thumb/dogecoin.png'      },
      { id: 'polkadot',         name: 'Polkadot',      symbol: 'DOT',  type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:DOTUSDT', image: 'https://assets.coingecko.com/coins/images/12171/thumb/polkadot.png'  },
      { id: 'avalanche-2',      name: 'Avalanche',     symbol: 'AVAX', type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:AVAXUSDT',image: 'https://assets.coingecko.com/coins/images/12559/thumb/Avalanche_Circle_RedWhite_Trans.png' },
      { id: 'chainlink',        name: 'Chainlink',     symbol: 'LINK', type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:LINKUSDT',image: 'https://assets.coingecko.com/coins/images/877/thumb/chainlink-new-logo.png' },
      { id: 'shiba-inu',        name: 'Shiba Inu',     symbol: 'SHIB', type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:SHIBUSDT',image: 'https://assets.coingecko.com/coins/images/11939/thumb/shiba.png'     },
      { id: 'litecoin',         name: 'Litecoin',      symbol: 'LTC',  type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:LTCUSDT', image: 'https://assets.coingecko.com/coins/images/2/thumb/litecoin.png'      },
      { id: 'cosmos',           name: 'Cosmos',        symbol: 'ATOM', type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:ATOMUSDT',image: 'https://assets.coingecko.com/coins/images/1481/thumb/cosmos_hub.png'  },
      { id: 'uniswap',          name: 'Uniswap',       symbol: 'UNI',  type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:UNIUSDT', image: 'https://assets.coingecko.com/coins/images/12504/thumb/uni.jpg'        },
      { id: 'near',             name: 'NEAR Protocol',  symbol: 'NEAR', type: 'crypto', analysisType: 'crypto', tvSymbol: 'BINANCE:NEARUSDT',image: 'https://assets.coingecko.com/coins/images/14877/thumb/NEAR.png'      },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'etfs', label: 'ETFs', icon: '📊',
    color: 'text-green-400', bg: 'bg-green-900/20',
    border: 'border-green-700/40', dot: 'bg-green-400',
    assets: [
      { id: 'SPY',  name: 'S&P 500 (SPY)',        symbol: 'SPY',  type: 'etf', analysisType: 'stock', tvSymbol: 'AMEX:SPY',     image: null },
      { id: 'QQQ',  name: 'NASDAQ 100 (QQQ)',      symbol: 'QQQ',  type: 'etf', analysisType: 'stock', tvSymbol: 'NASDAQ:QQQ',   image: null },
      { id: 'DIA',  name: 'Dow Jones (DIA)',        symbol: 'DIA',  type: 'etf', analysisType: 'stock', tvSymbol: 'AMEX:DIA',     image: null },
      { id: 'IWM',  name: 'Russell 2000 (IWM)',     symbol: 'IWM',  type: 'etf', analysisType: 'stock', tvSymbol: 'AMEX:IWM',     image: null },
      { id: 'URTH', name: 'MSCI World (URTH)',      symbol: 'URTH', type: 'etf', analysisType: 'stock', tvSymbol: 'AMEX:URTH',    image: null },
      { id: 'EEM',  name: 'Emergentes (EEM)',       symbol: 'EEM',  type: 'etf', analysisType: 'stock', tvSymbol: 'AMEX:EEM',     image: null },
      { id: 'VTI',  name: 'Total Market (VTI)',     symbol: 'VTI',  type: 'etf', analysisType: 'stock', tvSymbol: 'AMEX:VTI',     image: null },
      { id: 'ARKK', name: 'ARK Innovation (ARKK)',  symbol: 'ARKK', type: 'etf', analysisType: 'stock', tvSymbol: 'AMEX:ARKK',    image: null },
      { id: 'XLK',  name: 'Tech Sector (XLK)',      symbol: 'XLK',  type: 'etf', analysisType: 'stock', tvSymbol: 'AMEX:XLK',     image: null },
      { id: 'XLF',  name: 'Finance Sector (XLF)',   symbol: 'XLF',  type: 'etf', analysisType: 'stock', tvSymbol: 'AMEX:XLF',     image: null },
      { id: 'XLE',  name: 'Energy Sector (XLE)',    symbol: 'XLE',  type: 'etf', analysisType: 'stock', tvSymbol: 'AMEX:XLE',     image: null },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'bonds', label: 'Bonos', icon: '🏛️',
    color: 'text-cyan-400', bg: 'bg-cyan-900/20',
    border: 'border-cyan-700/40', dot: 'bg-cyan-400',
    assets: [
      { id: 'TLT',  name: 'Bonos T 20+ años (TLT)', symbol: 'TLT',  type: 'bond', analysisType: 'stock', tvSymbol: 'NASDAQ:TLT',  image: null },
      { id: 'IEF',  name: 'Bonos T 7-10 años (IEF)',symbol: 'IEF',  type: 'bond', analysisType: 'stock', tvSymbol: 'NASDAQ:IEF',  image: null },
      { id: 'SHY',  name: 'Bonos T 1-3 años (SHY)', symbol: 'SHY',  type: 'bond', analysisType: 'stock', tvSymbol: 'NASDAQ:SHY',  image: null },
      { id: 'HYG',  name: 'High Yield Corp (HYG)',   symbol: 'HYG',  type: 'bond', analysisType: 'stock', tvSymbol: 'AMEX:HYG',    image: null },
      { id: 'LQD',  name: 'Corp IG (LQD)',           symbol: 'LQD',  type: 'bond', analysisType: 'stock', tvSymbol: 'AMEX:LQD',    image: null },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'commodities', label: 'Materias Primas', icon: '🥇',
    color: 'text-yellow-400', bg: 'bg-yellow-900/20',
    border: 'border-yellow-700/40', dot: 'bg-yellow-400',
    assets: [
      { id: 'GC=F', name: 'Oro (Gold)',       symbol: 'XAU', type: 'commodity', analysisType: 'stock', tvSymbol: 'TVC:GOLD',   image: null },
      { id: 'SI=F', name: 'Plata (Silver)',    symbol: 'XAG', type: 'commodity', analysisType: 'stock', tvSymbol: 'TVC:SILVER', image: null },
      { id: 'CL=F', name: 'Petróleo WTI',     symbol: 'WTI', type: 'commodity', analysisType: 'stock', tvSymbol: 'TVC:USOIL',  image: null },
      { id: 'NG=F', name: 'Gas Natural',       symbol: 'NG',  type: 'commodity', analysisType: 'stock', tvSymbol: 'TVC:NATGAS', image: null },
      { id: 'HG=F', name: 'Cobre (Copper)',    symbol: 'HG',  type: 'commodity', analysisType: 'stock', tvSymbol: 'COMEX:HG1!', image: null },
      { id: 'GLD',  name: 'Oro ETF (GLD)',     symbol: 'GLD', type: 'etf',       analysisType: 'stock', tvSymbol: 'AMEX:GLD',   image: null },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'indices', label: 'Índices', icon: '📈',
    color: 'text-blue-400', bg: 'bg-blue-900/20',
    border: 'border-blue-700/40', dot: 'bg-blue-400',
    assets: [
      // IDs únicos para evitar colisión con ETFs. analysisType: null = solo gráfico TradingView
      { id: '^GSPC',  name: 'S&P 500',         symbol: 'SPX', type: 'index', analysisType: null, tvSymbol: 'CBOE:SPX',    image: null },
      { id: '^NDX',   name: 'NASDAQ 100',       symbol: 'NDX', type: 'index', analysisType: null, tvSymbol: 'NASDAQ:NDX',  image: null },
      { id: '^DJI',   name: 'Dow Jones',        symbol: 'DJI', type: 'index', analysisType: null, tvSymbol: 'DJ:DJI',      image: null },
      { id: '^FTSE',  name: 'FTSE 100',         symbol: 'UKX', type: 'index', analysisType: null, tvSymbol: 'TVC:UKX',     image: null },
      { id: '^N225',  name: 'Nikkei 225',       symbol: 'NKY', type: 'index', analysisType: null, tvSymbol: 'TVC:NI225',   image: null },
      { id: '^GDAXI', name: 'DAX 40',           symbol: 'DAX', type: 'index', analysisType: null, tvSymbol: 'XETR:DAX',    image: null },
    ],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'forex', label: 'Forex', icon: '💱',
    color: 'text-purple-400', bg: 'bg-purple-900/20',
    border: 'border-purple-700/40', dot: 'bg-purple-400',
    assets: [
      // analysisType: 'stock' usa Yahoo Finance con símbolo =X
      { id: 'EURUSD=X', name: 'EUR / USD', symbol: 'EUR/USD', type: 'forex', analysisType: 'stock', tvSymbol: 'FX:EURUSD', image: null },
      { id: 'GBPUSD=X', name: 'GBP / USD', symbol: 'GBP/USD', type: 'forex', analysisType: 'stock', tvSymbol: 'FX:GBPUSD', image: null },
      { id: 'USDJPY=X', name: 'USD / JPY', symbol: 'USD/JPY', type: 'forex', analysisType: 'stock', tvSymbol: 'FX:USDJPY', image: null },
      { id: 'USDMXN=X', name: 'USD / MXN', symbol: 'USD/MXN', type: 'forex', analysisType: 'stock', tvSymbol: 'FX:USDMXN', image: null },
      { id: 'USDBRL=X', name: 'USD / BRL', symbol: 'USD/BRL', type: 'forex', analysisType: 'stock', tvSymbol: 'FX:USDBRL', image: null },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Todos los activos en lista plana con metadatos de categoría */
export const ALL_ASSETS = ASSET_CATEGORIES.flatMap(cat =>
  cat.assets.map(a => ({
    ...a,
    categoryId:    cat.id,
    categoryLabel: cat.label,
    categoryColor: cat.color,
    dot:           cat.dot,
  }))
);

/** Solo activos con soporte de análisis técnico (Panorama) */
export const ANALYZABLE_ASSETS = ALL_ASSETS.filter(a => a.analysisType !== null);

/** Agrupar activos analizables por categoría (para dropdown de Panorama) */
export const ANALYZABLE_CATEGORIES = ASSET_CATEGORIES
  .map(cat => ({
    ...cat,
    assets: cat.assets.filter(a => a.analysisType !== null),
  }))
  .filter(cat => cat.assets.length > 0);

/** Devuelve el analysisType normalizado para el backend ('crypto' | 'stock') */
export function getAnalysisType(asset) {
  if (asset?.analysisType) return asset.analysisType;
  return asset?.type === 'crypto' ? 'crypto' : 'stock';
}
