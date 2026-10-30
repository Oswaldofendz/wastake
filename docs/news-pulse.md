# News Pulse v1 · método auditable de WaStake

## Qué representa

Índice experimental del contexto favorable/adverso que las noticias evaluadas describen para cada mercado o activo. Escala 0–10: 0 negativo, 5 equilibrio evaluado, 10 positivo. No mide valor intrínseco, rentabilidad esperada, probabilidad ni recomendación. Umbrales de lectura: ≤4 negativo, ≥6 positivo, el resto mixto. No se puntúan titulares pendientes como neutrales.

Mercados: acciones, cripto, divisas, materias primas, bonos, índices y ETF. Cada evaluación identifica la exposición en su explicación: no todos los instrumentos de una clase reaccionan igual. En bonos se interpreta el precio, no el rendimiento. Un ETF necesita identificar su subyacente. No se inventan signos para clases sin evidencia.

## Evidencia y clasificación

La petición contextual existente a Groq/Gemini solicita hasta tres mercados documentados por noticia, cada uno con dirección −100..100, vínculo 30..100, confianza 1..100, explicación localizada y cita literal del texto disponible. El servidor valida rangos, idioma y existencia de la cita; eso no verifica independientemente la veracidad ni la causalidad. Una valoración de mercado inválida se omite sin invalidar toda la noticia.

Se reutiliza la petición de noticias ya existente y su caché; no se añade un proveedor ni un plan de pago. El presupuesto de tiempo sigue en 45 s; los límites de salida global pasan a 4200 tokens por lote y 1800 por reparación. Los proveedores y cuotas gratuitas pueden impedir evaluar algunas o todas las noticias. Los titulares siguen accesibles sin esperar al modelo.

## Fórmula

Por noticia i y mercado m:

R = (0,25·gravedad + 0,25·vínculo_m + 0,20·sorpresa + 0,15·persistencia + 0,15·evidencia) / 100.

C = confianza / 100, limitada a 0,85 para artículo y 0,60 para extracto RSS.

E = evidencia / 100, limitada a 0,60 para extracto RSS. Se exige evidencia ≥20/100.

L = vínculo_m / 100, mínimo 0,30. Para un activo se utiliza su vínculo ya evaluado.

H = 2^(−antigüedad_en_horas / 12). El peso se reduce a la mitad cada doce horas.

S = dirección_m / 100, entre −1 y +1. Es una interpretación del contexto disponible, no una probabilidad ni retorno esperado.

**w = R³ · C · E · L · H**

**nota = 5 + 5 · Σ(w·S) / Σ(w)**

Cada contribución mostrada en el desglose es Δ_i = 5·w_i·S_i/Σ(w). Las contribuciones sumadas a cinco reproducen la aguja. El cubo realza la importancia; no hay multiplicador adicional por signo negativo. Una noticia importante positiva puede dominar del mismo modo.

Ejemplo sintético, no datos de mercado: diez positivas S=+1, R=0,20 y una negativa S=−1, R=0,90, con restantes factores iguales: suma positiva 0,080, negativa 0,729. Nota = 5 + 5·(0,080−0,729)/(0,080+0,729) = **0,988875... → 1,0/10**.

## Ventana, duplicados y calidad

- Global: últimas 24 h. Activo: ventana seleccionada de 24 h, 7 o 30 días; el archivo disponible sigue limitado por los proveedores. El decaimiento sigue siendo de doce horas incluso al ampliar la ventana.
- Se excluyen fechas futuras/ilegibles, URLs no HTTPS, ausencia de cuerpo/extracto, direcciones no numéricas y evaluaciones sin evidencia suficiente. Los valores ausentes nunca se convierten en cero.
- URL sin consulta y título normalizado evitan duplicados exactos. Cuando el contexto identifica una misma clave de evento, se conserva el informe con mayor peso, sin multiplicar el impacto por republicación. Esa agrupación inferida es imperfecta y puede dejar duplicados o agrupar incorrectamente.
- Se muestran titulares disponibles, evaluados y eventos únicos. “Muestra limitada” si hay menos de tres eventos o tamaño efectivo N=(Σw)²/Σ(w²) inferior a dos. Si un evento pesa más del 65%, se avisa de concentración.
- Sin peso válido: aguja ausente y “Sin evaluación suficiente”, nunca cinco/neutral. La fecha de consulta y el aviso de copia guardada siguen visibles. La nota se recalcula al refrescar las fuentes.
- Al cambiar filtros visuales u orden de noticias, el universo del índice global no cambia. Los mercados se calculan por separado, sin heredar automáticamente el tono general de una noticia.

## Validación y referencias

Pruebas deterministas: caso 10 vs 1, simetría de signo, neutral vs desconocido, mercados opuestos, deduplicación y claves de evento, decaimiento, fechas/URLs, caps de evidencia/confianza, valores corruptos, ventanas de activo, reconciliación de contribuciones y conservación por caché/refresco. Los datos sintéticos solo existen en pruebas y en una aplicación local de QA separada, nunca en producción.

La RBA y la Fed de San Francisco describen índices agregados de sentimiento textual y la necesidad de validar el dominio y las estimaciones. **No usan ni avalan esta fórmula propia**. Los exponentes, umbrales y semivida son decisiones iniciales de WaStake pendientes de calibración retrospectiva sobre etiquetas humanas y datos sin anticipación. Antes de afirmar utilidad predictiva haría falta evaluación fuera de muestra por mercado, sesgo de cobertura, estabilidad de etiquetas, sensibilidad de pesos y revisión manual de eventos.

- RBA: https://www.rba.gov.au/publications/rdp/2020/2020-08/how-do-we-measure-news-sentiment.html
- SF Fed: https://www.frbsf.org/research-and-insights/publications/economic-letter/2017/04/measuring-economic-sentiment-in-news/
