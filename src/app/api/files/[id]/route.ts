import { NextResponse } from "next/server";
import { requireCtx } from "@/core/auth/session";
import { readFile } from "@/core/services/files";
import { audit, getVaultUnlock } from "@/core/services/vault";
import { canInline } from "@/core/storage/types";
import { isAppError } from "@/core/errors";

export const runtime = "nodejs";

/**
 * Serves a file to a member of the owning household. Vault files additionally
 * require a fresh Vault unlock on this session. Responses are never cacheable.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const ctx = await requireCtx();
    const unlock = await getVaultUnlock(ctx.db, ctx.sessionId);
    const { meta, bytes } = await readFile({ ...ctx, vaultUnlocked: unlock !== null }, id);
    if (meta.isVault) await audit(ctx, "file_read", null);
    const url = new URL(req.url);
    const download = url.searchParams.get("download") === "1" || !canInline(meta.contentType);
    const asciiName = meta.filename.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "");
    const headers = new Headers({
      "Content-Type": meta.contentType,
      "Content-Length": String(bytes.length),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(meta.filename)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      // Served bytes are never HTML/SVG (see the allowlist), but lock them down anyway.
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'; sandbox",
    });
    return new NextResponse(new Uint8Array(bytes), { status: 200, headers });
  } catch (err) {
    if (isAppError(err)) {
      if (err.code === "unauthenticated") return NextResponse.redirect(new URL("/sign-in", req.url));
      return new NextResponse(err.message, { status: err.status, headers: { "Cache-Control": "private, no-store" } });
    }
    console.error("[file]", err instanceof Error ? err.message : err);
    return new NextResponse("Unable to read file.", { status: 500 });
  }
}
