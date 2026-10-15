import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/core/auth/auth";

export const runtime = "nodejs";

async function handle(req: Request) {
  const auth = await getAuth();
  const { GET, POST } = toNextJsHandler(auth);
  return req.method === "GET" ? GET(req) : POST(req);
}

export { handle as GET, handle as POST };
