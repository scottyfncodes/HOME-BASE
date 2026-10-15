import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/core/db/client";
import { setupProblems } from "@/core/env";

export const runtime = "nodejs";

/** Liveness + configuration check. Never includes secrets. */
export async function GET() {
  const problems = setupProblems();
  let database: "ok" | "error" | "unconfigured" = "unconfigured";
  if (!problems.some((p) => p.code === "DATABASE_URL")) {
    try {
      const db = await getDb();
      await db.execute(sql`select 1`);
      database = "ok";
    } catch {
      database = "error";
    }
  }
  const ok = database === "ok" && !problems.some((p) => p.fatal);
  return NextResponse.json({ ok, database, problems: problems.map((p) => p.code) }, { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
