# Entrega: noticias, catálogo, niveles y tops — 27/10/2026

## Cambios

1. Explorar: «Noticias importantes» dentro de la ficha seleccionada. Hasta cinco noticias de los últimos 30 días, enlace original, medio, fecha y traducción protegida por identidad del activo. Se muestran primero los titulares, sin esperar a la IA. Después, los análisis contextuales disponibles ordenan por relevancia e incluyen resumen y mecanismo; los no evaluados conservan un aviso y se ordenan por fecha. No se presenta el puntaje de palabras clave como relevancia verificada. La cobertura RSS es limitada.
2. Catálogo dentro del mismo panel «Encuentra un activo», antes de la ficha. Las categorías siguen cerradas inicialmente. Buscar filtra el catálogo y consulta fuentes externas; una selección externa no se hace pasar por miembro del catálogo. El catálogo sigue accesible cuando una ficha está abierta.
3. Panel: cuatro cuadros seleccionables con capitalización cripto, capitalización de empresas en USD, mayores subidas de empresas/cripto y mayores subidas cripto. Se reutilizan las cotizaciones ya cargadas: sin otra descarga masiva ni servicio de pago. Cobertura, fuentes y retrasos explícitos. No se anuncia un ranking mundial; no se mezclan capitalizaciones en monedas distintas ni variaciones de índices de rendimientos.
4. Gráfico: filtro de giros de 2 y 5 sesiones cerradas a cada lado, conservando los filtros de rupturas, proximidad y amplitud. Se mantienen como máximo dos zonas. Cada una muestra centro y límites; la línea ya no representa el extremo de un grupo como si fuera un precio exacto. Los dibujos comienzan en la fecha de confirmación. La vela de hoy no confirma giros. Último cierre y fuente del gráfico explícitos para explicar diferencias con otra cotización.

## Investigación y evidencia

- CME explica distintos métodos de soporte/resistencia, la importancia de máximos y mínimos previos y que son zonas, no precios exactos: https://www.cmegroup.com/education/courses/technical-analysis/support-and-resistance
- La fórmula implementada es una heurística propia, no una fórmula de CME ni una estrategia con rendimiento demostrado. El método y todos sus umbrales están desplegados en «Niveles clave · Método».
- NVDA: muestra pública de Yahoo Finance vía `/api/prices/ohlcv/NVDA?type=stock&range=1y`, conservada en `backend/test/fixtures/nvda-levels-2026-10-27.json`. Con corte al 27/10, el filtro anterior seleccionaba 243,37 USD de resistencia. El nuevo detecta el giro de 222,19 USD, confirmado el 23/10. El soporte agrupado queda en 206,17–210,01 USD, centro 208,09: no se inventa un mínimo reciente aún no confirmado. Los valores pertenecen a esta muestra, no son cotizaciones actuales ni objetivos.
- Revisión adicional con históricos públicos BTC, EUR/USD y futuro de oro GC=F. EUR/USD no produce resistencia elegible; se deja ausente. Son instrumentos y monedas identificados, sin sustituir el futuro por oro al contado.

## Validación

- 59 pruebas pasan: regresión con velas NVDA, confirmación sin anticipar datos, retiro de niveles rotos, aislamiento de monedas y tipos en rankings, ausencia de datos, orden y deduplicación de noticias.
- Compilación de producción correcta. Permanece el aviso preexistente sobre tamaño del paquete principal; optimizar la carga por sección es trabajo separado.
- Navegador: cuatro tops con datos públicos y selección de AAPL; búsqueda/catálogo integrados; noticias de BTC traducidas y análisis contextual disponible con enlaces. Móvil de 375 px: tops en dos columnas y noticias legibles, sin desbordamiento horizontal observado.
- Esta entrega cambia el frontend y sus pruebas. No requiere desplegar el backend ni modificar Render, claves, planes, cartera o datos privados.

## Límites

Un soporte/resistencia puede fallar; dos sesiones de confirmación reaccionan antes y también pueden producir más ruido que cinco. No se afirma precisión predictiva ni se elimina la posibilidad de falsos giros. Los tops abarcan solo el catálogo y la cobertura de datos disponibles. El análisis de noticias depende del texto accesible y de las cuotas gratuitas existentes; si falta, los titulares siguen visibles sin simular un análisis.
