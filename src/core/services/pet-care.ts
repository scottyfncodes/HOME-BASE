import { and, asc, desc, eq, isNotNull, isNull, lte } from "drizzle-orm";
import { maintenanceLog, maintenanceTask, pet, type Recurrence } from "../db/schema";
import { NotFoundError } from "../errors";
import type { PetCareInput } from "../domain/validation";
import { addDays, todayIn } from "../domain/dates";
import type { PropertyCtx } from "./context";
import { nullable } from "./context";
import { completeTask } from "./maintenance";
import { assertMedication } from "./pet-health";
import { getPet } from "./pets";

/**
 * Daily care and routines. A routine is a `maintenance_task` with a
 * `pet_id`; marking it done goes through the same `completeTask` that home
 * maintenance uses, so recurrence, the immutable history and the calendar
 * feed all work the same way. There is no second reminder system.
 */

const routineWith = { medication: { columns: { id: true, name: true, dosage: true } } } as const;

export async function listCareRoutines(ctx: PropertyCtx, petId: string) {
  await getPet(ctx, petId);
  return ctx.db.query.maintenanceTask.findMany({
    where: and(eq(maintenanceTask.petId, petId), eq(maintenanceTask.propertyId, ctx.propertyId), eq(maintenanceTask.status, "scheduled")),
    with: routineWith,
    orderBy: [asc(maintenanceTask.dueOn), asc(maintenanceTask.title)],
  });
}

export async function getCareRoutine(ctx: PropertyCtx, petId: string, id: string) {
  await getPet(ctx, petId);
  const row = await ctx.db.query.maintenanceTask.findFirst({
    where: and(eq(maintenanceTask.id, id), eq(maintenanceTask.petId, petId), eq(maintenanceTask.propertyId, ctx.propertyId)),
    with: routineWith,
  });
  if (!row) throw new NotFoundError("Routine not found");
  return row;
}

async function toRow(ctx: PropertyCtx, petId: string, input: PetCareInput) {
  return {
    title: input.title,
    description: nullable(input.description),
    dueOn: input.dueOn,
    recurrence: (input.recurrence ?? null) as Recurrence | null,
    careKind: input.careKind ?? "other",
    petMedicationId: await assertMedication(ctx, petId, input.medicationId),
  };
}

export async function createCareRoutine(ctx: PropertyCtx, petId: string, input: PetCareInput) {
  await getPet(ctx, petId);
  const [row] = await ctx.db
    .insert(maintenanceTask)
    .values({ propertyId: ctx.propertyId, petId, priority: "normal", ...(await toRow(ctx, petId, input)) })
    .returning();
  return row;
}

export async function updateCareRoutine(ctx: PropertyCtx, petId: string, id: string, input: PetCareInput) {
  await getCareRoutine(ctx, petId, id);
  const [row] = await ctx.db
    .update(maintenanceTask)
    .set(await toRow(ctx, petId, input))
    .where(and(eq(maintenanceTask.id, id), eq(maintenanceTask.petId, petId), eq(maintenanceTask.propertyId, ctx.propertyId)))
    .returning();
  return row;
}

/** Removes the routine. Its completion history stays on the pet. */
export async function deleteCareRoutine(ctx: PropertyCtx, petId: string, id: string) {
  await getCareRoutine(ctx, petId, id);
  await ctx.db.delete(maintenanceTask).where(and(eq(maintenanceTask.id, id), eq(maintenanceTask.petId, petId), eq(maintenanceTask.propertyId, ctx.propertyId)));
}

/** Marks a routine done (today unless a date is given) and schedules the next one. */
export async function completeCare(ctx: PropertyCtx, petId: string, id: string, opts: { completedOn?: string; notes?: string } = {}) {
  const routine = await getCareRoutine(ctx, petId, id);
  if (routine.status !== "scheduled") throw new NotFoundError("Routine not found");
  return completeTask(ctx, id, { completedOn: opts.completedOn ?? todayIn(ctx.timezone), notes: opts.notes });
}

export async function careHistory(ctx: PropertyCtx, petId: string, opts: { limit?: number } = {}) {
  await getPet(ctx, petId);
  return ctx.db.query.maintenanceLog.findMany({
    where: and(eq(maintenanceLog.petId, petId), eq(maintenanceLog.propertyId, ctx.propertyId)),
    with: { completedByUser: { columns: { name: true } } },
    orderBy: [desc(maintenanceLog.completedOn), desc(maintenanceLog.createdAt)],
    limit: Math.min(opts.limit ?? 60, 300),
  });
}

/** Last completion per routine, so the care list can say "done this morning". */
export async function lastDoneByRoutine(ctx: PropertyCtx, petId: string) {
  const rows = await ctx.db
    .select({ taskId: maintenanceLog.taskId, completedOn: maintenanceLog.completedOn })
    .from(maintenanceLog)
    .where(and(eq(maintenanceLog.petId, petId), eq(maintenanceLog.propertyId, ctx.propertyId), isNotNull(maintenanceLog.taskId)))
    .orderBy(desc(maintenanceLog.completedOn))
    .limit(500);
  const out = new Map<string, string>();
  for (const r of rows) if (r.taskId && !out.has(r.taskId)) out.set(r.taskId, r.completedOn);
  return out;
}

/**
 * Care routines due by `today + days` across the household's active pets.
 * Used for "Today" on the Pets page and the Home dashboard.
 */
export async function householdCareDue(ctx: PropertyCtx, days = 0) {
  const until = addDays(todayIn(ctx.timezone), days);
  const rows = await ctx.db
    .select({ task: maintenanceTask, petName: pet.name, petPhotoFileId: pet.photoFileId })
    .from(maintenanceTask)
    .innerJoin(pet, eq(pet.id, maintenanceTask.petId))
    .where(and(eq(maintenanceTask.propertyId, ctx.propertyId), eq(maintenanceTask.status, "scheduled"), eq(pet.householdId, ctx.householdId), isNull(pet.archivedAt), lte(maintenanceTask.dueOn, until)))
    .orderBy(asc(maintenanceTask.dueOn), asc(pet.name), asc(maintenanceTask.title))
    .limit(100);
  return rows.map((r) => ({ ...r.task, petId: r.task.petId!, petName: r.petName, petPhotoFileId: r.petPhotoFileId }));
}
