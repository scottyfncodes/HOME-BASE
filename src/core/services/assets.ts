import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { asset, document, expense, maintenanceLog, maintenanceTask } from "../db/schema";
import { NotFoundError } from "../errors";
import type { AssetInput } from "../domain/validation";
import { ASSET_CATEGORIES } from "../domain/validation";
import { addDays, todayIn } from "../domain/dates";
import type { PropertyCtx } from "./context";
import { nullable } from "./context";
import { resolveLocation } from "./locations";

export type AssetSort = "name" | "newest" | "warranty" | "value";

export type AssetFilter = {
  q?: string;
  category?: string;
  locationId?: string;
  status?: "active" | "retired" | "all";
  sort?: AssetSort;
  limit?: number;
};

export async function listAssets(ctx: PropertyCtx, filter: AssetFilter = {}) {
  const conditions = [eq(asset.propertyId, ctx.propertyId)];
  const status = filter.status ?? "active";
  if (status === "active") conditions.push(eq(asset.status, "active"));
  if (status === "retired") conditions.push(inArray(asset.status, ["retired", "replaced"]));
  if (filter.category && (ASSET_CATEGORIES as readonly string[]).includes(filter.category)) {
    conditions.push(eq(asset.category, filter.category));
  }
  if (filter.locationId) conditions.push(eq(asset.locationId, filter.locationId));
  if (filter.q && filter.q.trim()) {
    const term = `%${filter.q.trim().replace(/[%_]/g, "\\$&")}%`;
    conditions.push(
      or(
        ilike(asset.name, term),
        ilike(asset.manufacturer, term),
        ilike(asset.model, term),
        ilike(asset.serialNumber, term),
        ilike(asset.notes, term),
      )!,
    );
  }
  const orderBy = (() => {
    switch (filter.sort) {
      case "newest":
        return [desc(asset.createdAt)];
      case "warranty":
        return [sql`${asset.warrantyExpiresOn} asc nulls last`, asc(asset.name)];
      case "value":
        return [sql`${asset.replacementValueCents} desc nulls last`, asc(asset.name)];
      default:
        return [asc(asset.name)];
    }
  })();
  return ctx.db.query.asset.findMany({
    where: and(...conditions),
    with: { location: true },
    orderBy,
    limit: Math.min(filter.limit ?? 500, 500),
  });
}

export async function getAsset(ctx: PropertyCtx, id: string) {
  const row = await ctx.db.query.asset.findFirst({
    where: and(eq(asset.id, id), eq(asset.propertyId, ctx.propertyId)),
    with: { location: true },
  });
  if (!row) throw new NotFoundError("Item not found");
  return row;
}

/** Everything attached to one asset: open tasks, history, documents, expenses. */
export async function getAssetDetail(ctx: PropertyCtx, id: string) {
  const item = await getAsset(ctx, id);
  const [tasks, logs, documents, expenses] = await Promise.all([
    ctx.db.query.maintenanceTask.findMany({
      where: and(eq(maintenanceTask.assetId, id), eq(maintenanceTask.propertyId, ctx.propertyId), eq(maintenanceTask.status, "scheduled")),
      orderBy: [asc(maintenanceTask.dueOn)],
    }),
    ctx.db.query.maintenanceLog.findMany({
      where: and(eq(maintenanceLog.assetId, id), eq(maintenanceLog.propertyId, ctx.propertyId)),
      with: { provider: true },
      orderBy: [desc(maintenanceLog.completedOn), desc(maintenanceLog.createdAt)],
      limit: 100,
    }),
    ctx.db.query.document.findMany({
      where: and(eq(document.assetId, id), eq(document.propertyId, ctx.propertyId), eq(document.isVault, false)),
      with: { file: true },
      orderBy: [desc(document.createdAt)],
    }),
    ctx.db.query.expense.findMany({
      where: and(eq(expense.assetId, id), eq(expense.propertyId, ctx.propertyId)),
      orderBy: [desc(expense.spentOn)],
      limit: 50,
    }),
  ]);
  return { item, tasks, logs, documents, expenses };
}

export async function assertAsset(ctx: PropertyCtx, id: string | undefined | null) {
  if (!id) return null;
  await getAsset(ctx, id);
  return id;
}

