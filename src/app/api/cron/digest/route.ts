import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getDb } from "@/core/db/client";
import { env } from "@/core/env";
import { sendEmail } from "@/core/email/send";
import { sendWeeklyDigests } from "@/core/services/digest";

export const runtime = "nodejs";
export const maxDuration = 60;

function authorized(req: Request) {
  if (!env.cronSecret) return false;
  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${env.cronSecret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

/** Weekly reminder email. Called by Vercel Cron (see vercel.json) with CRON_SECRET as a bearer token. */
export async function GET(req: Request) {
  if (!env.cronSecret) return NextResponse.json({ error: "CRON_SECRET is not set." }, { status: 503 });
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const appUrl = env.publicUrl ?? new URL(req.url).origin;
  const result = await sendWeeklyDigests(await getDb(), appUrl, sendEmail);
  console.info("[digest]", JSON.stringify(result));
  return NextResponse.json(result);
}
