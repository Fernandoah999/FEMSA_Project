# Procedencia de recursos

- `public/references/47.webp` a `52.webp`: referencias seleccionadas de `/home/aguirreh/AfterAI/WebDesignInspo/public/images/`. Orbit, Earth Ops, Pandemic, Tracking, Territory OS e IoT Atlas, respectivamente. Se muestran como referencias, no como interfaces implementadas ni creaciones propias.
- `public/references/estrato.webp`: `/home/aguirreh/AfterAI/WebDesignInspo/public/images/generated/estrato.webp`. Concepto marcado como generado con IA en el catálogo original.
- `public/femsa-logo.png`: renderizado y recorte del logotipo de la página física 11 del manual proporcionado por el usuario. Se mantienen colores y proporción. El manual no se publica.
- `public/data/countries.json`: cartografía de Natural Earth distribuida en world-atlas 2, https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json. Datos geográficos Natural Earth de dominio público, https://www.naturalearthdata.com/about/terms-of-use/. La proyección y los nodos se dibujan localmente; no hay servicio externo de mapas.
- `public/fonts/mono.ttf`: fuente monoespaciada de la biblioteca local. Atribución y licencia original en `public/fonts/ATTRIBUTION-iA-Writer.txt`.
- Iconos: Lucide, incluidos a través de `lucide-react` (ISC).
- `public/textures/earth-day.jpg` y `earth-night.png`: texturas terrestres de los ejemplos públicos de Three.js, https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg y https://threejs.org/examples/textures/planets/earth_lights_2048.png. Se proyectan localmente en Canvas sobre una esfera ortográfica para Earth Ops/Pandemic; no representan infraestructura FEMSA.
- Globos, curvas, gráficos y curvas de nivel: geometría SVG dibujada a partir de cartografía y datos sintéticos en el frontend. No son mapas reales de riesgo.

Los archivos de procedencia `.webp.json` y los metadatos PNG se generaron mediante Impeccable. Ningún dato de infraestructura proviene de FEMSA.

## Globo del dashboard

- `src/lib/globe-land.json`: 6,923 puntos muestreados de la cartografía Natural Earth ya existente en `public/data/countries.json`. Se reproduce con `node scripts/build-globe-land.mjs`; no requiere conexiones externas. Las marcas numéricas del archivo distinguen EUA, México y Brasil para iluminar su superficie.
- `src/components/route-globe.tsx` y `route-globe-utils/globe.ts`: adaptación del componente Route Globe pegado por el usuario en la conversación. Se completaron las utilidades ausentes y se adaptaron rutas, puntos, pausa, arrastre y movimiento reducido al dashboard. No se añadió un paquete externo.
- La correspondencia Norte → EUA, Centro → México y Sur → Brasil fue solicitada por el usuario. Es una referencia del simulador, no una ubicación contenida en el Excel. Las líneas, cometas y ondas de puntos son animaciones ilustrativas; no son tráfico ni ataques detectados.

## Navegación y selectores

- `inventory-sidebar.tsx`: adaptación de los ejemplos de sidebar, panel móvil y navegación contraíble aportados por el usuario. Conserva las rutas del dashboard y agrega ajuste de ancho con puntero y teclado; usa componentes React y diálogo nativo, sin dependencias nuevas.
- `animated-dropdown.tsx` y su módulo CSS: adaptación del Animated Dropdown atribuido a @emerald-ui, versión 1.0.0, licencia MIT, https://emerald-ui.com, compartido por el usuario. Sustituye enlaces de demostración por selección de valores, conserva apertura animada y cierre exterior, y agrega navegación con teclado, selección activa y capa popover nativa para evitar recortes. No requiere Framer Motion ni Tailwind.

- `analysis-accordion.tsx` y su CSS: adaptación del acordeón Radix compartido por el usuario, con la dependencia `@radix-ui/react-accordion` (MIT). Referencia de API: https://www.radix-ui.com/primitives/docs/components/accordion. Se conserva la interacción de un único panel expandido y se adapta a la identidad FEMSA sin Tailwind ni utilidades adicionales.

- `text-decoder.tsx`: adaptación del TextDecoder compartido por el usuario para cifras. Conserva los separadores numéricos, ejecuta una decodificación finita por cambio de alcance y respeta movimiento reducido; los nombres accesibles siempre contienen el valor real.
- `src/lib/globe-countries.json`: contornos de EUA, México y Brasil derivados de la misma cartografía Natural Earth ya atribuida. Se regenera junto a los puntos con `node scripts/build-globe-land.mjs`. El resaltado proyecta esos contornos sobre el globo; son referencias del simulador, no ubicaciones de servidores.
