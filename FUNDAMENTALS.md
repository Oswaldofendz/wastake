# WaStake: Fundamentales y análisis de eventos

## Arquitectura

- **Interfaz:** React/Vite. `Fundamentales` muestra activos, horizontes de 24 horas/7/30 días, relevancia estimada, dirección, escenarios y reacción posterior observada.
- **API:** Express, `GET /api/fundamentals/:id?type=crypto|stock&name=...&symbol=...&lang=es|pt|en`.
- **Noticias:** feeds RSS públicos declarados en `backend/src/services/newsService.js`. La respuesta conserva titular original, traducción, fuente, fecha, enlace y nivel de texto consultado.
- **Análisis:** Gemini/Groq se invocan exclusivamente desde el backend usando `llmService.js`. El proveedor puede resumir en el idioma seleccionado y explicar mecanismo, horizonte, escenarios condicionales, evidencia y límites.
- **Artículo:** intenta leer solo HTTPS de los dominios de editores RSS ya configurados; hasta cinco artículos recientes, sin seguir redirecciones, sin superar 1 MB y con tiempo limitado. No se sortean muros de pago. Si el cuerpo no se puede leer, se usa el extracto RSS o se informa que solo hay titular.
- **Respaldo:** el clasificador determinista `keyword-rules-v1` se conserva para cuando no existe clave, la IA falla o su respuesta no se puede validar. La pantalla indica el estado y no presenta el respaldo como análisis IA.
- **Precios:** usa el endpoint OHLCV existente. El cambio posterior compara el último cierre diario anterior al titular con el primer cierre al menos 24 horas después. Es una observación temporal, no prueba de causalidad.

## Puntuación transparente

La IA estima cinco factores entre 0 y 100. El backend aplica los pesos fijos:

`relevancia = gravedad × 0,25 + relación_directa_con_activo × 0,25 + sorpresa × 0,20 + persistencia_probable × 0,15 + calidad_de_evidencia × 0,15`

Los cinco valores se muestran para poder reconstruir el resultado. El sesgo direccional de −100 a +100 y la confianza son medidas separadas; ninguno es un retorno esperado ni objetivo de precio. Los escenarios favorable, central y adverso son condicionales, no predicciones.

El respaldo léxico normaliza mayúsculas y acentos y calcula:

`puntaje_titular = 100 × (términos_positivos − términos_negativos) / (términos_positivos + términos_negativos)`

Si no hay términos de tono, el resultado es neutral con puntaje cero. Los términos que activan la regla aparecen en la interfaz.

## Proveedores y credenciales

Las claves viven solo como secretos del backend: `GEMINI_API_KEY`, `GROQ_API_KEY` y, de forma opcional, `GEMINI_API_KEY_2`, etc. No deben estar en el frontend, en el repositorio ni en respuestas HTTP. En la inspección actual, el backend activo `wastake` de Render Free tiene configurada `GEMINI_API_KEY`; `GROQ_API_KEY` no aparece allí. Railway muestra la prueba vencida y no es el backend que sirve la web. El código intentará Groq si se configura en el backend y tiene Gemini como alternativa. No se copiaron ni revelaron valores de claves.

La caché de análisis vive cuatro horas en memoria y se borra al reiniciar la instancia. La caché RSS dura 30 minutos. En un hosting gratuito, una instancia puede dormir, tener límites de cuota, reiniciarse o tardar en responder; la disponibilidad depende también de los planes gratuitos y sus políticas actuales.

## Fuentes y límites

- RSS público configurado: CoinDesk, Cointelegraph, Yahoo Finance, Reuters, CNBC, MarketWatch e Investing.com. Los feeds cambian, pueden bloquear el acceso y no siempre ofrecen fecha o resumen.
- Se entregan hasta 10 noticias recientes. Se intenta recuperar el cuerpo de las cinco primeras; las restantes se analizan con el extracto RSS. La selección de 30 días filtra lo que entregó el feed y no garantiza un archivo histórico completo.
- La IA puede traducir mal, omitir contexto o dar una interpretación discutible. Verifica el enlace de origen, la cita y los factores. Las reglas pueden fallar con negación, ironía, duplicados y palabras ambiguas.
- Una puntuación de evento no es una valoración intrínseca, una señal probada ni asesoramiento financiero. Un movimiento posterior del activo no demuestra que la noticia lo causó.
- Persistencia en Supabase, benchmark, deduplicación semántica y evaluación temporal fuera de muestra siguen siendo fases futuras.

## Plan de validación

1. **Respaldo:** comprobar titulares positivos, negativos, neutros, acentuados, negados y ambiguos; revisar que las palabras mostradas expliquen el cálculo.
2. **Fórmula:** recalcular manualmente combinaciones de factores 0/50/100 y verificar pesos 25/25/20/15/15; comprobar que sesgo no se interprete como retorno.
3. **Proveedores:** simular cuota agotada, falta de claves, JSON incompleto y error temporal; comprobar aviso y respaldo transparente.
4. **Cobertura:** verificar artículo, extracto RSS, titular solamente, redirección, URL fuera de la lista y muro de pago; confirmar que la tarjeta indica el material realmente analizado.
5. **Idioma:** comprobar traducción de titulares y análisis en ES/PT/EN, conservando la cita de evidencia en el idioma original.
6. **Precios:** velas antes/después, huecos de fin de semana, falta de cierres y timestamps inválidos; no atribuir causalidad.
7. **Revisión humana:** etiquetar una muestra y medir acuerdo para tema, dirección y relevancia; documentar desacuerdos antes de usarla como señal.
8. **Evaluación temporal:** cuando se archive histórico, probar ventanas futuras sin usar datos posteriores a cada fecha y comparar contra una línea base neutral y un índice de referencia.

## Fuentes estructuradas futuras

Para noticias regulatorias de empresas puede añadirse SEC EDGAR: [documentación oficial de APIs](https://www.sec.gov/search-filings/edgar-application-programming-interfaces). Para series macroeconómicas, FRED requiere una API key gratuita: [documentación oficial de FRED API keys](https://fred.stlouisfed.org/docs/api/api_key.html). No se conectan estas fuentes en esta entrega.

## WaGroup / WazPulse

La carpeta `C:\Dev\WaGroup\wazpulse-pipeline` contiene un recolector RSS persistente en Supabase para preparar publicaciones revisables. No se conecta automáticamente a esta señal; una fase posterior deberá revisar el esquema, políticas de expiración y licencias antes de integrar datos.
