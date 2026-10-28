# Anotaciones y reconstrucción de Gráfico IA

## Cambios por anotación

1. Panel: cinco activos elegibles por cuadro; cuatro cuadros en una fila. En anchos pequeños la fila se desplaza horizontalmente sin ensanchar la página. Si faltan datos no se inventan filas.
2. Mercados: retirado Fear & Greed de Eventos y calendario. Resumen compacto de actividad semanal y próximo evento; el calendario principal aparece inmediatamente debajo.
3. Mapa de calor: capitalización como tamaño inicial. Activos sin capitalización verificable siguen excluidos con aviso.
4. Explorar: cinco activos en cada ranking lateral.
5. Rankings: iconos de categoría, logos con inicial como alternativa si la imagen falla y cifras compactas con M/B/T (potencias y valor completo en el detalle al pasar el puntero).
6. Explorar: cuadro de explicación del análisis para el activo seleccionado, con idioma, proveedor, carga independiente, cancelación al cambiar de activo y reintento cuando no está disponible.
7. Panel: período visible y duración de vela en la misma barra. El texto distingue zoom, intervalo de velas y análisis técnico diario.
8. Panel: sin soportes/resistencias automáticos. Herramientas de línea horizontal, tendencia, rayo, zona, Fibonacci y nota. Niveles sugeridos solo por petición expresa. Edición, borrado y deshacer locales.
9. Gráfico IA: reconstruido como espacio de gráfico amplio y chat lateral, con herramientas compactas, objetos editables, motivos por trazo, favoritos locales y comparación en porcentaje. Sin el encabezado grande ni alternancia obligatoria entre gráfico y chat a 875 px.

## Funcionamiento del agente

Referencia pública revisada: https://coinmarketcap.com/cmc-ai/agentic-charts/ (incluido su panel «What can it do?»). Se reproduce el flujo de pedir, ver el cambio y entender el trazo mediante código propio y fuentes existentes. No se verificó el chat privado de CMC, que requiere inicio de sesión, ni se afirma equivalencia con su motor propietario.

Las peticiones reconocidas usan herramientas deterministas; las peticiones libres pueden producir un plan estructurado de Groq/Gemini. El servidor valida una lista cerrada de herramientas. El modelo no entrega código ejecutable, URLs de datos ni coordenadas arbitrarias.

Las geometrías se calculan con velas cerradas: tendencia por mínimos cuadrados (hasta 60 cierres), canal por residuos extremos, Fibonacci entre extremos observados de 30 velas y zona del rango de 20 velas. Los niveles sugeridos reutilizan giros confirmados. Cada objeto lleva su motivo y huella del historial. Una edición manual retira la justificación calculada original.

Las comparaciones usan solo cierres compartidos y un mismo instante inicial. Se pueden superponer activos o fuentes Coinbase/Kraken para las identidades cripto verificadas. Una fuente elegida expresamente no se sustituye silenciosamente por otra. No se comparan capitalizaciones ni precios nominales como si fueran rentabilidades. Los dibujos de precio quedan ocultos durante la vista porcentual y se conservan al volver.

## Validación y límites

- 85 pruebas automáticas: cálculos, geometría, ejecución acotada, edición, comparación temporal y rechazo de sustitución silenciosa de fuente.
- Compilación de producción correcta. Persiste el aviso existente sobre el tamaño del paquete principal.
- Interfaz comprobada a 875 y 1280 px: rankings con cinco filas, fila única, calendario arriba, mapa por capitalización y ausencia de dibujos automáticos.
- Interacción comprobada: dibujo solicitado desde el chat, línea manual sobre el gráfico, cambio de precio y etiqueta, borrar/deshacer, Fibonacci y comparación con Coinbase con 299 cierres compartidos durante la prueba.
- Servicio público: una petición libre eligió mediante Groq la herramienta de tendencia y devolvió una geometría calculada. Las explicaciones descartadas se identifican como tales; no se presentan como investigación.
- No se afirma una prueba completa en teléfono de 375 px, en Chrome nativo ni del arrastre de puntos mediante la automatización. La edición numérica y el borrado/deshacer sí se comprobaron en la interfaz.
- Descarga PNG implementada con dibujos y paneles técnicos; el evento de descarga del navegador automatizado no constituye prueba de recepción del archivo.
- Sin noticias investigadas por este agente, detección de todos los patrones, voz, órdenes, acceso al bróker o guardado en la nube. Favoritos solo en este navegador; chat y dibujos en memoria.
- No se contrataron servicios, planes o credenciales nuevos. Continúan los límites de las fuentes y proveedores configurados y el arranque en frío de Render Free.
