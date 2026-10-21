// Known industry classifications for the symbols supported by WaStake's free
// price feed. Unknown stocks are deliberately left unclassified.
const STOCK_SECTORS = {
  AAPL: 'technology', MSFT: 'technology', NVDA: 'technology', AMD: 'technology',
  INTC: 'technology', ORCL: 'technology', CRM: 'technology', ADBE: 'technology',
  SHOP: 'technology',
  GOOGL: 'communication', META: 'communication', NFLX: 'communication', DIS: 'communication',
  TSLA: 'discretionary', AMZN: 'discretionary', UBER: 'discretionary', NKE: 'discretionary',
  MCD: 'discretionary',
  JPM: 'financials', V: 'financials', PYPL: 'financials', GS: 'financials', MS: 'financials',
  PFE: 'healthcare', JNJ: 'healthcare',
  WMT: 'staples', KO: 'staples', PEP: 'staples',
  BA: 'industrials',
  XOM: 'energy',
};

const SYMBOL_GROUPS = {
  SPY: 'broad_market', QQQ: 'broad_market', DIA: 'broad_market', IWM: 'broad_market',
  URTH: 'broad_market', EEM: 'broad_market', VTI: 'broad_market',
  ARKK: 'growth', XLK: 'technology', XLF: 'financials', XLE: 'energy', GLD: 'commodities',
};

const TYPE_GROUPS = {
  crypto: 'crypto', etf: 'broad_market', bond: 'bonds', commodity: 'commodities',
  forex: 'forex', index: 'indices',
};

export function getAssetGroup(asset) {
  const symbol = String(asset?.symbol ?? asset?.id ?? '').toUpperCase();
  if (asset?.type === 'stock') return STOCK_SECTORS[symbol] ?? 'unclassified';
  return SYMBOL_GROUPS[symbol] ?? TYPE_GROUPS[asset?.type] ?? 'other';
}
