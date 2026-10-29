import { getDb } from "@/core/db/client";
import { renderCalendarFeed } from "@/core/services/calendar";

export const runtime = "nodejs";

/**
 * Private calendar subscription: /api/calendar/<token>.ics. The token is the
 * only credential (calendar apps cannot sign in), so it is long, random,
 * stored hashed, and replaceable from Settings.
 */
export async function GET(req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const token = file.replace(/\.ics$/, "");
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) return new Response("Not found", { status: 404 });
  const body = await renderCalendarFeed(await getDb(), token, new URL(req.url).origin);
  if (body === null) return new Response("Not found", { status: 404 });
  return new Response(body, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="home-base.ics"',
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer",
    },
  });
}
