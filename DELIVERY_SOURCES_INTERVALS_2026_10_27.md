# Entrega por orden solicitado: fuentes, presentación, anotaciones

## 1. Fuentes

Ver `FREE_SOURCES_2026_10_27.md`: Kraken y Coinbase como mercados de respaldo, Frankfurter/BCE como referencias diarias. Pruebas reales y pruebas de caída, identidades, monedas y fechas. Sin nuevas claves, cuentas, tarjetas ni servicios de pago.

El backend `f962849` se desplegó en el servicio existente de Render **Free**. Se verificaron `/health`, las referencias del BCE, el cierre de 15 minutos de BTC en Kraken y velas intradía para BTC/NVDA. No se cambiaron los planes ni las variables privadas.

## 2. Presentación y versión de Chrome

- La imagen enviada muestra una interfaz anterior: faltan los tops y conserva la resistencia vieja de NVDA. No permite demostrar por sí sola un fallo exclusivo de Chrome.
- Panel limitado a 1.680 px y centrado; el gráfico usa altura adaptable entre 340 y 500 px, para evitar un lienzo excesivamente ancho y bajo.
- Cada compilación genera `version.json` con la misma revisión incorporada en la app. Un aviso ofrece recargar cuando la pestaña detecta una versión nueva. No fuerza recargas ni borra sesiones o datos del navegador.
- Se verificaron compilación y presentación en el navegador integrado. **La inspección directa de Google Chrome se detuvo:** el control de Windows no pudo confirmar la URL de la ventana con suficiente seguridad. No se modificaron sus ajustes ni se borraron sus datos. El zoom reducido es una hipótesis visual, no una medición confirmada.
- En Chrome conviene recargar la versión nueva con Ctrl+Shift+R y comprobar el zoom con Ctrl+0. No se afirma que la reproducción específica en ese navegador haya quedado verificada.

## 3. Anotaciones

- Velas de **15 min, 4 h y 1 día**, separadas del rango visible, que también incluye **1D**. Las vistas TradingView reciben el mismo intervalo.
- Fuente, intervalo, horario UTC y cobertura real visibles. El índice técnico sigue usando sus datos diarios y se explica esa diferencia.
- Los niveles intradía usan velas completas del intervalo elegido; no se agregan por error todas las velas de un día. La vela abierta no confirma giros.
- Actualización intradía cada minuto con la pestaña visible; una caída conserva el gráfico anterior con aviso. Se conserva el rango de navegación del usuario al actualizar.
- El catálogo ocupa media anchura en escritorio; los tops de capitalización de empresas y cripto quedan a su lado. Columnas compactas de activo/precio/variación; filtros y categorías permanecen disponibles. En anchos menores el diseño apila los bloques.
- La cotización del activo seleccionado se consulta de forma independiente al catálogo masivo y muestra su fuente y fecha.

## Validación y límites

68 pruebas pasan. Incluyen la exclusión del tick plano sin volumen añadido por Yahoo, el agregado horario con apertura bursátil observada, el respaldo Coinbase, huecos, precios ausentes y niveles sin anticipar velas futuras. Compilación correcta; permanece el aviso preexistente de tamaño del paquete principal.

Datos de prueba reales: BTC ofrece 720 velas de 15 min y 720 de 4 h en Kraken; NVDA ofrece la cobertura intradía disponible de Yahoo. Son muestras de disponibilidad, no una promesa permanente. Las últimas velas bursátiles de 4 h pueden ser más cortas por cierre de sesión. La API no sustituye un intervalo intradía ausente por datos diarios.
