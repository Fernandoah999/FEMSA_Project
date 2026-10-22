export type StyleId =
  | "orbit"
  | "earth"
  | "pandemic"
  | "iot"
  | "territory"
  | "tracking"
  | "estrato"
  | "femsa";
export type PageId =
  "dashboard" | "servidores" | "vulnerabilidades" | "reportes";
export type Severity = "Crítica" | "Alta" | "Media" | "Baja";
export type Style = {
  id: StyleId;
  name: string;
  subtitle: string;
  color: string;
  reference: string;
  variants: [string, string, string];
  descriptions: [string, string, string];
};
export const styles: Style[] = [
  {
    id: "orbit",
    name: "Orbit",
    subtitle: "Estadística planetaria",
    color: "#ae8cff",
    reference: "47.webp",
    variants: ["Observatorio", "Constelación", "Horizonte"],
    descriptions: [
      "Planeta violeta, métricas periféricas y visión global del riesgo.",
      "Consola de activos con navegación superior y foco en la investigación.",
      "Exposición y remediación en una composición panorámica.",
    ],
  },
  {
    id: "earth",
    name: "Earth Ops",
    subtitle: "Operaciones globales",
    color: "#bbdf7d",
    reference: "48.webp",
    variants: ["Centro de mando", "Red continental", "Misión de actualización"],
    descriptions: [
      "Tierra nocturna y puntos de presencia con alertas de infraestructura.",
      "Operación regional con navegación compacta y selección de sedes.",
      "Campañas de actualización con objetivos y evolución.",
    ],
  },
  {
    id: "pandemic",
    name: "Pandemic",
    subtitle: "Exposición geoespacial",
    color: "#ff8278",
    reference: "49.webp",
    variants: ["Radar de exposición", "Sala de análisis", "Escenarios"],
    descriptions: [
      "Consola científica, distribución geográfica y concentración de riesgo.",
      "Investigación de hallazgos en una mesa de análisis de alta densidad.",
      "Comparación temporal de exposición y prioridades de mitigación.",
    ],
  },
  {
    id: "iot",
    name: "IoT Atlas",
    subtitle: "Telemetría de infraestructura",
    color: "#ff5454",
    reference: "52.webp",
    variants: ["Telemetría", "Matriz de nodos", "Control de cambios"],
    descriptions: [
      "Globo lineal, escalas radiales y datos de infraestructura.",
      "Retícula de servidores con estado y relaciones entre nodos.",
      "Cambios pendientes y trazabilidad en una consola roja y negra.",
    ],
  },
  {
    id: "territory",
    name: "Territory OS",
    subtitle: "Inteligencia regional",
    color: "#6ed9eb",
    reference: "51.webp",
    variants: [
      "Atlas de riesgo",
      "Distrito operativo",
      "Capas de infraestructura",
    ],
    descriptions: [
      "Mapa regional con capas, activos e indicadores de cobertura.",
      "Selección de sedes y exploración del inventario por territorio.",
      "Estratos de riesgo conectados a las prioridades de actualización.",
    ],
  },
  {
    id: "tracking",
    name: "Tracking",
    subtitle: "Trazabilidad de actualizaciones",
    color: "#eed66a",
    reference: "50.webp",
    variants: ["Ruta de remediación", "Inventario en tránsito", "Bitácora"],
    descriptions: [
      "Lista de intervención y mapa de conexiones en grafito y amarillo.",
      "Inventario operativo compacto, trazabilidad y detalle inmediato.",
      "Seguimiento de campañas y ventanas de mantenimiento.",
    ],
  },
  {
    id: "estrato",
    name: "Estrato",
    subtitle: "Los datos como paisaje",
    color: "#a33929",
    reference: "estrato.webp",
    variants: ["Paisaje de riesgo", "Archivo técnico", "Informe abierto"],
    descriptions: [
      "Superficie marfil, curvas de nivel y lectura editorial del riesgo.",
      "Archivo de activos con una estructura tipográfica precisa.",
      "Auditoría como informe vivo, con evidencia y acciones ordenadas.",
    ],
  },
  {
    id: "femsa",
    name: "FEMSA",
    subtitle: "Identidad corporativa",
    color: "#990033",
    reference: "",
    variants: [
      "Visión corporativa",
      "Operación integrada",
      "Decisiones con evidencia",
    ],
    descriptions: [
      "Vino corporativo, blanco y un resumen ejecutivo claro.",
      "Espacio de trabajo corporativo para auditar y priorizar activos.",
      "Informe de gestión con exposición, responsables y próximos pasos.",
    ],
  },
];
export const regions = [
  {
    id: "mx",
    name: "México",
    city: "Monterrey",
    coords: [-100.3, 25.7] as [number, number],
    total: 5280,
    critical: 186,
    health: 76,
  },
  {
    id: "br",
    name: "Brasil",
    city: "São Paulo",
    coords: [-46.6, -23.5] as [number, number],
    total: 3420,
    critical: 124,
    health: 82,
  },
  {
    id: "co",
    name: "Colombia",
    city: "Bogotá",
    coords: [-74.1, 4.7] as [number, number],
    total: 1860,
    critical: 67,
    health: 85,
  },
  {
    id: "cl",
    name: "Chile",
    city: "Santiago",
    coords: [-70.7, -33.4] as [number, number],
    total: 1240,
    critical: 29,
    health: 91,
  },
  {
    id: "ar",
    name: "Argentina",
    city: "Buenos Aires",
    coords: [-58.4, -34.6] as [number, number],
    total: 680,
    critical: 22,
    health: 89,
  },
];
export type Server = {
  id: string;
  name: string;
  ip: string;
  region: string;
  unit: string;
  software: string;
  version: string;
  target: string;
  severity: Severity;
  cvss: number;
  findings: number;
  owner: string;
  status: string;
  os: string;
};
const names = [
  "MTY-PROD-DB",
  "SP-DATA-CORE",
  "BOG-APP-WEB",
  "MTY-EDGE-GW",
  "SCL-PROD-API",
  "BA-CORE-DB",
  "MTY-BATCH-01",
  "SP-WEB-EDGE",
  "BOG-SAP-CORE",
  "SCL-OBS-NODE",
  "MTY-INTRA-01",
  "SP-CACHE-01",
];
export const servers: Server[] = names.map((name, i) => ({
  id: `SRV-${String(1042 + i).padStart(5, "0")}`,
  name,
  ip: `10.${20 + i}.4.${12 + i}`,
  region: [
    "mx",
    "br",
    "co",
    "mx",
    "cl",
    "ar",
    "mx",
    "br",
    "co",
    "cl",
    "mx",
    "br",
  ][i],
  unit: ["Corporativo", "Coca-Cola FEMSA", "OXXO", "Logística"][i % 4],
  software: [
    "PostgreSQL",
    "Apache HTTP",
    "Node.js",
    "OpenSSL",
    "Nginx",
    "PostgreSQL",
    "OpenJDK",
    "Apache HTTP",
    "OpenJDK",
    "Nginx",
    "Node.js",
    "Redis",
  ][i],
  version: [
    "12.8",
    "2.4.49",
    "16.13.0",
    "1.1.1k",
    "1.20.0",
    "13.4",
    "11.0.12",
    "2.4.50",
    "8u292",
    "1.22.0",
    "18.0.0",
    "6.2.1",
  ][i],
  target: [
    "16.4",
    "2.4.62",
    "22.8.0",
    "3.3.2",
    "1.26.2",
    "16.4",
    "21.0.4",
    "2.4.62",
    "21.0.4",
    "1.26.2",
    "22.8.0",
    "7.4.0",
  ][i],
  severity: (
    [
      "Crítica",
      "Crítica",
      "Alta",
      "Crítica",
      "Alta",
      "Media",
      "Alta",
      "Alta",
      "Media",
      "Baja",
      "Media",
      "Baja",
    ] as Severity[]
  )[i],
  cvss: [9.8, 9.8, 8.1, 9.1, 7.5, 5.9, 8.2, 7.8, 6.5, 3.7, 5.3, 3.1][i],
  findings: [14, 9, 7, 11, 5, 3, 6, 4, 3, 1, 2, 1][i],
  owner: [
    "Infraestructura MX",
    "Plataformas BR",
    "Operaciones CO",
    "Seguridad TI",
  ][i % 4],
  status: [
    "Pendiente",
    "Pendiente",
    "En revisión",
    "Pendiente",
    "Programada",
    "En revisión",
  ][i % 6],
  os: [
    "Red Hat Enterprise Linux 8",
    "Ubuntu Server 20.04",
    "Windows Server 2019",
  ][i % 3],
}));
export const vulnerabilities = [
  {
    id: "DEMO-CVE-001",
    title: "Ejecución remota de código",
    software: "Apache HTTP",
    severity: "Crítica" as Severity,
    cvss: 9.8,
    affected: 142,
    vector: "Red · sin autenticación",
    fix: "Actualizar a la versión aprobada y restringir acceso externo.",
  },
  {
    id: "DEMO-CVE-002",
    title: "Elevación de privilegios",
    software: "PostgreSQL",
    severity: "Crítica" as Severity,
    cvss: 9.8,
    affected: 186,
    vector: "Local · privilegios bajos",
    fix: "Aplicar el parche validado y revisar los roles de base de datos.",
  },
  {
    id: "DEMO-CVE-003",
    title: "Exposición de información sensible",
    software: "OpenSSL",
    severity: "Crítica" as Severity,
    cvss: 9.1,
    affected: 100,
    vector: "Red · interacción no requerida",
    fix: "Renovar el componente y verificar los certificados dependientes.",
  },
  {
    id: "DEMO-CVE-004",
    title: "Denegación de servicio",
    software: "Node.js",
    severity: "Alta" as Severity,
    cvss: 8.1,
    affected: 274,
    vector: "Red · baja complejidad",
    fix: "Migrar a la versión LTS aprobada y probar las dependencias.",
  },
  {
    id: "DEMO-CVE-005",
    title: "Validación insuficiente de solicitudes",
    software: "Nginx",
    severity: "Alta" as Severity,
    cvss: 7.5,
    affected: 193,
    vector: "Red · baja complejidad",
    fix: "Actualizar el servidor web y validar reglas del proxy.",
  },
  {
    id: "DEMO-CVE-006",
    title: "Componente fuera de soporte",
    software: "OpenJDK",
    severity: "Media" as Severity,
    cvss: 6.5,
    affected: 318,
    vector: "Depende de la configuración",
    fix: "Planear migración al runtime vigente y ejecutar pruebas de regresión.",
  },
];
export const format = (value: number) => value.toLocaleString("es-MX");
export const pageNames: Record<PageId, string> = {
  dashboard: "Panorama general",
  servidores: "Servidores",
  vulnerabilidades: "Vulnerabilidades",
  reportes: "Reportes",
};
export const severityClass = (severity: Severity) =>
  ({ Crítica: "critical", Alta: "high", Media: "medium", Baja: "low" })[
    severity
  ];
