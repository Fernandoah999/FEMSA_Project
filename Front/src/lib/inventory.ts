export type InventoryRow = Record<string, string>;
export type ImportWarning = { code: string; count: number; message: string };
export type SnapshotMeta = {
  id: string; name: string; filename: string; referenceDate: string | null;
  uploadedAt: string; serverCount: number; findingCount: number;
  warnings: ImportWarning[]; hash: string;
};
export type Snapshot = SnapshotMeta & { servers: InventoryRow[]; findings: InventoryRow[] };
export type Filters = { region: string; country: string; environment: string; os: string; exposure: string; criticality: string; severity: string; status: string; category: string; age: string; sla: string; search: string };
export const emptyFilters: Filters = { region: "", country: "", environment: "", os: "", exposure: "", criticality: "", severity: "", status: "", category: "", age: "", sla: "", search: "" };
export const regions = ["REGION_NORTH", "REGION_CENTRAL", "REGION_SOUTH"];
export const labels: Record<string, string> = {
  REGION_NORTH: "Norte", REGION_CENTRAL: "Centro", REGION_SOUTH: "Sur",
  PRODUCTION: "Producción", DEVELOPMENT: "Desarrollo", TEST: "Pruebas",
  WINDOWS_SERVER: "Windows Server", LINUX_SERVER: "Linux Server", UNIX_SERVER: "Unix", HYPERVISOR: "Hipervisor", OTHER_SERVER: "Otro sistema",
  CLOUD: "Nube", ON_PREM: "Infraestructura propia", VIRTUAL_MACHINE: "Máquina virtual", PHYSICAL_SERVER: "Servidor físico",
  SUPPORTED: "Con soporte", EOL: "Fin de vida", EOL_EOS: "Fin de vida y soporte",
  INTERNAL: "Interno", INTERNET_EXPOSED: "Expuesto a Internet", LOW: "Baja", MEDIUM: "Media", HIGH: "Alta", VERY_HIGH: "Muy alta", CRITICAL: "Crítica",
  NEW: "Nuevo", ACTIVE: "Activo", REMEDIATED: "Remediado", REOPENED: "Reabierto", OPEN: "Pendientes",
  GENERAL_INFRASTRUCTURE: "Infraestructura general", ERP_ANALYTICS: "Analítica ERP", DATABASE: "Base de datos", ERP_GOVERNANCE: "Gobierno ERP", WEB_APPLICATION: "Aplicación web", SECURITY: "Seguridad", DIRECTORY: "Directorio", FILE_TRANSFER: "Transferencia de archivos", ERP_PRODUCTION: "Producción ERP", ERP: "ERP", OPERATING_SYSTEM: "Sistema operativo", SECURE_CONFIGURATION: "Configuración segura", MIDDLEWARE: "Middleware",
  AGE_0_7D: "0–7 días", AGE_8_30D: "8–30 días", AGE_31_90D: "31–90 días", AGE_91_180D: "91–180 días", AGE_GT180D: "Más de 180 días",
  PATCH_OR_UPDATE: "Parche o actualización", VERSION_UPGRADE: "Cambio de versión", CONFIGURATION_CHANGE: "Cambio de configuración", GENERAL_REMEDIATION: "Corrección general",
  WITHIN: "Dentro del plazo", NOT_APPLICABLE: "No aplica (remediado)", UNKNOWN: "Sin datos para evaluar el SLA",
  BREACHED: "Incumplido", WITHIN_OR_NOT_APPLICABLE: "Dentro de plazo o no aplicable", YES: "Sí", NO: "No", KNOWN_OR_AVAILABLE: "Conocida o disponible", NOT_IDENTIFIED: "No identificada", ASSOCIATED: "Asociado",
};
export const label = (value: string) => Object.hasOwn(labels, value) ? labels[value] : value;
export const format = (n: number) => n.toLocaleString("es-MX");
export const isOpen = (r: InventoryRow) => r.FindingStatus !== "REMEDIATED";
export const severityLabel = (value: string) => `Nivel ${value}`;

export const countryCatalog: Record<string, { alpha3: string; numeric: string; point?: number[] }> = countryCodes;
const countryNames = new Intl.DisplayNames(["es-MX"], { type: "region" });
const englishCountryNames = new Intl.DisplayNames(["en"], { type: "region" });
const normalizeCountry = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/[^a-z0-9]+/g, "");
export const countryLabel = (code: string) => countryNames.of(code) ?? code;
const countryAliases = new Map<string, string>();
for (const [code, { alpha3, numeric }] of Object.entries(countryCatalog)) {
  for (const alias of [code, alpha3, numeric, String(Number(numeric)), countryLabel(code), englishCountryNames.of(code) ?? code]) {
    countryAliases.set(normalizeCountry(alias), code);
  }
}
for (const alias of ["EUA", "EE. UU.", "Estados Unidos de América", "United States of America"]) {
  countryAliases.set(normalizeCountry(alias), "US");
}
export const countryCode = (value?: string) => value ? countryAliases.get(normalizeCountry(value)) : undefined;

