import { and, eq } from "drizzle-orm";
import { property } from "../db/schema";
import { NotFoundError } from "../errors";
import type { PropertyInput } from "../domain/validation";
import { safeTimeZone } from "../domain/dates";
import type { Ctx, PropertyCtx } from "./context";
import { nullable } from "./context";

function toRow(input: PropertyInput) {
  return {
    name: input.name,
    addressLine1: nullable(input.addressLine1),
    addressLine2: nullable(input.addressLine2),
    city: nullable(input.city),
    region: nullable(input.region),
    postalCode: nullable(input.postalCode),
    country: nullable(input.country),
    homeType: nullable(input.homeType),
    yearBuilt: nullable(input.yearBuilt),
    squareFeet: nullable(input.squareFeet),
    bedrooms: nullable(input.bedrooms),
    bathrooms: nullable(input.bathrooms),
    lotSize: nullable(input.lotSize),
    purchaseDate: nullable(input.purchaseDate),
    purchasePriceCents: nullable(input.purchasePrice),
    notes: nullable(input.notes),
  };
}

export async function createProperty(ctx: Ctx, input: PropertyInput) {
  const [row] = await ctx.db
    .insert(property)
    .values({
      householdId: ctx.householdId,
      timezone: safeTimeZone(input.timezone),
      ...toRow(input),
    })
    .returning();
  return row;
}

export async function updateProperty(ctx: PropertyCtx, input: PropertyInput) {
  const [row] = await ctx.db
    .update(property)
    .set({
      ...toRow(input),
      ...(input.timezone ? { timezone: safeTimeZone(input.timezone) } : {}),
    })
    .where(and(eq(property.id, ctx.propertyId), eq(property.householdId, ctx.householdId)))
    .returning();
  if (!row) throw new NotFoundError("Property not found");
  return row;
}

export async function getProperty(ctx: PropertyCtx) {
  const row = await ctx.db.query.property.findFirst({
    where: and(eq(property.id, ctx.propertyId), eq(property.householdId, ctx.householdId)),
  });
  if (!row) throw new NotFoundError("Property not found");
  return row;
}

export function formatAddress(p: {
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
}): string {
  const line2 = [p.city, [p.region, p.postalCode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [p.addressLine1, p.addressLine2, line2].filter(Boolean).join(" · ");
}
