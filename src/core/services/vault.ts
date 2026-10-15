import { and, desc, eq, gte } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import type { Db } from "../db/client";
import { account, vaultAttempt, vaultAudit, vaultUnlock } from "../db/schema";
import { ForbiddenError, ValidationError } from "../errors";
import { vaultAvailable } from "../storage/crypto";
import type { Ctx } from "./context";

export const VAULT_UNLOCK_MINUTES = 10;
const MAX_FAILED_ATTEMPTS = 5;
const ATTEMPT_WINDOW_MINUTES = 15;

export function isVaultAvailable() {
  return vaultAvailable();
}

export async function getVaultUnlock(db: Db, sessionId: string) {
  const row = await db.query.vaultUnlock.findFirst({ where: eq(vaultUnlock.sessionId, sessionId) });
  if (!row) return null;
  if (row.unlockedUntil.getTime() <= Date.now()) return null;
  return row;
}

/** Verifies the user's current password against their credential account. */
export async function verifyUserPassword(db: Db, userId: string, password: string): Promise<boolean> {
  const cred = await db.query.account.findFirst({
    where: and(eq(account.userId, userId), eq(account.providerId, "credential")),
  });
  if (!cred?.password) return false;
  try {
    return await verifyPassword({ hash: cred.password, password });
  } catch {
    return false;
  }
}

async function recentFailures(db: Db, userId: string) {
  const since = new Date(Date.now() - ATTEMPT_WINDOW_MINUTES * 60_000);
  const rows = await db.query.vaultAttempt.findMany({
    where: and(eq(vaultAttempt.userId, userId), gte(vaultAttempt.attemptedAt, since)),
    orderBy: [desc(vaultAttempt.attemptedAt)],
    limit: 50,
  });
  // Count failures since the last success.
  let failures = 0;
  for (const r of rows) {
    if (r.succeeded) break;
    failures++;
  }
  return failures;
}

/**
 * Re-authenticates the user with their password and opens a short unlock
 * window bound to this session only. Five failures in 15 minutes lock the
 * Vault out for the rest of the window.
 */
export async function unlockVault(ctx: Ctx, sessionId: string, password: string) {
  if (!vaultAvailable()) throw new ForbiddenError("The Vault is not configured on this server.");
  const failures = await recentFailures(ctx.db, ctx.userId);
  if (failures >= MAX_FAILED_ATTEMPTS) {
    await audit(ctx, "unlock_blocked");
    throw new ValidationError(`Too many attempts. Try again in ${ATTEMPT_WINDOW_MINUTES} minutes.`, { password: "Too many attempts." });
  }
  const ok = await verifyUserPassword(ctx.db, ctx.userId, password);
  await ctx.db.insert(vaultAttempt).values({ userId: ctx.userId, succeeded: ok });
  if (!ok) {
    await audit(ctx, "unlock_failed");
    throw new ValidationError("That password is not correct.", { password: "Incorrect password." });
  }
  const unlockedUntil = new Date(Date.now() + VAULT_UNLOCK_MINUTES * 60_000);
  await ctx.db
    .insert(vaultUnlock)
    .values({ sessionId, userId: ctx.userId, unlockedUntil })
    .onConflictDoUpdate({ target: vaultUnlock.sessionId, set: { unlockedUntil, userId: ctx.userId } });
  await audit(ctx, "unlock");
  return unlockedUntil;
}

export async function lockVault(ctx: Ctx, sessionId: string) {
  await ctx.db.delete(vaultUnlock).where(eq(vaultUnlock.sessionId, sessionId));
  await audit(ctx, "lock");
}

export async function audit(ctx: Ctx, action: string, documentId?: string | null) {
  await ctx.db.insert(vaultAudit).values({ householdId: ctx.householdId, userId: ctx.userId, action, documentId: documentId ?? null });
}

export async function listVaultAudit(ctx: Ctx, limit = 30) {
  return ctx.db.query.vaultAudit.findMany({
    where: eq(vaultAudit.householdId, ctx.householdId),
    orderBy: [desc(vaultAudit.at)],
    limit,
  });
}
