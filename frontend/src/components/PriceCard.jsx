import { useTranslation } from 'react-i18next';

// Logo fallback map for non-crypto assets (SVG letter avatars handled in component)
const TYPE_COLORS = {
  crypto:    { bg: 'bg-orange-900/60', text: 'text-orange-300', badge: 'bg-purple-900/60 text-purple-300' },
  etf:       { bg: 'bg-blue-900/60',   text: 'text-blue-300',   badge: 'bg-blue-900/60 text-blue-300'   },
  commodity: { bg: 'bg-amber-900/60',  text: 'text-amber-300',  badge: 'bg-amber-900/60 text-amber-300' },
  index:     { bg: 'bg-cyan-900/60',   text: 'text-cyan-300',   badge: 'bg-cyan-900/60 text-cyan-300'   },
  forex:     { bg: 'bg-purple-900/60', text: 'text-purple-300', badge: 'bg-purple-900/60 text-purple-300' },
};

function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtPrice(n) {
  if (n == null || isNaN(n)) return '—';
  if (n >= 1000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (n >= 1)    return `$${n.toFixed(2)}`;
  return `$${n.toFixed(4)}`;
}

function AssetLogo({ asset }) {
  if (asset.image) {
    return (
      <img
        src={asset.image}
        alt={asset.symbol}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        onError={e => {
          e.target.style.display = 'none';
          e.target.nextElementSibling?.style.removeProperty('display');
        }}
      />
    );
  }

  // Initials fallback
  const colors = TYPE_COLORS[asset.type] ?? TYPE_COLORS.etf;
  const initials = (asset.symbol ?? asset.name ?? '?').slice(0, 2).toUpperCase();
  return (
    <div className={`w-8 h-8 rounded-full ${colors.bg} flex items-center justify-center flex-shrink-0`}>
      <span className={`text-xs font-bold ${colors.text}`}>{initials}</span>
    </div>
  );
}

export function PriceCard({ asset, isSelected, onClick }) {
  const { t } = useTranslation();
  const positive = asset.change24h >= 0;
  const typeMeta = TYPE_COLORS[asset.type] ?? TYPE_COLORS.etf;

  return (
    <button
      onClick={() => onClick(asset)}
      className={[
        'w-full text-left px-3 py-2.5 rounded-xl border transition-all duration-150',
        'hover:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-400',
        isSelected
          ? 'bg-white/[8%] border-l-2 border-l-[#c0c0c0] border-white/[8%]'
          : 'border-white/[8%] hover:bg-white/[4%]',
      ].join(' ')}
    >
      <div className="flex items-center gap-2.5">
        {/* Logo */}
        <AssetLogo asset={asset} />

        {/* Name + price */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1">
            <p className="font-medium text-sm text-white leading-tight truncate">{asset.name}</p>
            <span className={[
              'text-xs px-1.5 py-0.5 rounded-full font-medium flex-shrink-0',
              typeMeta.badge,
            ].join(' ')}>
              {asset.symbol}
            </span>
          </div>

          <div className="flex items-center justify-between mt-0.5">
            <p className="text-sm font-semibold text-white font-mono">{fmtPrice(asset.price)}</p>
            <span className={['text-xs font-medium', positive ? 'text-green-400' : 'text-red-400'].join(' ')}>
              {asset.change24h != null && !isNaN(asset.change24h)
                ? `${positive ? '+' : ''}${asset.change24h.toFixed(2)}%`
                : '—'}
            </span>
          </div>

          {asset.volume24h > 0 && (
            <p className="text-xs text-slate-500 mt-0.5">{fmt(asset.volume24h)} vol</p>
          )}
        </div>
      </div>
    </button>
  );
}
