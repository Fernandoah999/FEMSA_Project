# Verificación del dashboard local

Fecha local: 22 octubre 2026. Alcance: dashboard local académico con importación XLSX, persistencia, filtros y comparación. No auditoría de infraestructura real ni consulta CVE.

## Refinamiento solicitado por el usuario

La revisión posterior del usuario pidió mayor tipografía, menos información simultánea, ficha de servidor amplia y el globo Route Globe aportado. La interfaz actual conserva los KPIs: cuatro principales grandes y los análisis secundarios en desplegables inicialmente cerrados. El detalle tiene hasta 1240px de ancho y ocupa todo el viewport móvil. Las preguntas de prioridad abren registros, incluida antigüedad ordenada por bandas.

Después del último cambio de implementación se ejecutaron `npm run check` (exit 0) y `npm run test:dashboard` (exit 0). El navegador confirmó nueve grupos de comprobación, sin errores de consola, incluyendo los flujos de carga, persistencia, filtros, CSV, rechazo de archivos y comparación ya existentes.

La comprobación nueva mide tipografía (etiqueta de KPI al menos 14px y cifra principal al menos 56px), todos los análisis secundarios cerrados inicialmente, detalle de al menos 1100px a viewport 1440 y detalle de ancho completo a 390px. También comprueba el acceso a pendientes con el rango más antiguo primero. El globo respeta movimiento reducido; al habilitar movimiento sus píxeles cambian, al pausarlo permanecen iguales y al arrastrarlo cambian aun pausado. Centrar América restaura la orientación. La pausa se mide sobre el contenido Canvas, evitando comparar recortes de pantalla desplazados.

Las capturas de detalle son de viewport, con el desplazamiento del diálogo restablecido; los panoramas y otras vistas son full-page desde scroll 0. Evidencia actual: `.impeccable/review/dashboard/verification.json`, `desktop.png`, `mobile.png`, `detail-desktop.png`, `detail-mobile.png` y las otras capturas del flujo. El detector del refinamiento se ejecutó una vez: 82 avisos advisory de tamaños/paleta frente al sistema anterior y cero warnings; archivo `refinement-detector.json`. La documentación de diseño se actualiza al sistema realmente entregado. La revisión nueva se registra separadamente en `refinement-review.md`: disposition ship, sin hallazgos materiales, con las ocho capturas inspeccionadas. El veredicto previo no se atribuye a esta interfaz corregida.

## Gates y evidencia de la base funcional

| Comando real | Resultado | Alcance |
| --- | --- | --- |
| npm run check | Exit 0 | TypeScript y compilación de producción después de la última modificación de implementación: KPIs accionables y encabezado del detalle. Rutas /, /propuestas y API snapshots. |
| npm run test:inventory | Exit 0 | 10 pruebas Python del lector y controles independientes de métricas, filtros relacionados, severidad combinada, comparación y CSV, después de la última modificación de lógica. |
| npm run test:dashboard | Exit 0 | Flujo de navegador en compilación de producción con SQLite temporal, después del último cambio de implementación. Nueve grupos de comprobación, cero errores de consola registrados. |
| npm run test:ui | Exit 0 | Comparador original tras migrarlo a /propuestas: 24 propuestas × cuatro pantallas × escritorio/móvil, cero errores y desbordamientos. Las correcciones posteriores se limitaron al dashboard aislado y su lógica. |

No existe configuración CI en el repositorio; no se atribuyen estos resultados a un CI remoto.

## Casos probados

- Importación del archivo original mediante UI: 246 servidores, 3,450 hallazgos; 2,875 pendientes, 561 pendientes de severidad 4–5 y 257 pendientes con SLA incumplido.
- Historial SQLite y registros conservados al recargar; adicionalmente, el servidor del usuario se reinició y la API conservó el ejemplo con 246/3,450.
- KPIs que abren registros coincidentes: 561 para niveles 4–5 pendientes, 257 pendientes vencidos y conservación de un alcance más estrecho Norte + nivel 5 (90 registros).
- Selección del atlas mediante teclado, filtrado desde heatmap, estado, búsqueda sin distinción de mayúsculas, restablecimiento, paginación, detalle y cierre mediante Escape.
- Exportación CSV con las 246 filas del inventario filtrado, no solo la página visible. Control independiente de comillas y prefijo para evitar interpretación como fórmulas.
- Rechazo de Excel malformado y duplicado sin añadir cortes. Pruebas negativas con Excel estructuralmente válido y severidad inválida, hallazgo duplicado, servidor inexistente, columna ausente, valor vacío, estado desconocido, fórmula con valor cacheado y encabezado duplicado. Inventario con cero hallazgos aceptado.
- Segundo Excel generado en memoria desde una copia del original: un hallazgo pasó a remediado, otro volvió a pendiente, apareció un ID nuevo y faltó otro. La comparación distinguió los cuatro cambios; no clasificó ausencia como remediación.
- Cinco pantallas sin desbordamiento de documento a 390px; tablas con desplazamiento dentro de su contenedor. Capturas de panorama a 1440 y 390px.

Las pruebas del dashboard usan un servidor propio en 3041 y una carpeta temporal de datos que eliminan al finalizar. No dejan revisiones ficticias de prueba en el historial del usuario. Su ejemplo permanece como único corte local, sin fecha de referencia inventada.

## Revisión visual de la entrega anterior

El detector Impeccable se ejecutó una vez. Su aviso de animación de width se corrigió retirando la transición. Los avisos de paleta y tamaños frente a la documentación anterior se trataron como una ampliación intencional de la identidad FEMSA elegida, documentada en DESIGN.md y su sidecar.

La revisión completa pidió dos ajustes materiales: KPIs que conduzcan a su alcance de registros y un encabezado único en el detalle. El pase de veredicto puntuó ambos como resueltos, disposition ship. Ese veredicto cubre los dos ajustes; no es una certificación completa de accesibilidad. Una primera evidencia con barras fijas desplazadas se descartó y reemplazó por capturas desde scroll 0 antes de revisar.

Evidencia reproducible en .impeccable/review/dashboard/verification.json, finish-review.md y finish-verdict.md. Capturas: desktop.png, mobile.png, empty.png, imports-mobile.png, servers-desktop.png, compare-desktop.png y detail-desktop.png. Evidencia del comparador anterior en .impeccable/review/verification.json.

## Límites del análisis

Los datos aportados son ficticios. El Excel no tiene países ni coordenadas. Por instrucción posterior del usuario, el globo representa Norte en EUA, Centro en México y Sur en Brasil como referencias del simulador, con destellos ilustrativos; no son ubicación de activos ni tráfico o ataques detectados. Las edades y capacidades son bandas y no permiten días exactos o unidades confirmadas. Los campos sin diccionario conservan interpretaciones provisionales visibles en Criterios del análisis. Los IDs deben mantenerse estables para comparar. Un corte sin fecha o una referencia posterior no se presenta como mejora cronológica.

El historial conserva registros normalizados, metadata y huella de cada carga, no el archivo XLSX original. Persistencia en data/inventory.sqlite, servidor local, sin cuentas. Requiere Node compatible con node:sqlite y Python 3.
