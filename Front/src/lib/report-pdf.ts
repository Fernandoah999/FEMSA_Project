import { countryLabel, criticalities, format, label, regions, severityLabel, type Filters, type InventoryRow, type SlaPolicy, type Snapshot } from "./inventory";

type ReportData = { slaPolicy: SlaPolicy; snapshot: Snapshot; filters: Filters; servers: InventoryRow[]; findings: InventoryRow[]; allFindings: InventoryRow[]; metrics: { servers: number; open: number; high: number; overdue: number }; kind: "executive" | "technical" };
type BarEntry = [name: string, count: number, color?: string];
type CountAxis = { minimum: number; maximum: number; intervals: number };
const warningTitles: Record<string, string> = {
  volume: "Volumen declarado",
  criticality: "Criticidad del servidor",
  age: "Rangos de antigüedad",
  closed_sla: "SLA de hallazgos remediados",
  extra_columns: "Columnas adicionales",
  same_content: "Archivo repetido en otra fecha",
};
const clean = (value: string) => value.replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x20-\xFF]/g, "?");
const literal = (value: string) => clean(value).replace(/([\\()])/g, "\\$1");
const wrap = (value: string, limit: number): string[] => { const words = clean(value).split(/\s+/); const lines: string[] = []; let line = ""; for (let word of words) { while (word.length > limit) { if (line) { lines.push(line); line = ""; } lines.push(word.slice(0, limit)); word = word.slice(limit); } if (line && line.length + word.length + 1 > limit) { lines.push(line); line = ""; } line += (line ? " " : "") + word; } if (line) lines.push(line); return lines.length ? lines : [""]; };
const encode = (value: string) => Uint8Array.from(value, c => c.charCodeAt(0) & 255);
const concat = (parts: Uint8Array[]) => { const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0)); let pos = 0; for (const p of parts) { out.set(p, pos); pos += p.length; } return out; };

function countScale(minimum: number, maximum: number, tickLimit: number): CountAxis {
  const target = Math.max(1, (maximum - minimum) / tickLimit);
  const magnitude = 10 ** Math.floor(Math.log10(target));
  const steps = magnitude === 1 ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10];
  const step = steps.map(multiplier => multiplier * magnitude).find(size => size >= target) ?? 10 * magnitude;
  const lower = Math.floor(minimum / step) * step;
  const intervals = Math.max(1, Math.ceil((maximum - lower) / step));
  return { minimum: lower, maximum: lower + intervals * step, intervals };
}

