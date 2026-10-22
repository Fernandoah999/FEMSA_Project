import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "FEMSA · Atlas de infraestructura",
  description:
    "Análisis local de servidores y vulnerabilidades: importa Excel, explora el riesgo regional y compara cortes de inventario.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
