# Cobertura de noticias de WaStake

La franja y la vista **Última hora global** de Fundamentales comparten las mismas publicaciones. La vista **Noticias del activo** conserva la investigación por instrumento. No se añaden suscripciones, cuentas ni credenciales.

## Fuentes públicas

- Federal Reserve: https://www.federalreserve.gov/feeds/press_monetary.xml
- BCE: https://www.ecb.europa.eu/rss/press.html
- CNBC Markets: https://www.cnbc.com/id/100003114/device/rss/rss.html
- CNBC World: https://www.cnbc.com/id/100727362/device/rss/rss.html
- CNBC Technology: https://www.cnbc.com/id/19854910/device/rss/rss.html
- CoinDesk: https://www.coindesk.com/arc/outboundfeeds/rss/
- CoinTelegraph: https://cointelegraph.com/rss
- BBC World: https://feeds.bbci.co.uk/news/world/rss.xml
- BBC Business: https://feeds.bbci.co.uk/news/business/rss.xml

Son nueve canales de seis organizaciones, no nueve verificaciones independientes. Una publicación de prensa se presenta como un reporte atribuido, no como confirmación independiente del hecho. Los RSS pueden cambiar, fallar o demorar novedades. No se eluden bloqueos ni muros de pago. La interfaz muestra enlaces y extractos limitados, no copias completas de artículos.

## Selección y caducidad

Se admiten seguridad cripto, geopolítica, resultados y eventos empresariales, movimientos de mercado y publicaciones macroeconómicas seleccionadas. Se exigen HTTPS, dominio conocido, fecha válida y antigüedad menor de 24 horas. No se convierten previsiones de la Fed en decisiones publicadas. Se eliminan URL repetidas y titulares normalizados idénticos. Las decisiones oficiales sustituyen los duplicados de prensa de la misma decisión; distintas empresas del mismo día siguen separadas.

Se conservan hasta 40 publicaciones recientes. La franja elige hasta 12, representa las categorías disponibles y limita la repetición de entidades. Las opiniones/previsiones no entran en la franja, aunque pueden consultarse identificadas en Fundamentales. Una categoría vacía no significa ausencia de acontecimientos en el mundo.

## Prioridad preliminar, 0–100

Es una regla auditable de prioridad, no una predicción ni una probabilidad:

`prioridad = limitar(categoría + calificador + actualidad + fuente oficial − opinión, 0, 98)`

Bases: Fed 82; BCE 80; actas 66; inflación 78; empleo 74; emergencia 84; seguridad 80; geopolítica 76; empresas 64; movimientos de mercado 58. El calificador añade 8 cuando el titular contiene determinados términos de gravedad; actualidad añade 8 antes de 2 horas o 4 antes de 6; comunicado oficial añade 4; opinión/previsión resta 16. Factores y método son visibles. Esta clasificación depende de texto y reglas, puede equivocarse y no demuestra el efecto económico de una noticia.

Las referencias de activos combinan entidades explícitas en el texto y referencias generales por categoría. La interfaz las llama referencias para vigilar, sin atribuirles dirección ni afirmar que sean exposiciones verificadas.

## Análisis contextual

Los titulares aparecen antes que la IA. Se prioriza para análisis una muestra de hasta 10 historias, procurando representar las categorías disponibles. Se utiliza el texto accesible del artículo o su extracto RSS; no se presenta un análisis de solo titular como una lectura del artículo. La evidencia citada debe aparecer en el texto suministrado. Se mantiene la validación de idioma, cifras y nombres de empresas.

Cuando hay análisis válido, su relevancia pondera gravedad 25%, vínculo 25%, sorpresa 20%, persistencia 15% y evidencia 15%. Cuando no lo hay, la interfaz muestra **prioridad preliminar**, extracto atribuido y una guía por categoría, diferenciada del contexto específico de IA.

Los proveedores siguen siendo los configurados previamente en Render (Groq/Gemini). No se contratan planes ni se cambian sus límites. La disponibilidad depende de sus cuotas. El análisis válido de cada historia se reutiliza durante una hora, por idioma y objetivo; al llegar un titular nuevo se analizan las historias no almacenadas. El título, extracto o enlace modificado invalida la clave; un cambio solo de fecha de publicación conserva el contexto y su hora de revisión. La llegada de otro titular no descarta una evaluación válida de una historia que siga presente. Los lotes globales son de hasta tres historias para reducir respuestas truncadas. Caché acotada a 600 análisis.

## Actualización y velocidad

- RSS agregados: caché compartida de 60 segundos y solicitudes concurrentes agrupadas.
- Páginas visibles: consulta cada minuto; mientras hay análisis pendiente se consulta el estado cada 5 segundos.
- Navegador: copia pública limitada a seis horas, filtrada por la ventana de publicación y marcada con su fecha; un fallo no rejuvenece la copia.
- Una fuente fallida conserva solo publicaciones todavía dentro de su ventana y muestra cobertura parcial.
- Franja: aproximadamente 82 px/s al inicio y 45 px/s en modo normal; pausa manual, al pasar el ratón o enfocar, y respeto a movimiento reducido.
- Render gratuito puede dormir: no se añaden llamadas artificiales para evitarlo ni se garantiza llegada instantánea.

## API y validación

`GET /api/market/impact-alerts` devuelve publicaciones, fuentes, fechas, categorías y factores.

`GET /api/fundamentals/global?scope=market&lang=es&stage=headlines` entrega titulares sin iniciar análisis. `stage=snapshot` permite análisis en segundo plano.

El panel usa también el nombre y símbolo del catálogo al buscar noticias del activo. Esto evita que una búsqueda por NVDA omita noticias que solo dicen NVIDIA.

Ejecutar `npm test` desde backend y `npm run build` desde frontend. Las nuevas pruebas cubren categorías, duplicados, fechas/dominios, separación de previsiones, franja, respuestas antes de IA, caché por historia y coincidencia de nombres. Los datos sintéticos están confinados a pruebas; no se precargan acontecimientos inventados en la aplicación.
