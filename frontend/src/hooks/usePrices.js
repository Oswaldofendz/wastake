import { useState, useEffect, useCallback } from 'react';
import { fetchAllPrices } from '../services/api.js';

export function usePrices(intervalMs = 60_000) {
  const [data, setData]     = useState(null);   // { crypto, traditional }
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async () => {
    try {
      const result = await fetchAllPrices();
      setData(result);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, intervalMs);
    return () => clearInterval(id);
  }, [load, intervalMs]);

  // Lista plana de todos los activos ordenada por market cap
  const allAssets = data
    ? [
        ...Object.values(data.crypto),
        ...Object.values(data.traditional),
      ].sort((a, b) => (b.marketCap ?? 0) - (a.marketCap ?? 0))
    : [];

  return { data, allAssets, loading, error, lastUpdated, refresh: load };
}
