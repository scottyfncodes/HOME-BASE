import { and, eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { household, householdMember, property, user } from "../db/schema";
import { NotFoundError } from "../errors";
import type { Ctx, PropertyCtx } from "./context";

/** Idempotently gives a user their own household. Called from the sign-up hook. */
export async function ensureHouseholdForUser(db: Db, userId: string, displayName?: string | null) {
  const existing = await db.query.householdMember.findFirst({
    where: eq(householdMember.userId, userId),
  });
  if (existing) return existing.householdId;
  const name = displayName?.trim() ? `${displayName.trim().split(" ")[0]}'s household` : "My household";
  const [h] = await db.insert(household).values({ name }).returning();
  await db.insert(householdMember).values({ householdId: h.id, userId, role: "owner" });
  return h.id;
}

export async function getMembership(db: Db, userId: string) {
  const m = await db.query.householdMember.findFirst({
    where: eq(householdMember.userId, userId),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  return m ?? null;
}

export async function listMembers(ctx: Ctx) {
  const rows = await ctx.db
    .select({
      userId: householdMember.userId,
      role: householdMember.role,
      name: user.name,
      email: user.email,
      joinedAt: householdMember.createdAt,
    })
    .from(householdMember)
    .innerJoin(user, eq(user.id, householdMember.userId))
    .where(eq(householdMember.householdId, ctx.householdId));
  return rows;
}

export async function getHousehold(ctx: Ctx) {
  const h = await ctx.db.query.household.findFirst({ where: eq(household.id, ctx.householdId) });
  if (!h) throw new NotFoundError("Household not found");
  return h;
}

export async function renameHousehold(ctx: Ctx, name: string) {
  await ctx.db.update(household).set({ name }).where(eq(household.id, ctx.householdId));
}

/** Resolves the household's primary property (v1 supports one property per household in the UI). */
export async function getPrimaryProperty(ctx: Ctx) {
  return ctx.db.query.property.findFirst({
    where: eq(property.householdId, ctx.householdId),
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
}

export async function loadPropertyCtx(ctx: Ctx, propertyId: string, vaultUnlocked = false): Promise<PropertyCtx> {
  const p = await ctx.db.query.property.findFirst({
    where: and(eq(property.id, propertyId), eq(property.householdId, ctx.householdId)),
  });
  if (!p) throw new NotFoundError("Property not found");
  return { ...ctx, propertyId: p.id, timezone: p.timezone, vaultUnlocked };
}
