import { and, count, eq, gt, isNull } from "drizzle-orm";
import type { Db } from "../db/client";
import { household, householdInvite, householdMember, property, user } from "../db/schema";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "../errors";
import type { Ctx } from "./context";
import { getMembership } from "./household";
import { hashToken, newToken } from "./tokens";

export const INVITE_DAYS = 7;
export const MAX_MEMBERS = 8;

function requireOwner(ctx: Ctx) {
  if (ctx.role !== "owner") throw new ForbiddenError("Only a household owner can do that.");
}

/** Creates an invite link. Returns the raw token; only its hash is stored. */
export async function createInvite(ctx: Ctx, opts: { email?: string | null } = {}) {
  requireOwner(ctx);
  const [{ n }] = await ctx.db.select({ n: count() }).from(householdMember).where(eq(householdMember.householdId, ctx.householdId));
  if (n >= MAX_MEMBERS) throw new ValidationError(`A household can have up to ${MAX_MEMBERS} members.`);
  const email = opts.email?.trim().toLowerCase() || null;
  if (email) {
    const existing = await ctx.db
      .select({ id: user.id })
      .from(householdMember)
      .innerJoin(user, eq(user.id, householdMember.userId))
      .where(and(eq(householdMember.householdId, ctx.householdId), eq(user.email, email)));
    if (existing.length) throw new ValidationError("That person is already in your household.", { email: "Already a member." });
  }
  const { token, hash } = newToken();
  const [row] = await ctx.db
    .insert(householdInvite)
    .values({ householdId: ctx.householdId, tokenHash: hash, email, createdBy: ctx.userId, expiresAt: new Date(Date.now() + INVITE_DAYS * 86_400_000) })
    .returning();
  return { token, invite: row };
}

export async function listPendingInvites(ctx: Ctx) {
  return ctx.db.query.householdInvite.findMany({
    where: and(eq(householdInvite.householdId, ctx.householdId), isNull(householdInvite.acceptedAt), gt(householdInvite.expiresAt, new Date())),
    columns: { id: true, email: true, expiresAt: true, createdAt: true },
    orderBy: (t, { desc }) => [desc(t.createdAt)],
  });
}

export async function revokeInvite(ctx: Ctx, inviteId: string) {
  requireOwner(ctx);
  const res = await ctx.db
    .delete(householdInvite)
    .where(and(eq(householdInvite.id, inviteId), eq(householdInvite.householdId, ctx.householdId)))
    .returning({ id: householdInvite.id });
  if (res.length === 0) throw new NotFoundError("Invite not found");
}

async function findUsableInvite(db: Db, token: string) {
  const inv = await db.query.householdInvite.findFirst({ where: eq(householdInvite.tokenHash, hashToken(token)) });
  if (!inv || inv.acceptedAt || inv.expiresAt.getTime() <= Date.now()) return null;
  return inv;
}

/**
 * What the invite page shows: who is inviting, and what joining would mean
 * for the signed-in user's current household (if any).
 */
export async function previewInvite(db: Db, token: string, userId?: string | null) {
  const inv = await findUsableInvite(db, token);
  if (!inv) return null;
  const h = await db.query.household.findFirst({ where: eq(household.id, inv.householdId) });
  if (!h) return null;
  const inviter = inv.createdBy ? await db.query.user.findFirst({ where: eq(user.id, inv.createdBy), columns: { name: true } }) : null;
  let current: { alreadyMember: boolean; soleMember: boolean; hasHome: boolean; ownerWithOthers: boolean } | null = null;
  if (userId) {
    const m = await getMembership(db, userId);
    if (m) {
      const [{ n }] = await db.select({ n: count() }).from(householdMember).where(eq(householdMember.householdId, m.householdId));
      const home = await db.query.property.findFirst({ where: eq(property.householdId, m.householdId), columns: { id: true } });
      current = { alreadyMember: m.householdId === inv.householdId, soleMember: n <= 1, hasHome: Boolean(home), ownerWithOthers: m.role === "owner" && n > 1 };
    }
  }
  return { householdName: h.name, inviterName: inviter?.name ?? "A household owner", email: inv.email, expiresAt: inv.expiresAt, current };
}

/**
 * Joins the invite's household. The user leaves their current household;
 * when they were its only member, that household (and anything in it) is
 * deleted, which the caller must have confirmed via `discardCurrent`.
 */
