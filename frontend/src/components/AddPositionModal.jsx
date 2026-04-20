import { useState } from 'react';
import { AssetSearch } from './AssetSearch.jsx';

export function AddPositionModal({ onAdd, onClose }) {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [quantity,     setQuantity]     = useState('');
  const [entryPrice,   setEntryPrice]   = useState('');
  const [isPaper,      setIsPaper]      = useState(false);
  const [notes,        setNotes]        = useState('');
  const [tagInput,     setTagInput]     = useState('');
  const [tags,         setTags]         = useState([]);
  const [targetPrice,  setTargetPrice]  = useState('');
  const [showExtra,    setShowExtra]    = useState(false);
  const [error,        setError]        = useState(null);
  const [loading,      setLoading]      = useState(false);

  function addTag(e) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const t = tagInput.trim().replace(/,/g, '');
      if (t && !tags.includes(t)) setTags(prev => [...prev, t]);
      setTagInput('');
    }
  }

  function removeTag(t) {
    setTags(prev => prev.filter(x => x !== t));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedAsset)                      { setError('Selecciona un activo'); return; }
    if (!quantity || parseFloat(quantity) <= 0)    { setError('Cantidad inválida'); return; }
    if (!entryPrice || parseFloat(entryPrice) <= 0) { setError('Precio de entrada inválido'); return; }

    setError(null);
    setLoading(true);
    try {
      await onAdd({
        assetId:     selectedAsset.id,
        assetName:   selectedAsset.name,
        assetType:   selectedAsset.type ?? 'crypto',
        quantity,
        entryPrice,
        isPaper,
        notes:       notes.trim() || null,
        tags,
        targetPrice: targetPrice || null,
      });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <h2 className="text-white font-semibold">Nueva posición</h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.color = '#fff'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto max-h-[80vh]">

          {/* Activo */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Activo</label>
            {selectedAsset ? (
              <div className="flex items-center justify-between rounded-xl px-3 py-2.5 border"
                style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-normal)' }}>
                <span className="text-sm text-white font-medium">{selectedAsset.name}</span>
                <button type="button" onClick={() => setSelectedAsset(null)}
                  className="text-xs transition-colors" style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Cambiar
                </button>
              </div>
            ) : (
              <AssetSearch onSelect={asset => {
                setSelectedAsset(asset);
                if (asset.price) setEntryPrice(asset.price.toString());
              }} />
            )}
          </div>

          {/* Cantidad + Precio */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Cantidad</label>
              <input
                type="number" step="any" min="0" required
                value={quantity} onChange={e => setQuantity(e.target.value)}
                placeholder="ej: 0.5"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-normal)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--accent-silver)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-silver-glow)'; }}
                onBlur={e =>  { e.target.style.borderColor = 'var(--border-normal)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>P. entrada (USD)</label>
              <input
                type="number" step="any" min="0" required
                value={entryPrice} onChange={e => setEntryPrice(e.target.value)}
                placeholder="ej: 45000"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-normal)' }}
                onFocus={e => { e.target.style.borderColor = 'var(--accent-silver)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-silver-glow)'; }}
                onBlur={e =>  { e.target.style.borderColor = 'var(--border-normal)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* Simulación toggle */}
          <div className="flex items-center justify-between rounded-xl px-4 py-3 border"
            style={{ background: 'var(--bg-primary)', borderColor: isPaper ? 'rgba(217,119,6,0.4)' : 'var(--border-subtle)' }}>
            <div>
              <p className="text-sm text-white font-medium">Modo Simulación</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Posición hipotética sin dinero real</p>
            </div>
            <button
              type="button" onClick={() => setIsPaper(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors`}
              style={{ background: isPaper ? '#d97706' : 'var(--border-normal)', border: 'none', cursor: 'pointer' }}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPaper ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {/* Opciones avanzadas toggle */}
          <button
            type="button"
            onClick={() => setShowExtra(v => !v)}
            className="w-full flex items-center justify-between text-xs font-medium py-2 transition-colors"
            style={{ color: 'var(--accent-silver)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span>Opciones avanzadas (notas, etiquetas, precio objetivo)</span>
            <svg className={`w-4 h-4 transition-transform ${showExtra ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showExtra && (
            <div className="space-y-4 pt-1">
              {/* Precio objetivo */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Precio objetivo (USD)
                </label>
                <input
                  type="number" step="any" min="0"
                  value={targetPrice} onChange={e => setTargetPrice(e.target.value)}
                  placeholder="ej: 100000"
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-normal)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent-silver)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-silver-glow)'; }}
                  onBlur={e =>  { e.target.style.borderColor = 'var(--border-normal)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>

              {/* Etiquetas */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Etiquetas <span style={{ color: 'var(--text-muted)' }}>(Enter o coma para agregar)</span>
                </label>
                <div className="rounded-xl px-3 py-2 border transition-all"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-normal)', minHeight: '42px' }}>
                  <div className="flex flex-wrap gap-1.5 mb-1">
                    {tags.map(t => (
                      <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ background: 'var(--accent-silver-glow)', color: 'var(--accent-silver)', border: '1px solid var(--accent-silver)' }}>
                        {t}
                        <button type="button" onClick={() => removeTag(t)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--accent-silver)', lineHeight: 1 }}>
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={addTag}
                    placeholder="DeFi, Blue chip, Largo plazo..."
                    className="w-full text-sm text-white placeholder-slate-600 outline-none"
                    style={{ background: 'transparent', border: 'none' }}
                  />
                </div>
              </div>

              {/* Notas */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Notas / tesis de inversión
                </label>
                <textarea
                  value={notes} onChange={e => setNotes(e.target.value)}
                  placeholder="¿Por qué entras en esta posición? Escribe tu tesis..."
                  rows={3}
                  className="w-full rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-600 outline-none transition-all resize-none"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-normal)' }}
                  onFocus={e => { e.target.style.borderColor = 'var(--accent-silver)'; e.target.style.boxShadow = '0 0 0 3px var(--accent-silver-glow)'; }}
                  onBlur={e =>  { e.target.style.borderColor = 'var(--border-normal)'; e.target.style.boxShadow = 'none'; }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#f87171' }}>
              {error}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-3 pt-1">
            <button
              type="button" onClick={onClose}
              className="flex-1 text-sm font-medium rounded-xl py-2.5 transition-colors"
              style={{ background: 'var(--bg-primary)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)', cursor: 'pointer' }}
            >
              Cancelar
            </button>
            <button
              type="submit" disabled={loading}
              className="flex-1 text-white text-sm font-medium rounded-xl py-2.5 transition-all"
              style={{
                background: isPaper
                  ? 'linear-gradient(135deg, #92400e, #d97706)'
                  : 'linear-gradient(135deg, #3a3a3a, var(--accent-silver))',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                boxShadow: isPaper ? '0 4px 12px rgba(217,119,6,0.2)' : '0 4px 12px var(--accent-silver-glow)',
              }}
            >
              {loading ? 'Guardando...' : isPaper ? 'Agregar simulación' : 'Agregar posición'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
