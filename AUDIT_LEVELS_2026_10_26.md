# Auditoría de niveles, coherencia y redundancias

Fecha: 26 de octubre de 2026. Alcance: Panel, Explorar, Panorama, Fundamentales, Mercados y navegación de acceso a Cartera/Alertas. No se crearon operaciones, posiciones, cuentas ni alertas.

## Resultado principal

Había defectos reproducibles en la selección de niveles, el historial utilizado por los indicadores, la representación de instrumentos y la presentación de noticias y precios. La revisión corrige esos defectos; no certifica que cada zona técnica vaya a funcionar ni que la web esté libre de todo fallo.

## Hallazgos y acciones completadas

| Prioridad | Evidencia / reproducción | Corrección | Impacto y esfuerzo |
|---|---|---|---|
| P1 | Un soporte o resistencia antiguo podía seguir seleccionado después de un cierre que lo había roto. Bastaba volver a estar al mismo lado del precio. | Se retiran los giros rotos. Recuperar el precio no basta: hace falta un nuevo giro confirmado. Pruebas de ruptura, recuperación, mecha y cambio de función. | Evita presentar niveles invalidados como vigentes. Esfuerzo medio. |
| P1 | El algoritmo promediaba precios de distintos giros y dibujaba una línea a través de toda la historia, incluso antes de su confirmación. Los máximos iguales desaparecían por comparaciones estrictas. | Zona con rango orientativo, línea en un extremo observado, inicio en la última confirmación, máximo dos zonas. Las mesetas cuentan una vez y los giros cercanos no se encadenan indefinidamente. | Menos falsa precisión y menos ruido visual. Esfuerzo medio. |
| P1 | La vela aún abierta podía completar las cinco velas necesarias para confirmar un giro. | Los pivotes requieren cinco velas diarias cerradas a cada lado. La vela actual solo sitúa el precio; no confirma el giro. | Reduce señales que desaparecen al terminar la sesión. Esfuerzo medio. |
| P1 | Panel cambiaba el historial técnico con el botón del período, mientras Explorar/Panorama utilizaban otro. El gráfico calculaba EMA con hasta un año y el índice podía usar 90 barras. El respaldo cripto de CoinGecko podía entregar barras intradiarias al índice y agregadas a diario al gráfico. | Horizonte común solicitado de 365 días; el período es zoom. El análisis narrativo utiliza el mismo horizonte. Se agregan OHLC reales del respaldo a diario antes de calcular indicadores. Si el proveedor da menos historia, no se rellena. | Hace comparables las lecturas del mismo activo y fuente. Esfuerzo medio. |
| P1 | `GC=F`/`SI=F` se asociaban a oro/plata al contado en el gráfico externo; petróleo/gas también tenían referencias distintas. Se observó que `COMEX:GC1!` no está permitido dentro del widget gratuito. | Correspondencias de futuros corregidas; en futuros se mantiene la vista propia y se ofrece un enlace externo al contrato continuo. Se identifican los futuros y la diferencia entre proveedores. FTSE deja de apuntar al proveedor de CFD del mapa antiguo. | Evita sustituir silenciosamente un instrumento por otro. Sin contratar datos de pago. Esfuerzo medio. |
| P1 | El Panel público mostraba «No se pudieron cargar las noticias» cuando tardaba su clasificación. Además, palabras como “crash” podían sobrescribir un impacto ya analizado; la ausencia de tono podía presentarse como neutral. | Titulares y fuentes primero; clasificación después. El fallo de análisis no elimina los titulares. Se usa la misma evaluación que Panorama, se identifica lo no evaluado y se ocultan grupos vacíos. Hay reintento si falla la carga de fuentes. | Conserva información útil y evita contradicciones entre vistas. Esfuerzo medio. |
| P2 | Al seleccionar un activo del catálogo, el Panel retenía el objeto de precio anterior aunque el catálogo se actualizara. App y páginas consultaban precios por separado. | La selección toma la cotización más reciente del catálogo, respetando clase e identidad. Una sola consulta de precios alimenta cabecera, Panel y Explorar. | Evita precios congelados y peticiones redundantes. Esfuerzo bajo. |
| P2 | En listas había «$» para divisas con otras monedas y para volumen negociado de acciones/contratos. Algunos precios muy pequeños se redondeaban a cero y los pares de divisas perdían decimales útiles. | Moneda de la fuente, volumen como unidades cuando corresponde, precisión adaptada para precios pequeños y hasta cinco decimales en divisas. | Evita confundir unidades, monedas y redondeos con variaciones reales. Esfuerzo bajo. |
| P2 | Tras filtrar Explorar, sus contadores seguían siendo del catálogo completo; un dato ausente podía entrar en “cambios moderados” como cero. | Estadísticas de resultados filtrados; media solo con variaciones conocidas, ausencia distinta de cero y recuento explícito de cobertura. | Los números describen lo que se está viendo. Esfuerzo bajo. |
| P2 | Resumen del activo, cuentas completas e índice técnico repetían los mismos números en varios bloques consecutivos. Los grupos de noticias vacíos añadían cajas sin información. | Se mantiene «En un vistazo»; cuentas completas y desglose técnico quedan desplegables en Explorar. Se omiten estadísticas generales cuando hay una ficha abierta y grupos de noticias vacíos. | Menos longitud y repetición sin eliminar fórmulas, fuentes o explicaciones. Esfuerzo bajo. |
| P2 | Identidades duplicadas de componentes podían conservar contenido del activo anterior. Los mensajes de error y títulos del historial técnico tenían textos fijos en español. | Identidades separadas por función/activo/clase, limpieza al cambiar selección, cancelación de trabajo anterior del widget y nuevos textos ES/EN/PT. | Evita mezclas al navegar deprisa y mejora la consistencia de idioma. Esfuerzo bajo. |