async function toRow(ctx: PropertyCtx, input: AssetInput) {
  return {
    name: input.name,
    category: input.category,
    locationId: await resolveLocation(ctx, input),
    manufacturer: nullable(input.manufacturer),
    model: nullable(input.model),
    serialNumber: nullable(input.serialNumber),
    installDate: nullable(input.installDate),
    purchaseDate: nullable(input.purchaseDate),
    purchasePriceCents: nullable(input.purchasePrice),
    replacementValueCents: nullable(input.replacementValue),
    warrantyExpiresOn: nullable(input.warrantyExpiresOn),
    notes: nullable(input.notes),
  };
}

export async function createAsset(ctx: PropertyCtx, input: AssetInput) {
  const [row] = await ctx.db
    .insert(asset)
    .values({ propertyId: ctx.propertyId, ...(await toRow(ctx, input)) })
    .returning();
  return row;
}

export async function updateAsset(ctx: PropertyCtx, id: string, input: AssetInput) {
  const [row] = await ctx.db
    .update(asset)
    .set(await toRow(ctx, input))
    .where(and(eq(asset.id, id), eq(asset.propertyId, ctx.propertyId)))
    .returning();
  if (!row) throw new NotFoundError("Item not found");
  return row;
}

/** Retiring keeps the record and all history; scheduled tasks are cancelled. */
export async function retireAsset(ctx: PropertyCtx, id: string, status: "retired" | "replaced" = "retired") {
  await ctx.db.transaction(async (tx) => {
    const res = await tx
      .update(asset)
      .set({ status, retiredOn: todayIn(ctx.timezone) })
      .where(and(eq(asset.id, id), eq(asset.propertyId, ctx.propertyId)))
      .returning({ id: asset.id });
    if (res.length === 0) throw new NotFoundError("Item not found");
    await tx
      .update(maintenanceTask)
      .set({ status: "cancelled" })
      .where(and(eq(maintenanceTask.assetId, id), eq(maintenanceTask.propertyId, ctx.propertyId), eq(maintenanceTask.status, "scheduled")));
  });
}

export async function reactivateAsset(ctx: PropertyCtx, id: string) {
  const res = await ctx.db
    .update(asset)
    .set({ status: "active", retiredOn: null })
    .where(and(eq(asset.id, id), eq(asset.propertyId, ctx.propertyId)))
    .returning({ id: asset.id });
  if (res.length === 0) throw new NotFoundError("Item not found");
}

/**
 * Permanently deletes an asset. Maintenance history, documents and expenses
 * that referenced it are preserved with the reference cleared (FK set null).
 * Scheduled tasks for it are cancelled rather than deleted.
 */
export async function deleteAsset(ctx: PropertyCtx, id: string) {
  await ctx.db.transaction(async (tx) => {
    await tx
      .update(maintenanceTask)
      .set({ status: "cancelled" })
      .where(and(eq(maintenanceTask.assetId, id), eq(maintenanceTask.propertyId, ctx.propertyId), eq(maintenanceTask.status, "scheduled")));
    const res = await tx
      .delete(asset)
      .where(and(eq(asset.id, id), eq(asset.propertyId, ctx.propertyId)))
      .returning({ id: asset.id });
    if (res.length === 0) throw new NotFoundError("Item not found");
  });
}

export async function warrantiesExpiringSoon(ctx: PropertyCtx, days = 60) {
  const today = todayIn(ctx.timezone);
  const until = addDays(today, days);
  return ctx.db.query.asset.findMany({
    where: and(
      eq(asset.propertyId, ctx.propertyId),
      eq(asset.status, "active"),
      sql`${asset.warrantyExpiresOn} is not null and ${asset.warrantyExpiresOn} >= ${today} and ${asset.warrantyExpiresOn} <= ${until}`,
    ),
    orderBy: [asc(asset.warrantyExpiresOn)],
    limit: 10,
  });
}

export async function countAssets(ctx: PropertyCtx) {
  const [row] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(asset)
    .where(and(eq(asset.propertyId, ctx.propertyId), eq(asset.status, "active")));
  return row?.n ?? 0;
}
