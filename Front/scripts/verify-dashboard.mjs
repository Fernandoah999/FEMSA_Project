import { chromium } from "@playwright/test";
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
  for (const n of ["246", "2,875", "561", "257"]) assert.ok(metricText.includes(n), `Missing source metric ${n}`);
  checks.push("Import academic XLSX through UI: 246 servers, 3,450 findings, correct pending/high/SLA counts");
  const baseline = (await (await fetch(base + "/api/snapshots")).json())[0];
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("region", { name: "Indicadores del alcance" }).waitFor();
  assert.ok((await page.getByRole("region", { name: "Indicadores del alcance" }).innerText()).includes("2,875"));
  checks.push("SQLite history and records survive page reload");
  await page.getByRole("button", { name: /Pendientes de nivel 4–5/ }).click();
  assert.equal(await page.getByRole("combobox", { name: "Severidad", exact: true }).inputValue(), "4_5");
  await page.getByRole("region", { name: "Hallazgos del alcance" }).waitFor();
  assert.ok((await page.getByRole("region", { name: "Hallazgos del alcance" }).innerText()).includes("561 registros"));
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: "Panorama general", exact: true }).click();
  await page.getByRole("button", { name: /Pendientes fuera de SLA/ }).click();
  assert.ok((await page.getByRole("region", { name: "Hallazgos del alcance" }).innerText()).includes("257 registros"));
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: "Panorama general", exact: true }).click();
  checks.push("KPI drilldowns preserve scope: 561 high-severity pending records and 257 overdue pending records");
  await page.locator('[data-globe-ready="true"][data-motion="paused"]').waitFor();
  assert.equal(await page.locator('details[open]').count(), 0, "Secondary analysis must start collapsed");
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
  assert.equal(await page.getByRole("combobox", { name: "Región", exact: true }).inputValue(), "REGION_NORTH");
  assert.ok((await page.getByRole("region", { name: "Indicadores del alcance" }).innerText()).includes("131"));
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  await page.locator("summary").filter({ hasText: "¿Qué regiones acumulan mayor severidad?" }).click();
  await page.getByRole("button", { name: /Norte, nivel 5:/ }).click();
  await page.getByRole("button", { name: "Más filtros", exact: true }).click();
  assert.equal(await page.getByRole("combobox", { name: "Severidad", exact: true }).inputValue(), "5");
  assert.equal(await page.getByRole("combobox", { name: "Región", exact: true }).inputValue(), "REGION_NORTH");
  await page.getByRole("button", { name: /Pendientes de nivel 4–5/ }).click();
  assert.ok((await page.getByRole("region", { name: "Hallazgos del alcance" }).innerText()).includes("90 registros"), "KPI must preserve Norte + severity 5 instead of broadening to levels 4+5");
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: "Panorama general", exact: true }).click();
  await page.getByRole("button", { name: "Más filtros", exact: true }).click();
  await page.getByRole("combobox", { name: "Estado", exact: true }).selectOption("REMEDIATED");
  const closedText = await page.getByRole("region", { name: "Indicadores del alcance" }).innerText();
  assert.ok(closedText.includes("0"));
  await page.getByRole("button", { name: /^Restablecer \(/ }).click();
  checks.push("Keyboard map selection, heatmap cross-filter, status and reset update the analysis");
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: "Servidores", exact: true }).click();
  await page.getByRole("button", { name: "Página siguiente" }).click();
  await page.getByRole("textbox", { name: "Buscar en el inventario" }).fill("srv-0001");
  assert.equal(await page.locator("tbody tr").count(), 1);
  await page.getByRole("button", { name: "Ver SRV-0001", exact: true }).click();
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
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const downloaded = await downloading;
  const exported = await readFile(await downloaded.path(), "utf8");
  assert.equal(exported.split("\r\n").length, 247, "CSV must include all 246 servers, not just one page");
  await capture(page, "servers-desktop.png");
  checks.push("Pagination, case-insensitive search, empty state, source field detail, Escape and full filtered CSV export");
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
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: /Cargas de datos/ }).click();
  await page.getByLabel("Archivo Excel", { exact: true }).setInputFiles({ name: "revision.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: fixture });
  await page.getByLabel("Nombre del corte", { exact: true }).fill("Revisión de prueba");
  await page.getByLabel("Fecha de referencia", { exact: true }).fill("2026-10-22");
  await page.getByRole("button", { name: "Validar y guardar corte" }).click();
  await page.getByRole("region", { name: "Indicadores del alcance" }).waitFor();
  if (await page.getByRole("button", { name: "Cerrar notificación" }).isVisible()) await page.getByRole("button", { name: "Cerrar notificación" }).click();
  assert.equal((await (await fetch(base + "/api/snapshots")).json()).length, 2);
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: "Comparar cortes", exact: true }).click();
  await page.getByRole("combobox", { name: "Corte de referencia", exact: true }).selectOption(baseline.id);
  await page.getByRole("heading", { name: "Cambios en los hallazgos" }).waitFor();
  for (const name of ["Pasaron a remediados", "Volvieron a pendientes", "IDs nuevos", "IDs ausentes"]) {
    const button = page.getByRole("button", { name: new RegExp(name) });
    assert.ok((await button.innerText()).includes("1"), `Expected one change: ${name}`);
    await button.click();
    assert.equal(await page.locator("tbody").last().locator("tr").count(), 1);
  }
  await noOverflow(page, "comparison desktop");
  await capture(page, "compare-desktop.png");
  checks.push("Upload second XLSX through UI and compare: one resolved, one reopened, one new ID and one absent ID");
  await page.setViewportSize({ width: 390, height: 844 });
  for (const name of ["Panorama general", "Servidores", "Hallazgos", "Comparar cortes", "Cargas de datos"]) {
    await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: new RegExp(`^${name}`) }).click();
    await noOverflow(page, `${name} mobile`);
  }
  await capture(page, "imports-mobile.png");
  await page.getByRole("combobox", { name: "Corte activo", exact: true }).selectOption(baseline.id);
  await page.getByRole("heading", { name: "Observaciones del corte activo" }).waitFor();
  assert.ok((await page.getByRole("region", { name: "Observaciones del corte activo" }).innerText()).includes("222"));
  checks.push("All five screens fit 390px and persisted source cut can be selected again");
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: "Panorama general", exact: true }).click();
  await page.getByRole("button", { name: "¿Cuáles llevan más tiempo sin arreglar?", exact: false }).click();
  assert.equal(await page.getByRole("combobox", { name: "Orden de registros" }).inputValue(), "age");
  assert.ok((await page.locator("tbody tr").first().innerText()).includes("Más de 180 días"));
  await page.getByRole("navigation", { name: "Navegación principal" }).getByRole("button", { name: "Panorama general", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
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
