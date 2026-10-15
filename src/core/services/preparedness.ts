import { and, asc, eq } from "drizzle-orm";
import { preparednessItem } from "../db/schema";
import { NotFoundError } from "../errors";
import type { PreparednessInput } from "../domain/validation";
import type { PropertyCtx } from "./context";
import { nullable } from "./context";
import { assertLocation } from "./locations";

export async function listPreparedness(ctx: PropertyCtx) {
  return ctx.db.query.preparednessItem.findMany({
    where: eq(preparednessItem.propertyId, ctx.propertyId),
    with: { location: { columns: { id: true, name: true } } },
    orderBy: [asc(preparednessItem.sortOrder), asc(preparednessItem.createdAt)],
  });
}

export async function getPreparedness(ctx: PropertyCtx, id: string) {
  const row = await ctx.db.query.preparednessItem.findFirst({
    where: and(eq(preparednessItem.id, id), eq(preparednessItem.propertyId, ctx.propertyId)),
    with: { location: true },
  });
  if (!row) throw new NotFoundError("Record not found");
  return row;
}

async function toRow(ctx: PropertyCtx, input: PreparednessInput) {
  return {
    kind: input.kind,
    title: input.title,
    locationId: await assertLocation(ctx, input.locationId),
    whereText: nullable(input.whereText),
    instructions: nullable(input.instructions),
    phone: nullable(input.phone),
    details: nullable(input.details),
  };
}

export async function createPreparedness(ctx: PropertyCtx, input: PreparednessInput) {
  const [row] = await ctx.db.insert(preparednessItem).values({ propertyId: ctx.propertyId, ...(await toRow(ctx, input)) }).returning();
  return row;
}

export async function updatePreparedness(ctx: PropertyCtx, id: string, input: PreparednessInput) {
  const [row] = await ctx.db
    .update(preparednessItem)
    .set(await toRow(ctx, input))
    .where(and(eq(preparednessItem.id, id), eq(preparednessItem.propertyId, ctx.propertyId)))
    .returning();
  if (!row) throw new NotFoundError("Record not found");
  return row;
}

export async function deletePreparedness(ctx: PropertyCtx, id: string) {
  const res = await ctx.db
    .delete(preparednessItem)
    .where(and(eq(preparednessItem.id, id), eq(preparednessItem.propertyId, ctx.propertyId)))
    .returning({ id: preparednessItem.id });
  if (res.length === 0) throw new NotFoundError("Record not found");
}
