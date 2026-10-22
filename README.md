# FEMSA · Atlas de infraestructura

Aplicación **fullstack local** para analizar un inventario de servidores y sus vulnerabilidades a partir de archivos Excel. Su propósito es ayudar a responder **qué requiere atención primero, dónde se acumulan los hallazgos y qué cambió entre dos revisiones**, con filtros, indicadores y detalle de cada registro.

Es un proyecto académico construido con **datos ficticios**. El repositorio incluye un Excel de ejemplo con 246 servidores y 3,450 hallazgos para probar el flujo completo.

## Qué permite hacer

- Importar y validar Excel con las hojas `Servidores` y `Vulnerabilidades`.
- Consultar indicadores de hallazgos pendientes, severidad y plazos de atención.
- Filtrar por región, ambiente, sistema operativo, estado, severidad y otros atributos.
- Explorar tablas, mapa de calor y fichas amplias de servidores y hallazgos.
- Conservar las cargas y comparar cortes, distinguiendo registros nuevos, ausentes, remediados y reabiertos.
- Exportar todos los registros filtrados a CSV.

El globo 3D usa referencias visuales definidas para el simulador: **Norte en EUA, Centro en México y Sur en Brasil**. El Excel no contiene esas ubicaciones. Las líneas y destellos son ilustrativos y no representan tráfico ni ataques detectados.

## Arquitectura

| Parte | Implementación |
| --- | --- |
| Frontend | Next.js, React y TypeScript: dashboard e interacciones. |
| Backend | Rutas API de Next.js: reciben los Excel, validan y recuperan las cargas. |
| Lector de Excel | Python 3 con su biblioteca estándar; no necesita paquetes de Python adicionales. |
| Almacenamiento | SQLite integrado en Node.js; se crea automáticamente en el equipo. |

**Frontend y backend están dentro de `Front/`.** El nombre de la carpeta se conserva desde el prototipo inicial; contiene la aplicación completa. No hace falta iniciar un backend por separado, instalar un servidor de base de datos ni crear cuentas.

## Requisitos

- **Node.js 22.18 o posterior**, con npm. Puedes comprobarlo con `node --version` y `npm --version`.
- **Python 3.10 o posterior**. Por defecto la app ejecuta `python3`; comprueba `python3 --version`.
- Git y un navegador actualizado.

No se requieren claves API, variables de entorno ni dependencias Python para la configuración habitual. Todo el procesamiento y almacenamiento ocurre en el equipo; la instalación inicial de npm necesita acceso a Internet.

## Ejecutar en local

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

## Primera prueba con el Excel incluido

1. En la pantalla inicial, pulsa **Cargar Excel de ejemplo**.
2. La app valida y guarda el archivo incluido en `OneDrive_1_10-6-2026/`.
3. Explora los cuatro indicadores principales. Al seleccionar uno se abren los registros correspondientes.
4. Usa las preguntas de priorización, selecciona una región o despliega los análisis secundarios.
5. En **Servidores**, abre un registro para consultar su contexto, hallazgos y ficha técnica completa.

El ejemplo se registra **sin fecha de referencia**, porque su contenido no indica una fecha de corte. No necesita configuración adicional.

## Cargar y comparar tus archivos

1. Entra a **Cargas de datos** y selecciona o arrastra un `.xlsx` de hasta **20 MB**.
2. Asigna un nombre y la **fecha que representan los datos**; la fecha de importación se registra por separado.
3. Pulsa **Validar y guardar corte**. La app muestra los errores que impiden importarlo y conserva las observaciones de consistencia de las cargas aceptadas.
4. Cambia de corte con **Corte activo**.
5. Con dos cargas guardadas, abre **Comparar cortes** y elige el corte de referencia.

Cada Excel debe conservar las dos hojas y sus **17 columnas de servidores y 20 de vulnerabilidades**. Los encabezados pueden estar dentro de las primeras 25 filas; en el ejemplo están en la fila 4. Se rechazan campos requeridos vacíos, categorías no admitidas, IDs duplicados, servidores inexistentes y fórmulas en las columnas del contrato.

La comparación necesita identificadores `ServerID` y `FindingID` estables entre archivos. Un hallazgo que deja de aparecer se presenta como **ausente**, no se da por remediado. El mismo archivo para la misma fecha no se guarda dos veces.

Consulta el [contrato y documentación técnica](Front/README.md) o el [lector y sus columnas admitidas](Front/scripts/read-inventory.py) para preparar otros archivos.

## Dónde se guardan los datos

Las cargas se conservan en:

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
npm run test:inventory
```

Las pruebas del inventario esperan el comando `python3`. Si tu sistema solo ofrece `python`, necesitarás que `python3` resuelva al mismo intérprete para ejecutar esta suite opcional. Para el uso normal del dashboard basta con `FEMSA_PYTHON`, como se explica arriba.

Las pruebas de navegador son opcionales y requieren Chromium. En el equipo de desarrollo se utiliza `/usr/bin/chromium`:

```bash
npm run test:dashboard
```

Este comando requiere una compilación previa (`npm run check`), inicia un servidor de pruebas en **3041** y utiliza una base temporal. Comprueba carga, persistencia, filtros, comparación, exportación, escritorio/móvil y el comportamiento del globo. No modifica las cargas del usuario. Puedes cambiar el ejecutable con `CHROMIUM_PATH` y el puerto de pruebas con `FEMSA_TEST_PORT`.

## Estructura

```text
FEMSA_Project/
├── README.md
├── Front/
│   ├── src/app/                  # Páginas y API local
│   ├── src/components/           # Dashboard, detalle y globo
│   ├── src/lib/                  # Filtros, métricas y persistencia
│   ├── public/                   # Recursos locales
│   ├── scripts/                  # Lector Excel y comprobaciones
│   ├── data/                     # SQLite local; ignorado por Git
│   └── package.json
└── OneDrive_1_10-6-2026/
    └── Dataset Académico Parches en Servidores.xlsx
```

Las 24 propuestas visuales del prototipo original siguen disponibles en **[http://localhost:3040/propuestas?style=femsa&v=1](http://localhost:3040/propuestas?style=femsa&v=1)**. El dashboard actual está en `/`.

## Alcance del proyecto

La herramienta analiza los hallazgos entregados por el Excel: **no escanea servidores, no instala parches y no consulta fuentes CVE**. La severidad conserva los niveles 1–5 del archivo. Las edades son rangos, por lo que no se calculan días exactos ni tiempos medios de remediación. Los campos sin diccionario tienen interpretaciones provisionales visibles en **Criterios del análisis**.

El repositorio incluye el código, los recursos necesarios y el Excel ficticio utilizado por la app. Excluye bases locales, dependencias instaladas, compilaciones y las presentaciones u otros archivos de trabajo ajenos al flujo del dashboard. La procedencia de los recursos visuales se documenta en [ASSETS.md](Front/ASSETS.md).
