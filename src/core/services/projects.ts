import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { asset, document, expense, project, projectAsset, projectTask } from "../db/schema";
import { NotFoundError } from "../errors";
import type { ExpenseInput, ProjectInput } from "../domain/validation";
import { todayIn } from "../domain/dates";
import type { PropertyCtx } from "./context";
import { nullable } from "./context";
import { assertAsset } from "./assets";
import { assertLocation } from "./locations";
import { assertProvider } from "./providers";

const OPEN_STATUSES = ["idea", "planned", "in_progress", "on_hold"] as const;

export async function listProjects(ctx: PropertyCtx, view: "open" | "closed" | "all" = "open") {
  const conditions = [eq(project.propertyId, ctx.propertyId)];
  if (view === "open") conditions.push(inArray(project.status, [...OPEN_STATUSES]));
  if (view === "closed") conditions.push(inArray(project.status, ["completed", "cancelled"]));
  const rows = await ctx.db
    .select({
      id: project.id,
      name: project.name,
      status: project.status,
      priority: project.priority,
      startOn: project.startOn,
      targetOn: project.targetOn,
      completedOn: project.completedOn,
      budgetCents: project.budgetCents,
      // Drizzle leaves single-table selects unqualified, so the outer column is written explicitly.
      spentCents: sql<number>`coalesce((select sum(e.amount_cents) from ${expense} e where e.project_id = "project"."id"), 0)::int`,
      taskCount: sql<number>`(select count(*) from ${projectTask} t where t.project_id = "project"."id")::int`,
      doneCount: sql<number>`(select count(*) from ${projectTask} t where t.project_id = "project"."id" and t.completed_on is not null)::int`,
      updatedAt: project.updatedAt,
    })
    .from(project)
    .where(and(...conditions))
    .orderBy(
      sql`case ${project.status} when 'in_progress' then 0 when 'planned' then 1 when 'on_hold' then 2 when 'idea' then 3 else 4 end`,
      sql`${project.targetOn} asc nulls last`,
      desc(project.updatedAt),
    );
  return rows;
}

export async function getProject(ctx: PropertyCtx, id: string) {
  const row = await ctx.db.query.project.findFirst({
    where: and(eq(project.id, id), eq(project.propertyId, ctx.propertyId)),
    with: {
      location: true,
      tasks: { orderBy: [asc(projectTask.sortOrder), asc(projectTask.createdAt)] },
      expenses: { with: { provider: true }, orderBy: [desc(expense.spentOn)] },
      assets: { with: { asset: true } },
      documents: { where: eq(document.isVault, false), with: { file: true }, orderBy: [desc(document.createdAt)] },
    },
  });
  if (!row) throw new NotFoundError("Project not found");
  const spentCents = row.expenses.reduce((n, e) => n + e.amountCents, 0);
  return { ...row, spentCents };
}

export async function assertProject(ctx: PropertyCtx, id: string | undefined | null) {
  if (!id) return null;
  const row = await ctx.db.query.project.findFirst({
    where: and(eq(project.id, id), eq(project.propertyId, ctx.propertyId)),
    columns: { id: true },
  });
  if (!row) throw new NotFoundError("Project not found");
  return id;
}

async function toRow(ctx: PropertyCtx, input: ProjectInput) {
  const completedOn = input.status === "completed" ? (input.completedOn ?? todayIn(ctx.timezone)) : nullable(input.completedOn);
  return {
    name: input.name,
    description: nullable(input.description),
    status: input.status,
    priority: input.priority,
    startOn: nullable(input.startOn),
    targetOn: nullable(input.targetOn),
    completedOn,
    budgetCents: nullable(input.budget),
    locationId: await assertLocation(ctx, input.locationId),
    notes: nullable(input.notes),
  };
}

export async function createProject(ctx: PropertyCtx, input: ProjectInput) {
  const [row] = await ctx.db.insert(project).values({ propertyId: ctx.propertyId, ...(await toRow(ctx, input)) }).returning();
  return row;
}

export async function updateProject(ctx: PropertyCtx, id: string, input: ProjectInput) {
  const [row] = await ctx.db
    .update(project)
    .set(await toRow(ctx, input))
    .where(and(eq(project.id, id), eq(project.propertyId, ctx.propertyId)))
    .returning();
  if (!row) throw new NotFoundError("Project not found");
  return row;
}

export async function setProjectStatus(ctx: PropertyCtx, id: string, status: ProjectInput["status"]) {
  const [row] = await ctx.db
    .update(project)
    .set({ status, completedOn: status === "completed" ? todayIn(ctx.timezone) : null })
    .where(and(eq(project.id, id), eq(project.propertyId, ctx.propertyId)))
    .returning();
  if (!row) throw new NotFoundError("Project not found");
  return row;
}

/** Deleting a project keeps its expenses and documents (project reference cleared); its checklist goes with it. */
export async function deleteProject(ctx: PropertyCtx, id: string) {
  const res = await ctx.db
    .delete(project)
    .where(and(eq(project.id, id), eq(project.propertyId, ctx.propertyId)))
    .returning({ id: project.id });
  if (res.length === 0) throw new NotFoundError("Project not found");
}

