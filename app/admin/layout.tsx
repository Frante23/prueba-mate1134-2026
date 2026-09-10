import type { Metadata } from "next";

export const metadata: Metadata = { title: "Panel docente | MATE1134", description: "Detalle privado de respuestas de asistencia." };

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
