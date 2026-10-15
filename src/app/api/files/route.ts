import { NextResponse } from "next/server";
import { requireCtx } from "@/core/auth/session";
import { storeFile } from "@/core/services/files";
import { getVaultUnlock } from "@/core/services/vault";
import { isAppError } from "@/core/errors";
import { env } from "@/core/env";

export const runtime = "nodejs";

/**
 * Upload endpoint. Multipart body with `file` and optional `vault=1`.
 * Returns the stored file's id; the caller then attaches it to a document.
 */
export async function POST(req: Request) {
  try {
    const ctx = await requireCtx();
    const length = Number(req.headers.get("content-length") ?? 0);
    if (length > env.maxUploadBytes + 64 * 1024) {
      return NextResponse.json({ error: `Files must be under ${Math.round(env.maxUploadBytes / 1024 / 1024)} MB.` }, { status: 413 });
    }
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file received." }, { status: 400 });
    const vault = form.get("vault") === "1";
    if (vault) {
      const unlock = await getVaultUnlock(ctx.db, ctx.sessionId);
      if (!unlock) return NextResponse.json({ error: "Unlock the Vault first." }, { status: 403 });
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const stored = await storeFile(ctx, { bytes, filename: file.name, contentType: file.type, vault });
    return NextResponse.json({ id: stored.id, filename: stored.filename, contentType: stored.contentType, sizeBytes: stored.sizeBytes });
  } catch (err) {
    if (isAppError(err)) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[upload]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Upload failed." }, { status: 500 });
  }
}
