import { createHash } from "node:crypto";
import { del, get, list, put, type ListBlobResultBlob } from "@vercel/blob";

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
  return createHash("sha256").update(email).digest("hex").slice(0, 32);
}

function pathnameFor(email: string, answer: AttendanceAnswer) {
  return `${PREFIX}${emailHash(email)}/${answer}.json`;
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
  const record: AttendanceRecord = {
    name,
    email,
    answer,
    updatedAt: new Date().toISOString()
  };

  await put(pathnameFor(email, answer), JSON.stringify(record), {
    access: "private",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 60
  });

  const opposite: AttendanceAnswer = answer === "yes" ? "no" : "yes";
  try {
    await del(pathnameFor(email, opposite));
  } catch {
    // It is normal for the opposite response not to exist yet.
  }

  return record;
}

export async function deleteAttendance(email: string) {
  await Promise.all([
    del(pathnameFor(email, "yes")),
    del(pathnameFor(email, "no"))
  ]);
}

export async function getSummary(): Promise<AttendanceSummary> {
  const blobs = latestPerStudent(await listAll());
  const yes = blobs.filter((blob) => blob.pathname.endsWith("/yes.json")).length;
  const no = blobs.filter((blob) => blob.pathname.endsWith("/no.json")).length;
  const total = yes + no;
  const updatedAt = blobs.reduce<string | null>((latest, blob) => {
    const date = new Date(blob.uploadedAt).toISOString();
    return !latest || date > latest ? date : latest;
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
