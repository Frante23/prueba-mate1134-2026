import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { deleteAttendance, getRecords, getSummary } from "@/lib/store";
import { isUctDomainEmail, normalizeEmail } from "@/lib/validation";

export const dynamic = "force-dynamic";

function matchesSecret(received: string, expected: string) {
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function hasValidCredentials(email: string, password: string) {
  const configuredEmail = process.env.ADMIN_EMAIL;
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredEmail || !configuredPassword) return null;
  return matchesSecret(email.trim().toLowerCase(), configuredEmail.trim().toLowerCase()) && matchesSecret(password, configuredPassword);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const credentialsValid = hasValidCredentials(email, password);
    if (credentialsValid === null) {
      return NextResponse.json({ error: "El acceso docente no está configurado." }, { status: 503 });
    }
    if (!credentialsValid) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }

    const [summary, records] = await Promise.all([getSummary(), getRecords()]);
    return NextResponse.json({ summary, records }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Unable to load teacher dashboard", error);
    return NextResponse.json(
      { error: "No fue posible cargar el panel docente." },
      { status: 503 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; password?: unknown; studentEmail?: unknown };
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const studentEmail = typeof body.studentEmail === "string" ? normalizeEmail(body.studentEmail) : "";
    const credentialsValid = hasValidCredentials(email, password);

    if (credentialsValid === null) {
      return NextResponse.json({ error: "El acceso docente no está configurado." }, { status: 503 });
    }
    if (!credentialsValid) {
      return NextResponse.json({ error: "Correo o contraseña incorrectos." }, { status: 401 });
    }
    if (!isUctDomainEmail(studentEmail)) {
      return NextResponse.json({ error: "El registro no contiene un correo UCT eliminable." }, { status: 400 });
    }

    await deleteAttendance(studentEmail);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete attendance response", error);
    return NextResponse.json({ error: "No fue posible eliminar el voto." }, { status: 503 });
  }
}
