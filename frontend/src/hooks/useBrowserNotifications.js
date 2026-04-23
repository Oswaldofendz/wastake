import { useEffect, useRef } from 'react';

// Notificaciones nativas de navegador para alertas disparadas
export function useBrowserNotifications(triggered = []) {
  const notifiedIds = useRef(new Set());
  const permissionRequested = useRef(false);

  // Pedir permiso en cuanto haya alertas y aún no hayamos pedido
  useEffect(() => {
    if (triggered.length === 0) return;
    if (permissionRequested.current) return;
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') return;

    permissionRequested.current = true;
    Notification.requestPermission().catch(() => {});
  }, [triggered.length]);

  useEffect(() => {
    if (!('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;

    const now = Date.now();
    const FIVE_MIN = 5 * 60 * 1000;

    for (const alert of triggered) {
      const id = alert.id ?? `${alert.asset_id}-${alert.alert_type}`;
      if (notifiedIds.current.has(id)) continue;

      // Solo notificar alertas recientes (últimos 5 minutos)
      const triggeredAt = alert.triggered_at ? new Date(alert.triggered_at).getTime() : now;
      if (now - triggeredAt > FIVE_MIN) {
        notifiedIds.current.add(id); // marcar como visto aunque no notifiquemos
        continue;
      }

      notifiedIds.current.add(id);

      const title = `WaStake ⚡ ${alert.asset_id?.toUpperCase()}`;
      const body  = buildBody(alert);

      try {
        const n = new Notification(title, {
          body,
          icon: '/logo-icon.png',
          badge: '/logo-icon.png',
          tag: id,
          requireInteraction: false,
        });
        n.onclick = () => {
          window.focus();
          window.location.hash = 'alerts';
          n.close();
        };
        setTimeout(() => n.close(), 8000);
      } catch (e) {
        // Firefox en algunos contextos no permite Notification constructor
      }
    }
  }, [triggered]);
}

function buildBody(alert) {
  const asset = alert.asset_id?.toUpperCase() ?? 'Activo';
  const price = alert.current_price != null ? `$${Number(alert.current_price).toLocaleString()}` : '';
  switch (alert.alert_type) {
    case 'price_above': return `${asset} superó ${price} 🚀`;
    case 'price_below': return `${asset} cayó por debajo de ${price} 📉`;
    case 'change_up':   return `${asset} subió ${alert.threshold}% en 24h 📈`;
    case 'change_down': return `${asset} bajó ${alert.threshold}% en 24h 🔻`;
    default:            return `Alerta activada para ${asset}`;
  }
}
