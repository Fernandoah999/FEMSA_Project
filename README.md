# FEMSA · Atlas de infraestructura

Aplicación **fullstack local** para analizar un inventario de servidores y sus vulnerabilidades a partir de archivos Excel. Su propósito es ayudar a responder **qué requiere atención primero, dónde se acumulan los hallazgos y qué cambió entre dos revisiones**, con filtros, indicadores y detalle de cada registro.

Es un proyecto académico. El repositorio distribuye el frontend, el backend y sus recursos: **no incluye archivos Excel ni bases de datos**. Cada persona carga sus propios archivos con el formato admitido.

## Qué permite hacer

- Importar y validar Excel con las hojas `Servidores` y `Vulnerabilidades`.
- Consultar indicadores de hallazgos pendientes, severidad y plazos de atención.
- Filtrar por región, ambiente, sistema operativo, estado, severidad y otros atributos.
- Explorar tablas, mapa de calor y fichas amplias de servidores y hallazgos.
- Conservar las cargas y comparar cortes, distinguiendo registros nuevos, ausentes, remediados, reabiertos y reasignados.
- Exportar todos los registros filtrados a CSV y descargar reportes ejecutivo y técnico en PDF.

El globo 3D marca los países reportados en el Excel y filtra el alcance al seleccionarlos. Los cortes con agrupación exclusivamente regional usan referencias ilustrativas en EUA, México y Brasil para Norte, Centro y Sur.

El [guion de la demo](docs/Guion-demo-FEMSA.docx) distribuye la presentación entre cinco personas e incluye el contrato del Excel y un banco de preguntas técnicas.

## Arquitectura

| Parte | Implementación |
| --- | --- |
| Frontend | Next.js, React y TypeScript: dashboard e interacciones. |
| Backend | Rutas API de Next.js: reciben los Excel, validan y recuperan las cargas. |
| Lector de Excel | Python 3 con su biblioteca estándar; no necesita paquetes de Python adicionales. |
| Almacenamiento | SQLite integrado en Node.js; se crea automáticamente en el equipo. |

**Frontend y backend están dentro de `Front/`.** El nombre de la carpeta se conserva desde el prototipo inicial; contiene la aplicación completa. No hace falta iniciar un backend por separado, instalar un servidor de base de datos ni crear cuentas.

## Ejecutar con Docker

Requiere un equipo con Docker Engine y Docker Compose, o Docker Desktop configurado para contenedores Linux. Desde la raíz del repositorio:

```bash
git clone https://github.com/Fernandoah999/FEMSA_Project.git
cd FEMSA_Project
docker compose up -d --build --wait
```

