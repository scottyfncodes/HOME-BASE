import { createHash, randomBytes } from "node:crypto";

/** A URL-safe secret plus the hash that is stored in its place. */
export function newToken() {
  const token = randomBytes(24).toString("base64url");
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}
