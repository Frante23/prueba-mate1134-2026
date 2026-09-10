import { createHash } from "node:crypto";
import { del, get, list, put, type ListBlobResultBlob } from "@vercel/blob";
import { normalizeEmail } from "@/lib/validation";

export type AttendanceAnswer = "yes" | "no";

export type AttendanceRecord = {
  name: string;
  email: string;
  answer: AttendanceAnswer;
  updatedAt: string;
};

export type AttendanceSummary = {
  yes: number;
  no: number;
  total: number;
  yesPercent: number;
  noPercent: number;
  updatedAt: string | null;
};

const PREFIX = "attendance-v1/";

function emailHash(email: string) {
  return createHash("sha256").update(normalizeEmail(email)).digest("hex").slice(0, 32);
}

function legacyPathnameFor(email: string, answer: AttendanceAnswer) {
  return `${PREFIX}${emailHash(email)}/${answer}.json`;
}

function pathnameFor(email: string) {
  return `${PREFIX}${emailHash(email)}/record.json`;
}

async function listAll(): Promise<ListBlobResultBlob[]> {
  const blobs: ListBlobResultBlob[] = [];
  let cursor: string | undefined;

  do {
    const page = await list({ prefix: PREFIX, limit: 1000, cursor });
    blobs.push(...page.blobs);
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  return blobs;
}

function latestPerStudent(blobs: ListBlobResultBlob[]) {
  const latest = new Map<string, ListBlobResultBlob>();

  for (const blob of blobs) {
    const hash = blob.pathname.split("/")[1];
    if (!hash) continue;
    const current = latest.get(hash);
    if (!current || new Date(blob.uploadedAt).getTime() > new Date(current.uploadedAt).getTime()) {
      latest.set(hash, blob);
    }
  }

  return [...latest.values()];
}

export async function saveAttendance(name: string, email: string, answer: AttendanceAnswer) {
  const normalizedEmail = normalizeEmail(email);
  const record: AttendanceRecord = {
    name,
    email: normalizedEmail,
    answer,
    updatedAt: new Date().toISOString()
  };

  // Una ruta estable por correo hace que un segundo envío reemplace al primero.
  // Vercel Blob publica cada escritura de forma atómica, por lo que el panel
  // nunca necesita sumar dos archivos para un mismo estudiante.
  await put(pathnameFor(normalizedEmail), JSON.stringify(record), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60
  });

  // Limpieza de las dos rutas usadas por versiones anteriores. `del` acepta
  // rutas inexistentes, así que esta migración es segura e idempotente.
  await del([
    legacyPathnameFor(normalizedEmail, "yes"),
    legacyPathnameFor(normalizedEmail, "no")
  ]);

  return record;
}

export async function deleteAttendance(email: string) {
  const normalizedEmail = normalizeEmail(email);
  await del([
    pathnameFor(normalizedEmail),
    legacyPathnameFor(normalizedEmail, "yes"),
    legacyPathnameFor(normalizedEmail, "no")
  ]);
}

function summarize(records: AttendanceRecord[]): AttendanceSummary {
  const yes = records.filter((record) => record.answer === "yes").length;
  const no = records.filter((record) => record.answer === "no").length;
  const total = yes + no;
  const updatedAt = records.reduce<string | null>((latest, record) => {
    return !latest || record.updatedAt > latest ? record.updatedAt : latest;
  }, null);

  return {
    yes,
    no,
    total,
    yesPercent: total ? Math.round((yes / total) * 100) : 0,
    noPercent: total ? Math.round((no / total) * 100) : 0,
    updatedAt
  };
}

export async function getRecords(): Promise<AttendanceRecord[]> {
  const blobs = latestPerStudent(await listAll());
  const records = await Promise.all(
    blobs.map(async (blob) => {
      const result = await get(blob.url, { access: "private" });
      if (!result) return null;
      const text = await new Response(result.stream).text();
      const parsed = JSON.parse(text) as Partial<AttendanceRecord>;
      return {
        name: parsed.name || "Registro anterior (sin nombre)",
        email: parsed.email || "",
        answer: parsed.answer === "no" ? "no" : "yes",
        updatedAt: parsed.updatedAt || new Date(blob.uploadedAt).toISOString()
      } satisfies AttendanceRecord;
    })
  );

  return records
    .filter((record): record is AttendanceRecord => Boolean(record))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getAttendanceSnapshot() {
  const records = await getRecords();
  return { summary: summarize(records), records };
}

export async function getSummary(): Promise<AttendanceSummary> {
  return (await getAttendanceSnapshot()).summary;
}
