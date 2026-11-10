const rules = [
  ['greeting',/^(hola|hello|hi|hey|ola|bom dia|buenas|buenos dias)( alberto)?$/],
  ['help',/que puedes hacer|what can you do|o que podes fazer|como me puedes ayudar|how can you help/],
  ['futures',/\b(futuros?|futures?|perpetu[oa]s?|perpetuals?|apalancamiento|leverage|alavancagem|funding)\b/],
  ['orders',/\b(orden(?:es)? (?:de mercado|limitad[ao]s?)|(?:market|limit) orders?|ordens? (?:a mercado|limitadas?))\b/],
  ['rsi',/\brsi\b/],
  ['levels',/\b(soportes?|resistencias?|support|resistance|suportes?|zonas de entrada)\b/],
  ['trend',/\b(ema|ema20|ema50|media movil|medias moviles|moving averages?|media movel|medias moveis)\b/],
  ['atr',/\b(atr|volatilidad|volatility|volatilidade)\b/],
  ['portfolio',/\b(cartera|carteira|portfolio|seguimiento|tracking)\b/],
  ['volume',/\b(volumen|volume)\b/],
  ['news',/\b(noticias?|news|calendar|calendario|macro)\b/],
  ['alerts',/\b(alertas?|avisos?)\b/],
  ['charts',/\b(grafico ia|ai charts?|graficos ia|dibujar|draw|desenhar)\b/],
  ['asset',/donde veo un activo|como busco|where do i find|find an asset|onde encontro|como pesquiso|\bpanorama\b/]
];

export function helpTopic(text) {
  const plain=text.normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^a-z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
  return rules.find(([,rule])=>rule.test(plain))?.[0]??null;
}