| P1 | La caché del navegador reutilizaba archivos de desarrollo sin versión; el servidor entregaba código nuevo pero la página seguía ejecutando módulos anteriores. | La versión v6 excluye archivos de desarrollo, consulta primero la red para recursos sin versión y reserva caché primero para paquetes con huella. El HTML sin conexión solo se entrega en navegación. Registro del trabajador únicamente en producción. | Evita comprobar o mostrar versiones mezcladas. Cinco pruebas específicas de caché. Esfuerzo medio. |

## Regla auditable de zonas

Se usan hasta las últimas 120 velas diarias **cerradas**. Un giro necesita cinco velas a cada lado; máximos/mínimos iguales se asignan al último punto de la meseta. Se agrupa respecto a un ancla fija con tolerancia `max(0,35 × ATR reciente, 0,1% del cierre)`. Se exige repetición independiente o prominencia por ambos lados de al menos dos ATR locales.

Un cierre posterior que exceda el nivel por `max(0,25 × ATR reciente, 0,05% del cierre)` invalida ese giro. Los giros ya rotos no vuelven por una mera recuperación del precio. Se selecciona una zona vigente de cada lado, dentro del menor límite entre ocho ATR y un 20% del cierre. La línea representa un extremo observado; el intervalo añade una banda orientativa, no una medida de confianza estadística. El ATR reciente puede cambiar la agrupación al cambiar la volatilidad.

El método es una heurística propia y conservadora, no un estándar universal, un modelo de predicción ni un resultado de backtesting. Puede devolver una sola zona o ninguna; eso no se rellena con niveles inventados. Cambiar el zoom no modifica la base diaria de los niveles.

## Contraste con datos públicos

Se guardó una muestra de las mismas velas de Bitcoin, Apple, Intel, EUR/USD y futuros de oro para comparar el cálculo anterior con el nuevo. En esa muestra, resistencias anteriormente elegidas para Apple e Intel no superaron las nuevas reglas; no se fabricó una resistencia sustituta. Se contrastaron también rangos, confirmaciones y lado del último cierre.

La muestra es una fotografía fechada y no precios en vivo. No constituye una prueba de rentabilidad. En ejecución, las fuentes gratuitas y las cachés pueden producir retrasos: el histórico tiene una caché de una hora y las cotizaciones se actualizan por otra vía. La pantalla identifica este hecho.

