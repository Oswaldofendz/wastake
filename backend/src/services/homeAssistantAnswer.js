const tradingClaim = /\b(trading|trades?|operaciones?|ordens?|orden(?:es)?|orders?|broker|corretora|compras?|ventas?|vendas?|trade execution)\b/;
const locationClaim = /\b(wastake|platform|plataforma|app|section|seccion|secao)\b/;
const fallback = {
  es:'WaStake ofrece gráficos, análisis de mercado y alertas. Las órdenes se gestionan en el bróker o mercado donde operes.',
  en:'WaStake provides charts, market analysis and alerts. Orders are managed on the broker or exchange where you trade.',
  pt:'A WaStake oferece gráficos, análise de mercado e alertas. As ordens são geridas na corretora ou bolsa onde operas.'
};

export function reviewHomeAssistantReply(raw,lang) {
  if (typeof raw!=='string') return '';
  const reply=raw.trim().replace(/\*\*|[\x60]/g,'').slice(0,1800);
  const plain=reply.toLowerCase().normalize('NFD').replace(/\p{M}/gu,'');
  if (tradingClaim.test(plain) && locationClaim.test(plain)) return fallback[lang];
  return reply;
}
