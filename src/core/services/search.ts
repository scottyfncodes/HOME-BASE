import { and, eq, ilike, isNull, or } from "drizzle-orm";
import { asset, document, location, maintenanceTask, pet, preparednessItem, project, serviceProvider } from "../db/schema";
import { speciesLabel } from "../domain/pets";
import type { PropertyCtx } from "./context";

export type SearchHit = {
  kind: "asset" | "task" | "document" | "project" | "location" | "provider" | "preparedness" | "pet";
  id: string;
  title: string;
  subtitle?: string | null;
  href: string;
};

/** Global search over everything the household can see (never the Vault). */
export async function searchEverything(ctx: PropertyCtx, query: string, limitPerKind = 8): Promise<SearchHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const term = `%${q.replace(/[%_]/g, "\\$&")}%`;
  const [assets, tasks, docs, projects, locations, providers, prep, pets] = await Promise.all([
    ctx.db.query.asset.findMany({
      where: and(eq(asset.propertyId, ctx.propertyId), or(ilike(asset.name, term), ilike(asset.manufacturer, term), ilike(asset.model, term), ilike(asset.serialNumber, term), ilike(asset.notes, term))),
      with: { location: { columns: { name: true } } },
      limit: limitPerKind,
    }),
    ctx.db.query.maintenanceTask.findMany({
      where: and(eq(maintenanceTask.propertyId, ctx.propertyId), eq(maintenanceTask.status, "scheduled"), isNull(maintenanceTask.petId), or(ilike(maintenanceTask.title, term), ilike(maintenanceTask.description, term))),
      limit: limitPerKind,
    }),
    ctx.db.query.document.findMany({
      where: and(eq(document.propertyId, ctx.propertyId), eq(document.isVault, false), or(ilike(document.title, term), ilike(document.notes, term))),
      limit: limitPerKind,
    }),
    ctx.db.query.project.findMany({
      where: and(eq(project.propertyId, ctx.propertyId), or(ilike(project.name, term), ilike(project.description, term), ilike(project.notes, term))),
      limit: limitPerKind,
    }),
    ctx.db.query.location.findMany({
      where: and(eq(location.propertyId, ctx.propertyId), or(ilike(location.name, term), ilike(location.notes, term))),
      limit: limitPerKind,
    }),
    ctx.db.query.serviceProvider.findMany({
      where: and(eq(serviceProvider.householdId, ctx.householdId), or(ilike(serviceProvider.name, term), ilike(serviceProvider.trade, term), ilike(serviceProvider.notes, term))),
      limit: limitPerKind,
    }),
    ctx.db.query.preparednessItem.findMany({
      where: and(eq(preparednessItem.propertyId, ctx.propertyId), or(ilike(preparednessItem.title, term), ilike(preparednessItem.whereText, term), ilike(preparednessItem.instructions, term), ilike(preparednessItem.details, term))),
      limit: limitPerKind,
    }),
    ctx.db.query.pet.findMany({
      where: and(eq(pet.householdId, ctx.householdId), or(ilike(pet.name, term), ilike(pet.breed, term), ilike(pet.microchipNumber, term), ilike(pet.speciesDetail, term), ilike(pet.notes, term))),
      limit: limitPerKind,
    }),
  ]);
  const hits: SearchHit[] = [];
  for (const a of assets) hits.push({ kind: "asset", id: a.id, title: a.name, subtitle: [a.manufacturer, a.model, a.location?.name].filter(Boolean).join(" · ") || null, href: `/inventory/${a.id}` });
  for (const t of tasks) hits.push({ kind: "task", id: t.id, title: t.title, subtitle: `Due ${t.dueOn}`, href: `/maintenance/${t.id}` });
  for (const d of docs) hits.push({ kind: "document", id: d.id, title: d.title, subtitle: d.category, href: `/documents/${d.id}` });
  for (const p of projects) hits.push({ kind: "project", id: p.id, title: p.name, subtitle: p.status.replace("_", " "), href: `/projects/${p.id}` });
  for (const l of locations) hits.push({ kind: "location", id: l.id, title: l.name, subtitle: l.kind, href: `/home/locations/${l.id}` });
  for (const s of providers) hits.push({ kind: "provider", id: s.id, title: s.name, subtitle: s.trade, href: `/providers/${s.id}` });
  for (const p of prep) hits.push({ kind: "preparedness", id: p.id, title: p.title, subtitle: p.whereText, href: `/preparedness/${p.id}` });
  for (const p of pets) hits.push({ kind: "pet", id: p.id, title: p.name, subtitle: [speciesLabel(p.species, p.speciesDetail), p.breed, p.archivedAt ? "Archived" : null].filter(Boolean).join(" · "), href: `/pets/${p.id}` });
  return hits;
}
