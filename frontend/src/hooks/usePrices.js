import { useState, useEffect, useCallback } from 'react';
import { fetchAllPrices } from '../services/api.js';

export function usePrices(intervalMs = 60_000) {
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isStale, setIsStale]         = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await fetchAllPrices();
      setData(result);
      setLastUpdated(new Date());
      setIsStale(result.isStale ?? false);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Normal polling interval
  useEffect(() => {
    load();
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs]);

  // Retry every 30s while data is stale (stops automatically once fresh data arrives)
  useEffect(() => {
    if (!isStale) return;
    const id = setTimeout(load, 30_000);
    return () => clearTimeout(id);
  }, [isStale, lastUpdated, load]);

  const allAssets = data
    ? [
        ...Object.values(data.crypto).filter(a => a?.id),
        ...Object.values(data.traditional).filter(a => a?.id),
      ].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    : [];

  return { data, allAssets, loading, error, lastUpdated, isStale, refresh: load };
}
