# FEMSA · Atlas de infraestructura

Dashboard local para importar el Excel académico de servidores y vulnerabilidades, explorar riesgos y comparar cortes persistentes. Next.js, React y TypeScript, API local, SQLite integrado en Node y lector XLSX en Python 3 sin paquetes adicionales.

## Ejecutar

La [guía de Docker](../README.md#ejecutar-con-docker) incluye la construcción de la imagen, el puerto local y la persistencia de SQLite.

Requiere Node.js 22.18 o posterior y Python 3.10 o posterior en PATH. Validado con Node 26.2.0 y Python 3 del equipo.

```bash
cd Front
npm ci
npm run dev
```

Abrir http://localhost:3040. El servidor se limita a `127.0.0.1`; no hay autenticación ni servicios externos. Para producción local: `npm run check` y después `npm start`. Desarrollo y producción usan el mismo puerto; ejecutar uno a la vez.

## Usar el dashboard

1. Pulsar **Importar mi Excel** o abrir **Cargas de datos** para seleccionar un archivo propio. La instalación empieza vacía; no se distribuyen archivos Excel ni bases de datos.
2. Indicar nombre y fecha que representan los datos. La fecha de importación se registra por separado.
3. Seleccionar el corte activo. Combinar filtros por región, país cuando el Excel lo incluye, ambiente, sistema operativo, estado, severidad, exposición, criticidad, categoría, antigüedad y SLA, además de búsqueda.
4. Seleccionar un país, una región o una celda del mapa de calor para filtrar. El globo marca los países de la hoja Servidores. Si el Excel solo trae RegionGroup, muestra referencias ilustrativas en EUA, México y Brasil para Norte, Centro y Sur.
5. Explorar tablas paginadas, abrir todos los campos del registro y exportar los registros filtrados a CSV; la exportación incluye todas las páginas.
6. En **Cumplimiento del SLA**, configurar los días permitidos por criticidad del servidor. La política se guarda en el navegador y se aplica a ambos cortes al comparar.
7. En **Comparar cortes**, elegir otra carga como referencia. Se separan IDs nuevos, ausentes, cambios a remediado, regreso a pendientes y cambios de servidor. Un ID ausente no equivale a remediación.

La navegación lateral se puede contraer y ajustar de ancho; en móvil se abre con **Menú**. Todas las filas de servidores y hallazgos abren su detalle al pulsar cualquier celda; el botón de detalle permite hacerlo con teclado. Los filtros, cortes y orden usan dropdowns animados con flechas, Inicio/Fin, Enter, Escape y cierre al pulsar fuera. Las pestañas tienen una transición breve, desactivada con movimiento reducido.

Al cambiar de región o volver a Panorama, las cifras principales muestran una breve decodificación y se fijan en el conteo real. La región seleccionada se centra y se resalta con relleno y contorno en el globo. Las animaciones respetan movimiento reducido.

En panorama, los análisis usan acordeones Radix con un panel abierto a la vez. Los indicadores complementarios y calidad del corte se encuentran bajo las preguntas; los análisis amplios conservan el ancho completo debajo del globo.

La identidad combina FEMSA V1 y V3, con tipografía mayor, cuatro indicadores principales y análisis secundarios desplegables. La ficha de servidor usa un espacio amplio en escritorio y pantalla completa móvil. Las 24 propuestas anteriores se conservan en http://localhost:3040/propuestas?style=femsa&v=1 y siguen usando los datos ficticios propios del mockup.

## Contrato de importación

- `.xlsx`, hasta 20 MB; máximo 10,000 servidores y 100,000 hallazgos. Contenido descomprimido hasta 150 MB y 3,000 entradas ZIP.
- Hojas `Servidores` y `Vulnerabilidades`. Se admite variación de mayúsculas en los nombres de hoja. Encabezados originales dentro de las primeras 25 filas.
- Las 17 columnas de servidores y las 20 de vulnerabilidades se enumeran en `scripts/read-inventory.py`, junto con las categorías admitidas. En Servidores, la columna opcional `País` (también `Country` o `CountryCode`) acepta nombres en español o inglés y códigos ISO 3166-1. Los valores vacíos o sin correspondencia se conservan sin marcador.
- Se rechazan campos vacíos, categorías no admitidas, IDs duplicados, referencias inexistentes y fórmulas en las columnas del contrato. Debe existir al menos un servidor; cero hallazgos es válido.
- Se conservan como observaciones las diferencias de volumen declarado, criticidad, orden de rangos de antigüedad y SLA incumplido en remediados. Columnas adicionales se ignoran con aviso.
- Mismo archivo y misma fecha: duplicado rechazado. Mismo archivo y distinta fecha: se conserva con observación.
- No se ejecutan fórmulas, macros ni conexiones. Se guardan los registros importados, metadata y huella SHA-256; no se almacena el archivo Excel original.

Los indicadores usan el detalle. Los pendientes son los hallazgos NEW, ACTIVE y REOPENED. El plazo por criticidad se expresa en días enteros desde 0. Un pendiente está dentro del plazo si todo su rango de antigüedad cabe en él. Está vencido si todo el rango lo supera. Queda indeterminado si el rango cruza el plazo o faltan datos. El estado SLA del Excel se conserva en la ficha técnica y el CSV. La severidad conserva los niveles 1–5 del Excel. Los rangos representan bandas de antigüedad. ComplianceFlag y EncryptionContext tienen interpretaciones provisionales en **Criterios del análisis**.

## Persistencia y API

SQLite guarda las cargas independientes en `Front/data/inventory.sqlite`, ignorado por Git. Cerrar el navegador o reiniciar no borra el historial. La comparación requiere FindingID estables entre archivos.

Variables opcionales: `FEMSA_DATA_DIR` para la carpeta de datos, `FEMSA_PYTHON` para el ejecutable Python y `CHROMIUM_PATH` para Chromium en la prueba del dashboard.

- `GET /api/snapshots`: metadata de cargas, más recientes primero.
- `GET /api/snapshots/[id]`: metadata y registros de un corte.
- `POST /api/snapshots`: multipart con file, name y referenceDate (YYYY-MM-DD). Requiere un archivo aportado por el usuario; no hay carga de ejemplo.

## Verificación

```bash
npm run check

# Opcionales: requieren el fixture privado descrito debajo.
npm run test:inventory
node scripts/test-sla.mjs
npm run test:dashboard
npm run test:ui
```

Las suites `test:inventory` y `test:dashboard` dependen del archivo original privado en `../OneDrive_1_10-6-2026/Dataset Académico Parches en Servidores.xlsx`, excluido de Git. Sus expectativas corresponden a ese fixture; no se ejecutan con un Excel arbitrario. Este archivo no es necesario para usar la app.

`check` genera los tipos de Next.js y ejecuta TypeScript y compilación de producción, también en una instalación limpia. `test:inventory` incluye 12 casos del lector (incluidos rechazos de datos dentro de Excel válidos) y controles de métricas, filtros, comparación y CSV. `test:dashboard` inicia producción en 127.0.0.1:3041 con una base temporal: prueba carga real, recarga, filtros, mapa por teclado, plazos por criticidad y exportación PDF, heatmap, tablas, CSV completo, errores, duplicados y comparación de dos Excel, en escritorio 1440px y móvil 390px. También comprueba tipografía mayor, análisis inicialmente cerrados, ficha amplia, orden por antigüedad y píxeles Canvas durante animación/pausa/arrastre. Si se indica `FEMSA_TEST_COMPARISON_XLSX` con el corte simulado de la demo, también verifica selección de país, gesto táctil y los cinco grupos de cambios. Usa una base temporal. Evidencia en `.impeccable/review/dashboard/`.

`test:ui` requiere el servidor activo en 3040 y recorre las 24 propuestas originales en /propuestas. No hay CI configurado; resultados actuales en VERIFICATION.md.

## Archivos principales

- src/components/inventory-dashboard.tsx y su CSS Module: dashboard, importación, historial, tablas y comparación.
- src/lib/inventory.ts: filtros, métricas, comparación y CSV.
- src/lib/inventory-store.ts: SQLite y subproceso Python.
- src/app/api/snapshots/: API de cargas.
- scripts/read-inventory.py: extracción y validación XLSX.
- src/components/atlas-app.tsx y src/lib/data.ts: comparador anterior, conservado.

Procedencia de los recursos existentes en ASSETS.md. No se agregaron imágenes ni fuentes nuevas. El globo adapta el componente Route Globe aportado por el usuario; genera puntos a partir de la cartografía local Natural Earth, sin servicio externo.
