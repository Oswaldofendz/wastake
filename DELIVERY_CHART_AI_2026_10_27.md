# Gráfico IA · Alberto

Sección independiente en `/#chart-ai`, inspirada en la interacción pública de [CMC Agentic Charts](https://coinmarketcap.com/cmc-ai/agentic-charts/). Diseño y código propios; no integra la API de CMC ni reproduce su identidad.

## Alcance

- Búsqueda de activos del catálogo y fuentes externas existentes.
- Velas de 15 minutos, 4 horas y un día según cobertura de las fuentes.
- Chat en español, inglés y portugués. Acciones explícitas: niveles, EMA 20/50/200, RSI, Bollinger, volumen, enfoque de caída observada, limpieza y deshacer.
- Controles manuales y hasta cuatro líneas de referencia con precio editable. Historial local de veinte cambios; conversación solo en memoria.
- Exportación PNG del gráfico principal con fuente, intervalo y fecha; el panel RSI separado no se incluye en ese archivo.
- En pantallas estrechas, pestañas de gráfico y Alberto; en escritorio, ambos paneles contiguos.

## Datos y cálculos auditables

Los números no proceden del modelo de lenguaje. El servidor valida las velas y usa exclusivamente períodos cerrados para indicadores, nota técnica y niveles. La vela abierta solo se representa como precio provisional. La normalización diaria conserva una única sesión por fecha UTC.

Cada respuesta conserva identidad del activo, intervalo, fuente, fecha del último período cerrado, cantidad de velas y huella del historial utilizado. Cambiar de activo o intervalo impide aplicar una respuesta de un contexto anterior. El zoom no altera el historial calculado.

Los niveles reutilizan el método de giros confirmados de WaStake, con prueba de paridad entre servidor y navegador. Son zonas históricas que pueden romperse, no objetivos ni garantías. Un nivel ausente no se inventa. La nota técnica es la fórmula existente y no una valoración fundamental.

## IA y recursos gratuitos

Los cambios del gráfico se interpretan mediante una lista acotada de operaciones y no consumen IA. Las explicaciones pueden usar Groq/Gemini ya configurados. El modelo recibe la pregunta y hechos públicos; no lee la cartera. Su texto no puede introducir precios, notas ni código ejecutable. Las cifras se presentan por separado desde cálculos verificables.

Presupuesto temporal de IA de 22 segundos, límite de ocho consultas por minuto por IP y cachés acotadas en memoria. Ante cuota agotada, fallo o respuesta descartada, se indica claramente que la lectura procede de reglas. No se añaden planes ni servicios de pago. Los límites y el arranque en frío de Render Free siguen aplicando.

## Validación

- 78 pruebas automáticas superadas, incluidas diez específicas del estudio de gráficos.
- Compilación de producción correcta; la sección se carga por separado. Permanece el aviso preexistente sobre el tamaño del paquete principal.
- Comprobación visual local: Bitcoin y Apple, cambio de idioma sin traducir nombres propios, EMA 200, RSI con explicación, deshacer, línea manual, limpiar/restaurar e intervalo de cuatro horas.
- Servicio publicado: respuesta de datos real de Bitcoin y explicación contextual válida mediante Gemini comprobadas. El primer intento activó correctamente la alternativa por reglas; una validación demasiado estricta de la frase «no garantiza» se corrigió y quedó cubierta por prueba.
- Sin cuenta CMC ni acceso a sus funciones privadas. No se verificó la descarga mediante el navegador automatizado: su evento de descarga no fue recibido; no se presenta como prueba superada.
- La comprobación de tamaño móvil del navegador no fue fiable; los estilos adaptativos están implementados, pero no se afirma una prueba real en teléfono ni en Chrome nativo.

## Límites de esta primera versión

No compara mercados entre bolsas, no investiga noticias, no reconoce patrones adicionales ni predice precios. No hay órdenes, conexión al bróker, voz, dibujos arrastrables o guardado persistente del espacio. Las acciones admitidas se explican dentro de la sección; no se ofrece paridad completa con CoinMarketCap.