Abre [http://127.0.0.1:3040](http://127.0.0.1:3040). Compose publica el puerto en la interfaz local del equipo. La imagen `femsa-atlas:0.1.0` incluye Node.js, Python y una compilación de producción de Next.js. El contenedor corre con el usuario `node`.

SQLite queda en el volumen `inventory-data`, montado en `/app/data`. El volumen conserva los cortes al detener o recrear el contenedor. La primera instalación empieza vacía.

```bash
docker compose ps
docker compose logs -f atlas
docker compose down
```

Si el puerto **3040** está ocupado, define `FEMSA_HOST_PORT` antes de iniciar Compose. Por ejemplo, `FEMSA_HOST_PORT=3042 docker compose up -d --wait` en Linux/macOS o `$env:FEMSA_HOST_PORT = "3042"` en PowerShell antes de ejecutar Compose.

### Transferir la imagen a otro equipo

Descarga de [Releases](https://github.com/Fernandoah999/FEMSA_Project/releases) el archivo de imagen para la arquitectura del equipo. Copia el archivo al destino y ejecuta desde la carpeta que contiene `compose.yaml`:

```bash
docker image load --input femsa-atlas-0.1.0-linux-amd64.tar.gz
docker compose up -d --no-build --pull never --wait
```

La carga de la imagen funciona sin Internet. Para reconstruirla desde el código se necesita acceso a Docker Hub, Debian y npm. En el equipo de FEMSA, TI debe validar el runtime de contenedores, la arquitectura y el almacenamiento. La configuración de uso local confía en el acceso al equipo. Un servicio compartido requiere definir autenticación, autorización, TLS y respaldos antes de publicarlo en la red.

### Respaldar los cortes Docker

Detén el servicio para copiar la carpeta SQLite completa y vuelve a iniciarlo:

```bash
docker compose stop atlas
docker compose cp atlas:/app/data ./respaldo-femsa
docker compose start atlas
```

## Requisitos sin Docker

- **Node.js 22.18 o posterior**, con npm. Puedes comprobarlo con `node --version` y `npm --version`.
- **Python 3.10 o posterior**. Por defecto la app ejecuta `python3`; comprueba `python3 --version`.
- Git y un navegador actualizado.

No se requieren claves API, variables de entorno ni dependencias Python para la configuración habitual. Todo el procesamiento y almacenamiento ocurre en el equipo; la instalación inicial de npm necesita acceso a Internet.

## Ejecutar en local sin Docker

Desde una terminal:

```bash
git clone https://github.com/Fernandoah999/FEMSA_Project.git
cd FEMSA_Project/Front
npm ci
npm run dev
```

Abre **[http://localhost:3040](http://localhost:3040)**.

El servidor escucha únicamente en `127.0.0.1`, en el puerto **3040**. Mantén la terminal abierta mientras usas la app. Para detenerla, presiona **Ctrl+C**.

### Si tu comando de Python es `python`

En Windows suele utilizarse `python` en lugar de `python3`. Antes de iniciar la app, indica el ejecutable.

**PowerShell:**

```powershell
$env:FEMSA_PYTHON = "python"
npm run dev
```

**Linux/macOS, si corresponde:**

```bash
FEMSA_PYTHON=python npm run dev
```

La misma variable se puede usar con `npm start`. Puedes asignarle la ruta completa de Python si no está en el `PATH`.

## Cargar y comparar tus archivos

1. Entra a **Cargas de datos** y selecciona o arrastra un `.xlsx` de hasta **20 MB**.
2. Asigna un nombre y la **fecha que representan los datos**; la fecha de importación se registra por separado.
3. Pulsa **Validar y guardar corte**. La app muestra los errores que impiden importarlo y conserva las observaciones de consistencia de las cargas aceptadas.
4. Cambia de corte con **Corte activo**.
5. Con dos cargas guardadas, abre **Comparar cortes** y elige el corte de referencia.

Cada Excel debe conservar las dos hojas y sus **17 columnas de servidores y 20 de vulnerabilidades**. Los encabezados pueden estar dentro de las primeras 25 filas. Se rechazan campos requeridos vacíos, categorías no admitidas, IDs duplicados, servidores inexistentes y fórmulas en las columnas del contrato.

En la hoja Servidores puedes agregar la columna opcional `País` (`Country` o `CountryCode`). El globo reconoce nombres en español o inglés y códigos ISO 3166-1. Seleccionar un país actualiza los indicadores y las tablas.

En **Cumplimiento del SLA** puedes configurar 7, 30, 90 o 180 días por criticidad del servidor. La política se guarda en el navegador y se aplica al panorama, los filtros, los reportes y la comparación.

La comparación necesita identificadores `ServerID` y `FindingID` estables entre archivos. Un hallazgo que deja de aparecer se presenta como **ausente**, no se da por remediado. El mismo archivo para la misma fecha no se guarda dos veces.

Consulta el [contrato y documentación técnica](Front/README.md) o el [lector y sus columnas admitidas](Front/scripts/read-inventory.py) para preparar otros archivos.

## Dónde se guardan los datos

Con Docker, los cortes se guardan en el volumen de Compose. Con Node.js local, las cargas se conservan en:

```text
Front/data/inventory.sqlite
```

La base se crea automáticamente y permanece al cerrar el navegador o reiniciar la app. Se guardan registros importados, metadata y la huella del archivo; no se almacena el Excel original. La base local **no se publica en GitHub**, por lo que una instalación nueva empieza sin cargas.

Para volver a ejecutar la aplicación después de instalarla:

```bash
cd FEMSA_Project/Front
npm run dev
```

## Compilación de producción local

Desde `Front/`, con el servidor de desarrollo detenido:

```bash
npm run check
npm start
```

`check` genera los tipos de Next.js, comprueba TypeScript y construye la app. `start` usa esa compilación y el mismo puerto **3040**. Ejecuta desarrollo o producción, uno a la vez.

## Comprobaciones

Desde `Front/`:

```bash
npm run check
```

Las suites opcionales `npm run test:inventory` y `npm run test:dashboard` usan un archivo de referencia privado que **no se distribuye en este repositorio**. Para ejecutarlas, proporciona localmente el archivo original en `OneDrive_1_10-6-2026/Dataset Académico Parches en Servidores.xlsx`; comprueban los conteos y cambios conocidos de ese fixture y no admiten cualquier Excel como sustituto. No es necesario para iniciar o usar la aplicación. Las pruebas del inventario esperan el comando `python3`. Si tu sistema solo ofrece `python`, necesitarás que `python3` resuelva al mismo intérprete para ejecutar esta suite opcional. Para el uso normal del dashboard basta con `FEMSA_PYTHON`, como se explica arriba.

Las pruebas de navegador son opcionales y requieren Chromium. En el equipo de desarrollo se utiliza `/usr/bin/chromium`:

```bash
npm run test:dashboard
```

Este comando requiere una compilación previa (`npm run check`), inicia un servidor de pruebas en **3041** y utiliza una base temporal. Comprueba carga, persistencia, filtros, comparación, exportación, escritorio/móvil y el comportamiento del globo. No modifica las cargas del usuario. Puedes cambiar el ejecutable con `CHROMIUM_PATH` y el puerto de pruebas con `FEMSA_TEST_PORT`.

## Estructura

```text
FEMSA_Project/
├── Dockerfile                   # Imagen de producción
├── compose.yaml                 # Contenedor y volumen persistente
├── docs/                        # Guion y banco de preguntas técnicas
├── README.md
└── Front/
    ├── src/app/                  # Páginas y API local
    ├── src/components/           # Dashboard, detalle y globo
    ├── src/lib/                  # Filtros, métricas y persistencia
    ├── public/                   # Recursos locales
    ├── scripts/                  # Lector Excel y comprobaciones
    ├── data/                     # SQLite local; ignorado por Git
    └── package.json
```

Las 24 propuestas visuales del prototipo original siguen disponibles en **[http://localhost:3040/propuestas?style=femsa&v=1](http://localhost:3040/propuestas?style=femsa&v=1)**. El dashboard actual está en `/`.

## Alcance del proyecto

La herramienta analiza los hallazgos entregados por el Excel: **no escanea servidores, no instala parches y no consulta fuentes CVE**. La severidad conserva los niveles 1–5 del archivo. Las edades son rangos, por lo que no se calculan días exactos ni tiempos medios de remediación. Los campos sin diccionario tienen interpretaciones provisionales visibles en **Criterios del análisis**.

El repositorio incluye el código y los recursos necesarios de la aplicación. Los archivos Excel, bases locales, dependencias instaladas, compilaciones, presentaciones y otros archivos de trabajo quedan excluidos por `.gitignore`. La procedencia de los recursos visuales se documenta en [ASSETS.md](Front/ASSETS.md).
