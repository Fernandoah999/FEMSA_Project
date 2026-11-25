# Referencia de calidad del refinamiento

Criterios derivados de la corrección explícita del usuario; no es un comp aprobado ni una validación retroactiva.

## QUALITY BAR
- Lectura: cuerpo 16px, etiquetas principales 15px y cifras principales 49–64px en escritorio; contraste claro entre encabezados, explicación y datos.
- Menos carga simultánea: cuatro indicadores principales conservados, gráficos y métricas secundarios desplegables; filtros avanzados ocultos inicialmente.
- Orientación: preguntas como «¿Cuáles son los más críticos?» y «¿Cuáles llevan más tiempo sin arreglar?» conducen al detalle correcto.
- Foco: ficha de servidor amplia y centrada, pantalla completa móvil, cierre accesible, resumen/contexto/hallazgos antes de la ficha técnica.
- Globo: respetar el componente solicitado: mundo de puntos, rutas dinámicas, tres puntos blancos y destellos regionales. EUA/México/Brasil son referencias definidas por el usuario; no datos del Excel.
- Operación: selección regional, pausa, arrastre, centrar y preferencia de movimiento reducido funcionan; animación se suspende fuera de pantalla.
- Integridad: no se elimina ningún KPI ni campo; importación, historial, filtros, comparación y exportación siguen funcionando.

## Auditoría Impeccable del dashboard · 24 de noviembre de 2026

**Veredicto de integridad** — El panorama conserva un recorrido coherente desde el corte activo hasta los registros. Importación, filtros, mapa, SLA y comparación usan el mismo inventario y distinguen los países del Excel de las referencias regionales.

| Dimensión | Puntuación | Evidencia |
| --- | ---: | --- |
| Accesibilidad | 3/4 | Países seleccionables con teclado, controles de SLA con etiquetas y gráficos con valores visibles. El contraste del texto principal es 14.31:1 y el de la leyenda del globo, 13.45:1. |
| Rendimiento | 3/4 | El mapa por país dibuja al interactuar y el animado se suspende fuera de pantalla. El modo regional todavía procesa 6,923 puntos por cuadro activo. |
| Diseño adaptable | 3/4 | Panorama revisado en Chromium a 1440 y 390 px. El globo y las gráficas terminan a la misma altura en escritorio. La leyenda de estados se lee completa en móvil y el SLA pasa a una columna. |
| Tema | 2/4 | Los gráficos nuevos usan variables compartidas. El azul de acción del dashboard y varios tonos y tamaños aún difieren de la guía escrita. |
| Integridad | 3/4 | El estado inicial, los plazos, el alcance seleccionado y los resultados de una comparación están rotulados en la interfaz. Queda margen para orientar al usuario cuando falta el corte de referencia. |
| **Total** | **14/20** | **Bueno. Cuatro hallazgos P2 y uno P3.** |

El detector señaló 118 avisos de consistencia con `DESIGN.md` (74 tamaños y 44 colores), todos de nivel informativo. La etiqueta de color sin documentar se confirmó en la variable azul de acción. Los colores de severidad tienen una leyenda numérica visible.

Chromium verificó el flujo de importación y comparación en una base temporal, las diez opciones de país completas en ambos tamaños, la selección táctil simulada, el arrastre del globo, la persistencia de los plazos y el PDF exportado. La suite `npm run test:dashboard` escribe los resultados y las capturas en `.impeccable/review/dashboard/`. Quedan por medir el rendimiento en equipos de gama baja y el uso con lector de pantalla en un dispositivo físico.

### Hallazgos pendientes

- **P2 · Tablas anchas en móvil.** La tabla se desplaza dentro del panel y los encabezados no se ajustan. Es fácil pasar por alto las columnas de SLA y el botón de detalle. Mostrar una señal visible de desplazamiento y mantener el identificador al recorrer la tabla. Comando sugerido `$impeccable adapt`. [Estilos de tabla](../src/components/inventory-dashboard.module.css#L127)
- **P2 · Comparación con un solo corte.** El selector permite abrir una lista con solo el texto «Seleccionar otro corte» antes de mostrar la acción para importar. Cuando falte la segunda carga, mostrar «Importar otro corte» como acción principal. Comando sugerido `$impeccable onboard`. [Panel de comparación](../src/components/inventory-dashboard.tsx#L253)
- **P2 · Tamaño de controles geográficos.** Los puntos interactivos miden 28 px en escritorio y 36 px en móvil. Los botones de la lista ofrecen otra forma de seleccionar país. Ampliar el área de los puntos o resolver las colisiones en países próximos mejoraría la selección directa. Comando sugerido `$impeccable adapt`. [Estilos del globo](../src/components/route-globe.module.css#L9) · [WCAG 2.2, tamaño mejorado](https://www.w3.org/TR/WCAG22/#target-size-enhanced)
- **P2 · Tema desalineado.** La acción principal usa `#2563eb` y la guía del dashboard define `#990033`. Registrar la paleta que se decida conservar y agrupar los tamaños recurrentes reduciría inconsistencias en futuras pantallas. Comando sugerido `$impeccable document`. [Variables del dashboard](../src/components/inventory-dashboard.module.css#L1) · [Guía de diseño](../DESIGN.md)
- **P3 · Coste del modo regional animado.** Cada cuadro recorre el muestreo terrestre completo y redibuja las rutas. Conviene medir tiempos de cuadros en un equipo de gama baja antes de decidir si limitar la frecuencia o reutilizar la capa base. Comando sugerido `$impeccable optimize`. [Bucle de dibujo](../src/components/route-globe.tsx#L104)
