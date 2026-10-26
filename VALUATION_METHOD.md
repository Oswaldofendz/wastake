# Ficha de valoración en Explorar

Fecha de implementación: 26 de octubre de 2026. Datos consultados dinámicamente; este documento no contiene precios objetivo.

## Uso

En Explorar, busca una empresa por nombre o símbolo y selecciona el resultado correspondiente a su bolsa y clase. También puedes abrir una fila del catálogo. La ficha aparece antes del gráfico y el análisis técnico.

La primera parte explica el negocio, muestra las cuentas y ofrece una lectura basada en sus signos: pérdidas, beneficio acompañado de caja libre negativa, beneficio y caja positiva, o información insuficiente. Ninguno de esos estados afirma por sí solo que una acción sea barata.

La segunda parte permite construir un escenario DCF. No contiene hipótesis prefijadas. Las cifras introducidas son locales a la ficha, no se guardan en la cartera ni se envían a un bróker. Cambiar de activo reinicia el escenario.

## Correcciones a la propuesta de Boeing

1. El precio unitario y el volumen negociado no determinan valor intrínseco. Ventas son ingresos del negocio; volumen negociado es actividad bursátil.
2. Capitalización básica = precio × acciones comunes actuales en circulación. El promedio diluido utilizado para EPS no es ese mismo número.
3. EV básico = capitalización + deuda + preferentes + minoritarios − caja. Ajustar inversiones o asociadas exige coherencia con el perímetro de los flujos operativos, evitando doble cómputo. En el escenario se agregan los activos no operativos al pasar de EV a capital ordinario.
4. CFO − capex es una medida publicada de caja libre, no automáticamente FCFF. FCFF se descuenta al WACC; FCFE al coste del capital propio. No mezclar flujos después del servicio de deuda con una tasa para toda la empresa.
5. DCF no es una verdad observada: puede dominarlo el valor terminal. Se muestra su peso y sensibilidad a tasas.
6. WACC 8,5–10,5%, g 2–2,5%, múltiplos 11×/14× y margen 20–30% no son datos vigentes universales. No se usan como valores por defecto ni para emitir una señal automática.
7. EBITDA no es caja ni elimina todos los extraordinarios. Beneficios/EBITDA/FCF negativos o nulos no producen múltiplos interpretables como descuentos.
8. Un precio inferior al valor de un escenario no es automáticamente una oportunidad: puede reflejar deterioro, financiación, dilución o errores de hipótesis.
9. La recomendación de exigir cierto margen es una preferencia de inversión, no una norma universal. La aplicación pide el margen elegido por el usuario.

## Fuentes y cobertura

- Yahoo Finance: series estandarizadas anuales de ingresos, resultado, EPS diluido, EBIT, EBITDA, CFO y capex; balance trimestral/anual de deuda, efectivo, acciones comunes, preferentes, minoritarios y patrimonio. Cada hecho conserva etiqueta, moneda y fecha original.
- Nasdaq: perfil público identificado por símbolo exacto y capitalización en USD. No se remapea un símbolo extranjero a una empresa estadounidense por semejanza.
- Cotización: servicio existente de precios de WaStake; conserva moneda, fuente y hora. GBp se convierte a GBP únicamente para el cálculo compatible de PER y comparación DCF.
- La descripción es un extracto del perfil del proveedor, traducido con el mecanismo existente y protección de identidades. Si no se puede verificar la traducción, se identifica el texto original.
- Enlaces al estado financiero, balance, flujos, web empresarial y búsqueda de informes originales de SEC permiten contrastar las cifras. Los datos del proveedor no se presentan como una auditoría propia.
- La API pública de SEC se probó y devolvió HTTP 403 en este entorno. No se inventó un contacto para obtener acceso ni se añadieron credenciales. Se conservan enlaces a informes originales para verificación.
- El año de ingresos fija el periodo de todas las magnitudes de resultados y flujos: una ausencia no se rellena con otro ejercicio. El balance usa una fecha disponible común para todos sus hechos; no se suman saldos de fechas diferentes.
- Las cuentas disponibles pueden ir por detrás del último informe oficial. En la prueba con BA, Yahoo devolvió resultados anuales a 2025-12-31 y balance a 2026-03-31, aunque Boeing ya había publicado su segundo trimestre de 2026. La pantalla lo advierte explícitamente; no se denominan datos TTM ni “último informe”.
- Caché de investigación: una hora, hasta 150 símbolos; peticiones concurrentes por símbolo se comparten y las fuentes tienen tiempos máximos. La cotización usa la caché existente. Fallos parciales se muestran sin inventar cifras.
- Ningún proveedor de pago ni dependencia nueva. Las fuentes gratuitas pueden limitar, retrasar o denegar acceso. No existe garantía de cobertura mundial ni actualización en tiempo real de estados contables.

## Fórmulas de la ficha

- FCF publicado = CFO − abs(capex). Capex puede venir con signo negativo en el estado de flujos.
- Crecimiento de ventas = ventas actuales / ventas del ejercicio comparable anterior − 1. Se exige misma moneda y separación aproximada de un ejercicio (330–400 días).
- Margen operativo = EBIT / ventas.
- PER = cotización por acción / EPS diluido anual positivo.
- Precio/ventas = capitalización / ventas anuales positivas.
- Precio/FCF = capitalización / FCF anual positivo.
- EV/EBITDA = EV básico / EBITDA anual positivo. Se requiere el puente completo, incluidas preferentes y minoritarios; las ausencias no equivalen a cero.
- No se convierten divisas automáticamente. Monedas incompatibles dejan el ratio pendiente. No se mezclan PER actual y supuesto PER histórico “normal”.

