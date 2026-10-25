# Correcciones de calidad · 25 de octubre de 2026

## Cambios incluidos

1. Calendario: retirada la lista manual de 2026. Feed semanal público, complementado con agendas oficiales de la Fed y el BLS. Si el feed falla, solo se muestran las fechas recuperadas de esas instituciones. Si ninguna fuente responde, se declara la falta de datos; una caché antigua se identifica como tal y caduca tras 24 horas.
2. Procedencia y horario: fuente por evento, fecha de consulta y conversión a la zona horaria del dispositivo con cambios de horario de verano. Los eventos sin hora publicada permanecen sin hora. Los campos ausentes no se convierten en cero. La agenda oficial no promete consenso ni resultados.
3. Traducción: protección de nombres de empresas, criptoactivos y símbolos mediante marcadores; rechazo de traducciones que pierdan una identidad o alteren números. Idioma del documento sincronizado con ES/PT/EN y traducción automática del navegador desactivada para evitar que vuelva a traducir marcas. Las traducciones de noticias se asocian a su identidad e idioma, en lugar de su posición o del número de artículos.
4. IA: nuevo formato de análisis con idioma declarado, controles conservadores de idioma, identidad y cifras del titular, y citas literales verificadas contra el texto suministrado. Se rechaza la evidencia de boletines, publicidad y otros fragmentos genéricos. El material de solo titular usa reglas preliminares. Lectura de cuerpos HTML limitada al contenedor del artículo; no se atribuye todo el contenido de una página a la noticia.
5. Tipografía y temas: pesos 400–700 explícitos, contraste de texto secundario, foco de teclado y respeto a movimiento reducido. Fondos y texto del modo claro coherentes. Reparado el arco SVG del medidor Fear & Greed para valores superiores a 50.
6. Fundamentales: titulares e histórico aparecen de forma independiente; el análisis contextual se completa después. Al cambiar de activo se descarta el estado anterior. Etiquetas y errores localizados. Símbolos duplicados retirados del selector.
7. Explorador: retiradas las vistas rápidas que repetían los filtros existentes; acordeones cerrados por defecto conservados. Filas más compactas en móvil, marcas y símbolos protegidos.
8. Navegación: sincronización con el historial del navegador y retorno al inicio de la pantalla al cambiar de sección.

## Comprobaciones

- `cd backend && npm test`: casos de identidad/números, idioma, evidencia, horario de verano, parseo de agendas oficiales, datos ausentes, clasificación de desempleo y etiquetas.
- `cd frontend && npm run build`.
- Consulta real de fuentes públicas: reunión del FOMC el 28 de octubre de 2026; IPC de octubre el 10 de noviembre. Los valores de consenso y resultados solo se muestran si los facilita la fuente.
- Revisión visual local: escritorio y ancho de 375 px, modo claro/oscuro, ES/PT/EN, Mercados/Explorador/Fundamentales.

## Límites y siguientes mejoras

- La comprobación literal de una cita no demuestra por sí sola que todas las conclusiones de IA sean correctas. Las reglas de idioma son conservadoras y pueden descartar resultados válidos; se muestra la lectura preliminar cuando no pasan.
- La solidez/confianza sigue siendo una estimación del modelo, sin calibración estadística. Los pesos de relevancia y el índice técnico requieren validación histórica independiente antes de atribuirles capacidad predictiva.
- La cobertura oficial alternativa incluye Fed y determinadas publicaciones del BLS. Añadir fuentes oficiales de BEA/BCE/BoE es una ampliación pendiente; no se reconstruyen sus agendas con fechas inventadas.
- El glosario local cubre etiquetas macro habituales. Un evento desconocido conserva su nombre de origen y el enlace a la fuente; ampliar el glosario según los datos recibidos.
- Los límites gratuitos de precios y proveedores de IA siguen aplicándose. No se han añadido planes, suscripciones ni proveedores de pago.
- Pendiente: ampliar revisión de cartera/DCA con datos de prueba, revisar todas las pantallas secundarias en móvil y medir accesibilidad de manera más extensa.
