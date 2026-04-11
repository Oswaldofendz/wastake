import { useState, useEffect } from 'react';

const ALERT_TYPES = [
  { value: 'price_above',     label: 'Precio objetivo (arriba)',  needsValue: true,  unit: '$' },
  { value: 'price_below',     label: 'Precio objetivo (abajo)',   needsValue: true,  unit: '$' },
  { value: 'change_above',    label: 'Variación % (sube)',        needsValue: true,  unit: '%' },
  { value: 'change_below',    label: 'Variación % (baja)',        needsValue: true,  unit: '%' },
  { value: 'rsi_overbought',  label: 'RSI sobrecomprado (>70)',   needsValue: false, unit: '' },
  { value: 'rsi_oversold',    label: 'RSI sobrevendido (<30)',    needsValue: false, unit: '' },
  { value: 'macd_bullish',    label: 'MACD alcista',              needsValue: false, unit: '' },
  { value: 'macd_bearish',    label: 'MACD bajista',              needsValue: false, unit: '' },
];

function formatPrice(price) {
  if (price == null) return '';
  if (price >= 1000) return (price != null && !isNaN(price) ? price : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (price >= 1)    return price.toFixed(4);
  return price.toPrecision(4);
}

export function CreateAlertModal({ isOpen, onClose, onSave, assets }) {
  const [selectedAssetId, setSelectedAssetId] = useState('');
  const [alertType, setAlertType]             = useState('price_above');
  const [targetValue, setTargetValue]         = useState('');
  const [validationError, setValidationError] = useState('');
  const [submitting, setSubmitting]           = useState(false);

  // Initialise defaults when modal opens / assets load
  useEffect(() => {
    if (isOpen && assets && assets.length > 0) {
      setSelectedAssetId(assets[0].id);
      setAlertType('price_above');
      setTargetValue('');
      setValidationError('');
    }
  }, [isOpen, assets]);

  if (!isOpen) return null;

  const selectedAsset      = assets?.find(a => a.id === selectedAssetId) ?? null;
  const alertTypeMeta      = ALERT_TYPES.find(t => t.value === alertType) ?? ALERT_TYPES[0];
  const requiresTargetValue = alertTypeMeta.needsValue;

  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setValidationError('');

    if (requiresTargetValue) {
      const parsed = parseFloat(targetValue);
      if (targetValue === '' || isNaN(parsed)) {
        setValidationError('Introduce un valor numérico válido.');
        return;
      }
    }

    if (!selectedAsset) {
      setValidationError('Selecciona un activo.');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        asset_id:    selectedAsset.id,
        asset_name:  selectedAsset.name,
        asset_type:  selectedAsset.type,
        alert_type:  alertType,
        target_value: requiresTargetValue ? parseFloat(targetValue) : null,
      });
      onClose();
    } catch {
      setValidationError('Error al crear la alerta. Inténtalo de nuevo.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="w-full max-w-md mx-4 bg-slate-800 border border-slate-700 rounded-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold text-lg">Nueva Alerta</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors rounded-lg p-1 hover:bg-slate-700"
            aria-label="Cerrar"
          >
            <svg viewBox="0 0 20 20" className="w-5 h-5 fill-current">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Asset selector */}
          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Activo</label>
            <select
              value={selectedAssetId}
              onChange={e => setSelectedAssetId(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
            >
              {assets?.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name}
                  {asset.price != null ? ` — $${formatPrice(asset.price)}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Alert type selector */}
          <div>
            <label className="block text-slate-400 text-sm mb-1.5">Tipo de alerta</label>
            <select
              value={alertType}
              onChange={e => {
                setAlertType(e.target.value);
                setTargetValue('');
                setValidationError('');
              }}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors"
            >
              {ALERT_TYPES.map(t => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target value input (conditional) */}
          {requiresTargetValue && (
            <div>
              <label className="block text-slate-400 text-sm mb-1.5">
                Valor objetivo
                {alertTypeMeta.unit === '$' && <span className="ml-1 text-slate-500">(USD)</span>}
                {alertTypeMeta.unit === '%' && <span className="ml-1 text-slate-500">(%)</span>}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">
                  {alertTypeMeta.unit}
                </span>
                <input
                  type="number"
                  step="any"
                  value={targetValue}
                  onChange={e => {
                    setTargetValue(e.target.value);
                    setValidationError('');
                  }}
                  placeholder={
                    alertTypeMeta.unit === '$' && selectedAsset?.price != null
                      ? formatPrice(selectedAsset.price)
                      : alertTypeMeta.unit === '%'
                      ? '5'
                      : '0'
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg pl-7 pr-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-500"
                />
              </div>
              {/* Price hint */}
              {alertTypeMeta.unit === '$' && selectedAsset?.price != null && (
                <p className="mt-1 text-slate-500 text-xs">
                  Precio actual: ${formatPrice(selectedAsset.price)}
                </p>
              )}
              {alertTypeMeta.unit === '%' && selectedAsset?.change24h != null && (
                <p className="mt-1 text-slate-500 text-xs">
                  Variación 24h actual: {selectedAsset.change24h != null && !isNaN(selectedAsset.change24h) ? selectedAsset.change24h.toFixed(2) : '0.00'}%
                </p>
              )}
            </div>
          )}

          {/* Validation error */}
          {validationError && (
            <p className="text-red-400 text-sm bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {validationError}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {submitting ? 'Creando...' : 'Crear Alerta'}
          </button>
        </form>
      </div>
    </div>
  );
}
