import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase.js';

export function usePortfolio(user, allAssets = []) {
  const [positions, setPositions] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);

  // Mapa rápido id → asset con precio actual
  const priceMap = Object.fromEntries(allAssets.map(a => [a.id, a]));

  const load = useCallback(async () => {
    if (!user) { setPositions([]); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('portfolio')
      .select('*')
      .order('created_at', { ascending: false });
    if (err) setError(err.message);
    else setPositions(data ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Enriquecer posiciones con precios actuales y P&L
  const enriched = positions.map(pos => {
    const asset        = priceMap[pos.asset_id];
    const currentPrice = asset?.price ?? null;
    const currentValue = currentPrice != null ? pos.quantity * currentPrice : null;
    const costBasis    = pos.quantity * pos.entry_price;
    const pnlUsd       = currentValue != null ? currentValue - costBasis : null;
    const pnlPct       = costBasis > 0 && pnlUsd != null ? (pnlUsd / costBasis) * 100 : null;
    const change24h    = asset?.change24h ?? null;
    return { ...pos, currentPrice, currentValue, costBasis, pnlUsd, pnlPct, change24h };
  });

  const real  = enriched.filter(p => !p.is_simulation);
  const paper = enriched.filter(p =>  p.is_simulation);

  const totalValue = real.reduce((s, p) => s + (p.currentValue ?? 0), 0);
  const totalCost  = real.reduce((s, p) => s + p.costBasis, 0);
  const totalPnl   = totalValue - totalCost;
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  async function addPosition({ assetId, assetName, assetType, quantity, entryPrice, isPaper }) {
    const { error: err } = await supabase.from('portfolio').insert({
      user_id:     user.id,
      asset_id:    assetId,
      asset_name:  assetName,
      asset_type:  assetType,
      quantity:    parseFloat(quantity),
      entry_price: parseFloat(entryPrice),
      is_simulation:    isPaper,
    });
    if (err) throw err;
    await load();
  }

  async function removePosition(id) {
    const { error: err } = await supabase.from('portfolio').delete().eq('id', id);
    if (err) throw err;
    await load();
  }

  return {
    positions: enriched,
    real,
    paper,
    loading,
    error,
    addPosition,
    removePosition,
    refresh: load,
    totalValue,
    totalCost,
    totalPnl,
    totalPnlPct,
  };
}