export async function acceptInvite(db: Db, userId: string, token: string, opts: { discardCurrent?: boolean } = {}) {
  return db.transaction(async (tx) => {
    // Claiming the invite first makes a double submit (or two people racing one link) fail cleanly.
    const [inv] = await tx
      .update(householdInvite)
      .set({ acceptedAt: new Date(), acceptedBy: userId })
      .where(and(eq(householdInvite.tokenHash, hashToken(token)), isNull(householdInvite.acceptedAt), gt(householdInvite.expiresAt, new Date())))
      .returning();
    if (!inv) throw new NotFoundError("This invite has expired or was already used.");
    const memberships = await tx.query.householdMember.findMany({ where: eq(householdMember.userId, userId) });
    if (memberships.some((m) => m.householdId === inv.householdId)) throw new ConflictError("You are already in this household.");
    const [{ n }] = await tx.select({ n: count() }).from(householdMember).where(eq(householdMember.householdId, inv.householdId));
    if (n >= MAX_MEMBERS) throw new ValidationError(`That household already has ${MAX_MEMBERS} members.`);

    for (const m of memberships) {
      const [{ others }] = await tx.select({ others: count() }).from(householdMember).where(eq(householdMember.householdId, m.householdId));
      if (others <= 1) {
        const home = await tx.query.property.findFirst({ where: eq(property.householdId, m.householdId), columns: { id: true } });
        if (home && !opts.discardCurrent) throw new ValidationError("Joining would delete your current home's records. Confirm to continue.", { discardCurrent: "Confirm to continue." });
        await tx.delete(household).where(eq(household.id, m.householdId));
      } else {
        if (m.role === "owner") {
          const [{ owners }] = await tx.select({ owners: count() }).from(householdMember).where(and(eq(householdMember.householdId, m.householdId), eq(householdMember.role, "owner")));
          if (owners <= 1) throw new ValidationError("You are the only owner of a household other people share. Remove them or make someone else an owner first.");
        }
        await tx.delete(householdMember).where(and(eq(householdMember.householdId, m.householdId), eq(householdMember.userId, userId)));
      }
    }
    await tx.insert(householdMember).values({ householdId: inv.householdId, userId, role: "member" });
    return inv.householdId;
  });
}

export async function removeMember(ctx: Ctx, memberUserId: string) {
  requireOwner(ctx);
  if (memberUserId === ctx.userId) throw new ValidationError("Use Leave household to remove yourself.");
  const res = await ctx.db
    .delete(householdMember)
    .where(and(eq(householdMember.householdId, ctx.householdId), eq(householdMember.userId, memberUserId)))
    .returning({ userId: householdMember.userId });
  if (res.length === 0) throw new NotFoundError("Member not found");
}

export async function setMemberRole(ctx: Ctx, memberUserId: string, role: "owner" | "member") {
  requireOwner(ctx);
  if (memberUserId === ctx.userId && role === "member") {
    const [{ owners }] = await ctx.db.select({ owners: count() }).from(householdMember).where(and(eq(householdMember.householdId, ctx.householdId), eq(householdMember.role, "owner")));
    if (owners <= 1) throw new ValidationError("A household needs at least one owner.");
  }
  const res = await ctx.db
    .update(householdMember)
    .set({ role })
    .where(and(eq(householdMember.householdId, ctx.householdId), eq(householdMember.userId, memberUserId)))
    .returning({ userId: householdMember.userId });
  if (res.length === 0) throw new NotFoundError("Member not found");
}

/**
 * Leaves a shared household. The last owner cannot leave while others remain.
 * The next request gives the user a fresh, empty household of their own.
 */
export async function leaveHousehold(ctx: Ctx) {
  const [{ n }] = await ctx.db.select({ n: count() }).from(householdMember).where(eq(householdMember.householdId, ctx.householdId));
  if (n <= 1) throw new ValidationError("You are the only member. Delete your account instead if you want to remove this household.");
  if (ctx.role === "owner") {
    const [{ owners }] = await ctx.db.select({ owners: count() }).from(householdMember).where(and(eq(householdMember.householdId, ctx.householdId), eq(householdMember.role, "owner")));
    if (owners <= 1) throw new ValidationError("Make another member an owner before you leave.");
  }
  await ctx.db.delete(householdMember).where(and(eq(householdMember.householdId, ctx.householdId), eq(householdMember.userId, ctx.userId)));
}
