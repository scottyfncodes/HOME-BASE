import { NextResponse } from "next/server";
import { requireCtx } from "@/core/auth/session";
import { exportHousehold } from "@/core/services/account";
import { getVaultUnlock } from "@/core/services/vault";

export const runtime = "nodejs";

/** Full JSON export of the household's records (see docs/DATA.md). */
export async function GET() {
  const ctx = await requireCtx();
  const unlock = await getVaultUnlock(ctx.db, ctx.sessionId);
  const data = await exportHousehold({ ...ctx, vaultUnlocked: unlock !== null });
  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="home-base-export-${stamp}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
