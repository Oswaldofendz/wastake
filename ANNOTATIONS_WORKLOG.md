# Anotaciones del 25 de octubre de 2026

## Cambios

1. Gráfico claro con velas diarias y EMA20/50 opcionales. Máximo un soporte y una resistencia: giros confirmados por cinco velas a cada lado; agrupación con tolerancia de 0,6 rangos verdaderos medios recientes (mínimo 0,1% del cierre). Se exige repetición o amplitud de dos rangos; se elige el nivel válido más cercano por lado. No se fabrican niveles cuando faltan giros. Vista avanzada TradingView disponible sin la colección invasiva de pivotes.
2. Fear & Greed identificado como contexto del mercado cripto. En otros activos se muestra su rango reciente, recorrido de cierres y fechas de la muestra; no se presenta como sentimiento o valoración fundamental.
3. Retiradas capitalizaciones constantes y pesos arbitrarios. Mapa por clase/sector, tamaño igual o capitalización disponible, datos accesibles en lista y rankings de valores en USD recibidos de Nasdaq/CoinGecko. En móvil se priorizan 18 activos para mantener etiquetas legibles. Se informa cobertura parcial y faltantes.
4. Búsqueda común con resultados locales, Yahoo Finance y CoinGecko. Identidad por símbolo/bolsa o CoinGecko ID, debounce, protección frente a respuestas antiguas, navegación con teclado y errores de fuente. Seleccionar abre un análisis fuera del catálogo tanto en Screener como Panorama/Dashboard. Buscar en el Screener abre los grupos coincidentes.
5. Fundamentales sin titulares: explicación y botón para ampliar a 30 días, sin prometer un archivo completo.
6. Cartera: guía inicial, planificador sin rendimientos, concentración agregada por activo, cobertura de cotizaciones y últimas compras. Sustituida la falsa evolución histórica que acumulaba valores actuales en fechas pasadas. Sin cotizaciones completas, valor y resultado total quedan pendientes; no se contabilizan como pérdidas. Retirado el tipo EUR fijo de respaldo.
7. Integridad de históricos: retiradas velas cripto sintéticas reconstruidas con cierres. Se usan OHLC reales de Yahoo Finance para símbolos conocidos o CoinGecko OHLC donde esté disponible. Se recupera volumen real de Yahoo; se corrige la variación diaria que antes comparaba contra el inicio de cinco días.

## Validación

- 14 pruebas automáticas: identidades externas, filtrado de capitalizaciones, agregación OHLC real, límite/confirmación de niveles, EMA insuficiente, cotizaciones ausentes y planificación de aportes, respaldo ante bloqueo de CoinGecko y regresiones anteriores de idioma/calendario.
- Compilación de producción. Verificación visual local en escritorio y 375 px: búsqueda ASML con bolsas distintas y gráfico/análisis, mapa/rankings sin desbordamiento, guía de cartera y aporte semanal de 100 USD durante 12 meses = 5200 USD. Pruebas de cartera sin insertar ni modificar datos de usuario.
- Comprobación puntual de API local: 5764 valores recibidos de Nasdaq, 50 criptoactivos de CoinGecko, 365 velas reales BTC-USD con volumen. Estas cantidades son de la consulta, no cobertura garantizada.

## Límites

- Fuentes públicas gratuitas sujetas a disponibilidad, bloqueo y cuotas. Caché de búsquedas 5 minutos, capitalizaciones 30 minutos. Fallos se identifican sin completar números inventados.
- Producción: CoinGecko puede rechazar el ranking de 50 activos desde Render. Se recurre a los precios/capitalizaciones del catálogo cripto (CoinGecko o CryptoCompare), con proveedor por fila y cobertura parcial explícita. No se presenta ese catálogo como el top mundial.
- El ranking incluye valores cotizados recibidos de Nasdaq y hasta 50 criptoactivos; no es un ranking mundial exhaustivo de empresas. Clases de acciones pueden aparecer por separado y no deben sumarse como empresas distintas.
- Los niveles son una regla histórica propia y auditable, no un modelo predictivo validado. Una zona puede romperse. No se pinta cada pivote ni se modifica el historial con velas ficticias.
- Los símbolos externos no garantizan histórico/noticias disponibles; se identifica la bolsa y se informa ausencia de cotización. No se añaden a una cartera ni se ejecutan órdenes al buscarlos.
- Cartera: cálculos antes de comisiones, impuestos y dividendos. El planificador solo suma aportaciones; no programa compras. El gráfico de compras no se presenta como rentabilidad histórica.
- Persiste el aviso de tamaño del paquete de JavaScript; separar pantallas y gráficos en cargas diferidas queda como mejora de rendimiento, sin bloquear estos cambios.

## Referencias

- https://www.tradingview.com/support/solutions/43000589195-pivot-points-high-low/ — confirmación de giros mediante barras a cada lado.
- https://tradingview.github.io/lightweight-charts/docs/4.2/ — gráficos y atribución.
- https://finviz.com/map — inspiración de exploración por tamaño/color, sin copiar su diseño.
- https://www.nasdaq.com/market-activity/stocks/screener — fuente pública de capitalización y valores cotizados.
- https://www.coingecko.com/en/api — búsqueda e información de criptoactivos.
- https://help.portfolio-performance.info/en/reference/view/reports/performance/dashboard/ — separar aportaciones, resultado, distribución y riesgo.

