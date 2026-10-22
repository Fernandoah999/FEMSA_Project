import { ImportError, importSnapshot, listSnapshots } from "@/lib/inventory-store";
export const runtime = "nodejs";
export async function GET() {
  try { return Response.json(listSnapshots(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ errors: ["No se pudo abrir el historial local. Verifica los permisos de la carpeta data."] }, { status: 500 }); }
}
export async function POST(request: Request) {
  try {
    if (+(request.headers.get("content-length") || 0) > 21 * 1024 * 1024) throw new ImportError(["La carga supera el límite de 20 MB."], 413);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) throw new ImportError(["Selecciona un archivo Excel .xlsx."]);
    const date = form.get("referenceDate");
    if (typeof date !== "string" || !date) throw new ImportError(["Indica la fecha que representan los datos del Excel."]);
    const name = form.get("name");
    return Response.json(await importSnapshot(Buffer.from(await file.arrayBuffer()), file.name, typeof name === "string" ? name : "", date), { status: 201 });
  } catch (error) {
    if (error instanceof ImportError) return Response.json({ errors: error.issues }, { status: error.status });
    console.error("Inventory import failed", error);
    return Response.json({ errors: ["No se pudo guardar la carga. Verifica que el archivo esté disponible y vuelve a intentarlo."] }, { status: 500 });
  }
}
