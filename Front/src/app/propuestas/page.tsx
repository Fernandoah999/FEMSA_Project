import { Suspense } from "react";
import { AtlasApp } from "@/components/atlas-app";
export default function Proposals() {
  return <Suspense fallback={<main className="boot">Cargando propuestas…</main>}><AtlasApp /></Suspense>;
}