Son múltiplos de precio consultado frente a cuentas del ejercicio identificado, no múltiplos normalizados de un proveedor de análisis. La capitalización tiene hora de consulta, no una fecha financiera implícita. Los extraordinarios requieren revisión manual.

## Modelo DCF industrial

Unidades de entrada: millones de la moneda financiera indicada y millones de acciones. Resultado: unidades monetarias por acción.

```
FCFF_t = EBIT_t × (1 − T_t) + D&A_t − capex_t − ΔNWC_t
PV explícito = Σ FCFF_t / (1 + WACC)^t, t = 1..5
TV_5 = FCFF_5 × (1 + g) / (WACC − g)
EV = PV explícito + TV_5 / (1 + WACC)^5
Capital ordinario = EV + efectivo + activos no operativos adicionales
                    − deuda − preferentes − minoritarios − otras obligaciones
Valor/acción = capital ordinario / acciones comunes diluidas previstas
Umbral con margen = valor/acción × (1 − margen exigido)
Descuento precio/valor = 1 − precio / valor
Diferencia valor/precio = valor / precio − 1
```

Los dos porcentajes finales tienen denominadores diferentes y no son intercambiables. El resultado describe únicamente el escenario introducido.

Condiciones: cinco FCFF finitos; año 5 positivo; 0 < WACC ≤ 100%; −100% < g < WACC; acciones > 0; 0 ≤ margen < 100%; ajustes ≥ 0. Los primeros FCFF pueden ser negativos. Una casilla vacía es inválida, no cero. No se calcula comparación con precio si su moneda es incompatible. Si el escenario no deja capital ordinario positivo, no se inventa un valor por acción negativo para dar una señal de venta.

Sensibilidad: WACC ±1 punto porcentual y g ±0,5 puntos, formando 3×3 escenarios; combinaciones inválidas quedan sin valor. El peso terminal es PV terminal / EV, cuando EV > 0.

La opción de usar balance publicado rellena únicamente los valores disponibles de caja, deuda, preferentes y minoritarios. Son puntos de partida contables, no ajustes de valor económico ya verificados. No rellena acciones diluidas futuras, FCFF, WACC ni crecimiento. El usuario debe revisar conversiones de preferentes y dilución para no contabilizarlas dos veces.

El DCF se excluye cuando el sector identificado es financiero, bancario o asegurador. Esos negocios necesitan modelos de capital propio, capital regulatorio u otros enfoques sectoriales. La clasificación puede faltar; el texto identifica el modelo como industrial, no universal.

## Particularidades verificadas de Boeing

El 10-K de 2025 registra una ganancia por la venta de partes de Digital Aviation Solutions de USD 9.566 millones. No debe confundirse con generación operativa recurrente. El informe también identifica acciones preferentes. La nota específica de BA enlaza ese documento; no incorpora tasas WACC, restricciones de producción o precios objetivo como si fueran hechos actuales.

Fuentes primarias contrastadas:

- [Boeing 10-K 2025, SEC](https://www.sec.gov/Archives/edgar/data/12927/000162828026004357/ba-20251231.htm)
- [Boeing resultados segundo trimestre 2026](https://investors.boeing.com/investors/news/press-release-details/2026/Boeing-Reports-Second-Quarter-Results/)
- [Damodaran: introducción a valoración y consistencia de flujos/tasas](https://pages.stern.nyu.edu/~adamodar/New_Home_Page/background/valintro.htm)
- [Damodaran: paso de valor de empresa a valor por acción](https://pages.stern.nyu.edu/adamodar/New_Home_Page/littlebook/valuepershare.htm)
- [SEC: acceso a datos y APIs EDGAR](https://www.sec.gov/search-filings/edgar-application-programming-interfaces)
- [Investor.gov: acciones](https://www.investor.gov/introduction-investing/investing-basics/investment-products/stocks)

## Otros activos

Todos tienen una ficha de contexto, pero no se fabrican cuentas empresariales para cripto, ETF, bonos, índices, materias primas o divisas. ETF: NAV, costes, liquidez, réplica y cartera. Cripto: oferta, dilución, utilidad, red y riesgos. Bonos: cupones, principal, rendimiento, crédito, moneda y duración. Estos son criterios explicados, no métricas nuevas cuya cobertura se afirme sin datos.

El gráfico y el índice técnico siguen disponibles debajo; su función es tendencia e impulso históricos, no valor intrínseco.

## Validación

- 27 pruebas automáticas del backend, incluidas siete nuevas pruebas de valoración, parser e identidades.
- Caso sintético independiente: FCFF 100 durante cinco años, WACC 10%, g 0%, ajustes 0, acciones 100 → EV 1.000, valor/acción 10. Precio 8 → descuento 20%, diferencia valor/precio 25%, umbral con margen 20% = 8. No son cifras de Boeing.
- Pruebas de preferentes/minoritarios, flujos iniciales negativos, terminal negativo, g ≥ WACC, acciones cero, datos ausentes, distintas monedas y periodos, GBp/GBP, estados sin balance trimestral, y nombres con puntuación.
- Compilación de producción del frontend. El aviso de tamaño del paquete es previo al alcance de esta ficha; no impide la compilación.
- Comprobación del navegador: búsqueda y selección de Boeing, apertura desde fila, traducción preservando la identidad, exclusión de DCF para banco, formulario sin hipótesis prefijadas y cálculo sintético con sensibilidad. Vista móvil de 375 px sin desbordamiento horizontal.

Pendiente de mayor alcance: comparables sectoriales normalizados, extracción directa y normalización de informes primarios, modelos de bancos/seguros y de otros tipos de activo, persistencia/exportación de escenarios y validación de supuestos con seguimiento histórico. No se presentan como funciones existentes.
