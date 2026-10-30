# Auditoría cuantitativa de WaStake — 30 de octubre de 2026

## Dictamen

WaStake tiene una base de indicadores habituales y un DCF con una estructura matemática apropiada, pero había errores de precisión, coherencia entre resúmenes, monedas, periodos y tratamiento de ausencias que podían cambiar la interpretación. Se corrigieron los casos reproducibles y se añadieron pruebas de regresión. Una puntuación calculada correctamente no demuestra capacidad predictiva: los pesos técnicos, el filtro de oportunidades y la ponderación de noticias siguen siendo modelos propios pendientes de validación histórica.

La revisión abarcó precios y velas, indicadores del servidor y gráficos, señales compuestas, valoración empresarial, métricas cripto, noticias, calendario, correlaciones, cartera, DCA y selección de oportunidades. Se hizo un inventario de 56 módulos de servicios/utilidades, con lectura dirigida de las fórmulas y sus consumidores; no es una certificación independiente de todos los datos de cada proveedor. No se consultaron credenciales ni carteras privadas. Los casos de cartera son sintéticos y las muestras de precios son públicas.

## 1. Evidencia de los errores corregidos

| Prioridad | Problema comprobado | Corrección |
|---|---|---|
| Crítica | Se redondeaban precio, EMA, MACD y ATR a cuatro decimales antes de elaborar la señal. Una cripto pequeña podía convertirse en cero. | Precisión significativa en los cálculos y decimales adaptativos en indicadores/gráficos. |
| Alta | El resumen antiguo y el índice 0–10 aplicaban modelos diferentes: una misma serie podía ser alcista y mostrar «venta». | El resumen antiguo deriva ahora del mismo índice; no calcula otra señal incompatible. |
| Alta | Una serie completamente plana producía una lectura alcista y bandas de ancho cero podían interpretarse como señal. | RSI plano = 50; banda sin anchura no vota; ADX indefinido queda ausente. Resultado plano: 5/10. |
| Alta | P/FCF podía mezclar capitalización en USD con flujo de caja en EUR; algunos márgenes mezclaban periodos. | Compatibilidad de moneda y periodo antes de dividir. Si falta compatibilidad, se muestra ausencia. |
| Alta | GBX/GBp y ZAc podían compararse con beneficios por acción expresados en GBP/ZAR sin convertir la subunidad. | Normalización por 100 para PER y comparación del escenario DCF. |
| Alta | Ingreso actual ausente podía aparecer como caída de ventas del 100%. | Crecimiento solo con valores presentes y ejercicios anuales comparables. Un cero real sigue siendo una caída del 100%. |
| Alta | Coste de una posición ausente podía tratarse como cero y crear beneficios ficticios. | Coste, beneficio y rentabilidad quedan pendientes cuando falta coste; se informa al usuario. |
| Alta | Series actuales o casi constantes podían contaminar la matriz de correlaciones; la gráfica «90 días» podía incluir un año. | Solo fechas UTC cerradas de la ventana real; Pearson estable ante variaciones pequeñas; sin muestra/varianza suficiente no hay cifra. |
| Alta | Un dato de IA nulo, vacío o booleano podía convertirse numéricamente en cero y parecer una evaluación neutral. | Validación de tipo y rango antes de aceptar dirección, factores y confianza. Desconocido no equivale a neutral. |
| Media | Volumen negativo o suministro circulante superior al total/máximo podían producir ratios cripto aparentemente válidos. | Rechazo de datos incompatibles, aviso de calidad y exclusión del filtro de oportunidades. |
| Media | El volumen relativo podía calcularse con observaciones antiguas saltando huecos. | Exige las veinte velas anteriores consecutivas con volumen válido; no incluye la vela actual en su media. |
| Media | Alertas técnicas y el resumen favorable de una empresa podían usar observaciones demasiado antiguas. | Controles de fecha para alertas y estados anuales utilizados en el resumen. |
| Media | El parser macro podía leer «5,2%» como 52%; se podían comparar porcentajes con cantidades. | Sintaxis del proveedor y compatibilidad de unidades; los datos incompatibles no generan flechas. |
| Media | DCF con precio infinito/desbordamiento podía devolver un potencial del −100% o infinitos. | Precio no utilizable no genera comparación; resultados no finitos se rechazan. |
| Media | Un identificador igual en clases distintas podía agrupar posiciones diferentes. | La agrupación de cartera usa clase e identificador conjuntamente. |
| Media | La planificación DCA no distinguía correctamente frecuencias no mensuales/semanales. | Frecuencias semanal, quincenal y mensual explícitas, con límites válidos; sigue siendo una aproximación anualizada de aportaciones. |