## Validación

- 45 pruebas automáticas: incluye las anteriores y casos nuevos de ruptura, recuperación, cambio de función, mesetas, vela abierta, ausencia de anticipación de velas futuras, normalización diaria, precisión monetaria, alcance de filtros, cotización seleccionada y clasificación de noticias.
- Compilación de producción del frontend. Persiste un aviso de tamaño del paquete; no impide compilar y se deja como tarea de rendimiento.
- Navegación pública por todas las secciones citadas, sin desbordamiento horizontal en la revisión de escritorio. El regreso desde Cartera/Alertas se comprobó sin registrar datos.
- Comparación del índice del Panel al cambiar 3M → 1S: mantiene la misma lectura mientras cambia la vista del gráfico.
- Prueba real del widget de oro: contrato correcto pero no disponible embebido gratis. Por ello se usa el gráfico propio, con enlace externo y aviso de instrumento.
- Explorar filtrado a divisas: cinco resultados y cinco variaciones usadas por sus estadísticas, en lugar de 81. JPY, BRL y MXN conservan su moneda.
- Vista móvil de 375 píxeles: gráfico propio de oro y controles visibles, sin desbordamiento horizontal. Consola de la sesión nueva sin errores durante la comprobación.
- El historial insuficiente o la clasificación no disponible permanecen explícitos; no se convierten en una señal neutral.

## Próxima ruta, por prioridad

1. **P1 — Trazabilidad de cada fotografía de datos.** Añadir fecha de consulta del histórico a la API y versiones de cálculo visibles; separar hora del último negocio, hora de descarga y caché. Impacto alto; esfuerzo medio. Actualmente se muestra la fecha de la vela y el límite de la caché, pero no una auditoría completa de cada descarga.
2. **P2 — Contexto de activo entre pestañas.** Compartir la selección entre Panel, Explorar y Panorama, distinguiendo los períodos de gráficos, comparación y noticias. Impacto alto; esfuerzo medio. Hoy cada sección conserva su selección y su encabezado; un activo distinto no es una contradicción numérica.
3. **P2 — Cobertura de fuentes gratuitas.** Mostrar cobertura por fuente/activo y ampliar fuentes originales de calendario y noticias cuando no haya dato real, consenso o texto completo. Impacto alto; esfuerzo alto. No reemplazar ausencias por estimaciones presentadas como hechos ni prometer disponibilidad permanente de IA gratuita.
4. **P2 — Rendimiento.** Separar los paquetes de gráficos y páginas bajo demanda, medir carga móvil y pausar consultas de pestañas inactivas. Impacto medio; esfuerzo medio. El aviso de tamaño procede de la compilación; no se han inventado métricas de rendimiento de usuarios.
5. **P3 — Pruebas persistentes de cuenta.** Validar importaciones, DCA, alertas y cambios de divisa con una cuenta de pruebas y datos de prueba identificados. Impacto medio; esfuerzo medio. Esta auditoría no ejecutó operaciones sobre una cartera real ni certifica esos flujos de extremo a extremo.

## Referencias verificadas

- [CME: soporte, resistencia y zonas](https://www.cmegroup.com/education/courses/technical-analysis/support-and-resistance)
- [Fidelity: rupturas y cambio de función](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/support-and-resistance?print=true)
- [TradingView: gráfico avanzado y configuración](https://www.tradingview.com/widget-docs/widgets/charts/advanced-chart/)
- [TradingView: contratos continuos de oro](https://www.tradingview.com/symbols/COMEX-GC1%21/contracts/)
- [TradingView: ajustes de futuros y dividendos](https://www.tradingview.com/support/solutions/43000748166-how-to-configure-your-supercharts/)
- [TradingView: FTSE 100](https://www.tradingview.com/symbols/FTSE-UKX/)

Se utilizan como referencias de metodología e identidad de instrumentos, no se copia su diseño ni se usan sus señales como valoración propia de WaStake. No se añadieron suscripciones, nuevas claves ni servicios de pago.
