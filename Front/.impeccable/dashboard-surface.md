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
