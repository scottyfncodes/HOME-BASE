import { and, asc, eq } from "drizzle-orm";
import { serviceProvider } from "../db/schema";
import { NotFoundError } from "../errors";
import type { ProviderInput } from "../domain/validation";
import type { Ctx } from "./context";
import { nullable } from "./context";

export async function listProviders(ctx: Ctx) {
  return ctx.db.query.serviceProvider.findMany({
    where: eq(serviceProvider.householdId, ctx.householdId),
    orderBy: [asc(serviceProvider.name)],
  });
}

export async function getProvider(ctx: Ctx, id: string) {
  const row = await ctx.db.query.serviceProvider.findFirst({
    where: and(eq(serviceProvider.id, id), eq(serviceProvider.householdId, ctx.householdId)),
  });
  if (!row) throw new NotFoundError("Service provider not found");
  return row;
}

export async function assertProvider(ctx: Ctx, id: string | undefined | null) {
  if (!id) return null;
  await getProvider(ctx, id);
  return id;
}

function toRow(input: ProviderInput) {
  return {
    name: input.name,
    trade: nullable(input.trade),
    phone: nullable(input.phone),
    email: nullable(input.email),
    website: nullable(input.website),
    notes: nullable(input.notes),
  };
}

export async function createProvider(ctx: Ctx, input: ProviderInput) {
  const [row] = await ctx.db.insert(serviceProvider).values({ householdId: ctx.householdId, ...toRow(input) }).returning();
  return row;
}

export async function updateProvider(ctx: Ctx, id: string, input: ProviderInput) {
  const [row] = await ctx.db
    .update(serviceProvider)
    .set(toRow(input))
    .where(and(eq(serviceProvider.id, id), eq(serviceProvider.householdId, ctx.householdId)))
    .returning();
  if (!row) throw new NotFoundError("Service provider not found");
  return row;
}

/** History and expenses keep their rows; the provider reference is cleared. */
export async function deleteProvider(ctx: Ctx, id: string) {
  const res = await ctx.db
    .delete(serviceProvider)
    .where(and(eq(serviceProvider.id, id), eq(serviceProvider.householdId, ctx.householdId)))
    .returning({ id: serviceProvider.id });
  if (res.length === 0) throw new NotFoundError("Service provider not found");
}