/** A self-contained, paginated PDF using the built-in Helvetica fonts and WinAnsi encoding. */
export function buildReportPdf(data: ReportData): Uint8Array {
  const { snapshot, filters, servers, findings, allFindings, metrics, kind } = data;
  const pages: string[][] = []; let commands: string[] = []; let y = 0;
  const text = (x: number, at: number, value: string, size = 10, bold = false, color = "0.21 0.17 0.19") => commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${color} rg 1 0 0 1 ${x} ${at} Tm (${literal(value)}) Tj ET`);
  const line = (x1: number, at: number, x2: number, color = "0.88 0.85 0.86") => commands.push(`${color} RG 0.6 w ${x1} ${at} m ${x2} ${at} l S`);
  const newPage = () => { if (commands.length) pages.push(commands); commands = []; commands.push("0.15 0.39 0.92 rg 0 806 595 36 re f"); text(40, 818, "FEMSA", 15, true, "1 1 1"); text(365, 819, "ATLAS DE INFRAESTRUCTURA", 8, true, "1 1 1"); y = 770; };
  const ensure = (height: number) => { if (y - height < 55) newPage(); };
  const paragraph = (value: string, opts: { size?: number; bold?: boolean; color?: string; indent?: number } = {}) => { const size = opts.size ?? 10; for (const valueLine of wrap(value, opts.indent ? 92 : 100)) { ensure(size + 6); text(40 + (opts.indent ?? 0), y, valueLine, size, opts.bold, opts.color); y -= size + 5; } };
  const heading = (value: string) => { ensure(42); y -= 10; text(40, y, value, 16, true, "0.08 0.20 0.35"); y -= 23; };
  const regionValues = [...regions, ...new Set(servers.map(server => server.RegionGroup).filter(region => !regions.includes(region)))];
  const regionData = regionValues.map(region => { const regionalServers = servers.filter(server => server.RegionGroup === region); const ids = new Set(regionalServers.map(server => server.ServerID)); return { region, servers: regionalServers, findings: findings.filter(f => ids.has(f.ServerID)) }; }).filter(group => group.servers.length);
  const niceMax = (value: number) => { const step = Math.max(1, 10 ** Math.floor(Math.log10(Math.max(1, value))) / 2); return Math.ceil(Math.max(1, value) / (step * 4)) * step * 4; };
  const horizontalAxis = (top: number, bottom: number, left: number, width: number, axis: CountAxis, unit: string) => {
    const step = (axis.maximum - axis.minimum) / axis.intervals;
    for (let i = 0; i <= axis.intervals; i++) {
      const x = left + width * i / axis.intervals;
      commands.push(`0.85 0.89 0.93 RG 0.5 w ${x} ${top} m ${x} ${bottom} l S`);
      text(x - 5, bottom - 14, format(axis.minimum + step * i), 8);
    }
    line(left, bottom, left + width, "0.35 0.43 0.53"); text(left + 35, bottom - 30, unit, 9, true);
  };
  const countChart = (title: string, caption: string, entries: BarEntry[], unit = "Cantidad de hallazgos pendientes", scale?: CountAxis) => {
    ensure(135 + entries.length * 28); heading(title); paragraph(caption, { size: 9, color: "0.45 0.40 0.42" }); y -= 8;
    const axis = scale ?? { minimum: 0, maximum: niceMax(Math.max(1, ...entries.map(([, value]) => value))), intervals: 4 };
    const left = scale ? 172 : 220;
    const width = scale ? 330 : 240;
    if (!scale) { text(40, y, "Categoría (eje Y)", 9, true); y -= 24; }
    horizontalAxis(y + 12, y - entries.length * 28 + 10, left, width, axis, scale ? unit : `${unit} (eje X)`);
    for (const [name, count, color] of entries) {
      const offset = width * (count - axis.minimum) / (axis.maximum - axis.minimum);
      const x = left + offset;
      const barColor = color ?? (name === "Dentro del plazo" ? "0.09 0.64 0.29" : name === "Fuera del plazo" ? "0.86 0.15 0.15" : "0.15 0.39 0.92");
      text(40, y, name, scale ? 10 : 9, !!scale);
      if (axis.minimum > 0) {
        line(left, y + 3, left + width, "0.88 0.91 0.95");
        commands.push(`q ${barColor} rg 1 0 0 1 ${x.toFixed(2)} ${y + 3} cm 4 0 m 4 2.21 2.21 4 0 4 c -2.21 4 -4 2.21 -4 0 c -4 -2.21 -2.21 -4 0 -4 c 2.21 -4 4 -2.21 4 0 c h f Q`);
      } else if (count) {
        commands.push(`${barColor} rg ${left} ${y - 2} ${offset.toFixed(2)} ${scale ? 13 : 11} re f`);
      }
      text(scale ? x + 8 : 480, y, format(count), 10, true);
      y -= 28;
    }
    y -= 40;
  };
  const regionalCriticalityChart = () => {
    const categories = [
      { key: "CRITICAL", name: "Crítica", color: "0.86 0.15 0.15" },
      { key: "VERY_HIGH", name: "Muy alta", color: "0.92 0.35 0.05" },
      { key: "HIGH", name: "Alta", color: "0.85 0.47 0.02" },
      { key: "MEDIUM", name: "Media", color: "0.15 0.39 0.92" },
      { key: "LOW", name: "Baja", color: "0.03 0.57 0.70" },
    ];
    const serversById = new Map(servers.map(server => [server.ServerID, server]));
    ensure(150 + regionData.length * 52); heading("Pendientes por región y criticidad");
    paragraph(kind === "executive" ? "Cada segmento cuenta hallazgos pendientes en servidores de una criticidad. Un servidor puede aportar varios hallazgos." : "Hallazgos pendientes agrupados por la criticidad del servidor; el total aparece al final de cada barra.", { size: 9, color: "0.45 0.40 0.42" });
    y -= 5;
    categories.forEach((category, i) => { const x = 40 + i * 103; commands.push(`${category.color} rg ${x} ${y - 2} 9 9 re f`); text(x + 14, y - 1, category.name, 9); }); y -= 28;
    const max = niceMax(Math.max(1, ...regionData.map(group => group.findings.length)));
    if (kind === "technical") text(40, y + 7, "Región (eje Y)", 8, true);
    horizontalAxis(y + 10, y - regionData.length * 48 + 15, 135, 330, { minimum: 0, maximum: max, intervals: 4 }, "Cantidad de hallazgos pendientes (eje X)");
    for (const group of regionData) {
      ensure(50); text(40, y, label(group.region), 10, true); let x = 135;
      const counts = categories.map(category => group.findings.filter(f => serversById.get(f.ServerID)?.AssetCriticality === category.key).length);
      const accounted = counts.reduce((total, count) => total + count, 0);
      commands.push(`0.94 0.91 0.92 rg 135 ${y - 3} 330 12 re f`);
      counts.forEach((count, i) => { const width = 330 * count / max; if (width > 0) commands.push(`${categories[i].color} rg ${x.toFixed(2)} ${y - 3} ${width.toFixed(2)} 12 re f`); x += width; });
      if (accounted < group.findings.length) { const width = 330 * (group.findings.length - accounted) / max; commands.push(`0.45 0.43 0.44 rg ${x.toFixed(2)} ${y - 3} ${width.toFixed(2)} 12 re f`); }
      text(478, y, format(group.findings.length), 10, true); y -= 18;
      text(135, y, categories.map((category, i) => `${category.name}: ${format(counts[i])}`).join("  |  ") + (accounted < group.findings.length ? `  |  Sin dato: ${format(group.findings.length - accounted)}` : ""), 8, false, "0.35 0.30 0.32"); y -= 30;
    }
    y -= 35;
    if (!regionData.length) paragraph("Sin servidores en el alcance seleccionado.");
  };
  const regionalMatrix = (type: "severity" | "criticality") => {
    const isSeverity = type === "severity";
    ensure(95 + regionData.length * 32); heading(isSeverity ? "Severidad por región" : "Criticidad por región");
    paragraph(kind === "executive" ? (isSeverity ? "Cuenta hallazgos pendientes por región y nivel de gravedad. El máximo de la escala es 5." : "Cada celda cuenta servidores por región y criticidad. Cada servidor aparece una vez.") : (isSeverity ? "Hallazgos pendientes por región y nivel de severidad." : "Servidores por región y criticidad del activo; cada servidor se cuenta una vez."), { size: 9, color: "0.45 0.40 0.42" });
    paragraph(isSeverity ? "Un tono más intenso indica más problemas dentro del total seleccionado." : "Un tono más intenso indica más servidores dentro del total seleccionado.", { size: 9, color: "0.45 0.40 0.42" });
    const headings = isSeverity ? ["Nivel 1", "Nivel 2", "Nivel 3", "Nivel 4", "Nivel 5"] : ["Baja", "Media", "Alta", "Muy alta", "Crítica"];
    const values = ["LOW", "MEDIUM", "HIGH", "VERY_HIGH", "CRITICAL"];
    const colors = ["0.95 0.94 0.94", "0.85 0.94 0.98", "0.66 0.84 0.95", "0.35 0.68 0.86", "0.12 0.47 0.70", "0.05 0.28 0.50"];
    y -= 5; headings.forEach((name, i) => text(139 + i * 78, y, name, 8, true)); y -= 22;
    for (const group of regionData) {
      text(40, y, label(group.region), 10, true);
      headings.forEach((_, index) => { const count = isSeverity ? group.findings.filter(f => +f.Severity === index + 1).length : group.servers.filter(server => server.AssetCriticality === values[index]).length; const total = isSeverity ? findings.length : servers.length; const intensity = Math.min(5, Math.ceil(count / Math.max(total, 1) * 25)); const x = 135 + index * 78; commands.push(`${colors[intensity]} rg ${x} ${y - 9} 68 23 re f`); text(x + 10, y - 1, format(count), 10, true, intensity >= 4 ? "1 1 1" : "0.21 0.17 0.19"); }); y -= 32;
    }
    if (!regionData.length) paragraph("Sin servidores en el alcance seleccionado.");
  };
  newPage();
  text(40, y, kind === "executive" ? "Reporte ejecutivo" : "Reporte técnico", 25, true, "0.08 0.20 0.35"); y -= 28;
  paragraph(`Corte: ${snapshot.name} | Fecha de referencia: ${snapshot.referenceDate ?? "Sin fecha de referencia"}`, { color: "0.45 0.40 0.42" });
  paragraph(`SLA por criticidad del activo: ${criticalities.map(level => `${label(level)} ${data.slaPolicy[level]} días`).join(", ")}.`, { size: 9 });
  const scopeNames: Record<string, string> = { region: "Región", country: "País", environment: "Ambiente", os: "Sistema operativo", exposure: "Exposición", criticality: "Criticidad", severity: "Severidad", status: "Estado", category: "Categoría", age: "Antigüedad", sla: kind === "executive" ? "Plazo de atención" : "SLA", search: "Búsqueda" };
  const scope = Object.entries(filters).filter(([, value]) => value).map(([key, value]) => `${scopeNames[key] ?? key}: ${key === "country" ? countryLabel(value) : label(value)}`).join(" | ") || "Sin filtros";
  paragraph(`Alcance: ${scope}`, { color: "0.45 0.40 0.42" }); y -= 8; line(40, y, 555); y -= 24;
  heading("Indicadores del alcance");
  const cards = [[format(metrics.open), "Problemas pendientes"], [format(metrics.high), kind === "executive" ? "Gravedad 4-5 (máx. 5)" : "Gravedad nivel 4-5"], [format(metrics.overdue), kind === "executive" ? "Plazo vencido" : "SLA incumplido"], [format(metrics.servers), "Servidores incluidos"]];
  cards.forEach(([value, caption], i) => { const x = 40 + i * 130; text(x, y, value, 24, true, i === 0 ? "0.15 0.39 0.92" : undefined); text(x, y - 19, caption, 9, false, "0.45 0.40 0.42"); }); y -= 44; line(40, y, 555); y -= 12;
  // Keep the visual summary on the opening page when space permits.
  ensure(440);
  heading("Estado de los hallazgos");
  paragraph("Cada sector representa la proporción de un estado sobre el total filtrado. La leyenda muestra cantidad y porcentaje; verde identifica remediados.", { size: 9 });
  const states = ["NEW", "ACTIVE", "REOPENED", "REMEDIATED"];
  const stateColors = ["0.85 0.47 0.02", "0.92 0.35 0.05", "0.75 0.07 0.24", "0.09 0.64 0.29"];
  const total = allFindings.length;
  const cx = 145, cy = y - 75, radius = 62;
  let angle = -Math.PI / 2;
  if (!total) { text(65, cy, "Sin hallazgos en el alcance", 11); }
  states.forEach((state, index) => {
    const count = allFindings.filter(f => f.FindingStatus === state).length;
    const sweep = total ? count / total * Math.PI * 2 : 0;
    if (count) {
      const steps = Math.max(2, Math.ceil(sweep * 30));
      let path = `${cx} ${cy} m`;
      for (let step = 0; step <= steps; step++) {
        const a = angle + sweep * step / steps;
        path += ` ${(cx + Math.cos(a) * radius).toFixed(3)} ${(cy - Math.sin(a) * radius).toFixed(3)} l`;
      }
      commands.push(`${stateColors[index]} rg ${path} h f`);
    }
    angle += sweep;
    const at = y - 35 - index * 36;
    commands.push(`${stateColors[index]} rg 270 ${at - 2} 11 11 re f`);
    text(292, at, label(state), 11);
    text(430, at, `${format(count)} (${total ? (count / total * 100).toFixed(1) : "0.0"}%)`, 10, true);
  });
  y -= 170;
  paragraph(`Total del alcance: ${format(total)} hallazgos.`, { bold: true });
  if (kind === "executive") ensure(250);
  heading("Severidad de los pendientes");
  paragraph("La escala del Excel va de 1 a 5. Los niveles 4 y 5 se cuentan como graves.", { size: 9 });
  const columnCounts = [1, 2, 3, 4, 5].map(level => findings.filter(f => +f.Severity === level).length);
  const columnColors = ["0.03 0.57 0.70", "0.15 0.39 0.92", "0.85 0.47 0.02", "0.92 0.35 0.05", "0.86 0.15 0.15"];
  const maximum = niceMax(Math.max(1, ...columnCounts));
  const plotHeight = kind === "executive" ? 92 : 100;
  const baseline = y - plotHeight - (kind === "executive" ? 32 : 40);
  text(65, y - 10, "Cantidad de hallazgos pendientes (eje Y)", 9, true);
  for (let tick = 0; tick <= 4; tick++) { const at = baseline + tick / 4 * plotHeight; line(65, at, 535, "0.85 0.89 0.93"); text(40, at - 3, format(maximum * tick / 4), 8); }
  commands.push(`0.35 0.43 0.53 RG 0.7 w 65 ${baseline + plotHeight} m 65 ${baseline} l 535 ${baseline} l S`);
  text(210, baseline - 38, "Nivel de severidad (eje X)", 9, true);
  columnCounts.forEach((count, index) => {
    const x = 80 + index * 94, height = count / maximum * plotHeight;
    if (count) commands.push(`${columnColors[index]} rg ${x} ${baseline} 50 ${height.toFixed(2)} re f`);
    text(x + 10, baseline + height + 12, format(count), 11, true);
    text(x + 5, baseline - 20, `Nivel ${index + 1}`, 10);
  });
  y = baseline - 45;

  newPage();
  countChart("Cumplimiento del SLA", "Pendientes evaluados con el plazo de su criticidad y el rango de antigüedad.", [["Dentro del plazo", findings.filter(f => f.SLAStatus === "WITHIN").length], ["Fuera del plazo", findings.filter(f => f.SLAStatus === "BREACHED").length], ["Sin datos para evaluar", findings.filter(f => f.SLAStatus === "UNKNOWN").length]]);
  if (kind === "executive") {
    const ageGroups: BarEntry[] = ["AGE_0_7D", "AGE_8_30D", "AGE_31_90D", "AGE_91_180D", "AGE_GT180D"].map(value => [label(value), findings.filter(f => f.AgeBand === value).length]);
    const ageCounts = ageGroups.map(([, count]) => count);
    const smallest = Math.min(...ageCounts);
    const largest = Math.max(...ageCounts);
    const difference = largest - smallest;
    const padding = Math.max(1, difference / 4);
    const ageAxis = smallest > padding && difference <= largest / 4 ? countScale(smallest - padding, largest + padding, 6) : countScale(0, largest, 10);
    const zoomed = ageAxis.minimum > 0;
    countChart("¿Cuánto tiempo llevan pendientes?", `Cada ${zoomed ? "punto marca" : "barra muestra"} el conteo de hallazgos en un rango de antigüedad del Excel.`, ageGroups, "Cantidad de hallazgos pendientes", ageAxis);
    if (zoomed) {
      const comparison = difference ? `La diferencia entre extremos es de ${format(difference)}.` : "Todos los rangos tienen el mismo conteo.";
      paragraph(`Eje ampliado de ${format(ageAxis.minimum)} a ${format(ageAxis.maximum)} hallazgos. ${comparison}`, { size: 9 });
    }
    newPage();
    regionalCriticalityChart();
    regionalMatrix("severity");
    regionalMatrix("criticality");
    newPage();
    const impacted = new Set(findings.filter(f => +f.Severity >= 4).map(f => f.ServerID));
    const attentionGroups: BarEntry[] = [
      ["Con problemas graves", impacted.size, "0.72 0.11 0.16"],
      ["Fin de vida o soporte", servers.filter(server => server.OSLifecycle === "EOL" || server.OSLifecycle === "EOL_EOS").length, "0.74 0.41 0.05"],
      ["Expuestos a Internet", servers.filter(server => server.ExposureCategory === "INTERNET_EXPOSED").length, "0.11 0.39 0.67"],
    ];
    countChart("Servidores que requieren atención", "Cada barra cuenta servidores del alcance. Un servidor puede aparecer en más de una categoría.", attentionGroups, "Cantidad de servidores", countScale(0, Math.max(...attentionGroups.map(([, count]) => count)), 6));
    paragraph("Problema grave. El servidor tiene al menos un hallazgo pendiente de nivel 4 o 5.", { size: 9 });
    paragraph("Fin de vida o soporte. El Excel marca el sistema operativo como retirado o sin soporte del proveedor.", { size: 9 });
    paragraph("Exposición a Internet. El inventario clasifica el servidor como accesible desde Internet.", { size: 9 });
    y -= 18;
    ensure(100);
    heading("Calidad de los datos");
    paragraph("Al importar el Excel se revisa la consistencia del corte completo. Cada aviso describe qué revisar y el conteo asociado.", { size: 9, color: "0.45 0.40 0.42" });
    if (!snapshot.warnings.length) paragraph("La importación terminó sin avisos de consistencia.");
    for (const warning of snapshot.warnings) {
      ensure(55);
      y -= 3;
      paragraph(warningTitles[warning.code] ?? "Aviso de importación", { size: 10, bold: true });
      paragraph(warning.message, { size: 9 });
    }
  } else {
    const serverMap = new Map(servers.map(server => [server.ServerID, server]));
    const criticalServers = servers.filter(server => ["CRITICAL", "VERY_HIGH"].includes(server.AssetCriticality)).length;
    const exposedServers = servers.filter(server => server.ExposureCategory === "INTERNET_EXPOSED").length;
    const exploitable = findings.filter(f => f.ExploitabilityCategory === "KNOWN_OR_AVAILABLE").length;
    const old = findings.filter(f => f.AgeBand === "AGE_GT180D").length;
    heading("Indicadores técnicos adicionales");
    const extra = [[format(criticalServers), "Criticidad alta*"], [format(exposedServers), "Expuestos a Internet"], [format(exploitable), "Exploit disponible"], [format(old), "Más de 180 días"]];
    extra.forEach(([value, caption], i) => { const x = 40 + i * 130; text(x, y, value, 21, true, "0.08 0.20 0.35"); text(x, y - 17, caption, 8, false, "0.45 0.40 0.42"); }); y -= 35;
    const remediated = allFindings.filter(f => f.FindingStatus === "REMEDIATED").length;
    const obsolete = servers.filter(server => server.OSLifecycle === "EOL" || server.OSLifecycle === "EOL_EOS").length;
    const extra2 = [[format(remediated), "Remediados"], [format(obsolete), "Fin de vida o soporte"], [format(new Set(findings.map(f => f.ServerID)).size), "Servidores afectados"], [format(allFindings.length), "Hallazgos del alcance"]];
    extra2.forEach(([value, caption], i) => { const x = 40 + i * 130; text(x, y, value, 21, true, "0.08 0.20 0.35"); text(x, y - 17, caption, 8, false, "0.45 0.40 0.42"); }); y -= 40;
    paragraph("* Criticidad crítica o muy alta. Explotación disponible no confirma un ataque.", { size: 9, color: "0.45 0.40 0.42" });
    newPage(); heading("Panorama por región");
    paragraph("El detalle regional conserva el mismo alcance y la prioridad por criticidad del activo y severidad del hallazgo.", { size: 9, color: "0.45 0.40 0.42" });
    regionalCriticalityChart();
    regionalMatrix("severity");
    newPage(); regionalMatrix("criticality");
    heading("Indicadores regionales");
    for (const group of regionData) {
      ensure(100); y -= 7; line(40, y, 555); y -= 22;
      text(40, y, label(group.region), 14, true, "0.08 0.20 0.35"); y -= 22;
      paragraph(`${format(group.servers.length)} servidores | ${format(group.findings.length)} pendientes | ${format(group.findings.filter(f => +f.Severity >= 4).length)} de nivel 4-5 | ${format(group.findings.filter(f => f.SLAStatus === "BREACHED").length)} SLA incumplidos`, { bold: true });
      const counts = [5, 4, 3, 2, 1].map(level => group.findings.filter(f => +f.Severity === level).length);
      paragraph(`Severidad: ${counts.map((count, i) => `N${5-i}: ${format(count)}`).join("    |    ")}`, { color: "0.45 0.40 0.42" });
    }
    if (!regionData.length) paragraph("No hay servidores en el alcance seleccionado.");
    newPage(); heading("Antigüedad y remediación");
    const chart = (title: string, entries: [string, number][]) => countChart(title, "Conteos de pendientes por categoría del archivo; una barra más larga indica mayor volumen.", entries);
    paragraph("Los conteos corresponden a hallazgos pendientes. La antigüedad se presenta en rangos, sin inferir fechas exactas.", { size: 9, color: "0.45 0.40 0.42" });
    chart("Antigüedad de los pendientes", ["AGE_0_7D", "AGE_8_30D", "AGE_31_90D", "AGE_91_180D", "AGE_GT180D"].map(value => [label(value), findings.filter(f => f.AgeBand === value).length]));
    chart("Acciones de remediación", ["PATCH_OR_UPDATE", "VERSION_UPGRADE", "CONFIGURATION_CHANGE", "GENERAL_REMEDIATION"].map(value => [label(value), findings.filter(f => f.RemediationCategory === value).length]));
    for (const group of regionData) {
      newPage(); heading(`Detalle regional: ${label(group.region)}`);
      paragraph(`${format(group.servers.length)} servidores | ${format(group.findings.length)} hallazgos pendientes`, { bold: true });
      paragraph("Secuencia por criticidad del servidor y severidad del hallazgo. El identificador desempata; los plazos y acciones proceden del archivo.", { size: 9, color: "0.45 0.40 0.42" }); y -= 8;
      if (!group.findings.length) paragraph("No hay hallazgos pendientes en esta región.");
      for (let i = 0; i < group.findings.length; i++) {
        const f = group.findings[i]; const server = serverMap.get(f.ServerID); const details = [`${f.ServerID} | Criticidad ${label(server?.AssetCriticality ?? "")} | ${severityLabel(f.Severity)}`, `Tipo: ${f.VulnerabilityTypeID} | Categoría: ${label(f.FunctionalCategory)}`, `SLA: ${label(f.SLAStatus)} | Antigüedad: ${label(f.AgeBand)} | Acción: ${label(f.RemediationCategory)}`];
        const rows = details.flatMap(value => wrap(value, 94)); ensure(30 + rows.length * 14); text(40, y, `${i + 1}. ${f.FindingID}`, 11, true, "0.15 0.39 0.92"); y -= 16; for (const row of rows) { text(40, y, row, 9); y -= 14; } line(40, y + 3, 555); y -= 12;
      }
    }
  }
  pages.push(commands);
  const objects: string[] = ["", "", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"];
  const pageIds: number[] = [];
  pages.forEach((page, index) => { const content = [...page, `0.88 0.85 0.86 RG 0.6 w 40 38 m 555 38 l S`, `BT /F1 8 Tf 0.45 0.40 0.42 rg 1 0 0 1 40 23 Tm (Datos académicos - análisis local) Tj ET`, `BT /F1 8 Tf 0.45 0.40 0.42 rg 1 0 0 1 490 23 Tm (Página ${index + 1} de ${pages.length}) Tj ET`].join("\n"); const contentId = objects.length + 1; objects.push(`<< /Length ${encode(content).length} >>\nstream\n${content}\nendstream`); const pageId = objects.length + 1; pageIds.push(pageId); objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`); });
  objects[0] = "<< /Type /Catalog /Pages 2 0 R >>"; objects[1] = `<< /Type /Pages /Count ${pages.length} /Kids [${pageIds.map(id => `${id} 0 R`).join(" ")}] >>`;
  const parts = [encode("%PDF-1.4\n%âãÏÓ\n")]; const offsets = [0]; let length = parts[0].length;
  objects.forEach((object, i) => { offsets.push(length); const part = encode(`${i + 1} 0 obj\n${object}\nendobj\n`); parts.push(part); length += part.length; });
  const xref = length; parts.push(encode(`xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`));
  return concat(parts);
}
