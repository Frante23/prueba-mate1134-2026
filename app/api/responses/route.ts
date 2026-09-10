import { NextResponse } from "next/server";
import { saveAttendance, type AttendanceAnswer } from "@/lib/store";
import { isFullName, isValidUctEmail, normalizeEmail, normalizeName } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { name?: unknown; email?: unknown; answer?: unknown };
    const name = typeof body.name === "string" ? normalizeName(body.name) : "";
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const answer = body.answer as AttendanceAnswer;

    if (!isFullName(name)) {
      return NextResponse.json(
        { error: "Ingresa tu nombre completo, incluyendo nombre y apellido." },
        { status: 400 }
      );
    }

    if (!isValidUctEmail(email)) {
      return NextResponse.json(
        { error: "Usa inicial + apellido + año, o nombre.apellido + año, seguido de @alu.uct.cl." },
        { status: 400 }
      );
    }

    if (answer !== "yes" && answer !== "no") {
      return NextResponse.json({ error: "Selecciona Sí o No." }, { status: 400 });
    }

    const record = await saveAttendance(name, email, answer);
    return NextResponse.json({ ok: true, mode: "created-or-updated", record });
  } catch (error) {
    console.error("Unable to save attendance response", error);
    return NextResponse.json(
      { error: "No pudimos guardar tu respuesta. Intenta nuevamente." },
      { status: 503 }
    );
  }
}
