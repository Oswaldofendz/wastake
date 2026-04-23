import { useState, useEffect, useCallback } from 'react';

const DISMISS_KEY = 'wa_pwa_dismissed';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(DISMISS_KEY)
  );
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Detectar si ya está instalada (modo standalone)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setInstalled(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const dismiss = useCallback(() => {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
    setDeferredPrompt(null);
  }, []);

  const canInstall = !!deferredPrompt && !dismissed && !installed;

  return { canInstall, install, dismiss, installed };
}
