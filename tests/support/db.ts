import { createPgliteDb, type Db } from "@/core/db/client";
import { account, user } from "@/core/db/schema";
import { hashPassword } from "better-auth/crypto";
import { ensureHouseholdForUser, loadPropertyCtx } from "@/core/services/household";
import { createProperty } from "@/core/services/property";
import type { Ctx, PropertyCtx } from "@/core/services/context";

export async function testDb(): Promise<Db> {
  return createPgliteDb();
}

let counter = 0;

/** Creates a user with a credential account, their household, and one property. */
export async function makeUser(db: Db, opts: { name?: string; password?: string; timezone?: string } = {}) {
  counter++;
  const id = `user-${counter}-${Math.random().toString(36).slice(2, 8)}`;
  const name = opts.name ?? `User ${counter}`;
  const password = opts.password ?? "correct horse battery";
  await db.insert(user).values({ id, name, email: `${id}@example.com` });
  await db.insert(account).values({
    id: `acct-${id}`,
    accountId: id,
    providerId: "credential",
    userId: id,
    password: await hashPassword(password),
  });
  const householdId = await ensureHouseholdForUser(db, id, name);
  const ctx: Ctx = { db, userId: id, householdId, role: "owner" };
  const property = await createProperty(ctx, { name: `${name}'s home`, timezone: opts.timezone ?? "America/Denver" });
  const pctx: PropertyCtx = await loadPropertyCtx(ctx, property.id, false);
  return { userId: id, password, ctx, pctx, property };
}
