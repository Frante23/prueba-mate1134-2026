import { NextResponse } from "next/server";
import { getSummary } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await getSummary();
    return NextResponse.json(summary, {
      headers: { "Cache-Control": "no-store, max-age=0" }
    });
  } catch (error) {
    console.error("Unable to load attendance summary", error);
    return NextResponse.json(
      { error: "No fue posible actualizar los resultados." },
      { status: 503 }
    );
  }
}
