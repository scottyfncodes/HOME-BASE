import { and, asc, eq, sql } from "drizzle-orm";
import { asset, location } from "../db/schema";
import { NotFoundError } from "../errors";
import type { LocationInput } from "../domain/validation";
import type { PropertyCtx } from "./context";
import { nullable } from "./context";

export async function listLocations(ctx: PropertyCtx) {
  return ctx.db.query.location.findMany({
    where: eq(location.propertyId, ctx.propertyId),
    orderBy: [asc(location.sortOrder), asc(location.name)],
  });
}

export async function listLocationsWithCounts(ctx: PropertyCtx) {
  const rows = await ctx.db
    .select({
      id: location.id,
      name: location.name,
      kind: location.kind,
      floor: location.floor,
      notes: location.notes,
      // Drizzle leaves single-table selects unqualified, so the outer column is written explicitly.
      assetCount: sql<number>`(select count(*)::int from ${asset} a where a.location_id = "location"."id" and a.status = 'active')`,
    })
    .from(location)
    .where(eq(location.propertyId, ctx.propertyId))
    .orderBy(asc(location.sortOrder), asc(location.name));
  return rows;
}

export async function getLocation(ctx: PropertyCtx, id: string) {
  const row = await ctx.db.query.location.findFirst({
    where: and(eq(location.id, id), eq(location.propertyId, ctx.propertyId)),
  });
  if (!row) throw new NotFoundError("Location not found");
  return row;
}

/** Validates that a location id (if given) belongs to this property. */
export async function assertLocation(ctx: PropertyCtx, id: string | undefined | null) {
  if (!id) return null;
  await getLocation(ctx, id);
  return id;
}

export async function createLocation(ctx: PropertyCtx, input: LocationInput) {
  const [row] = await ctx.db
    .insert(location)
    .values({
      propertyId: ctx.propertyId,
      name: input.name,
      kind: input.kind,
      floor: nullable(input.floor),
      notes: nullable(input.notes),
    })
    .returning();
  return row;
}

export async function createLocations(ctx: PropertyCtx, names: string[], kind: LocationInput["kind"] = "room") {
  const clean = Array.from(new Set(names.map((n) => n.trim()).filter(Boolean)));
  if (clean.length === 0) return [];
  return ctx.db
    .insert(location)
    .values(clean.map((name, i) => ({ propertyId: ctx.propertyId, name, kind, sortOrder: i })))
    .returning();
}

export async function updateLocation(ctx: PropertyCtx, id: string, input: LocationInput) {
  const [row] = await ctx.db
    .update(location)
    .set({ name: input.name, kind: input.kind, floor: nullable(input.floor), notes: nullable(input.notes) })
    .where(and(eq(location.id, id), eq(location.propertyId, ctx.propertyId)))
    .returning();
  if (!row) throw new NotFoundError("Location not found");
  return row;
}

/** Deleting a location keeps its assets (their location becomes unset). */
export async function deleteLocation(ctx: PropertyCtx, id: string) {
  const res = await ctx.db
    .delete(location)
    .where(and(eq(location.id, id), eq(location.propertyId, ctx.propertyId)))
    .returning({ id: location.id });
  if (res.length === 0) throw new NotFoundError("Location not found");
}
