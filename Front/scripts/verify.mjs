import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

const base = process.env.TEST_URL || "http://localhost:3040/propuestas";
const output = ".impeccable/review";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1050 },
  reducedMotion: "reduce",
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
const overflows = [];
const results = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text().slice(0, 1000));
});
const styles = [
  "orbit",
  "earth",
  "pandemic",
  "iot",
  "territory",
  "tracking",
  "estrato",
  "femsa",
];
const navigation = [
  "Panorama general",
  "Servidores",
  "Vulnerabilidades",
  "Reportes",
];
async function checkOverflow(label) {
  const size = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  if (size.content > size.viewport + 1) overflows.push({ label, ...size });
}

try {
  for (const style of styles) {
    for (let variant = 1; variant <= 3; variant++) {
      await page.goto(`${base}/?style=${style}&v=${variant}`, {
        waitUntil: "networkidle",
      });
      await page.locator(".world").waitFor();
      if (style === "earth" || style === "pandemic") {
        await page.locator('[data-texture="ready"]').waitFor();
      }
      assert.equal(await page.locator("#style").inputValue(), style);
      await checkOverflow(`${style}-${variant}-dashboard-desktop`);
      await page.screenshot({
        path: `${output}/${style}-${variant}-desktop.png`,
        fullPage: true,
      });
      for (const label of navigation.slice(1)) {
        await page
          .getByRole("navigation")
          .getByRole("button", {
            name: label,
            exact: label !== "Vulnerabilidades",
          })
          .click();
        await page.getByRole("heading", { level: 1, name: label }).waitFor();
        await checkOverflow(`${style}-${variant}-${label}-desktop`);
      }
      results.push(`${style}-${variant}: four screens render`);
    }
  }

  await page.goto(`${base}/?style=orbit&v=1`, { waitUntil: "networkidle" });
  await page
    .getByRole("button", { name: "Revisar críticos", exact: true })
    .click();
  assert.equal(
    await page.locator("tbody tr").count(),
    3,
    "Critical filter must show three sample servers",
  );
  await page
    .getByRole("button", { name: "Ver detalle de MTY-PROD-DB" })
    .click();
  await page.getByRole("dialog").waitFor({ state: "visible" });
  await page
    .getByRole("button", { name: "Añadir al plan de actualización" })
    .click();
  assert.equal(
    await page
      .getByRole("button", { name: "Incluido en el plan de muestra" })
      .isDisabled(),
    true,
  );
  await page.keyboard.press("Escape");
  await page
    .getByRole("textbox", { name: "Buscar servidores" })
    .fill("no-existe-999");
  await page
    .getByRole("heading", { name: "No encontramos servidores" })
    .waitFor();
  await page.getByRole("button", { name: "Restablecer filtros" }).click();
  assert.equal(await page.locator("tbody tr").count(), 12);
  const inventoryDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar inventario" }).click();
  assert.equal(
    (await inventoryDownload).suggestedFilename(),
    "femsa-servidores-demo.csv",
  );
  await page
    .getByRole("navigation")
    .getByRole("button", { name: /Vulnerabilidades/ })
    .click();
  await page
    .getByRole("textbox", { name: "Buscar vulnerabilidades" })
    .fill("Apache");
  assert.equal(await page.locator(".vulnerability-item").count(), 1);
  await page.locator(".vulnerability-item").click();
  await page
    .getByRole("button", { name: "Explorar servidores de muestra" })
    .click();
  assert.equal(await page.locator("tbody tr").count(), 2);
  await page
    .getByRole("navigation")
    .getByRole("button", { name: "Reportes", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Preparar reporte de muestra" })
    .click();
  await page.locator(".report-ready").waitFor();
  const reportDownload = page.waitForEvent("download");
  await page.getByRole("button", { name: "Descargar", exact: true }).click();
  assert.match((await reportDownload).suggestedFilename(), /resumen-ejecutivo/);
  await page
    .getByRole("button", { name: "Guardar favorito", exact: true })
    .click();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(
    await page
      .getByRole("button", { name: "Quitar de favoritos" })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.getByRole("button", { name: "Ver las 24" }).click();
  assert.equal(await page.locator(".gallery-version").count(), 24);
  await page.screenshot({
    path: `${output}/gallery-desktop.png`,
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Abrir Estrato versión 3", exact: true })
    .click();
  await page.getByRole("heading", { level: 1, name: "Reportes" }).waitFor();
  assert.equal(await page.locator("#style").inputValue(), "estrato");
  results.push(
    "Interactions: critical filter, negative search, reset, detail, plan, Escape, software drilldown, CSV exports, gallery, favorites persistence, page preservation",
  );

  for (const screen of ["servidores", "vulnerabilidades", "reportes"]) {
    await page.goto(`${base}/?style=femsa&v=1&page=${screen}`, {
      waitUntil: "networkidle",
    });
    await page.screenshot({
      path: `${output}/${screen}-desktop.png`,
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const style of styles) {
    for (let variant = 1; variant <= 3; variant++) {
      await page.goto(`${base}/?style=${style}&v=${variant}`, {
        waitUntil: "networkidle",
      });
      await checkOverflow(`${style}-${variant}-dashboard-mobile`);
      await page.screenshot({
        path: `${output}/${style}-${variant}-mobile.png`,
        fullPage: true,
      });
      for (const label of navigation.slice(1)) {
        await page
          .getByRole("navigation")
          .getByRole("button", {
            name: label,
            exact: label !== "Vulnerabilidades",
          })
          .click();
        await page.getByRole("heading", { level: 1, name: label }).waitFor();
        await checkOverflow(`${style}-${variant}-${label}-mobile`);
      }
    }
  }
  for (const screen of ["servidores", "vulnerabilidades", "reportes"]) {
    await page.goto(`${base}/?style=femsa&v=1&page=${screen}`, {
      waitUntil: "networkidle",
    });
    await page.screenshot({
      path: `${output}/${screen}-mobile.png`,
      fullPage: true,
    });
  }
  const summary = {
    combinations: 24,
    screensPerCombination: 4,
    viewports: [1440, 390],
    errors,
    overflows,
    results,
  };
  await writeFile(
    `${output}/verification.json`,
    JSON.stringify(summary, null, 2),
  );
  console.log(JSON.stringify(summary, null, 2));
  assert.equal(errors.length, 0, "No browser errors");
  assert.equal(overflows.length, 0, "No document overflow");
} finally {
  await browser.close();
}
