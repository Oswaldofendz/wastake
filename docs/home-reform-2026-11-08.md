# Inicio: Mercado primero

Implementación de la distribución aprobada el 8 de noviembre de 2026. Conserva el backend gratuito y sus fuentes actuales; no añade servicios, suscripciones ni credenciales.

## Cambios de producto

- Inicio reúne búsqueda transversal, cinco rankings, muestra de activos por clase, dos noticias y los próximos eventos disponibles. Los gráficos y cálculos detallados están en Panorama.
- Los cinco rankings ocupan una fila en escritorio; en móvil se consulta uno mediante un selector. Las listas muestran hasta cinco resultados válidos, sin fabricar candidatos.
- Panorama conserva búsqueda, catálogo y ficha única con resumen, gráfico, valoración y noticias. Se eliminan los rankings repetidos de su pantalla de entrada.
- Noticias y macro agrupa noticias globales/por activo, calendario/macro y herramientas de mapa/correlaciones. Los hashes anteriores siguen funcionando.
- Seguimiento agrupa los accesos existentes a cartera/DCA y alertas. Autenticación y datos personales conservan su flujo existente.
- Inicio antiguo con `inspect` y `kind` válidos abre Panorama con el mismo activo. Al regresar mediante Inicio se limpia la selección del enlace.

## Calidad de datos

- Alphabet y las clases conocidas de Berkshire se agrupan por emisor en el ranking de empresas. Se conserva una referencia observada; nunca se suman las capitalizaciones de clases.
- La tabla distingue cambios cripto de 24 horas y cambios de sesión. Precio, fuente, moneda y fecha permanecen unidos. Una cotización sin fecha se solicita al endpoint público de cotización; si no hay respuesta verificable, se muestra ausencia de dato.
- Estas peticiones adicionales se limitan a ocho filas visibles y usan caché de dos minutos. No se solicitan historiales ni análisis de todo el catálogo para mostrar Inicio.
- Los incidentes de ciberseguridad necesitan una mención explícita de activos o un sujeto financiero/empresarial. Una filtración personal genérica no implica exposición del mercado cripto.
- La franja de última hora aparece únicamente con prioridad de al menos 85/100 y publicación dentro de las últimas seis horas. Es una regla editorial de selección, no una probabilidad de impacto.
- Las noticias ordinarias conservan fuente y fecha, se agrupan por identificador de evento cuando existe y no repiten enlaces presentes en la franja. Las noticias sin análisis contextual se identifican como tales.
- El calendario usa fechas devueltas por la fuente; nunca inventa una hora, previsión o resultado.

## Carga y límites

Las secciones detalladas se cargan al abrirlas. El archivo principal compilado pasó de aproximadamente 1,25 MB a 754 KB antes de compresión durante esta reforma. El índice técnico y las valoraciones mantienen sus fórmulas existentes.

Las fuentes gratuitas pueden devolver cobertura parcial o retrasada. La agrupación de empresas cubre identificadores de emisor proporcionados y clases conocidas; no pretende identificar por nombre todas las clases, ADR o cotizaciones internacionales. El filtro de relevancia es una regla conservadora y no sustituye una verificación editorial.

## Validación

- 175 pruebas automáticas: 168 existentes y siete de la nueva portada; todas pasan.
- Compilación de producción correcta.
- Revisión visual con respuestas reales del backend público mediante proxy local, sin acceder a credenciales.
- Recorrido Inicio → búsqueda Apple → ficha de Panorama → Inicio, conservando identidad y limpiando la selección al volver.
- Temas claro/oscuro e idiomas ES, EN y PT.
- Anchos 320, 375, 736 y 1024: sin desbordamiento horizontal detectado en Inicio.
- Selector de oportunidades en móvil; pestañas de noticias, calendario y mapa; salida disponible desde autenticación.

## Desarrollo local

La configuración opcional `WASTAKE_PREVIEW_API` permite dirigir el proxy de desarrollo/preview al backend de prueba elegido. Si no se configura, se conserva `http://localhost:3001`. No modifica el destino de producción, que continúa usando `VITE_API_URL` desde Vercel.

## Continuidad

La clasificación y fechas del proveedor se muestran sin inventar cobertura mundial. La revisión detallada de datos por proveedor, normalización de emisores internacionales y ampliación de cobertura informativa son mejoras independientes que deben conservar estos controles de ausencia y trazabilidad.
