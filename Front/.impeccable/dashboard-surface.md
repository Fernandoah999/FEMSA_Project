# Dashboard local de infraestructura

Mode: Operate. Refinamiento solicitado explícitamente tras revisar la primera implementación: tipografía mayor, menos información simultánea, indicadores principales conservados y secundarios desplegables, preguntas descriptivas, detalle de servidor amplio y sustitución del atlas por el globo suministrado.

## Direction contract
THESIS: Identificar qué requiere atención mediante cuatro cifras principales y preguntas concretas; el resto se consulta al desplegar o abrir registros.
OWN-WORLD: Se conserva identidad FEMSA, vino #990033, fondo #f6f5f4 y Calibri/Carlito/Arial. Cuerpo 16px, controles 14–16px, metadatos 13–14px, secciones 21–23px, título 32–36px, indicadores 43–64px. Atlas Mono solo para IDs.
STORY: Reconocer la severidad y el plazo, elegir una pregunta o región, investigar registros y abrir una ficha amplia. Importación, historial y comparación permanecen disponibles.
FIRST VIEWPORT: Cuatro KPIs grandes y enlazados; región como único filtro operativo inicial; globo de puntos centrado en América, junto a preguntas de priorización. El mapa de calor, tablas prioritarias, antigüedad, remediación y calidad empiezan cerrados.
FORM: Refinamiento de FEMSA V1/V3 fijado por el usuario; no hay nueva semilla ni comp aprobado. El usuario rechazó la densidad/tipo anteriores y aportó RouteGlobe como referencia de componente. Sus requisitos prevalecen sobre la disposición previa.
SIGNATURE INTERACTION: Globo Canvas 3D de puntos: tres puntos blancos, líneas con cometas y destellos que recorren la superficie de EUA, México y Brasil. Norte → EUA, Centro → México, Sur → Brasil, correspondencia explícita del usuario. Arrastre, giro lento, pausa, centrar América y movimiento reducido; selección accesible por puntos y botones regionales enlaza los filtros.
CONTENT: Las ubicaciones son referencias del simulador, no datos geográficos del archivo. Las líneas/destellos son ilustrativos, no tráfico o ataques. Los KPIs se conservan, los secundarios se despliegan. Títulos interrogativos explican lo que responde cada vista.
DETAIL: Diálogo centrado de hasta 1240px y casi toda la altura; pantalla completa móvil. Encabezado/cierre persistentes, resumen, contexto operativo, tabla de hallazgos y ficha técnica desplegable con todos los campos. Un hallazgo permite volver al servidor.
STATES: Cargas/validación existentes, sin coincidencias, filtros activos/restablecer, análisis cerrado/abierto, globo en movimiento/pausado, detalle con pendientes/todos/remediados. Ninguna dependencia de mapas externos.
RESPONSIVE: Escritorio 1440px; móvil 390px con KPIs en dos columnas, paneles apilados y detalle a pantalla completa. Tablas con scroll local.
BUILD PATH: code, hereda el mundo FEMSA y adapta el componente suministrado. Sin comp de fidelidad literal.
FINISH: Gate real, navegador escritorio/móvil, prueba de animación/pausa/arrastre, revisión de evidencia y documentación final.

## Ajuste de lectura y navegación
Solicitud posterior: celdas principales 20px, contexto 17px, IDs 19px, cabeceras 17px, filtros y dropdowns 18px; conservar esos tamaños en móvil. La fila completa abre el registro y el botón nativo de detalle conserva el acceso con teclado. Sidebar expandido de 280px, ancho ajustable entre 248 y 360px, contraído de 88px y panel modal móvil hasta 960px. No se muestra el enlace a propuestas originales. Los selectores de filtros, cortes y orden comparten dropdown animado con teclado y cierre exterior. Cambiar de pestaña anima únicamente el contenido durante 240ms y restablece su desplazamiento; movimiento reducido desactiva esas animaciones.

## Panorama con acordeón Radix
Los cinco análisis secundarios usan el componente Radix compartido por el usuario, con cabecera de 23px, descripción de 17px, borde de 2px y tinte vino al abrir. Solo uno puede permanecer abierto. Se aprovecha el área bajo las preguntas para colocar indicadores complementarios y calidad del corte; los tres análisis más amplios conservan todo el ancho debajo del globo y las preguntas. El área de calidad existe también sin observaciones, explicando el resultado de validación. No se agregan KPIs ni cifras decorativas para llenar espacio. Apertura/cierre suaves y teclado; movimiento reducido respetado.

## Cifras y selección regional
Los cuatro KPIs reproducen una decodificación numérica finita de 620ms al cambiar de región y al montar de nuevo Panorama. No hay ciclo permanente. Los nombres accesibles conservan los valores reales y movimiento reducido fija las cifras inmediatamente. El país de referencia seleccionado se centra, tiene relleno vino, contorno blanco de 2.1px y puntos mayores, mientras el resto se atenúa. Se muestra su etiqueta seleccionada y se conserva la aclaración de referencia ilustrativa.
