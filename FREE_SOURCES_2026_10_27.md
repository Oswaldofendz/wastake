# Fuentes gratuitas incorporadas — 27/10/2026

| Fuente | Aporte y uso implementado | Límites y protección |
| --- | --- | --- |
| Kraken, REST público | Velas USD de proyectos con identidad explícita; respaldo diario y fuente intradía; referencia de otra bolsa en fichas cripto | Hasta 720 velas recientes según documentación. La última puede estar abierta. Caché, solicitudes compartidas, validación OHLC, fecha y mercado visibles. No es precio agregado global. |
| Coinbase Exchange, REST público | Respaldo independiente de Kraken, sin cuenta de trading ni autenticación | Documenta 300 velas por solicitud; no se solicita ni se promete un archivo completo. Velas de 4 h se agregan desde horas realmente observadas, sin rellenar huecos. No se consulta ninguna cuenta privada. |
| Frankfurter v2, proveedor ECB | Referencias EUR/USD, EUR/GBP, EUR/JPY y EUR/CHF dentro de Mercados | Datos diarios del BCE con fecha efectiva, no intradía ni precio ejecutable. Caché de una hora. No es una fuente independiente del propio BCE. |

Las tres peticiones públicas fueron probadas sin nuevas credenciales. No se añadió ningún plan, tarjeta, clave ni proveedor de IA de pago. Los servicios externos pueden limitar solicitudes o dejar de responder; se muestran ausencias explícitas en lugar de sustituir intervalos o inventar valores. El acceso público no supone una garantía de disponibilidad ni una licencia general para cualquier redistribución futura; se conserva atribución y se enlaza a las fuentes.

## Referencias oficiales consultadas

- Kraken OHLC: https://docs.kraken.com/api-reference/market-data/get-ohlc-data
- Coinbase candles y límites: https://docs.cdp.coinbase.com/api-reference/exchange-api/rest-api/products/get-product-candles
- Frankfurter API, frecuencia, gratuidad, atribución y condiciones del proveedor: https://frankfurter.dev/
- Referencias BCE: https://www.ecb.europa.eu/stats/policy_and_exchange_rates/euro_reference_exchange_rates/html/index.en.html

No se integran fuentes de meteorología ni se crean cuentas de APIs que no aporten datos verificables a estas funciones. Las fuentes actuales de cuentas empresariales, cotizaciones agregadas, calendario y noticias se conservan; las bolsas nuevas complementan esas funciones, sin convertir su volumen negociado en ventas de una empresa o capitalización.

## Datos y cálculos

- Los proyectos se asignan con una tabla de identidades explícitas; una coincidencia de símbolo no resuelve un proyecto externo.
- Normalización Kraken: tiempo, apertura, máximo, mínimo, cierre, VWAP, volumen, operaciones. Coinbase: tiempo, mínimo, máximo, apertura, cierre, volumen.
- Agrupación de 4 h: primera apertura, máximo de máximos, mínimo de mínimos, último cierre y suma de volúmenes observados. En acciones, se parte de la apertura observada de cada sesión y se admite una última vela más corta.
- Yahoo añade un tick plano sin volumen con la hora de la cotización; se excluye para no presentarlo como una vela intradía adicional.
- El precio del instrumento seleccionado se consulta por separado, con fecha/fuente, para evitar usar indefinidamente el valor de la descarga masiva del catálogo. La caché de cotización tradicional individual pasa a un minuto.
- Las pruebas incluyen caída de Kraken con respuesta Coinbase, monedas/fechas ausentes, OHLC inválido, huecos horarios, sesiones de bolsa y confirmación de niveles sin datos futuros.
