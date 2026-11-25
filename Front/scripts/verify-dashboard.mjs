import { chromium, expect } from "@playwright/test";
import { spawn, execFileSync } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const output = ".impeccable/review/dashboard";
await mkdir(output, { recursive: true });
const directory = await mkdtemp(path.join(tmpdir(), "femsa-dashboard-test-"));
const port = process.env.FEMSA_TEST_PORT || "3041";
const base = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", port], { env: { ...process.env, FEMSA_DATA_DIR: directory }, stdio: ["ignore", "pipe", "pipe"] });
let logs = "";
server.stdout.on("data", d => logs += d);
server.stderr.on("data", d => logs += d);
let browser;
const errors = [], checks = [];
const source = await readFile("../OneDrive_1_10-6-2026/Dataset Académico Parches en Servidores.xlsx");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    if (server.exitCode !== null) throw new Error(`Test server exited: ${logs}`);
    try { if ((await fetch(base + "/api/snapshots")).ok) return; } catch {}
    await delay(100);
  }
  throw new Error(`Test server did not start: ${logs}`);
}
async function noOverflow(page, name) {
  const size = await page.evaluate(() => ({ content: document.documentElement.scrollWidth, viewport: window.innerWidth }));
  assert.ok(size.content <= size.viewport + 1, `${name}: document overflow ${JSON.stringify(size)}`);
}
async function capture(page, filename) {
  await page.evaluate(() => { document.activeElement?.blur(); window.scrollTo(0, 0); document.querySelectorAll("dialog[open]").forEach(el => el.scrollTo(0, 0)); });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: output + "/" + filename, fullPage: !(await page.locator("dialog[open]").count()) });
}
async function uploadApi(buffer, name, referenceDate = "2026-10-21", filename = "inventory.xlsx") {
  const form = new FormData(); form.set("file", new Blob([buffer]), filename); form.set("name", name); form.set("referenceDate", referenceDate);
  const response = await fetch(base + "/api/snapshots", { method: "POST", body: form });
  return { response, data: await response.json() };
}
async function navigate(page, name) {
  const trigger = page.getByRole("button", { name: "Abrir menú de navegación", exact: true });
  if (await trigger.isVisible()) await trigger.click();
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name, exact: typeof name === "string" }).click();
}
async function selectOption(page, name, value) {
  await page.getByRole("combobox", { name, exact: true }).click();
  await page.getByRole("listbox", { name, exact: true }).locator(`[role="option"][data-value=${JSON.stringify(value)}]`).click();
}
async function downloadReport(page, name = "Reporte ejecutivo") {
  const menu = page.getByText("Generar reporte", { exact: true });
  await menu.click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name, exact: true }).click();
  const pdf = await readFile(await (await pending).path());
  await menu.click();
  return pdf;
}
try {
  await waitForServer();
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || "/usr/bin/chromium", headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1050 }, reducedMotion: "reduce", acceptDownloads: true });
  const page = await context.newPage();
  page.on("pageerror", e => errors.push(e.message));
  page.on("console", msg => { if (msg.type() === "error") errors.push(msg.text()); });
  await page.goto(base, { waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "Tu primer corte empieza aquí." }).waitFor();
  await noOverflow(page, "empty desktop");
  await capture(page, "empty.png");
  assert.equal(await page.getByRole("button", { name: /ejemplo/i }).count(), 0);
  await page.getByRole("button", { name: "Importar mi Excel", exact: true }).click();
  await page.getByLabel("Archivo Excel", { exact: true }).setInputFiles({ name: "inventory.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: source });
  await page.getByLabel("Nombre del corte", { exact: true }).fill("Inventario de prueba");
  await page.getByLabel("Fecha de referencia", { exact: true }).fill("2026-10-21");
  await page.getByRole("button", { name: "Validar y guardar corte" }).click();
  await page.getByRole("region", { name: "Indicadores del alcance" }).waitFor();
  await page.getByRole("button", { name: "Cerrar notificación" }).click();
  const metricText = await page.getByRole("region", { name: "Indicadores del alcance" }).innerText();
  for (const n of ["246", "2,875", "561", "1,569"]) assert.ok(metricText.includes(n), `Missing source metric ${n}`);
  checks.push("Import academic XLSX through UI: 246 servers, 3,450 findings, correct pending/high/SLA counts");
  const baseline = (await (await fetch(base + "/api/snapshots")).json())[0];
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("region", { name: "Indicadores del alcance" }).waitFor();
  assert.ok((await page.getByRole("region", { name: "Indicadores del alcance" }).innerText()).includes("2,875"));
  checks.push("SQLite history and records survive page reload");
  assert.equal(await page.getByRole("link", { name: "Ver propuestas originales" }).count(), 0);
  await page.getByRole("button", { name: "Contraer menú lateral" }).click();
  assert.ok((await page.getByRole("complementary", { name: "Barra lateral" }).boundingBox()).width <= 89);
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: "Servidores", exact: true }).click();
  await page.getByRole("heading", { name: "Inventario de servidores", exact: true }).waitFor();
  await capture(page, "sidebar-collapsed.png");
  await page.getByRole("button", { name: "Expandir menú lateral" }).click();
  const handle = page.getByRole("separator", { name: "Ancho del menú lateral" });
  await handle.focus(); await page.keyboard.press("ArrowRight");
  assert.equal(await handle.getAttribute("aria-valuenow"), "296");
  const grip = await handle.boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down(); await page.mouse.move(320, grip.y + grip.height / 2, { steps: 4 }); await page.mouse.up();
  assert.equal(await handle.getAttribute("aria-valuenow"), "320");
  await handle.focus(); await page.keyboard.press("Home"); await page.keyboard.press("ArrowRight"); await page.keyboard.press("ArrowRight");
  await navigate(page, "Panorama general");
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileMenu = page.getByRole("button", { name: "Abrir menú de navegación", exact: true });
  await mobileMenu.click();
  await page.getByRole("dialog", { name: "Atlas de infraestructura" }).waitFor({ state: "visible" });
  await capture(page, "sidebar-mobile.png");
  await page.keyboard.press("Escape");
  await expect(mobileMenu).toHaveAttribute("aria-expanded", "false");
  assert.ok(await mobileMenu.evaluate(el => el === document.activeElement));
  await navigate(page, "Servidores");
  assert.equal(await page.getByRole("dialog", { name: "Atlas de infraestructura" }).count(), 0);
  await navigate(page, "Panorama general");
  const regionDropdown = page.getByRole("combobox", { name: "Región", exact: true });
  await regionDropdown.click();
  const popup = page.getByRole("listbox", { name: "Región", exact: true });
  const popupBounds = await popup.boundingBox();
  assert.ok(popupBounds.x >= 0 && popupBounds.x + popupBounds.width <= 390);
  await page.keyboard.press("End"); await page.keyboard.press("Enter");
  assert.equal(await regionDropdown.getAttribute("data-value"), "REGION_SOUTH");
  await regionDropdown.click(); await page.keyboard.press("Escape");
  await expect(regionDropdown).toHaveAttribute("aria-expanded", "false");
  await regionDropdown.click(); await page.getByRole("heading", { name: "¿Dónde debemos actuar primero?" }).click();
  await expect(regionDropdown).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  await page.setViewportSize({ width: 1440, height: 1050 });
  await regionDropdown.click();
  await capture(page, "dropdown-desktop.png");
  await page.keyboard.press("Escape");
  checks.push("Collapsible/resizable desktop sidebar, keyboard resize, mobile drawer/Escape/focus restoration and auto-close, original proposals link removed");
  checks.push("Animated dropdowns: mobile viewport bounds, keyboard End/Enter, Escape, outside click and filtering preserve expected values");

  await page.getByRole("button", { name: /Pendientes de nivel 4–5/ }).click();
  assert.equal(await page.getByRole("combobox", { name: "Severidad", exact: true }).getAttribute("data-value"), "4_5");
  await page.getByRole("region", { name: "Hallazgos del alcance" }).waitFor();
  assert.ok((await page.getByRole("region", { name: "Hallazgos del alcance" }).innerText()).includes("561 registros"));
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  await navigate(page, "Panorama general");
  await page.getByRole("button", { name: /Pendientes fuera de SLA/ }).click();
  assert.ok((await page.getByRole("region", { name: "Hallazgos del alcance" }).innerText()).includes("1,569 registros"));
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  await navigate(page, "Panorama general");
  checks.push("KPI drilldowns preserve scope: 561 high-severity pending records and 1,569 overdue pending records");
  await page.locator('[data-globe-ready="true"][data-motion="paused"]').waitFor();
  assert.equal(await page.locator('[data-analysis-trigger]').count(), 5);
  assert.equal(await page.locator('[data-analysis-trigger][aria-expanded="true"]').count(), 0, "Secondary analysis must start collapsed");
  const questionsBox = await page.getByRole("region", { name: "Preguntas para priorizar" }).boundingBox();
  const inventoryBox = await page.locator('[data-analysis-item="inventory"]').boundingBox();
  const globeBox = await page.getByRole("region", { name: "Globo regional" }).boundingBox();
  assert.ok(Math.abs(inventoryBox.x - questionsBox.x) < 2, "Supplementary analysis must align below questions");
  assert.ok(inventoryBox.y - questionsBox.y - questionsBox.height <= 34, "Supplementary analysis starts below questions");
  const chartsBox = await page.getByRole("region", { name: "Gráficas del alcance" }).boundingBox();
  const sla = page.getByRole("region", { name: "Cumplimiento del SLA" });
  const slaBox = await sla.boundingBox();
  assert.ok(Math.abs(globeBox.y + globeBox.height - chartsBox.y - chartsBox.height) <= 2, "Map and charts end at the same height");
  assert.ok(slaBox.y > globeBox.y + globeBox.height && slaBox.width > globeBox.width, "SLA and its configuration occupy the full next row");
  const criticalDeadline = sla.getByLabel("Crítica", { exact: true });
  const applyDeadlines = sla.getByRole("button", { name: "Aplicar plazos", exact: true });
  const overdueCount = sla.getByText("Fuera del plazo", { exact: true }).locator("..").locator("strong");
  await criticalDeadline.fill("-1");
  await applyDeadlines.click();
  assert.equal(await criticalDeadline.evaluate(input => input.validity.rangeUnderflow), true);
  await expect(overdueCount).toHaveText("1,569");
  await criticalDeadline.fill("15");
  await expect(overdueCount).toHaveText("1,569");
  await applyDeadlines.click();
  await expect(overdueCount).not.toHaveText("1,569");
  await expect(sla.getByText("Indeterminado", { exact: true }).locator("..").locator("strong")).not.toHaveText("0");
  await page.reload();
  await expect(criticalDeadline).toHaveValue("15");
  const reportBytes = await downloadReport(page);
  const reportPdf = reportBytes.toString("latin1");
  assert.match(reportPdf, /SLA por criticidad del activo: Crítica 15 días, Muy alta 30 días/);
  assert.match(reportPdf, /Indeterminado/);
  assert.match(reportPdf, /Gravedad 4-5.*máx\. 5/);
  assert.doesNotMatch(reportPdf, /CVSS/i);
  assert.match(reportPdf, /Cada punto marca el conteo/);
  assert.match(reportPdf, /Eje ampliado de 570 a 580 hallazgos.*diferencia entre extremos es de 6/);
  assert.match(reportPdf, /Cada segmento cuenta hallazgos pendientes/);
  assert.match(reportPdf, /Cada celda cuenta servidores/);
  assert.match(reportPdf, /0\.72 0\.11 0\.16 rg/);
  assert.match(reportPdf, /1,337 hallazgos indican una última observación/);
  await writeFile(output + "/reporte-ejecutivo.pdf", reportBytes);
  await page.getByRole("button", { name: "Más filtros", exact: true }).click();
  await selectOption(page, "Antigüedad", "AGE_0_7D");
  const singleBandPdf = (await downloadReport(page)).toString("latin1");
  assert.match(singleBandPdf, /Cada barra muestra el conteo de hallazgos en un rango de antigüedad/);
  assert.doesNotMatch(singleBandPdf, /Eje ampliado/);
  assert.doesNotMatch((await downloadReport(page, "Reporte técnico")).toString("latin1"), /CVSS/i);
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  await page.getByRole("button", { name: "Menos filtros", exact: true }).click();
  checks.push("Executive PDF compares close age counts on a zoomed axis and uses bars for widely spaced counts. Both reports use the Excel severity scale.");
  await criticalDeadline.fill("7");
  await applyDeadlines.click();
  await expect(overdueCount).toHaveText("1,569");
  checks.push("A 15-day SLA recalculates findings, classifies ranges spanning the deadline as undetermined, persists, and appears in the PDF. Negative values are blocked.");
  const quality = page.getByRole("button", { name: "¿Qué debo revisar?", exact: true });
  await quality.focus(); await page.keyboard.press("Enter");
  await expect(quality).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('[data-analysis-content="quality"]')).toBeVisible();
  await page.keyboard.press("ArrowDown");
  assert.ok(await page.locator('[data-analysis-trigger="priorities"]').evaluate(el => el === document.activeElement));
  await page.keyboard.press("Enter");
  await expect(quality).toHaveAttribute("aria-expanded", "false");
  assert.equal(await page.locator('[data-analysis-trigger][aria-expanded="true"]').count(), 1);
  await capture(page, "accordion-priorities-desktop.png");
  await page.locator('[data-analysis-trigger="priorities"]').focus();
  await page.keyboard.press("Home");
  assert.ok(await page.locator('[data-analysis-trigger="inventory"]').evaluate(el => el === document.activeElement));
  await page.keyboard.press("End");
  assert.ok(await page.locator('[data-analysis-trigger="age"]').evaluate(el => el === document.activeElement));
  await page.keyboard.press("Enter");
  await expect(page.locator('[data-analysis-trigger="priorities"]')).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator('[data-analysis-trigger][aria-expanded="true"]').count(), 0);
  checks.push("Radix overview accordions: all five initially closed, one open at a time, keyboard Enter/arrows/Home/End, supplemental analysis fills the space below questions");
  const typeScale = await page.getByRole("region", { name: "Indicadores del alcance" }).evaluate(el => ({ label: getComputedStyle(el.querySelector("button span")).fontSize, number: getComputedStyle(el.querySelector("button strong")).fontSize }));
  assert.ok(parseFloat(typeScale.label) >= 14);
  assert.ok(parseFloat(typeScale.number) >= 56);
  await noOverflow(page, "overview desktop");
  await capture(page, "desktop.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await noOverflow(page, "overview mobile");
  await capture(page, "mobile.png");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole("button", { name: /Filtrar región Norte/ }).focus();
  await page.keyboard.press("Enter");
  assert.equal(await page.getByRole("combobox", { name: "Región", exact: true }).getAttribute("data-value"), "REGION_NORTH");
  assert.ok((await page.getByRole("region", { name: "Indicadores del alcance" }).innerText()).includes("131"));
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  await page.getByRole("button", { name: "¿Qué regiones acumulan mayor severidad?", exact: true }).click();
  await page.getByRole("button", { name: /Norte, nivel 5:/ }).click();
  await page.getByRole("button", { name: "Más filtros", exact: true }).click();
  assert.equal(await page.getByRole("combobox", { name: "Severidad", exact: true }).getAttribute("data-value"), "5");
  assert.equal(await page.getByRole("combobox", { name: "Región", exact: true }).getAttribute("data-value"), "REGION_NORTH");
  await page.getByRole("button", { name: /Pendientes de nivel 4–5/ }).click();
  assert.ok((await page.getByRole("region", { name: "Hallazgos del alcance" }).innerText()).includes("90 registros"), "KPI must preserve Norte + severity 5 instead of broadening to levels 4+5");
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  await navigate(page, "Panorama general");
  await page.getByRole("button", { name: "Más filtros", exact: true }).click();
  await selectOption(page, "Estado", "REMEDIATED");
  const closedText = await page.getByRole("region", { name: "Indicadores del alcance" }).innerText();
  assert.ok(closedText.includes("0"));
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  checks.push("Keyboard map selection, heatmap cross-filter, status and reset update the analysis");
  await navigate(page, "Servidores");
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await page.getByRole("textbox", { name: "Buscar en el inventario" }).fill("srv-0001");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  const row = page.locator("tbody tr").first();
  const tableType = await row.evaluate(el => ({ cell: getComputedStyle(el.cells[3]).fontSize, secondary: getComputedStyle(el.querySelector("small")).fontSize, id: getComputedStyle(el.querySelector("td span")).fontSize }));
  assert.ok(parseFloat(tableType.cell) >= 20 && parseFloat(tableType.secondary) >= 17 && parseFloat(tableType.id) >= 19, JSON.stringify(tableType));
  await row.locator("td").nth(3).click();
  await page.getByRole("dialog").waitFor({ state: "visible" });
  const detailBox = await page.getByRole("dialog").boundingBox();
  assert.ok(detailBox.width >= 1100, "Server detail must occupy a large workspace, not a narrow drawer");
  await page.getByRole("dialog").locator("summary").filter({ hasText: "Ver ficha técnica completa" }).click();
  assert.ok((await page.getByRole("dialog").innerText()).includes("VulnerabilityVolumeBand"));
  await page.getByRole("dialog").locator("summary").filter({ hasText: "Ver ficha técnica completa" }).click();
  await capture(page, "detail-desktop.png");
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileDetail = await page.getByRole("dialog").boundingBox();
  assert.ok(mobileDetail.width >= 389, "Mobile detail must use the full viewport");
  await capture(page, "detail-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Buscar en el inventario" }).fill("no-existe-999");
  await page.getByRole("heading", { name: "Sin servidores coincidentes" }).waitFor();
  await page.getByRole("button", { name: "Restablecer filtros", exact: true }).click();
  await page.getByRole("textbox", { name: "Buscar en el inventario" }).fill("srv-0001");
  await page.getByRole("button", { name: "Ver SRV-0001", exact: true }).focus();
  await page.keyboard.press("Enter");
  await page.getByRole("dialog").waitFor({ state: "visible" });
  await page.getByRole("region", { name: "Hallazgos del servidor" }).locator("tbody tr").first().locator("td").nth(2).click();
  await page.getByRole("heading", { name: /^Hallazgo FND-/ }).waitFor();
  await page.keyboard.press("Escape");
  await page.getByRole("textbox", { name: "Buscar en el inventario" }).fill("");
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const downloaded = await downloading;
  const exported = await readFile(await downloaded.path(), "utf8");
  assert.equal(exported.split("\r\n").length, 247, "CSV must include all 246 servers, not just one page");
  await capture(page, "servers-desktop.png");
  checks.push("Pagination, case-insensitive search, empty state, source field detail, Escape and full filtered CSV export");
  await navigate(page, "Hallazgos");
  await page.locator("tbody tr").first().locator("td").nth(4).click();
  await page.getByRole("heading", { name: /^Hallazgo FND-/ }).waitFor();
  await page.keyboard.press("Escape");
  await capture(page, "findings-desktop.png");
  checks.push("20px table cells, 17px secondary text, full server/finding rows and nested finding rows open detail; native detail button remains keyboard accessible");
  const bad = await uploadApi(Buffer.from("not an excel"), "Invalid");
  assert.equal(bad.response.status, 422);
  assert.equal((await (await fetch(base + "/api/snapshots")).json()).length, 1);
  const removedExample = new FormData(); removedExample.set("example", "true");
  const removedResponse = await fetch(base + "/api/snapshots", { method: "POST", body: removedExample });
  assert.equal(removedResponse.status, 422, "The removed example action must require an uploaded file");
  assert.ok((await removedResponse.json()).errors.includes("Selecciona un archivo Excel .xlsx."));
  const duplicate = await uploadApi(source, "Duplicado");
  assert.equal(duplicate.response.status, 409);
  assert.equal((await (await fetch(base + "/api/snapshots")).json()).length, 1);
  checks.push("Malformed XLSX and duplicate snapshot rejected without storing a new cut");

  const fixture = execFileSync("python3", ["-c", `
import sys
sys.path.insert(0, 'scripts')
from test_inventory import mutate, set_cell
def change(root):
    set_cell(root, 'F6', 'REMEDIATED')
    set_cell(root, 'F9', 'REOPENED')
    set_cell(root, 'A3454', 'FND-NEW-TEST')
sys.stdout.buffer.write(mutate(change))
`], { maxBuffer: 5 * 1024 * 1024 });
  await navigate(page, "Cargas de datos");
  await page.getByLabel("Archivo Excel", { exact: true }).setInputFiles({ name: "revision.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: fixture });
  await page.getByLabel("Nombre del corte", { exact: true }).fill("Revisión de prueba");
  await page.getByLabel("Fecha de referencia", { exact: true }).fill("2026-10-22");
  await page.getByRole("button", { name: "Validar y guardar corte" }).click();
  await page.getByRole("region", { name: "Indicadores del alcance" }).waitFor();
  if (await page.getByRole("button", { name: "Cerrar notificación" }).isVisible()) await page.getByRole("button", { name: "Cerrar notificación" }).click();
  assert.equal((await (await fetch(base + "/api/snapshots")).json()).length, 2);
  await navigate(page, "Comparar cortes");
  await selectOption(page, "Corte de referencia", baseline.id);
  await page.getByRole("heading", { name: "Cambios en los hallazgos" }).waitFor();
  for (const name of ["Pasaron a remediados", "Volvieron a pendientes", "IDs nuevos", "IDs ausentes"]) {
    const button = page.getByRole("button", { name: new RegExp(name) });
    assert.ok((await button.innerText()).includes("1"), `Expected one change: ${name}`);
    await button.click();
    await expect(page.locator("tbody").last().locator("tr")).toHaveCount(1);
  }
  await noOverflow(page, "comparison desktop");
  await capture(page, "compare-desktop.png");
  checks.push("Upload second XLSX through UI and compare: one resolved, one reopened, one new ID and one absent ID");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ["Panorama general", "Servidores", "Hallazgos", "Comparar cortes", "Cargas de datos"]) {
    await navigate(page, name);
    await noOverflow(page, `${name} mobile`);
  }
  await capture(page, "imports-mobile.png");
  await selectOption(page, "Corte activo", baseline.id);
  await page.getByRole("heading", { name: "Observaciones del corte activo" }).waitFor();
  assert.ok((await page.getByRole("region", { name: "Observaciones del corte activo" }).innerText()).includes("222"));
  checks.push("All five screens fit 390px and persisted source cut can be selected again");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await navigate(page, "Panorama general");
  await page.getByRole("button", { name: "¿Cuáles llevan más tiempo sin arreglar?", exact: false }).click();
  assert.equal(await page.getByRole("combobox", { name: "Orden de registros" }).getAttribute("data-value"), "age");
  assert.ok((await page.locator("tbody tr").first().innerText()).includes("Más de 180 días"));
  await navigate(page, "Panorama general");
  const motionBefore = await page.locator("main").evaluate(el => getComputedStyle(el).animationName);
  assert.equal(motionBefore, "none", "Reduced motion must disable tab transitions");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await navigate(page, "Hallazgos");
  assert.ok((await page.locator("main").evaluate(el => getComputedStyle(el).animationName)).includes("page-enter"));
  await page.getByRole("combobox", { name: "Orden de registros" }).click();
  assert.ok((await page.getByRole("listbox", { name: "Orden de registros" }).getByRole("option").first().evaluate(el => getComputedStyle(el).animationName)).includes("option-enter"));
  await page.keyboard.press("Escape");
  await navigate(page, "Panorama general");
  await page.locator('[data-analysis-trigger="inventory"]').click();
  assert.ok((await page.locator('[data-analysis-content="inventory"]').evaluate(el => getComputedStyle(el).animationName)).includes("accordion-down"));
  await page.locator('[data-analysis-trigger="inventory"]').click();
  checks.push("Tab transitions, dropdown options and Radix accordion animations enabled in normal motion; reduced motion disables animation");
  await page.locator('[data-motion="running"]').waitFor();
  const globe = page.getByRole("img", { name: /Globo 3D de puntos/ });
  await globe.scrollIntoViewIfNeeded();
  const firstFrame = await globe.evaluate(el => el.toDataURL());
  await page.waitForTimeout(180);
  assert.ok(firstFrame !== await globe.evaluate(el => el.toDataURL()), "Full-motion globe must animate");
  await page.getByRole("button", { name: "Pausar animación del globo" }).click();
  await page.locator('canvas[data-render-mode="paused"]').waitFor();
  const still = await globe.evaluate(el => el.toDataURL());
  await page.waitForTimeout(180);
  assert.ok(still === await globe.evaluate(el => el.toDataURL()), "Paused globe must remain still");
  const box = await globe.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 60, box.y + box.height / 2 + 15, { steps: 6 }); await page.mouse.up();
  assert.ok(still !== await globe.evaluate(el => el.toDataURL()), "Dragging must rotate the globe even while paused");
  await page.getByRole("button", { name: "Centrar América" }).click();
  checks.push("Larger type, collapsed secondary analyses, wide desktop/fullscreen mobile detail, oldest-first question, reduced motion, animation/pause and drag verified");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const decoders = page.locator('[data-decoder="metric"]');
  for (const region of ["REGION_NORTH", "REGION_CENTRAL", "REGION_NORTH"]) {
    await selectOption(page, "Región", region);
    await expect(decoders.first()).toHaveAttribute("data-settled", "false");
    await expect(page.locator('[data-decoder="metric"][data-settled="true"]')).toHaveCount(4);
    assert.ok(await decoders.evaluateAll(nodes => nodes.every(el => el.textContent === el.dataset.value && el.getAttribute("aria-label") === el.dataset.value)));
  }
  const stableCounts = await decoders.allTextContents();
  await page.waitForTimeout(800);
  assert.deepEqual(await decoders.allTextContents(), stableCounts, "Decoder must finish and remain settled");
  await navigate(page, "Servidores");
  await navigate(page, "Panorama general");
  await expect(decoders.first()).toHaveAttribute("data-settled", "false");
  await expect(page.locator('[data-decoder="metric"][data-settled="true"]')).toHaveCount(4);
  assert.deepEqual(await decoders.allTextContents(), stableCounts, "Returning to the tab must preserve the real counts");
  await selectOption(page, "Región", "REGION_SOUTH");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator('[data-decoder="metric"][data-settled="true"]')).toHaveCount(4);
  assert.ok(await decoders.evaluateAll(nodes => nodes.every(el => el.textContent === el.dataset.value)));
  checks.push("Finite KPI decoder replays on region changes, revisiting a region and returning to overview; stable final values, real accessible labels and reduced-motion cancellation");
  for (const [region, name] of [["REGION_NORTH", "Norte"], ["REGION_CENTRAL", "Centro"], ["REGION_SOUTH", "Sur"]]) {
    await selectOption(page, "Región", region);
    const selectedGlobe = page.getByRole("img", { name: /Globo 3D de puntos/ });
    await expect(selectedGlobe).toHaveAttribute("data-selected-region", region);
    await expect(selectedGlobe).toHaveAttribute("aria-label", new RegExp(`Región ${name} seleccionada`));
    await selectedGlobe.scrollIntoViewIfNeeded();
    const fill = await selectedGlobe.evaluate(canvas => {
      const pixels = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height).data;
      let count = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 95 && pixels[i + 1] > 45 && pixels[i + 2] > 75 && pixels[i] - pixels[i + 1] > 40) count++;
      const center = canvas.getContext("2d").getImageData(Math.floor(canvas.width / 2) - 5, Math.floor(canvas.height / 2) - 5, 10, 10).data;
      let centerCount = 0;
      for (let i = 0; i < center.length; i += 4) if (center[i] - center[i + 1] > 30) centerCount++;
      return { count, centerCount };
    });
    assert.ok(fill.count > 100 && fill.centerCount > 30, `${region} must have a visible filled territory and center on it: ${JSON.stringify(fill)}`);
    await capture(page, `globe-selected-${region}.png`);
  }
  checks.push("All three reference countries render a measurable wine fill, boundary and selected label; selected map redraw confirmed even with reduced motion");
  const comparisonWorkbook = process.env.FEMSA_TEST_COMPARISON_XLSX;
  if (comparisonWorkbook) {
    await navigate(page, /Cargas de datos/);
    await page.getByLabel("Archivo Excel", { exact: true }).setInputFiles(comparisonWorkbook);
    await page.getByLabel("Nombre del corte", { exact: true }).fill("Corte simulado");
    await page.getByLabel("Fecha de referencia", { exact: true }).fill("2026-10-31");
    await page.getByRole("button", { name: "Validar y guardar corte" }).click();
    const map = page.getByRole("region", { name: "Globo por país" });
    await expect(map).toBeVisible();
    await page.getByRole("button", { name: "Cerrar notificación" }).click();
    const syntheticPdf = await downloadReport(page);
    assert.match(syntheticPdf.toString("latin1"), /La importación terminó sin avisos de consistencia/);
    assert.match(syntheticPdf.toString("latin1"), /Eje ampliado de 550 a 600 hallazgos.*diferencia entre extremos es de 21/);
    await writeFile(output + "/reporte-ejecutivo-simulado.pdf", syntheticPdf);
    const countryList = map.getByRole("group", { name: "Seleccionar país del globo" });
    await expect(countryList.getByRole("button")).toHaveCount(10);
    assert.ok(await countryList.evaluate(el => el.scrollHeight <= el.clientHeight + 1), "The whole country list should fit in the map card");
    const mexico = countryList.getByRole("button", { name: /^México/ });
    await mexico.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("combobox", { name: "País", exact: true })).toHaveAttribute("data-value", "MX");
    await expect(map.getByRole("img", { name: /Globo con países del Excel/ })).toHaveAttribute("data-selected-region", "MX");
    await expect(map.getByRole("button", { name: /Filtrar país México/ })).toBeVisible();
    const mexicoPending = Number((await mexico.innerText()).match(/([\d,]+) pendientes/)[1].replaceAll(",", ""));
    await expect(page.getByRole("button", { name: /Hallazgos pendientes/ }).getByText(mexicoPending.toLocaleString("es-MX"), { exact: true })).toBeVisible();
    await capture(page, "pais-desktop.png");
    const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: "reduce" });
    try {
      const mobile = await mobileContext.newPage();
      await mobile.goto(base);
      const mobileMap = mobile.getByRole("region", { name: "Globo por país" });
      const mobileCountries = mobileMap.getByRole("group", { name: "Seleccionar país del globo" });
      const mobileMexico = mobileCountries.getByRole("button", { name: /^México/ });
      await mobileMexico.tap();
      assert.ok(await mobileCountries.evaluate(el => el.scrollHeight <= el.clientHeight + 1), "Country list should not clip on mobile");
      const canvas = mobileMap.getByRole("img", { name: /Globo con países del Excel/ });
      await expect(canvas).toHaveAttribute("data-selected-region", "MX");
      await noOverflow(mobile, "country overview mobile");
      await canvas.scrollIntoViewIfNeeded();
      const frame = await canvas.evaluate(el => el.toDataURL());
      const area = await canvas.boundingBox();
      const touch = await mobileContext.newCDPSession(mobile);
      const touchPoint = { x: area.x + area.width * .32, y: area.y + area.height * .6 };
      await touch.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [touchPoint] });
      await touch.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ ...touchPoint, x: touchPoint.x + 65 }] });
      await touch.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      assert.notEqual(await canvas.evaluate(el => el.toDataURL()), frame, "The globe should rotate during a horizontal touch gesture");
      await capture(mobile, "pais-mobile.png");
    } finally {
      await mobileContext.close();
    }
    await page.getByRole("button", { name: /^Restablecer \(/ }).click();
    await navigate(page, "Comparar cortes");
    await selectOption(page, "Corte de referencia", baseline.id);
    const changes = page.getByRole("region", { name: "Cambios en los hallazgos" });
    for (const [title, count] of [["Pasaron a remediados", 40], ["Volvieron a pendientes", 12], ["IDs nuevos", 24], ["IDs ausentes", 18], ["Cambio de servidor", 9]]) {
      await expect(changes.getByRole("button", { name: new RegExp(title) })).toHaveText(`${title}${count}`);
    }
    checks.push("Synthetic XLSX imports through the UI, country selection updates the globe and KPIs, touch rotates the globe, and all five change groups match the reference");
  }
  assert.deepEqual(errors, []);
  await rm(output + "/failure.json", { force: true });
  await writeFile(output + "/verification.json", JSON.stringify({ passed: true, checks, errors }, null, 2));
  console.log(JSON.stringify({ passed: true, checks, errors }, null, 2));
} catch (error) {
  await writeFile(output + "/failure.json", JSON.stringify({ error: String(error), logs, errors, checks }, null, 2));
  throw error;
} finally {
  await browser?.close();
  const stopped = once(server, "exit");
  server.kill("SIGTERM");
  await Promise.race([stopped, delay(5000)]);
  if (server.exitCode === null) server.kill("SIGKILL");
  await rm(directory, { recursive: true, force: true });
}
