const rows={
 nav_screener:['Panorama','Panorama','Panorama'],
 easy_nav_panorama:['Panorama','Panorama','Panorama'],
 screener_title:['Panorama','Panorama','Panorama'],
 screener_intro:['Busca un activo y reúne su análisis, gráfico, valoración y noticias en una sola ficha.','Find an asset and bring its analysis, chart, valuation and news into one workspace.','Procure um ativo e reúna a análise, o gráfico, a avaliação e as notícias numa só ficha.'],
 easy_read_title:['Panorama','Panorama','Panorama'],easy_explore_title:['Panorama','Panorama','Panorama'],
 uni_summary:['Resumen','Overview','Resumo'],uni_chart:['Gráfico','Chart','Gráfico'],uni_valuation:['Valoración','Valuation','Avaliação'],uni_news:['Noticias','News','Notícias'],
 uni_sections:['Secciones del activo','Asset sections','Secções do ativo'],
 uni_refresh:['Actualizar resumen','Refresh overview','Atualizar resumo'],
 uni_summary_help:['Una lectura técnica histórica para entender el movimiento. La valoración del negocio se consulta por separado.','A historical technical view to understand price movement. Business valuation is available separately.','Uma leitura técnica histórica para compreender o movimento. A avaliação do negócio está numa secção separada.'],
 uni_chart_help:['Explora el precio y añade indicadores o dibujos. La nota técnica del resumen utiliza velas diarias cerradas.','Explore prices and add indicators or drawings. The overview technical score uses completed daily candles.','Explore o preço e adicione indicadores ou desenhos. A nota técnica do resumo usa velas diárias fechadas.'],
 uni_valuation_help:['Contrasta el precio con datos del negocio o del proyecto. Una señal técnica favorable no demuestra que el activo esté barato.','Compare price with business or project data. A favorable technical signal does not prove an asset is undervalued.','Compare o preço com dados do negócio ou projeto. Um sinal técnico favorável não prova que o ativo esteja barato.'],
 uni_news_help:['Las noticias más importantes de este activo, con fuente y contexto cuando está disponible.','This asset’s most important news, with sources and context when available.','As notícias mais importantes deste ativo, com fontes e contexto quando disponíveis.'],
 uni_compare:['Comparar con una referencia','Compare with a benchmark','Comparar com uma referência'],
 uni_quote_missing:['Cotización pendiente; no se sustituye por cero.','Quote unavailable; never replaced with zero.','Cotação indisponível; nunca é substituída por zero.'],
 uni_ai_chart:['Abrir en Gráfico IA','Open in AI Chart','Abrir no Gráfico IA'],
 uni_time:['Tiempo del gráfico','Chart timeframe','Período do gráfico'],
};
export const unifiedPanoramaCopy=Object.fromEntries(['es','en','pt'].map((lang,index)=>[lang,Object.fromEntries(Object.entries(rows).map(([key,values])=>[key,values[index]]))]));
