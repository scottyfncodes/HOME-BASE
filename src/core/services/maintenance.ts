import { and, asc, desc, eq, gte, lte, lt, sql } from "drizzle-orm";
import { maintenanceLog, maintenanceTask, type Recurrence } from "../db/schema";
import { NotFoundError, ValidationError } from "../errors";
import type { CompleteTaskInput, MaintenanceLogInput, MaintenanceTaskInput } from "../domain/validation";
import { addDays, compareISODate, todayIn } from "../domain/dates";
import { nextDueDate } from "../domain/recurrence";
import type { PropertyCtx } from "./context";
import { nullable } from "./context";
import { assertAsset } from "./assets";
import { assertLocation } from "./locations";
import { assertProvider } from "./providers";

export type TaskView = "upcoming" | "overdue" | "all" | "completed" | "cancelled";

const taskWith = { asset: { columns: { id: true, name: true, category: true } }, location: { columns: { id: true, name: true } } } as const;

export async function listTasks(ctx: PropertyCtx, view: TaskView = "upcoming", opts: { assetId?: string; limit?: number; horizonDays?: number } = {}) {
  const today = todayIn(ctx.timezone);
  const conditions = [eq(maintenanceTask.propertyId, ctx.propertyId)];
  if (opts.assetId) conditions.push(eq(maintenanceTask.assetId, opts.assetId));
  switch (view) {
    case "overdue":
      conditions.push(eq(maintenanceTask.status, "scheduled"), lt(maintenanceTask.dueOn, today));
      break;
    case "upcoming":
      conditions.push(eq(maintenanceTask.status, "scheduled"), gte(maintenanceTask.dueOn, today));
      if (opts.horizonDays) conditions.push(lte(maintenanceTask.dueOn, addDays(today, opts.horizonDays)));
      break;
    case "all":
      conditions.push(eq(maintenanceTask.status, "scheduled"));
      break;
    case "completed":
      conditions.push(eq(maintenanceTask.status, "completed"));
      break;
    case "cancelled":
      conditions.push(eq(maintenanceTask.status, "cancelled"));
      break;
  }
  return ctx.db.query.maintenanceTask.findMany({
    where: and(...conditions),
    with: taskWith,
    orderBy: view === "completed" || view === "cancelled" ? [desc(maintenanceTask.updatedAt)] : [asc(maintenanceTask.dueOn), asc(maintenanceTask.title)],
    limit: Math.min(opts.limit ?? 300, 500),
  });
}

export async function getTask(ctx: PropertyCtx, id: string) {
  const row = await ctx.db.query.maintenanceTask.findFirst({
    where: and(eq(maintenanceTask.id, id), eq(maintenanceTask.propertyId, ctx.propertyId)),
    with: taskWith,
  });
  if (!row) throw new NotFoundError("Task not found");
  return row;
}

export async function getTaskHistory(ctx: PropertyCtx, taskId: string) {
  return ctx.db.query.maintenanceLog.findMany({
    where: and(eq(maintenanceLog.taskId, taskId), eq(maintenanceLog.propertyId, ctx.propertyId)),
    with: { provider: true },
    orderBy: [desc(maintenanceLog.completedOn), desc(maintenanceLog.createdAt)],
  });
}

async function toRow(ctx: PropertyCtx, input: MaintenanceTaskInput) {
  return {
    title: input.title,
    description: nullable(input.description),
    dueOn: input.dueOn,
    recurrence: (input.recurrence ?? null) as Recurrence | null,
    priority: input.priority,
    assetId: await assertAsset(ctx, input.assetId),
    locationId: await assertLocation(ctx, input.locationId),
    estimatedMinutes: nullable(input.estimatedMinutes),
    guideSlug: nullable(input.guideSlug),
  };
}

export async function createTask(ctx: PropertyCtx, input: MaintenanceTaskInput) {
  const [row] = await ctx.db
    .insert(maintenanceTask)
    .values({ propertyId: ctx.propertyId, ...(await toRow(ctx, input)) })
    .returning();
  return row;
}

export async function updateTask(ctx: PropertyCtx, id: string, input: MaintenanceTaskInput) {
  const [row] = await ctx.db
    .update(maintenanceTask)
    .set(await toRow(ctx, input))
    .where(and(eq(maintenanceTask.id, id), eq(maintenanceTask.propertyId, ctx.propertyId), eq(maintenanceTask.status, "scheduled")))
    .returning();
  if (!row) throw new NotFoundError("Task not found or no longer scheduled");
  return row;
}

export async function cancelTask(ctx: PropertyCtx, id: string) {
  const res = await ctx.db
    .update(maintenanceTask)
    .set({ status: "cancelled" })
    .where(and(eq(maintenanceTask.id, id), eq(maintenanceTask.propertyId, ctx.propertyId), eq(maintenanceTask.status, "scheduled")))
    .returning({ id: maintenanceTask.id });
  if (res.length === 0) throw new NotFoundError("Task not found or no longer scheduled");
}