**Comprobación con el mismo historial:** en la muestra pública de SHIB, el servidor anterior devolvió precio de cierre 0 y nota 5,8/10; al recalcular las mismas velas cerradas, el precio fue aproximadamente 0,000005 USD y la nota 3,6/10. La última vela coincide: la diferencia procede del cálculo, no de un movimiento de mercado. NVDA y EURUSD conservaron sus notas 1,7 y 2,4 en las muestras contrastadas. Estos son resultados puntuales de la consulta, no valores actuales garantizados.

Las reproducciones y resultados están en antes.json, despues.json y muestras-publicas.json, junto al informe entregado.

## 2. Indicadores: qué está bien y qué conservar

| Indicador | Implementación revisada | Interpretación correcta |
|---|---|---|
| RSI 14 | Ganancias/pérdidas suavizadas con Wilder; escala 0–100. | Momentum. Sobrecompra/sobreventa no son órdenes automáticas. |
| MACD 12/26/9 | Diferencia de EMA rápida/lenta, señal EMA y su histograma. | Histograma y línea MACD son magnitudes distintas; se conservan separadas. |
| EMA 20/50 | Suavizado exponencial y comparación con el cierre. | Tendencia retrasada; no valor intrínseco. |
| Bollinger 20, 2σ | Media y desviación poblacional de cierres. | Posición y dispersión; tocar una banda no demuestra giro. |
| ATR 14 | Rango verdadero con suavizado Wilder. | Volatilidad en unidades del precio; ATR/precio permite expresar porcentaje. No dirección. |
| ADX/DMI 14 | Fuerza suavizada y comparación +DI/−DI. | ADX mide fuerza; la dirección procede de los DI. |
| Volumen relativo 20 | Volumen actual dividido entre media de veinte velas previas. | Participación relativa a esa fuente; no prueba compras netas ni liquidez ejecutable. |

Se revisaron también RSI y bandas del gráfico, estocástico, OBV, VWAP por sesión UTC, CCI, MFI, Williams %R, ROC, CMF, Donchian y Keltner. Son herramientas complementarias: no hace falta ponerlas todas en el resumen. Las zonas FVG/«liquidez» obtenidas de OHLC son aproximaciones del precio; no son un libro real de órdenes ni posiciones de otros operadores. El VWAP exige volumen válido y una definición explícita de sesión.

**Recomendación:** conservar los siete bloques principales y ofrecer los demás bajo demanda. Añadir osciladores correlacionados no aporta siete pruebas independientes. Como siguientes contextos serían más útiles una EMA de largo plazo, fortaleza relativa frente a un índice y volatilidad/drawdown calculados con ventanas y mercados coherentes.

