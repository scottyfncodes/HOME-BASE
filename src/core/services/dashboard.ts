import { and, eq, inArray } from "drizzle-orm";
import { preparednessItem } from "../db/schema";
import { todayIn } from "../domain/dates";
import type { PropertyCtx } from "./context";
import { countAssets, warrantiesExpiringSoon } from "./assets";
import { documentsExpiringSoon } from "./documents";
import { listTasks, taskCounts } from "./maintenance";
import { listProjects, projectCounts } from "./projects";
import { listLocations } from "./locations";

export async function getDashboard(ctx: PropertyCtx) {
  const today = todayIn(ctx.timezone);
  const [overdue, upcoming, tCounts, projects, pCounts, warranties, expiringDocs, assetCount, locations, shutoffs] = await Promise.all([
    listTasks(ctx, "overdue", { limit: 10 }),
    listTasks(ctx, "upcoming", { limit: 10, horizonDays: 30 }),
    taskCounts(ctx),
    listProjects(ctx, "open"),
    projectCounts(ctx),
    warrantiesExpiringSoon(ctx, 60),
    documentsExpiringSoon(ctx, 60),
    countAssets(ctx),
    listLocations(ctx),
    ctx.db.query.preparednessItem.findMany({
      where: and(eq(preparednessItem.propertyId, ctx.propertyId), inArray(preparednessItem.kind, ["water_shutoff", "gas_shutoff", "electrical_panel"])),
      limit: 3,
    }),
  ]);
  return {
    today,
    overdue,
    upcoming,
    taskCounts: tCounts,
    projects: projects.filter((p) => p.status === "in_progress").slice(0, 5),
    projectCounts: pCounts,
    warranties,
    expiringDocs,
    assetCount,
    locationCount: locations.length,
    shutoffs,
    isEmpty: assetCount === 0 && locations.length === 0 && tCounts.scheduled === 0 && pCounts.open === 0,
  };
}
