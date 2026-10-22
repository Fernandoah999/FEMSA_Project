import { getSnapshot } from "@/lib/inventory-store";
export const runtime = "nodejs";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const snapshot = getSnapshot(id);
    return snapshot ? Response.json(snapshot, { headers: { "Cache-Control": "no-store" } }) : Response.json({ errors: ["La carga seleccionada no existe."] }, { status: 404 });
  } catch { return Response.json({ errors: ["No se pudo leer la carga local. Inténtalo de nuevo."] }, { status: 500 }); }
}