/* ------------------------------ checklist -------------------------------- */

export async function addProjectTask(ctx: PropertyCtx, projectId: string, input: { title: string; isMilestone?: boolean; dueOn?: string }) {
  await assertProject(ctx, projectId);
  const [{ n }] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(projectTask).where(eq(projectTask.projectId, projectId));
  const [row] = await ctx.db
    .insert(projectTask)
    .values({ projectId, title: input.title, isMilestone: input.isMilestone ?? false, dueOn: nullable(input.dueOn), sortOrder: n })
    .returning();
  return row;
}

export async function toggleProjectTask(ctx: PropertyCtx, taskId: string, done: boolean) {
  const row = await ctx.db
    .select({ id: projectTask.id, projectId: projectTask.projectId })
    .from(projectTask)
    .innerJoin(project, eq(project.id, projectTask.projectId))
    .where(and(eq(projectTask.id, taskId), eq(project.propertyId, ctx.propertyId)));
  if (row.length === 0) throw new NotFoundError("Checklist item not found");
  await ctx.db
    .update(projectTask)
    .set({ completedOn: done ? todayIn(ctx.timezone) : null })
    .where(eq(projectTask.id, taskId));
  return row[0].projectId;
}

export async function deleteProjectTask(ctx: PropertyCtx, taskId: string) {
  const row = await ctx.db
    .select({ id: projectTask.id, projectId: projectTask.projectId })
    .from(projectTask)
    .innerJoin(project, eq(project.id, projectTask.projectId))
    .where(and(eq(projectTask.id, taskId), eq(project.propertyId, ctx.propertyId)));
  if (row.length === 0) throw new NotFoundError("Checklist item not found");
  await ctx.db.delete(projectTask).where(eq(projectTask.id, taskId));
  return row[0].projectId;
}

/* ---------------------------- linked assets ------------------------------ */

export async function linkProjectAsset(ctx: PropertyCtx, projectId: string, assetId: string) {
  await assertProject(ctx, projectId);
  await assertAsset(ctx, assetId);
  await ctx.db.insert(projectAsset).values({ projectId, assetId }).onConflictDoNothing();
}

export async function unlinkProjectAsset(ctx: PropertyCtx, projectId: string, assetId: string) {
  await assertProject(ctx, projectId);
  await ctx.db.delete(projectAsset).where(and(eq(projectAsset.projectId, projectId), eq(projectAsset.assetId, assetId)));
}

export async function projectsForAsset(ctx: PropertyCtx, assetId: string) {
  return ctx.db
    .select({ id: project.id, name: project.name, status: project.status })
    .from(projectAsset)
    .innerJoin(project, eq(project.id, projectAsset.projectId))
    .innerJoin(asset, eq(asset.id, projectAsset.assetId))
    .where(and(eq(projectAsset.assetId, assetId), eq(project.propertyId, ctx.propertyId)));
}

/* -------------------------------- expenses ------------------------------- */

export async function createExpense(ctx: PropertyCtx, input: ExpenseInput) {
  const [row] = await ctx.db
    .insert(expense)
    .values({
      propertyId: ctx.propertyId,
      title: input.title,
      amountCents: input.amount,
      spentOn: input.spentOn,
      category: input.category,
      projectId: await assertProject(ctx, input.projectId),
      assetId: await assertAsset(ctx, input.assetId),
      providerId: await assertProvider(ctx, input.providerId),
      notes: nullable(input.notes),
    })
    .returning();
  return row;
}

export async function deleteExpense(ctx: PropertyCtx, id: string) {
  const res = await ctx.db
    .delete(expense)
    .where(and(eq(expense.id, id), eq(expense.propertyId, ctx.propertyId)))
    .returning({ id: expense.id, projectId: expense.projectId });
  if (res.length === 0) throw new NotFoundError("Expense not found");
  return res[0];
}

export async function listExpenses(ctx: PropertyCtx, opts: { limit?: number } = {}) {
  return ctx.db.query.expense.findMany({
    where: eq(expense.propertyId, ctx.propertyId),
    with: { project: { columns: { id: true, name: true } }, asset: { columns: { id: true, name: true } }, provider: { columns: { id: true, name: true } } },
    orderBy: [desc(expense.spentOn), desc(expense.createdAt)],
    limit: Math.min(opts.limit ?? 200, 500),
  });
}

export async function projectCounts(ctx: PropertyCtx) {
  const [row] = await ctx.db
    .select({
      inProgress: sql<number>`count(*) filter (where ${project.status} = 'in_progress')::int`,
      open: sql<number>`count(*)::int`,
    })
    .from(project)
    .where(and(eq(project.propertyId, ctx.propertyId), inArray(project.status, [...OPEN_STATUSES])));
  return row ?? { inProgress: 0, open: 0 };
}
