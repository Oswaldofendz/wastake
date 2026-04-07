import { useState, useEffect, useRef } from 'react';
import { ASSET_CATEGORIES, ALL_ASSETS } from '../data/assetCatalog.js';

// ── Sub-components ────────────────────────────────────────────────────────────

function CategoryRow({ cat, expanded, onToggle, onSelect }) {
  return (
    <div className="border-b border-slate-700/40 last:border-0">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-slate-700/30 ${expanded ? cat.bg : ''}`}
      >
        <span className="text-base leading-none">{cat.icon}</span>
        <span className={`text-xs font-semibold ${cat.color}`}>{cat.label}</span>
        <span className="text-xs text-slate-600 ml-1">({cat.assets.length})</span>
        <svg
          viewBox="0 0 16 16"
          className={`w-3 h-3 fill-current text-slate-500 ml-auto transition-transform ${expanded ? 'rotate-180' : ''}`}
        >
          <path d="M8 10.5L2.5 5h11L8 10.5Z" />
        </svg>
      </button>

      {expanded && (
        <ul className="pb-1">
          {cat.assets.map(asset => (
            <li key={`${cat.id}-${asset.id}`}>
              <button
                onClick={() => onSelect(asset)}
                className="w-full flex items-center gap-2.5 pl-8 pr-3 py-1.5 text-left hover:bg-slate-700/40 transition-colors group"
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cat.dot}`} />
                <span className="text-sm text-slate-200 group-hover:text-white transition-colors truncate">
                  {asset.name}
                </span>
                <span className="ml-auto text-xs text-slate-500 font-mono flex-shrink-0">
                  {asset.symbol}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SearchResults({ results, onSelect }) {
  if (results.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-slate-500 text-sm">Sin resultados</div>
    );
  }
  return (
    <ul>
      {results.map(asset => (
        <li key={`${asset.categoryId}-${asset.id}`}>
          <button
            onClick={() => onSelect(asset)}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-700/50 transition-colors group"
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${asset.dot}`} />
            <div className="flex-1 min-w-0">
              <span className="text-sm text-white truncate block">{asset.name}</span>
              <span className={`text-xs ${asset.categoryColor}`}>{asset.categoryLabel}</span>
            </div>
            <span className="text-xs text-slate-400 font-mono flex-shrink-0">{asset.symbol}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AssetSearch({ onSelect }) {
  const [query, setQuery]       = useState('');
  const [open, setOpen]         = useState(false);
  const [expanded, setExpanded] = useState({ crypto: true });
  const wrapperRef              = useRef(null);

  useEffect(() => {
    function handler(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const q        = query.trim().toLowerCase();
  const filtered = q.length >= 1
    ? ALL_ASSETS.filter(a =>
        a.name.toLowerCase().includes(q) ||
        a.symbol.toLowerCase().includes(q) ||
        a.id.toLowerCase().includes(q)
      )
    : [];

  function handleSelect(asset) {
    onSelect(asset);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={wrapperRef} className="relative">
      {/* Input */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar activos..."
          className="w-full pl-9 pr-4 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setOpen(true); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 fill-current">
              <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.749.749 0 0 1 1.275.326.749.749 0 0 1-.215.734L9.06 8l3.22 3.22a.749.749 0 0 1-.326 1.275.749.749 0 0 1-.734-.215L8 9.06l-3.22 3.22a.751.751 0 0 1-1.042-.018.751.751 0 0 1-.018-1.042L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden z-50 shadow-2xl max-h-80 overflow-y-auto">
          {q.length >= 1 ? (
            <SearchResults results={filtered} onSelect={handleSelect} />
          ) : (
            <>
              <div className="px-3 py-2 border-b border-slate-700/60">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Explorar por categoría</p>
              </div>
              {ASSET_CATEGORIES.map(cat => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  expanded={!!expanded[cat.id]}
                  onToggle={() => setExpanded(p => ({ ...p, [cat.id]: !p[cat.id] }))}
                  onSelect={handleSelect}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
