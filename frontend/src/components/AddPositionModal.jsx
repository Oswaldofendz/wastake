import { useState } from 'react';
import { AssetSearch } from './AssetSearch.jsx';

export function AddPositionModal({ onAdd, onClose }) {
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [quantity, setQuantity]           = useState('');
  const [entryPrice, setEntryPrice]       = useState('');
  const [isPaper, setIsPaper]             = useState(false);
  const [error, setError]                 = useState(null);
  const [loading, setLoading]             = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedAsset) { setError('Selecciona un activo'); return; }
    if (!quantity || parseFloat(quantity) <= 0) { setError('Cantidad inválida'); return; }
    if (!entryPrice || parseFloat(entryPrice) <= 0) { setError('Precio de entrada inválido'); return; }

    setError(null);
    setLoading(true);
    try {
      await onAdd({
        assetId:    selectedAsset.id,
        assetName:  selectedAsset.name,
        assetType:  selectedAsset.type ?? 'crypto',
        quantity,
        entryPrice,
        isPaper,
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
      <div className="w-full max-w-md bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/40">
          <h2 className="text-white font-semibold">Nueva posición</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Activo */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Activo</label>
            {selectedAsset ? (
              <div className="flex items-center justify-between bg-slate-800/60 border border-slate-700/40 rounded-lg px-3 py-2">
                <span className="text-sm text-white">{selectedAsset.name}</span>
                <button
                  type="button"
                  onClick={() => setSelectedAsset(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
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

          {/* Cantidad */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Cantidad</label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              placeholder="ej: 0.5"
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Precio de entrada */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Precio de entrada (USD)</label>
            <input
              type="number"
              step="any"
              min="0"
              required
              value={entryPrice}
              onChange={e => setEntryPrice(e.target.value)}
              placeholder="ej: 45000"
              className="w-full bg-slate-800/60 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
          </div>

          {/* Toggle paper trading */}
          <div className="flex items-center justify-between bg-slate-800/40 rounded-lg px-4 py-3 border border-slate-700/30">
            <div>
              <p className="text-sm text-white font-medium">Modo Simulación</p>
              <p className="text-xs text-slate-400">Posición hipotética sin dinero real</p>
            </div>
            <button
              type="button"
              onClick={() => setIsPaper(v => !v)}
              className={`relative w-10 h-5 rounded-full transition-colors ${isPaper ? 'bg-amber-500' : 'bg-slate-600'}`}
            >
              <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${isPaper ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </button>
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg py-2.5 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`flex-1 text-white text-sm font-medium rounded-lg py-2.5 transition-colors disabled:opacity-50 ${
                isPaper ? 'bg-amber-600 hover:bg-amber-500' : 'bg-brand-600 hover:bg-brand-500'
              }`}
            >
              {loading ? 'Guardando...' : isPaper ? 'Agregar simulación' : 'Agregar posición'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
