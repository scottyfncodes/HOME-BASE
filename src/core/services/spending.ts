import { and, eq, gte, isNotNull, lte, sql } from "drizzle-orm";
import { expense, maintenanceLog } from "../db/schema";
import type { PropertyCtx } from "./context";

export type SpendingLine = { id: string; kind: "maintenance" | "expense"; title: string; on: string; cents: number; assetId: string | null; assetName: string | null; projectId: string | null; projectName: string | null };

/**
 * What the home cost in one calendar year: completed maintenance with a cost,
 * plus every recorded expense (project or not). The purchase price of items
 * is not spending and is left out.
 */
export async function getSpending(ctx: PropertyCtx, year: number) {
  const from = `${year}-01-01`;
  const to = `${year}-12-31`;
  const [logs, expenses, years] = await Promise.all([
    ctx.db.query.maintenanceLog.findMany({
      where: and(eq(maintenanceLog.propertyId, ctx.propertyId), isNotNull(maintenanceLog.costCents), gte(maintenanceLog.completedOn, from), lte(maintenanceLog.completedOn, to)),
      with: { asset: { columns: { id: true, name: true } } },
    }),
    ctx.db.query.expense.findMany({
      where: and(eq(expense.propertyId, ctx.propertyId), gte(expense.spentOn, from), lte(expense.spentOn, to)),
      with: { asset: { columns: { id: true, name: true } }, project: { columns: { id: true, name: true } } },
    }),
    spendingYears(ctx),
  ]);

  const lines: SpendingLine[] = [
    ...logs.map((l) => ({ id: l.id, kind: "maintenance" as const, title: l.title, on: l.completedOn, cents: l.costCents ?? 0, assetId: l.asset?.id ?? null, assetName: l.asset?.name ?? null, projectId: null, projectName: null })),
    ...expenses.map((e) => ({ id: e.id, kind: "expense" as const, title: e.title, on: e.spentOn, cents: e.amountCents, assetId: e.asset?.id ?? null, assetName: e.asset?.name ?? null, projectId: e.project?.id ?? null, projectName: e.project?.name ?? null })),
  ].sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : b.cents - a.cents));

  const byMonth = Array.from({ length: 12 }, () => 0);
  let maintenance = 0;
  let projects = 0;
  let other = 0;
  const byAsset = new Map<string, { id: string; name: string; cents: number }>();
  const byProject = new Map<string, { id: string; name: string; cents: number }>();
  for (const l of lines) {
    byMonth[Number(l.on.slice(5, 7)) - 1] += l.cents;
    if (l.kind === "maintenance") maintenance += l.cents;
    else if (l.projectId) projects += l.cents;
    else other += l.cents;
    if (l.assetId && l.assetName) {
      const cur = byAsset.get(l.assetId) ?? { id: l.assetId, name: l.assetName, cents: 0 };
      cur.cents += l.cents;
      byAsset.set(l.assetId, cur);
    }
    if (l.projectId && l.projectName) {
      const cur = byProject.get(l.projectId) ?? { id: l.projectId, name: l.projectName, cents: 0 };
      cur.cents += l.cents;
      byProject.set(l.projectId, cur);
    }
  }
  const top = <T extends { cents: number }>(m: Map<string, T>) => [...m.values()].sort((a, b) => b.cents - a.cents).slice(0, 5);
  return {
    year,
    years,
    total: maintenance + projects + other,
    maintenance,
    projects,
    other,
    byMonth,
    topAssets: top(byAsset),
    topProjects: top(byProject),
    lines,
  };
}

/** Years that have any spending recorded, newest first. */
export async function spendingYears(ctx: PropertyCtx): Promise<number[]> {
  const [a, b] = await Promise.all([
    ctx.db
      .selectDistinct({ y: sql<number>`extract(year from ${maintenanceLog.completedOn})::int` })
      .from(maintenanceLog)
      .where(and(eq(maintenanceLog.propertyId, ctx.propertyId), isNotNull(maintenanceLog.costCents))),
    ctx.db
      .selectDistinct({ y: sql<number>`extract(year from ${expense.spentOn})::int` })
      .from(expense)
      .where(eq(expense.propertyId, ctx.propertyId)),
  ]);
  return [...new Set([...a, ...b].map((r) => Number(r.y)))].sort((x, y) => y - x);
}