TradingView combina 26 indicadores en grupos de medias y osciladores y publica las reglas de sus votos. Su nota no tiene por qué coincidir con WaStake. La lección útil es una metodología única y transparente, no copiar una cifra ni añadir 26 indicadores obligatorios. [Metodología oficial de Technical Ratings](https://www.tradingview.com/support/solutions/43000614331-technical-ratings/).

Fidelity explica que Bollinger requiere confirmación y contexto. Se debe evitar vender por tocar la banda superior o comprar por tocar la inferior como regla universal. [Guía oficial de Bollinger](https://www.fidelity.com/learning-center/trading-investing/technical-analysis/technical-indicator-guide/bollinger-bands).

## 3. Índice técnico propio: fórmula y límites

Los grupos tienen pesos tendencia 35%, momentum 35%, estructura 20% y fuerza direccional 10%. Dentro de cada grupo se promedian únicamente las observaciones disponibles.

- Tendencia: signo de EMA20−EMA50 y signo de cierre−EMA50.
- Momentum: RSI normalizado como (RSI−50)/50 y tanh(1000 × histograma MACD / cierre).
- Estructura: (cierre−media de Bollinger)/(banda superior−media), acotado a −1…1.
- Fuerza direccional: para ADX ≥20, (+DI−−DI)/100 multiplicado por min(ADX/25,1), acotado; ADX disponible inferior a 20 aporta cero.
- Cada dirección d se convierte en 5+5d. La nota final es la media de los grupos, ponderada por sus pesos disponibles.
- Compatibilidad antigua: score = 20 × (nota−5). Sesgo bajista ≤4; alcista ≥6; entre ambos, mixto.

La cobertura informa cuánto peso está disponible; no es confianza estadística. **Los pesos, la ganancia 1000 y los umbrales son decisiones heurísticas.** No hay evidencia suficiente para decir que 8/10 implica 80% de probabilidad, que predice rentabilidad o que detecta una acción barata. No se cambiaron arbitrariamente estos pesos durante una corrección matemática.

## 4. Valoración empresarial

Las identidades utilizadas son razonables cuando moneda, fechas y definiciones coinciden:

- Capitalización = precio × acciones; hay que distinguir acciones actuales de la media diluida usada en BPA.
- Deuda neta = deuda financiera − efectivo.
- EV empleado = capitalización + deuda + preferentes + minoritarios − efectivo. Se exige un puente completo; participaciones/activos no operativos necesitan un ajuste documentado, no una resta automática universal.
- Flujo libre descriptivo = flujo operativo − valor absoluto del Capex.
- PER = precio por acción / BPA positivo; P/S = capitalización / ingresos; P/FCF = capitalización / FCF positivo; EV/EBITDA requiere EBITDA positivo.
- Margen operativo = resultado operativo / ingresos; crecimiento anual = ingresos actuales / anteriores −1.

No se debe comparar el PER de un ejercicio anual con el PER TTM o futuro de otra web sin avisarlo. Un múltiplo menor puede reflejar deterioro, deuda, riesgo o distinta contabilidad. Finviz distingue sus campos y periodos; sirve como contraste de definiciones, no como umbral universal de compra. [Documentación de Finviz](https://elite.finviz.com/help/screener).

El DCF proyecta cinco FCFF, descuenta al WACC, calcula terminal FCFF5×(1+g)/(WACC−g), exige WACC>g y FCFF terminal positivo, y transforma EV en patrimonio ajustando caja, deuda, preferentes, minoritarios y otras reclamaciones/activos. Divide por acciones y aplica un margen de seguridad seleccionado por el usuario. Hay sensibilidad de WACC ±1 punto y g ±0,5 puntos.

**Distinción crucial:** CFO−Capex no es automáticamente FCFF. Bajo clasificaciones compatibles, FCFF añade intereses después de impuestos al CFO y resta inversión; FCFE añade endeudamiento neto. FCFF se descuenta al WACC; FCFE al coste de capital propio. El formulario mantiene FCFF explícitos, sin rellenarlos silenciosamente con CFO−Capex. [CFA Institute: Free Cash Flow Valuation](https://www.cfainstitute.org/insights/professional-learning/refresher-readings/2026/free-cash-flow-valuation).

El caso Boeing aportado por el usuario es útil como esquema, pero WACC 8,5–10,5%, múltiplo 14×, crecimiento perpetuo 2–2,5% o margen 20–30% no deben convertirse en constantes verificadas de BA. Backlog no equivale a efectivo futuro garantizado. Bancos/aseguradoras requieren otro modelo; REIT, compañías cíclicas y empresas con pérdidas necesitan normalización específica. Faltan comparables sectoriales, tratamiento exhaustivo de ADR y contraste automatizado con estados oficiales punto en el tiempo.

## 5. Cripto: valoración y calidad

Precio unitario bajo, caída desde máximo, FDV/capitalización o nota técnica alta no determinan valor intrínseco. Se mantienen separados precio, capitalización, volumen, suministro y exposición a dilución.

Hay diferencias incluso en publicaciones de proveedores: CoinGecko documenta FDV mediante suministro total en su explicación de OTV, mientras otros contextos utilizan máximo. WaStake conserva el FDV informado e identifica el fallback precio×máximo cuando lo usa; se añadió el aviso correspondiente. No se presupone comparabilidad perfecta entre ambas bases. [CoinGecko: OTV y definiciones de suministro](https://support.coingecko.com/articles/5050659658-introducing-coingecko-s-outstanding-token-value-otv-metric).

Volumen/capitalización no es profundidad de mercado, y FDV/capitalización no mide por sí solo los desbloqueos próximos. Para una valoración económica sólida harían falta derechos del token, ingresos/comisiones atribuibles, emisión, desbloqueos, concentración, seguridad y actividad verificable. Esos datos no existen completos para todo el catálogo. La web debe decir qué falta, sin fabricar una recomendación.

## 6. Noticias y tacómetros

El modelo propio emplea relevancia R = 25% severidad +25% vínculo +20% sorpresa +15% persistencia +15% evidencia. Para cada evento, el peso es:

w = (R/100)^3 × confianza × calidad de evidencia × vínculo de mercado × 2^(−edad en horas/12).

Los factores finales están normalizados a 0…1. La dirección d está en −1…1; tacómetro = 5×(1+Σwd/Σw). Sin eventos evaluables no hay nota. Se deduplican titulares/enlaces y se agrupan eventos identificados, conservando su representante mejor respaldado. Los límites de confianza/calidad son menores para extractos RSS que para artículo completo.

Con factores restantes iguales, diez noticias positivas de relevancia 20 tienen peso total 0,08; una negativa de relevancia 100 pesa 1. Si las direcciones son +1 y −1, la nota es aproximadamente 0,74/10. Cumple el objetivo de que una noticia importante pueda dominar muchas leves. Esto demuestra el comportamiento de la fórmula, no su precisión predictiva.

Persisten riesgos: cobertura parcial, identificación imperfecta del mismo evento, interpretación de IA y sensibilidad al exponente 3 y vida media de 12 horas. La confianza del modelo no es una probabilidad calibrada. Hace falta una muestra etiquetada por humanos y análisis de sensibilidad antes de atribuir precisión financiera al tacómetro. La investigación sobre sentimiento informativo respalda estudiar el problema, no estos pesos concretos. [RBA: metodología de sentimiento de noticias](https://www.rba.gov.au/publications/rdp/2020/2020-08/how-do-we-measure-news-sentiment.html).

La «reacción posterior» compara cierres de días UTC, no una ventana exacta de 24 horas desde la publicación. Se corrigió el texto. No demuestra causalidad ni incorpora dividendos, comisiones o conversión de divisa.

## 7. Precios, gráficos, cartera y calendario

Los retornos usan (precio final/precio inicial−1). Cripto 24h y acciones frente al cierre anterior son ventanas distintas; no deben presentarse como una clasificación homogénea de rendimiento. Los futuros continuos =F no equivalen al contado: se añadió la aclaración y no se calculan garantías, tamaño de contrato o coste de renovación a partir de esa serie.

Las velas en formación y las cerradas deben conservar su distinción. La agrupación UTC es conservadora pero no reemplaza calendarios oficiales por bolsa, festivos y medias sesiones. Los soportes/resistencias por pivotes y ATR son referencias históricas opcionales; necesitan validación independiente por horizonte, roturas y volatilidad. No se garantiza que coincidan con otro analista.

Pearson se calcula sobre retornos entre fechas compartidas, no sobre niveles de precio. Se exige muestra mínima y varianza. Compartir fecha no hace simultáneos los cierres de distintas bolsas. La correlación no explica por sí sola una noticia.

Cartera: valor = unidades×cotización compatible; beneficio = valor−coste; rentabilidad simple = beneficio/coste. Es correcto como resumen de costes y valor, pero no es TWR, IRR, rentabilidad anualizada ni resultado realizado. Se aclaró la etiqueta. Para medir desempeño con aportaciones, dividendos, ventas y comisiones hace falta un registro completo de flujos y valoraciones. [Morningstar: definición de TWR](https://admainnew.morningstar.com/WebHelp/glossary_definitions/accounts/TWR_%28Time_Weighted_Return%29.htm).

El DCA registra compras realizadas o simula aportaciones; no ejecuta órdenes del bróker. El estimador por frecuencia no promete un calendario exacto. Calendario macro: sin real/consenso compatibles no hay sorpresa cuantificada. Las flechas son relaciones condicionales, no pronósticos.

## 8. Oportunidades y tareas siguientes, por prioridad

El filtro actual es una selección técnica con controles de datos: nota ≥6, RSI 45–68, alineación de EMA, MACD positivo, extensión ≤3 ATR, límites de volatilidad y volumen relativo. Empresas y cripto añaden controles específicos. Se buscan candidatos en un conjunto acotado de 16 acciones, 12 criptos y 4 ETF; no es un ranking exhaustivo de todo el catálogo. Una muestra reducida no garantiza cinco candidatos válidos.

1. **Terminado: corregir errores demostrados y protegerlos con pruebas.** Precisión, señales, monedas, periodos, ausencias, suministro, Pearson, alertas y unidades macro.
2. **Alta: contrato de datos por activo/proveedor.** Añadir moneda de cotización, subunidad, mercado, sesión, tipo de volumen, ajuste por dividendos/splits, fecha económica y fecha de consulta. Impide comparar magnitudes distintas.
3. **Alta: validación histórica fuera de muestra.** Conservar datos disponibles en cada fecha, incluir costes/deslizamiento y evitar anticipación/sesgo de supervivencia. Comparar índice actual, EMA simple y referencia de mantener; medir estabilidad y drawdown por clase/horizonte. Sin esta etapa no declarar rentabilidad.
4. **Alta: valoración empresarial con datos oficiales y comparables.** Priorizar estados y periodos trazables, ADR, anual/TTM y sectores. Añadir sensibilidad/escenarios antes de automatizar «barato/caro».
5. **Alta: noticias calibradas.** Etiquetar relevancia/dirección por mercado; medir concordancia, duplicados y cobertura. Contrastar exponente 1/2/3 y vidas medias 6/12/24h, sin optimizar únicamente rentabilidad pasada.
6. **Media: métricas cripto especializadas.** Incorporar desbloqueos, emisión y economía del token solo con fuente verificable, manteniendo explícita la cobertura parcial.
7. **Media: desempeño de cartera.** Completar flujos y eventos corporativos antes de ofrecer TWR/IRR y comparación de retorno total.
8. **Media: pruebas de sesión y gráficos.** Casos de festivos, splits, huecos, proveedores alternativos, confirmaciones/roturas de pivotes y horarios. Mantener dibujos de niveles como opcionales.
9. **Media: ampliar candidatos con control de cuota.** Rotación documentada de universo, caché y cobertura visible; evitar cientos de consultas simultáneas o servicios de pago.
10. **Baja: optimización de descarga inicial.** El build pasa, pero avisa de un paquete principal grande. Conviene separar más secciones sin mezclar esa tarea con cambios financieros.

## 9. Validación entregada

165 pruebas automatizadas aprobadas, incluidas 22 nuevas de auditoría; compilación de producción correcta. Hay invariancia ante cambios de escala de precio, series planas, cálculo independiente de componentes, comparación manual del DCF, monedas/subunidades, datos faltantes, fechas, unidades y casos de suministro incoherente. Se contrastaron tres historiales públicos conservando la misma última vela.

Las pruebas aseguran los casos cubiertos y previenen regresiones; no certifican exactitud universal de cada proveedor ni predicen éxito de inversión. No se añadieron suscripciones, dependencias de pago ni credenciales.
