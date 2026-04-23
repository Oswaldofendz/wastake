import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase.js';

export function usePortfolios(user) {
  const [portfolios, setPortfolios] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [loading, setLoading]       = useState(false);

  const load = useCallback(async () => {
    if (!user) { setPortfolios([]); setSelected(null); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from('portfolios')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setPortfolios(data);
      setSelected(prev => {
        // Mantener selección si sigue existiendo, o tomar el primero
        if (prev && data.find(p => p.id === prev.id)) return prev;
        return data[0] ?? null;
      });
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // Auto-crear "Mi cartera" en el primer login
  useEffect(() => {
    if (!user || loading || portfolios.length > 0) return;
    (async () => {
      const { data, error } = await supabase
        .from('portfolios')
        .insert({ user_id: user.id, name: 'Mi cartera', color: '#c0c0c0' })
        .select()
        .single();
      if (!error && data) {
        setPortfolios([data]);
        setSelected(data);
      }
    })();
  }, [user, loading, portfolios.length]);

  async function createPortfolio(name) {
    const { data, error } = await supabase
      .from('portfolios')
      .insert({ user_id: user.id, name: name.trim(), color: '#c0c0c0' })
      .select()
      .single();
    if (error) throw error;
    await load();
    setSelected(data);
    return data;
  }

  async function renamePortfolio(id, name) {
    const { error } = await supabase
      .from('portfolios')
      .update({ name: name.trim() })
      .eq('id', id);
    if (error) throw error;
    await load();
  }

  async function deletePortfolio(id) {
    if (portfolios.length <= 1) throw new Error('No puedes eliminar la única cartera');
    const { error } = await supabase.from('portfolios').delete().eq('id', id);
    if (error) throw error;
    // Si se borró la seleccionada, cambiar a otra
    if (selected?.id === id) setSelected(portfolios.find(p => p.id !== id) ?? null);
    await load();
  }

  return {
    portfolios,
    selected,
    setSelected,
    loading,
    createPortfolio,
    renamePortfolio,
    deletePortfolio,
    refresh: load,
  };
}
