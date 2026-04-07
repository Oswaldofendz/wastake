import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export function Disclaimer() {
  const { t } = useTranslation();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('disclaimer_dismissed') === '1'
  );

  if (dismissed) return null;

  return (
    <div className="mx-4 mt-3 px-4 py-2.5 bg-amber-950/60 border border-amber-700/40 rounded-lg flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
        </svg>
        <p className="text-xs text-amber-300/90">{t('disclaimer')}</p>
      </div>
      <button
        onClick={() => {
          localStorage.setItem('disclaimer_dismissed', '1');
          setDismissed(true);
        }}
        className="text-amber-500 hover:text-amber-300 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>
  );
}
