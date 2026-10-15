import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "./auth";
import { getDb } from "../db/client";
import { ensureHouseholdForUser, getMembership, getPrimaryProperty, loadPropertyCtx } from "../services/household";
import { getVaultUnlock } from "../services/vault";
import type { Ctx, PropertyCtx } from "../services/context";

export const getSessionOrNull = cache(async () => {
  const auth = await getAuth();
  const result = await auth.api.getSession({ headers: await headers() });
  return result ?? null;
});

export async function requireUser() {
  const s = await getSessionOrNull();
  if (!s) redirect("/sign-in");
  return s;
}

/** Household-level context for the signed-in user. */
export const requireCtx = cache(async (): Promise<Ctx & { sessionId: string; user: { id: string; name: string; email: string } }> => {
  const s = await requireUser();
  const db = await getDb();
  let membership = await getMembership(db, s.user.id);
  if (!membership) {
    const householdId = await ensureHouseholdForUser(db, s.user.id, s.user.name);
    membership = { householdId, userId: s.user.id, role: "owner", createdAt: new Date() };
  }
  return {
    db,
    userId: s.user.id,
    householdId: membership.householdId,
    role: membership.role,
    sessionId: s.session.id,
    user: { id: s.user.id, name: s.user.name, email: s.user.email },
  };
});

/** Property-level context. Sends users without a property to onboarding. */
export const requirePropertyCtx = cache(async (): Promise<PropertyCtx & { sessionId: string; user: { id: string; name: string; email: string }; vaultUnlockedUntil: Date | null }> => {
  const ctx = await requireCtx();
  const property = await getPrimaryProperty(ctx);
  if (!property) redirect("/onboarding");
  const unlock = await getVaultUnlock(ctx.db, ctx.sessionId);
  const pctx = await loadPropertyCtx(ctx, property.id, unlock !== null);
  return { ...pctx, sessionId: ctx.sessionId, user: ctx.user, vaultUnlockedUntil: unlock?.unlockedUntil ?? null };
});

/** Like requirePropertyCtx but sends the user to the Vault unlock screen when locked. */
export async function requireVaultCtx(next?: string) {
  const ctx = await requirePropertyCtx();
  if (!ctx.vaultUnlocked) redirect(`/vault${next ? `?next=${encodeURIComponent(next)}` : ""}`);
  return ctx;
}
