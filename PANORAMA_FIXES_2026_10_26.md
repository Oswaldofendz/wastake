# Correcciones de Panorama — 26 de octubre de 2026

## Tareas terminadas

1. **Tono de noticias y relevancia separados.** El resumen cuenta los sentimientos positivos, negativos y neutrales de forma independiente de su relevancia. Noticias positivas de alto impacto ya no se convierten en negativas. Las clasificaciones ausentes y fallos de IA se marcan como no evaluados; no se cuentan como neutrales. Se informa la cobertura evaluada.
2. **Comparación de activos externos.** Se calcula la variación nominal entre las dos últimas fechas UTC compartidas con datos completos, excluyendo el día UTC en curso. No se consulta un catálogo cerrado ni se sustituye la falta de datos por 0%. Se muestran fechas, porcentajes y diferencia en puntos porcentuales. Un 0% real sigue siendo válido. No incluye dividendos, comisiones ni conversión monetaria; las bolsas pueden cerrar a horas diferentes.
3. **Traducciones completas de la vista.** Etiquetas, errores, estados de carga, explicación del método y comparación en español, inglés y portugués. Nombres, tickers y bolsa permanecen como identidades. Se respetan EUR y subunidades como GBp, sin asumir USD. Se muestran fuente, fecha del precio cuando existe y fecha de consulta por separado.
4. **Índice técnico compartido 0–10.** Panorama y Dashboard usan los mismos componentes visuales, pesos, umbrales y `summary.score10` de la API. Retirados el semáforo con instrucciones de operar y la escala de confluencia antigua. La explicación IA recibe también el índice 0–10, no la puntuación anterior; no se etiqueta con un proveedor fijo.

## Comprobaciones

- 20 pruebas automáticas: regresiones de noticias de alto/bajo impacto, tono ausente, periodos compartidos, cotizaciones desconocidas frente a cero real, monedas/subunidades, deduplicación de clasificación concurrente y pruebas anteriores de calendario/identidades/capitalización.
- Compilación de producción.
- Revisión visual local de ES/EN/PT, escritorio y 375 px, sin desbordamiento horizontal. Ajustado el índice para que «/ 10» no se divida en móvil.
- ASML.AS consultado fuera del catálogo: cotización EUR y comparación con SPY calculada sobre fechas comunes, sin retorno ficticio del 0%.
- Prueba local controlada con noticias demoradas 15 segundos: el índice técnico ya estaba visible mientras el bloque de noticias seguía pendiente.
- Cancelación e identificación de solicitudes al cambiar de activo/idioma; cada bloque carga por separado para evitar que noticias o IA oculten el análisis disponible.
- En producción se observó demora del clasificador gratuito. Se añadió una primera respuesta de titulares RSS sin tono evaluado, seguida del enriquecimiento opcional; un fallo conserva los titulares y enlaces originales. Las solicitudes concurrentes de clasificación del mismo activo comparten trabajo para ahorrar cuota.

## Límites

- Proveedores públicos sujetos a cuotas, demoras y bloqueos. No se añaden suscripciones ni APIs de pago.
- El tono y la explicación IA son estimaciones automáticas, no una comprobación independiente de noticias ni prueba de causalidad. Un filtro de idioma conservador puede ocultar una explicación válida; el índice queda disponible.
- Los titulares del desplegable de fuentes se conservan en su idioma original y se identifican como no traducidos. Las etiquetas y el resumen de tono sí se localizan; no se presenta una traducción inexistente como realizada.
- La comparación es de precios nominales en la moneda de cada instrumento, sin ajuste por dividendos o divisa y con cierres que pueden ocurrir a distintas horas. No es rentabilidad total comparable para un inversor en una moneda común.
- Los OHLC de Yahoo pueden incluir una vela en curso para el análisis técnico. La comparación excluye siempre el día UTC actual; el precio más reciente del histórico no se presenta como cierre definitivo.
- Persiste el aviso previo sobre el tamaño del paquete JavaScript. Dividir la carga por pantallas sigue siendo una mejora de rendimiento pendiente.
- Se retiraron del Panorama anterior el «mejor día» sin validación y el «rango objetivo» no validado. El ATR se muestra como rango histórico, sin prometer límites ni precios futuros.

Referencia de diseño funcional: https://www.tradingview.com/support/solutions/43000614331-technical-ratings/ — mantener una valoración coherente entre vistas. WaStake conserva su propia fórmula y no se presenta como una copia o equivalencia del indicador de TradingView.
