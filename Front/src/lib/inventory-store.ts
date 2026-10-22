import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import type { Snapshot, SnapshotMeta, ImportWarning } from "./inventory";

export class ImportError extends Error {
  constructor(public issues: string[], public status = 422) { super(issues[0]); }
}
function database() {
  const folder = process.env.FEMSA_DATA_DIR || path.join(process.cwd(), "data");
  mkdirSync(folder, { recursive: true });
  const db = new DatabaseSync(path.join(folder, "inventory.sqlite"));
  db.exec("PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, metadata TEXT NOT NULL, payload TEXT NOT NULL, hash TEXT NOT NULL, reference_date TEXT NOT NULL, UNIQUE(hash, reference_date));");
  return db;
}
export function listSnapshots(): SnapshotMeta[] {
  const db = database();
  try { return db.prepare("SELECT metadata FROM snapshots ORDER BY rowid DESC").all().map(row => JSON.parse(row.metadata as string)); }
  finally { db.close(); }
}
export function getSnapshot(id: string): Snapshot | null {
  const db = database();
  try { const row = db.prepare("SELECT metadata, payload FROM snapshots WHERE id = ?").get(id); return row ? { ...JSON.parse(row.metadata as string), ...JSON.parse(row.payload as string) } : null; }
  finally { db.close(); }
}
function parseWorkbook(buffer: Buffer): Promise<{ servers: Snapshot["servers"]; findings: Snapshot["findings"]; warnings: ImportWarning[] }> {
  return new Promise((resolve, reject) => {
    // The local Python interpreter is a runtime dependency, not a bundled executable.
    const child = spawn(/*turbopackIgnore: true*/ process.env.FEMSA_PYTHON || "python3", [path.join(process.cwd(), "scripts", "read-inventory.py")], { stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let size = 0;
    const timer = setTimeout(() => { child.kill(); reject(new ImportError(["La lectura superó 45 segundos. Reduce el tamaño del archivo."])); }, 45000);
    child.on("error", () => { clearTimeout(timer); reject(new ImportError(["No se pudo iniciar Python 3. Verifica que esté instalado o configura FEMSA_PYTHON."], 500)); });
    child.stdin.on("error", () => {});
    child.stderr.resume();
    child.stdout.on("data", (chunk: Buffer) => { size += chunk.length; if (size > 100 * 1024 * 1024) child.kill(); else chunks.push(chunk); });
    child.on("close", code => {
      clearTimeout(timer);
      if (code !== 0) { reject(new ImportError(["No se pudo procesar el archivo dentro de los límites admitidos."])); return; }
      try { const result = JSON.parse(Buffer.concat(chunks).toString("utf8")); if (result.errors) reject(new ImportError(result.errors)); else resolve(result); }
      catch { reject(new ImportError(["La lectura del Excel no devolvió un resultado válido."])); }
    });
    child.stdin.end(buffer);
  });
}
export async function importSnapshot(buffer: Buffer, filename: string, name: string, referenceDate: string | null): Promise<Snapshot> {
  if (buffer.length > 20 * 1024 * 1024) throw new ImportError(["El archivo supera 20 MB."], 413);
  if (!filename.toLowerCase().endsWith(".xlsx")) throw new ImportError(["Usa un archivo con extensión .xlsx."]);
  if (!name.trim() || name.trim().length > 100) throw new ImportError(["El nombre de la carga debe tener entre 1 y 100 caracteres."]);
  if (referenceDate !== null && (!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate) || !Number.isFinite(Date.parse(referenceDate)) || new Date(referenceDate).toISOString().slice(0, 10) !== referenceDate)) throw new ImportError(["Indica una fecha de referencia válida."]);
  const hash = createHash("sha256").update(buffer).digest("hex");
  const parsed = await parseWorkbook(buffer);
  const db = database();
  try {
    const previous = db.prepare("SELECT metadata FROM snapshots WHERE hash = ? AND reference_date = ?").get(hash, referenceDate ?? "");
    if (previous) throw new ImportError(["Este mismo archivo ya está guardado para esa fecha de referencia. Selecciona la carga existente."], 409);
    if (db.prepare("SELECT id FROM snapshots WHERE hash = ?").get(hash)) parsed.warnings.push({ code: "same_content", count: 1, message: "Este archivo coincide con otro corte. Se guardó por tener una fecha de referencia diferente." });
    const meta: SnapshotMeta = { id: randomUUID(), name: name.trim(), filename: path.basename(filename), referenceDate, uploadedAt: new Date().toISOString(), serverCount: parsed.servers.length, findingCount: parsed.findings.length, warnings: parsed.warnings, hash };
    db.prepare("INSERT INTO snapshots (id, metadata, payload, hash, reference_date) VALUES (?, ?, ?, ?, ?)").run(meta.id, JSON.stringify(meta), JSON.stringify({ servers: parsed.servers, findings: parsed.findings }), hash, referenceDate ?? "");
    return { ...meta, servers: parsed.servers, findings: parsed.findings };
  } finally { db.close(); }
}
