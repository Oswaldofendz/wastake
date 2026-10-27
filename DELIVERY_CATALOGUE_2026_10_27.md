# Catálogo ampliado, análisis cripto y transacciones BTC

Fecha: 27 de octubre de 2026. Se conserva el alojamiento existente; no se añadieron suscripciones, claves ni proveedores de pago.

## Cobertura incorporada

| Clase | Instrumentos | Criterio |
|---|---:|---|
| Acciones | 204 | Fotografía de las 200 mayores empresas cotizadas de CompaniesMarketCap, más valores previos conservados. Incluye Asia, Europa, América y Oriente Medio; puede haber más de una clase de acciones de un emisor. |
| Cripto | 100 | Fotografía de CoinGecko ordenada por capitalización USD. Incluye stablecoins y activos envueltos si pertenecen al ranking; no implica recomendación. |
| ETF | 22 | Selección representativa, ampliada con instrumentos de iShares. |
| Renta fija mediante ETF | 12 | Vencimientos, inflación, crédito y mercados emergentes. No son bonos individuales. |
| Divisas | 12 | Pares representativos; cotización expresada en su moneda real. |
| Materias primas | 13 | Contratos de futuros; no se sustituyen por contado. |
| Índices | 13 | Referencias regionales; no son valores directamente negociables. |
| **Total** | **376** | El resto continúa accesible mediante búsqueda externa. |

La selección es una fotografía fechada en `backend/src/data/marketUniverse.json`, no un ranking mundial actualizado en cada visita. `scripts/build-universe.mjs` reconstruye la pertenencia desde las dos páginas públicas y los JSON descargados de CoinGecko/Nasdaq. Los sectores de 199 de las 200 empresas se contrastaron mediante coincidencia exacta del símbolo en Yahoo Finance; IHC permanece sin clasificar si la fuente no aporta datos. No hay precios, capitalizaciones ni rentabilidades fijos guardados en la fotografía de pertenencia.

## Cambios de comportamiento

1. **Cripto dentro y fuera del catálogo.** Ficha con descripción del proveedor, fuente y hora, capitalización, FDV, oferta, volumen, evolución temporal y enlaces al proyecto. FDV/capitalización y volumen/capitalización incluyen interpretación y límites. No se finge un valor intrínseco ni se convierte un precio unitario bajo en una oportunidad de compra.
2. **Identidad e histórico.** CoinGecko se prioriza para identificar las criptomonedas. Yahoo se usa para ampliar el histórico solo al encontrar el mismo nombre y tipo de instrumento; no basta un ticker parecido. HYPE tiene su símbolo desambiguado verificado. Se mantienen los límites de cobertura si no hay histórico suficiente.
3. **Explorar compacto.** Siete clases cerradas inicialmente, filtro de sector para empresas, filtros secundarios desplegables y 25 filas por bloque. La ficha abierta sustituye la lista y dispone de regreso al catálogo. Los activos sin precio siguen siendo consultables.
4. **Fuentes gratuitas.** Cotizaciones de acciones estadounidenses en lote; resto por lotes de seis, con carga progresiva y caché de quince minutos. Cripto con caché de cinco minutos y respaldo de CoinPaprika por identidad exacta. La ficha se consulta bajo demanda y conserva caché de treinta minutos. No se interpreta la ausencia como cero.
5. **BTC.** Se elimina el precio fijo de 85.000 USD. Una conversión sin fuente válida queda ausente; BTC permanece visible. Se distingue entre pendientes y confirmadas, se deduplican operaciones y se prioriza la confirmación si aparecen en ambas fuentes. La suma de salidas se explica: puede contener cambio y no es una medida de compra/venta o flujo neto de inversión. Las horas desconocidas no se inventan.
6. **Resumen.** La cotización no toma prestada la fecha de un cierre histórico distinto. ATR/precio conserva la base del análisis diario y las cantidades pequeñas no se redondean a cero en el resumen.

## Comprobaciones

- 55 pruebas automáticas correctas, incluidos catálogo sin precios inventados, identidad cripto, faltantes, sector, fórmulas y transacciones.
- Compilación de producción correcta. Sigue pendiente dividir el paquete grande de gráficos/páginas; no se afirma que haya desaparecido el aviso de tamaño.
- HYPE: ficha real y 364 velas diarias de Yahoo en la comprobación local.
- Hyperlane: búsqueda fuera del catálogo, ficha y análisis técnico de la fuente identificada.
- Fuente principal deliberadamente deshabilitada solo en un proceso local: CoinPaprika aportó 82 cotizaciones de las 100 identidades del catálogo. No se rellenaron las restantes.
- Catálogo local: 376 registros; 375 con cotización en la revisión. La cobertura puede variar por proveedor y momento.
- Vista móvil de 375 píxeles sin desbordamiento horizontal; ficha HYPE y traducción al inglés comprobadas, conservando el nombre del activo.
- Flujo de paginación 25 → 50 y filtro por sector comprobados. No se crearon cuentas, compras, posiciones ni alertas.

## Límites y siguiente mantenimiento

Actualizar la fotografía de pertenencia periódicamente mediante fuentes verificables. Mejorar trazabilidad de las descargas y automatizar la revisión de cambios de ticker, fusiones y exclusiones. Las fuentes gratuitas pueden limitar consultas, retrasar datos o no cubrir determinadas bolsas. No se garantiza cobertura financiera completa de cada empresa internacional ni auditoría económica de cada protocolo. Los ETF, bonos, índices y divisas no tienen un único ranking de “mejores” comparable al de capitalización de empresas.

## Fuentes

- [CompaniesMarketCap, selección mundial](https://companiesmarketcap.com/) y [segunda página](https://companiesmarketcap.com/page/2/).
- [CoinGecko, datos de mercado](https://docs.coingecko.com/reference/coins-markets) y [datos del proyecto](https://docs.coingecko.com/reference/coins-id).
- [CoinPaprika, ticker público](https://docs.coinpaprika.com/api-reference/tickers/get-ticker-for-a-specific-coin).
- [Directorio oficial de ETF iShares](https://www.ishares.com/us/products/etf-investments).
- [Mempool, documentación y transacciones](https://mempool.space/docs/api/rest).
- [Yahoo Finance](https://finance.yahoo.com/), símbolos, sectores y OHLC observados; no garantiza datos oficiales en tiempo real.
