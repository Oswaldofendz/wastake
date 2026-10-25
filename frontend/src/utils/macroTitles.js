// A local glossary avoids spending translation quotas on recurring calendar labels.
// Tickers, institution acronyms, personal names and measurement suffixes stay intact.
const GLOSSARY = [
  ['Non-Manufacturing PMI', 'PMI no manufacturero', 'PMI não industrial'],
  ['Core PCE Price Index', 'Índice de precios PCE subyacente', 'Índice de preços PCE subjacente'],
  ['Core CPI', 'IPC subyacente', 'IPC subjacente'],
  ['Core PPI', 'IPP subyacente', 'IPP subjacente'],
  ['Core Durable Goods Orders', 'Pedidos de bienes duraderos sin transporte', 'Encomendas de bens duradouros sem transportes'],
  ['Main Refinancing Rate', 'Tipo principal de refinanciación', 'Taxa principal de refinanciamento'],
  ['Mortgage Approvals', 'Hipotecas aprobadas', 'Créditos à habitação aprovados'],
  ['Net Lending to Individuals', 'Crédito neto a particulares', 'Crédito líquido a particulares'],
  ['SPPI', 'Índice de precios de servicios al productor', 'Índice de preços dos serviços no produtor'],
  ['Federal Funds Rate', 'Tipo de los fondos federales', 'Taxa dos fundos federais'],
  ['FOMC Statement', 'Comunicado del FOMC', 'Comunicado do FOMC'],
  ['Press Conference', 'Rueda de prensa', 'Conferência de imprensa'],
  ['Monetary Policy Report', 'Informe de política monetaria', 'Relatório de política monetária'],
  ['Monetary Policy Statement', 'Comunicado de política monetaria', 'Comunicado de política monetária'],
  ['Rate Statement', 'Comunicado de tipos de interés', 'Comunicado de taxas de juro'],
  ['Official Cash Rate', 'Tipo de interés oficial', 'Taxa de juro oficial'],
  ['Overnight Rate', 'Tipo de interés a un día', 'Taxa de juro overnight'],
  ['Policy Rate', 'Tipo de política monetaria', 'Taxa de política monetária'],
  ['Outlook Report', 'Informe de perspectivas', 'Relatório de perspetivas'],
  ['Business Climate', 'Clima empresarial', 'Clima empresarial'],
  ['Realized Sales', 'Ventas registradas', 'Vendas realizadas'],
  ['Shop Price Index', 'Índice de precios en comercios', 'Índice de preços nas lojas'],
  ['Money Supply', 'Oferta monetaria', 'Oferta monetária'],
  ['Private Loans', 'Préstamos al sector privado', 'Empréstimos ao setor privado'],
  ['Weekly Employment Change', 'Variación semanal del empleo', 'Variação semanal do emprego'],
  ['Non-Farm Employment Change', 'Variación del empleo no agrícola', 'Variação do emprego não agrícola'],
  ['Employment Change', 'Variación del empleo', 'Variação do emprego'],
  ['Unemployment Rate', 'Tasa de desempleo', 'Taxa de desemprego'],
  ['Unemployment Change', 'Variación del desempleo', 'Variação do desemprego'],
  ['Unemployment Claims', 'Solicitudes de subsidio de desempleo', 'Pedidos de subsídio de desemprego'],
  ['Employment Cost Index', 'Índice del coste del empleo', 'Índice do custo do emprego'],
  ['Durable Goods Orders', 'Pedidos de bienes duraderos', 'Encomendas de bens duradouros'],
  ['Consumer Confidence', 'Confianza del consumidor', 'Confiança dos consumidores'],
  ['Consumer Climate', 'Clima del consumidor', 'Clima dos consumidores'],
  ['Business Confidence', 'Confianza empresarial', 'Confiança empresarial'],
  ['Economic Expectations', 'Expectativas económicas', 'Expectativas económicas'],
  ['New Home Sales', 'Ventas de viviendas nuevas', 'Vendas de casas novas'],
  ['Pending Home Sales', 'Ventas pendientes de viviendas', 'Vendas pendentes de casas'],
  ['Home Price Index', 'Índice de precios de la vivienda', 'Índice de preços da habitação'],
  ['Housing Starts', 'Inicio de construcción de viviendas', 'Inícios de construção de habitação'],
  ['Building Permits', 'Permisos de construcción', 'Licenças de construção'],
  ['Manufacturing Index', 'Índice manufacturero', 'Índice da indústria transformadora'],
  ['Manufacturing PMI', 'PMI manufacturero', 'PMI da indústria transformadora'],
  ['Services PMI', 'PMI de servicios', 'PMI dos serviços'],
  ['Weekly Statistical Bulletin', 'Boletín estadístico semanal', 'Boletim estatístico semanal'],
  ['Bond Auction', 'Subasta de bonos', 'Leilão de obrigações'],
  ['Annual Budget Release', 'Publicación del presupuesto anual', 'Publicação do orçamento anual'],
  ['Autumn Forecast Statement', 'Previsiones económicas de otoño', 'Previsões económicas de outono'],
  ['Goods Trade Balance', 'Balanza comercial de bienes', 'Balança comercial de bens'],
  ['Trade Balance', 'Balanza comercial', 'Balança comercial'],
  ['Wholesale Inventories', 'Inventarios mayoristas', 'Existências no comércio grossista'],
  ['Crude Oil Inventories', 'Inventarios de petróleo crudo', 'Existências de petróleo bruto'],
  ['Natural Gas Storage', 'Reservas de gas natural', 'Reservas de gás natural'],
  ['Leading Index', 'Índice de indicadores adelantados', 'Índice de indicadores avançados'],
  ['Industrial Production', 'Producción industrial', 'Produção industrial'],
  ['Retail Sales', 'Ventas minoristas', 'Vendas a retalho'],
  ['Private Sector Credit', 'Crédito al sector privado', 'Crédito ao setor privado'],
  ['Consumer Spending', 'Gasto de los consumidores', 'Despesa dos consumidores'],
  ['Import Prices', 'Precios de importación', 'Preços das importações'],
  ['Private Payrolls', 'Empleo del sector privado', 'Emprego no setor privado'],
  ['Economic Barometer', 'Barómetro económico', 'Barómetro económico'],
  ['GDP Price Index', 'Índice de precios del PIB', 'Índice de preços do PIB'],
  ['PCE Price Index', 'Índice de precios PCE', 'Índice de preços PCE'],
  ['Personal Income', 'Ingresos personales', 'Rendimento pessoal'],
  ['Personal Spending', 'Gasto personal', 'Despesa pessoal'],
  ['GDP', 'PIB', 'PIB'], ['CPI', 'IPC', 'IPC'], ['PPI', 'IPP', 'IPP'], ['HPI', 'Índice de precios de vivienda', 'Índice de preços da habitação'],
];
const QUALIFIERS = [
  ['Non-Manufacturing', 'No manufacturero', 'Não industrial'], ['Trimmed Mean', 'Media recortada', 'Média aparada'],
  ['Core', 'Subyacente', 'Subjacente'], ['Advance', 'Avance', 'Estimativa inicial'], ['Prelim', 'Preliminar', 'Preliminar'],
  ['Flash', 'Avance', 'Estimativa rápida'], ['German', 'Alemania ·', 'Alemanha ·'], ['French', 'Francia ·', 'França ·'],
  ['Spanish', 'España ·', 'Espanha ·'], ['Italian', 'Italia ·', 'Itália ·'],
  ['Monthly', 'Mensual', 'Mensal'], ['Tokyo', 'Tokio ·', 'Tóquio ·'],
];
const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function localizeMacroTitle(title, language) {
  const lang = language?.split('-')[0];
  if (lang !== 'es' && lang !== 'pt') return title;
  const column = lang === 'es' ? 1 : 2;
  if (/\bSpeaks$/.test(title)) {
    const speaker = title.replace(/ Speaks$/, '')
      .replace(/Assist Gov/g, lang === 'es' ? 'gobernador adjunto' : 'governador adjunto')
      .replace(/Gov Council Member|Gov Board Member/g, lang === 'es' ? 'miembro del consejo' : 'membro do conselho')
      .replace(/\bGov\b/g, lang === 'es' ? 'gobernador' : 'governador')
      .replace(/\bMember\b/g, lang === 'es' ? 'miembro' : 'membro');
    return `${lang === 'es' ? 'Intervención' : 'Intervenção'} · ${speaker}`;
  }
  const term = [...GLOSSARY].sort((a, b) => b[0].length - a[0].length)
    .find(([english]) => new RegExp(`\\b${escape(english)}\\b`, 'i').test(title));
  if (!term) return title;
  let result = title.replace(new RegExp(`\\b${escape(term[0])}\\b`, 'i'), term[column]);
  for (const qualifier of QUALIFIERS) result = result.replace(new RegExp(`\\b${escape(qualifier[0])}\\b`, 'g'), qualifier[column]);
  return result;
}