export function filterInventory(snapshot: Snapshot, filters: Filters) {
  const serverFields = { region: "RegionGroup", environment: "Environment", os: "OSFamily", exposure: "ExposureCategory", criticality: "AssetCriticality" };
  const base = snapshot.servers.filter(s => (!filters.country || countryCode(s.Country) === filters.country)
    && Object.entries(serverFields).every(([key, col]) => !filters[key as keyof Filters] || filters[key as keyof Filters] === s[col]));
  const ids = new Set(base.map(s => s.ServerID));
  const search = filters.search.trim().toLowerCase();
  const matchingServers = new Set(base.filter(s => [s.ServerID, s.FunctionalRole, label(s.FunctionalRole), s.OSFamily, label(s.OSFamily)].some(v => v.toLowerCase().includes(search))).map(s => s.ServerID));
  const findings = snapshot.findings.filter(f => ids.has(f.ServerID)
    && (!filters.severity || (filters.severity === "4_5" ? +f.Severity >= 4 : f.Severity === filters.severity))
    && (!filters.status || (filters.status === "OPEN" ? isOpen(f) : f.FindingStatus === filters.status))
    && (!filters.category || f.FunctionalCategory === filters.category)
    && (!filters.age || f.AgeBand === filters.age)
    && (!filters.sla || f.SLAStatus === filters.sla)
    && (!search || matchingServers.has(f.ServerID) || [f.FindingID, f.VulnerabilityTypeID, f.FunctionalCategory, label(f.FunctionalCategory)].some(v => v.toLowerCase().includes(search))));
  const affected = new Set(findings.map(f => f.ServerID));
  const hasFindingFilter = !!(filters.severity || filters.status || filters.category || filters.age || filters.sla);
  const servers = base.filter(s => hasFindingFilter ? affected.has(s.ServerID) : !search || matchingServers.has(s.ServerID) || affected.has(s.ServerID));
  return { servers, findings };
}
export function metrics(data: { servers: InventoryRow[]; findings: InventoryRow[] }) {
  const open = data.findings.filter(isOpen);
  return { servers: data.servers.length, findings: data.findings.length, open: open.length, high: open.filter(f => +f.Severity >= 4).length, overdue: open.filter(f => f.SLAStatus === "BREACHED").length, obsolete: data.servers.filter(s => s.OSLifecycle !== "SUPPORTED").length, remediated: data.findings.length - open.length, exposed: data.servers.filter(s => s.ExposureCategory === "INTERNET_EXPOSED").length };
}
export function compareSnapshots(before: Snapshot, after: Snapshot, filters: Filters) {
  const a = filterInventory(before, filters), b = filterInventory(after, filters);
  const original = new Map(before.findings.map(f => [f.FindingID, f]));
  const current = new Map(after.findings.map(f => [f.FindingID, f]));
  return { before: metrics(a), after: metrics(b),
    added: b.findings.filter(f => !original.has(f.FindingID)),
    absent: a.findings.filter(f => !current.has(f.FindingID)),
    resolved: b.findings.filter(f => f.FindingStatus === "REMEDIATED" && original.has(f.FindingID) && isOpen(original.get(f.FindingID)!)),
    reopened: b.findings.filter(f => isOpen(f) && original.get(f.FindingID)?.FindingStatus === "REMEDIATED"),
    reassigned: b.findings.filter(f => original.has(f.FindingID) && original.get(f.FindingID)!.ServerID !== f.ServerID),
  };
}
export function csv(rows: InventoryRow[], columns: string[]) {
  const escape = (v: string) => `"${(/^[=+@\-\t\r]/.test(v) ? "'" : "") + v.replaceAll('"', '""')}"`;
  return "\uFEFF" + [columns, ...rows.map(r => columns.map(c => r[c] ?? ""))].map(row => row.map(escape).join(",")).join("\r\n");
}

export const slaDaysOptions = [7, 30, 90, 180] as const;
export const criticalities = ["CRITICAL", "VERY_HIGH", "HIGH", "MEDIUM", "LOW"] as const;
export type Criticality = typeof criticalities[number];
export type SlaDays = typeof slaDaysOptions[number];
export type SlaPolicy = Record<Criticality, SlaDays>;
export const defaultSlaPolicy: SlaPolicy = { CRITICAL: 7, VERY_HIGH: 30, HIGH: 30, MEDIUM: 90, LOW: 180 };
const ageUpperBounds = new Map([["AGE_0_7D", 7], ["AGE_8_30D", 30], ["AGE_31_90D", 90], ["AGE_91_180D", 180], ["AGE_GT180D", Infinity]]);
export const isSlaDays = (value: unknown): value is SlaDays => slaDaysOptions.some(days => value === days);
export function applySla(snapshot: Snapshot, policy: SlaPolicy): Snapshot {
  if (!criticalities.every(level => isSlaDays(policy[level]))) throw new Error("Plazo SLA no compatible con los rangos del archivo");
  const daysByCriticality = new Map<string, SlaDays>(criticalities.map(level => [level, policy[level]]));
  const daysByServer = new Map(snapshot.servers.map(server => [server.ServerID, daysByCriticality.get(server.AssetCriticality)]));
  return { ...snapshot, findings: snapshot.findings.map(finding => {
    const days = daysByServer.get(finding.ServerID);
    const age = ageUpperBounds.get(finding.AgeBand);
    let status = "NOT_APPLICABLE";
    if (isOpen(finding)) status = days === undefined || age === undefined ? "UNKNOWN" : age <= days ? "WITHIN" : "BREACHED";
    return {
      ...finding,
      OriginalSLAStatus: finding.OriginalSLAStatus ?? finding.SLAStatus,
      SLATargetDays: status === "NOT_APPLICABLE" || days === undefined ? "" : String(days),
      SLAStatus: status,
    };
  }) };
}
import countryCodes from "./country-codes.json" with { type: "json" };
