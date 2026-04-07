import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase.js';

export function useAlerts(user) {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('alerts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setAlerts(data ?? []);
    } catch (err) {
      setError(err.message ?? 'Error loading alerts');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      load();
    } else {
      setAlerts([]);
      setError(null);
      setLoading(false);
    }
  }, [user, load]);

  // ── Computed slices ──────────────────────────────────────────────────────────

  const active = alerts.filter(a => a.triggered_at == null && a.is_active === true);

  const triggered = alerts
    .filter(a => a.triggered_at != null)
    .sort((a, b) => new Date(b.triggered_at) - new Date(a.triggered_at));

  const unreadCount = alerts.filter(
    a => a.triggered_at != null && a.is_read === false
  ).length;

  // ── Mutations ────────────────────────────────────────────────────────────────

  const createAlert = useCallback(
    async ({ asset_id, asset_name, asset_type, alert_type, target_value }) => {
      if (!user) return;

      setError(null);
      try {
        const { error: insertError } = await supabase.from('alerts').insert({
          user_id: user.id,
          asset_id,
          asset_name,
          asset_type,
          alert_type,
          target_value: target_value != null ? Number(target_value) : null,
          is_active: true,
          is_read: false,
          triggered_at: null,
        });

        if (insertError) throw insertError;
        await load();
      } catch (err) {
        setError(err.message ?? 'Error creating alert');
        throw err;
      }
    },
    [user, load]
  );

  const deleteAlert = useCallback(
    async (id) => {
      if (!user) return;

      setError(null);
      try {
        const { error: deleteError } = await supabase
          .from('alerts')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;
        await load();
      } catch (err) {
        setError(err.message ?? 'Error deleting alert');
        throw err;
      }
    },
    [user, load]
  );

  const markRead = useCallback(
    async (id) => {
      if (!user) return;

      setError(null);
      try {
        const { error: updateError } = await supabase
          .from('alerts')
          .update({ is_read: true })
          .eq('id', id)
          .eq('user_id', user.id);

        if (updateError) throw updateError;
        await load();
      } catch (err) {
        setError(err.message ?? 'Error marking alert as read');
        throw err;
      }
    },
    [user, load]
  );

  const markAllRead = useCallback(async () => {
    if (!user) return;

    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('alerts')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .not('triggered_at', 'is', null)
        .eq('is_read', false);

      if (updateError) throw updateError;
      await load();
    } catch (err) {
      setError(err.message ?? 'Error marking all alerts as read');
      throw err;
    }
  }, [user, load]);

  // ── Guard: not logged in ─────────────────────────────────────────────────────

  if (!user) {
    return {
      alerts: [],
      active: [],
      triggered: [],
      unreadCount: 0,
      loading: false,
      error: null,
      createAlert: async () => {},
      deleteAlert: async () => {},
      markRead: async () => {},
      markAllRead: async () => {},
      refresh: async () => {},
    };
  }

  return {
    alerts,
    active,
    triggered,
    unreadCount,
    loading,
    error,
    createAlert,
    deleteAlert,
    markRead,
    markAllRead,
    refresh: load,
  };
}
