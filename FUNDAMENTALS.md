# WaStake: arquitectura y primera entrega de Fundamentales

## Arquitectura de la primera entrega

- **Interfaz:** React/Vite. La pestaña `Fundamentales` permite elegir activos, ventanas de 24 horas, 7 días y 30 días, y revisar los titulares y la reacción observada.
- **API:** Express, en `GET /api/fundamentals/:id`. Obtiene los RSS públicos que ya consume el backend y devuelve el titular, fecha disponible, fuente, enlace, términos coincidentes y clasificación.
- **Cálculo:** reglas deterministas versionadas como `keyword-rules-v1`. No llama a Gemini, Groq ni a otro servicio de IA.
- **Precios:** usa el endpoint OHLCV existente del proyecto. La respuesta posterior compara el último cierre diario anterior al titular con el primer cierre a partir de 24 horas después.
- **Caché:** titulares y feeds se conservan en memoria durante 30 minutos. Un reinicio del backend borra la caché.

## Fórmulas visibles y auditables

Para cada titular, se normalizan mayúsculas y acentos. Una lista versionada de términos positivos y negativos determina el tono:

`puntaje_titular = 100 × (términos_positivos − términos_negativos) / (términos_positivos + términos_negativos)`

Si no hay términos de tono, el resultado es neutral con puntaje cero. La clasificación de impacto es alto si aparece un término de impacto alto; en su defecto, medio si aparece uno de impacto medio; de lo contrario, bajo. La interfaz presenta los términos detectados para permitir revisar la regla.

En el resumen del período, cada noticia recibe peso 1, 2 o 3 (impacto bajo, medio o alto):

`sesgo = 100 × suma(tono × peso) / suma(pesos)`

El tono se codifica como +1, 0 o −1. La intensidad es `100 × promedio(pesos) / 3`. La reacción es la media simple de los cambios porcentuales posteriores que tienen velas disponibles; no prueba que la noticia causara el movimiento.

## Fuentes y límites

- Las noticias vienen de los feeds RSS públicos declarados en `backend/src/services/newsService.js` (CoinDesk, Cointelegraph, Yahoo Finance, CNBC, MarketWatch, Investing.com y Reuters). Los feeds pueden cambiar, limitar acceso o no entregar fecha. No se inventa una fecha ausente.
- El histórico de precios proviene del endpoint de datos que ya tiene WaStake. La primera entrega no agrega una clave de proveedor ni crea credenciales.
- El límite actual es de 10 titulares recientes por activo y una caché temporal. Por ello, la selección «30 días» solo filtra los titulares que el feed entregó; **no** garantiza 30 días completos de cobertura.
- Las reglas léxicas pueden fallar con negación, ironía, contexto, noticias duplicadas con titulares distintos y términos ambiguos. La puntuación no es valoración intrínseca ni recomendación de inversión.
- El archivo persistente en Supabase, el análisis de ventanas de retorno configurable, el benchmark de mercado, el control de duplicados semánticos y métricas de validación fuera de muestra quedan para fases siguientes.

## Plan de validación

1. **Pruebas de reglas:** titulares positivos, negativos, neutrales, con acentos, negación y términos ambiguos; verificar que los términos mostrados explican el resultado.
2. **Pruebas de API:** activo válido, tipo inválido, proveedor RSS caído, titular sin fecha y consulta repetida dentro de la caché.
3. **Pruebas de reacción:** velas antes/después, huecos de fin de semana, falta de cierre y timestamps inválidos.
4. **Revisión manual:** comparar una muestra etiquetada por una persona con el clasificador y reportar precisión, recall y matriz de confusión antes de usar la señal en decisiones.
5. **Validación temporal:** cuando se archive histórico, evaluar ventanas futuras sin usar información posterior a cada fecha; comparar con una línea base neutral y un índice de referencia.

## Fuentes estructuradas posteriores

Para noticias regulatorias de empresas puede añadirse SEC EDGAR, que ofrece interfaces de datos públicas: [documentación oficial de SEC EDGAR APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces). Para series macroeconómicas, FRED requiere registrar una API key gratuita: [documentación oficial de FRED API keys](https://fred.stlouisfed.org/docs/api/api_key.html). No se han creado credenciales ni conectado estas APIs en esta entrega.

## Reutilización de WaGroup / WazPulse

La carpeta `C:\Dev\WaGroup\wazpulse-pipeline` ya tiene un recolector RSS persistente en Supabase (`pulse_candidates`), deduplicación por identificador/enlace/titular, filtro de antigüedad y detección de activos e intención editorial. Su propósito actual es preparar publicaciones revisables para redes sociales; no conserva por sí solo un panel completo de eventos con retornos de mercado. En la siguiente fase conviene validar las tablas y sus políticas de expiración y evaluar una integración de solo lectura para ampliar fuentes y cobertura, sin mezclar automáticamente una cola editorial con una señal de inversión.
