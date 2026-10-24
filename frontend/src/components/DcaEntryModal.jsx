import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const FREQS = ['weekly', 'biweekly', 'monthly'];

function number(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function DcaEntryModal({ assets, positions, onAdd, onClose }) {
  const { t } = useTranslation();
  const [asset, setAsset] = useState(null);
  const [amount, setAmount] = useState('100');
  const [frequency, setFrequency] = useState('weekly');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [executionPrice, setExecutionPrice] = useState('');
  const [fee, setFee] = useState('0');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function selectAsset(assetId) {
    const next = assets.find(item => item.id === assetId) ?? null;
    setAsset(next);
    setExecutionPrice(next?.price ? String(next.price) : '');
    if (!next) return;
    const lastDca = positions.find(position => position.asset_id === next.id
      && !position.is_simulation
      && position.tags?.some(tag => String(tag).startsWith('DCA|')));
    const config = lastDca?.tags?.find(tag => String(tag).startsWith('DCA|'))?.split('|');
    if (config?.length === 3 && FREQS.includes(config[1])) {
      setFrequency(config[1]);
      if (number(config[2])) setAmount(config[2]);
    }
  }

  const contribution = number(amount);
  const fill = number(executionPrice);
  const quantity = contribution && fill ? contribution / fill : null;
  const feeValue = Number(fee);
  const effectivePrice = quantity && Number.isFinite(feeValue) && feeValue >= 0
    ? (contribution + feeValue) / quantity
    : null;

  async function submit(event) {
    event.preventDefault();
    if (!asset || !contribution || !fill || !Number.isFinite(feeValue) || feeValue < 0) {
      setError(t('dca_invalid_values'));
      return;
    }
    if (!confirmed) {
      setError(t('dca_confirm_required'));
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onAdd({
        assetId: asset.id,
        assetName: asset.name,
        assetType: asset.type ?? 'crypto',
        quantity: quantity.toPrecision(12),
        entryPrice: effectivePrice.toPrecision(12),
        purchaseDate,
        isPaper: false,
        notes: `${t(`dca_frequency_${frequency}`)} · ${t('dca_purchase_date')}: ${purchaseDate} · ${t('dca_invested_amount')}: $${contribution.toFixed(2)} · ${t('dca_quote_at_entry')}: $${asset.price?.toFixed?.(6) ?? asset.price ?? '—'} · ${t('dca_execution_price')}: $${fill.toFixed(6)} · ${t('dca_fees')}: $${feeValue.toFixed(2)}`,
        tags: ['DCA', `DCA|${frequency}|${contribution}`],
        targetPrice: null,
      });
      onClose();
    } catch (err) {
      setError(err.message || t('error_fetch'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="dca-title">
        <div className="flex items-start justify-between gap-3 border-b border-slate-700/60 px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-300">{t('dca_modal_eyebrow')}</p>
            <h2 id="dca-title" className="mt-1 text-lg font-semibold text-white">{t('dca_modal_title')}</h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{t('dca_manual_note')}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label={t('close')}>×</button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          <label className="block text-xs font-medium text-slate-300">
            {t('dca_asset')}
            <select value={asset?.id ?? ''} onChange={event => selectAsset(event.target.value)} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:border-brand-400 focus:outline-none">
              <option value="">{t('dca_choose_asset')}</option>
              {assets.map(item => <option key={item.id} value={item.id}>{item.name} ({item.symbol})</option>)}
            </select>
          </label>

          {asset && (
            <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 px-3 py-2">
              <p className="text-xs text-slate-400">{t('dca_live_quote')}</p>
              <p className="mt-0.5 font-mono text-sm font-semibold text-white">{asset.price == null ? '—' : `$${Number(asset.price).toLocaleString(undefined, { maximumFractionDigits: 8 })}`}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-300">
              {t('dca_frequency')}
              <select value={frequency} onChange={event => setFrequency(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:border-brand-400 focus:outline-none">
                {FREQS.map(freq => <option key={freq} value={freq}>{t(`dca_frequency_${freq}`)}</option>)}
              </select>
            </label>
            <label className="block text-xs font-medium text-slate-300">
              {t('dca_amount')} (USD)
              <input type="number" min="0.01" step="any" required value={amount} onChange={event => setAmount(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-sm text-white focus:border-brand-400 focus:outline-none" />
            </label>
          </div>

          <label className="block text-xs font-medium text-slate-300">
            {t('dca_purchase_date')}
            <input type="date" max={new Date().toISOString().slice(0, 10)} required value={purchaseDate} onChange={event => setPurchaseDate(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm text-white focus:border-brand-400 focus:outline-none" />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-slate-300">
              {t('dca_execution_price')} (USD)
              <input type="number" min="0.00000001" step="any" required value={executionPrice} onChange={event => setExecutionPrice(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-sm text-white focus:border-brand-400 focus:outline-none" />
            </label>
            <label className="block text-xs font-medium text-slate-300">
              {t('dca_fees')} (USD)
              <input type="number" min="0" step="any" value={fee} onChange={event => setFee(event.target.value)} className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-sm text-white focus:border-brand-400 focus:outline-none" />
            </label>
          </div>
          <p className="text-[11px] leading-relaxed text-amber-300/90">{t('dca_quote_warning')}</p>

          <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-700/50 bg-slate-800/40 p-3 text-xs">
            <div><p className="text-slate-500">{t('dca_estimated_units')}</p><p className="mt-1 font-mono text-white">{quantity == null ? '—' : quantity.toLocaleString(undefined, { maximumSignificantDigits: 10 })}</p></div>
            <div><p className="text-slate-500">{t('dca_cost_basis_with_fees')}</p><p className="mt-1 font-mono text-white">{effectivePrice == null ? '—' : `$${effectivePrice.toLocaleString(undefined, { maximumFractionDigits: 8 })}`}</p></div>
          </div>

          <label className="flex items-start gap-2 text-xs leading-relaxed text-slate-300">
            <input type="checkbox" checked={confirmed} onChange={event => setConfirmed(event.target.checked)} className="mt-0.5 rounded border-slate-600 bg-slate-950" />
            <span>{t('dca_purchase_confirmation')}</span>
          </label>

          {error && <p className="rounded-lg border border-red-700/40 bg-red-950/30 px-3 py-2 text-xs text-red-300" role="alert">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="min-h-11 flex-1 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800">{t('cancel')}</button>
            <button type="submit" disabled={saving || !asset} className="min-h-11 flex-1 rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50">{saving ? t('loading') : t('dca_register_purchase')}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