/** Brings a cancelled or completed one-time task back to the schedule with a new due date. */
export async function rescheduleTask(ctx: PropertyCtx, id: string, dueOn: string) {
  const res = await ctx.db
    .update(maintenanceTask)
    .set({ status: "scheduled", dueOn })
    .where(and(eq(maintenanceTask.id, id), eq(maintenanceTask.propertyId, ctx.propertyId)))
    .returning({ id: maintenanceTask.id });
  if (res.length === 0) throw new NotFoundError("Task not found");
}

/** Deletes the task definition. Completed history is kept (task reference cleared). */
export async function deleteTask(ctx: PropertyCtx, id: string) {
  const res = await ctx.db
    .delete(maintenanceTask)
    .where(and(eq(maintenanceTask.id, id), eq(maintenanceTask.propertyId, ctx.propertyId)))
    .returning({ id: maintenanceTask.id });
  if (res.length === 0) throw new NotFoundError("Task not found");
}

/**
 * Completes a task: records an immutable log entry, then either closes a
 * one-time task or advances a recurring one. Runs in one transaction so a
 * crash can never produce a log without the reschedule (or vice versa).
 */
export async function completeTask(ctx: PropertyCtx, id: string, input: CompleteTaskInput) {
  const today = todayIn(ctx.timezone);
  if (compareISODate(input.completedOn, addDays(today, 1)) > 0) {
    throw new ValidationError("Completion date cannot be in the future.", { completedOn: "Cannot be in the future." });
  }
  const providerId = await assertProvider(ctx, input.providerId);
  return ctx.db.transaction(async (tx) => {
    const task = await tx.query.maintenanceTask.findFirst({
      where: and(eq(maintenanceTask.id, id), eq(maintenanceTask.propertyId, ctx.propertyId)),
    });
    if (!task) throw new NotFoundError("Task not found");
    if (task.status !== "scheduled") throw new ValidationError("This task is not scheduled.");

    const [log] = await tx
      .insert(maintenanceLog)
      .values({
        propertyId: ctx.propertyId,
        taskId: task.id,
        assetId: task.assetId,
        locationId: task.locationId,
        providerId,
        title: task.title,
        completedOn: input.completedOn,
        scheduledFor: task.dueOn,
        notes: nullable(input.notes),
        costCents: nullable(input.cost),
        completedBy: ctx.userId,
      })
      .returning();

    let nextDue: string | null = null;
    if (task.recurrence) {
      nextDue = nextDueDate(task.dueOn, input.completedOn, task.recurrence);
      await tx.update(maintenanceTask).set({ dueOn: nextDue }).where(eq(maintenanceTask.id, task.id));
    } else {
      await tx.update(maintenanceTask).set({ status: "completed" }).where(eq(maintenanceTask.id, task.id));
    }
    return { log, nextDue };
  });
}

/** Ad-hoc history entry not tied to a scheduled task ("had the furnace serviced last spring"). */
export async function recordMaintenance(ctx: PropertyCtx, input: MaintenanceLogInput) {
  const [row] = await ctx.db
    .insert(maintenanceLog)
    .values({
      propertyId: ctx.propertyId,
      title: input.title,
      completedOn: input.completedOn,
      notes: nullable(input.notes),
      costCents: nullable(input.cost),
      providerId: await assertProvider(ctx, input.providerId),
      assetId: await assertAsset(ctx, input.assetId),
      locationId: await assertLocation(ctx, input.locationId),
      completedBy: ctx.userId,
    })
    .returning();
  return row;
}

export async function listHistory(ctx: PropertyCtx, opts: { limit?: number } = {}) {
  return ctx.db.query.maintenanceLog.findMany({
    where: eq(maintenanceLog.propertyId, ctx.propertyId),
    with: { asset: { columns: { id: true, name: true } }, provider: { columns: { id: true, name: true } } },
    orderBy: [desc(maintenanceLog.completedOn), desc(maintenanceLog.createdAt)],
    limit: Math.min(opts.limit ?? 100, 500),
  });
}

export async function deleteLog(ctx: PropertyCtx, id: string) {
  const res = await ctx.db
    .delete(maintenanceLog)
    .where(and(eq(maintenanceLog.id, id), eq(maintenanceLog.propertyId, ctx.propertyId)))
    .returning({ id: maintenanceLog.id });
  if (res.length === 0) throw new NotFoundError("History entry not found");
}

export async function taskCounts(ctx: PropertyCtx) {
  const today = todayIn(ctx.timezone);
  const soon = addDays(today, 14);
  const [row] = await ctx.db
    .select({
      overdue: sql<number>`count(*) filter (where ${maintenanceTask.dueOn} < ${today})::int`,
      dueSoon: sql<number>`count(*) filter (where ${maintenanceTask.dueOn} >= ${today} and ${maintenanceTask.dueOn} <= ${soon})::int`,
      scheduled: sql<number>`count(*)::int`,
    })
    .from(maintenanceTask)
    .where(and(eq(maintenanceTask.propertyId, ctx.propertyId), eq(maintenanceTask.status, "scheduled")));
  return row ?? { overdue: 0, dueSoon: 0, scheduled: 0 };
}
