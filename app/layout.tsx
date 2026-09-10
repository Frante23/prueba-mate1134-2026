import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Confirmación de asistencia | MATE1134",
  description: "Registro de asistencia para la evaluación MATE1134 2026."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
