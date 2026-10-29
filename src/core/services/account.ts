import { and, eq, inArray } from "drizzle-orm";
import type { Db } from "../db/client";
import * as s from "../db/schema";
import { ValidationError } from "../errors";
import type { Ctx } from "./context";
import { verifyUserPassword } from "./vault";

/**
 * Everything the household owns, as JSON. File bytes are not inlined; each
 * file lists its id and a download path that requires the user's session.
 * Vault documents are included as metadata only when the Vault is unlocked.
 */
export async function exportHousehold(ctx: Ctx & { vaultUnlocked?: boolean }) {
  const db = ctx.db;
  const properties = await db.query.property.findMany({ where: eq(s.property.householdId, ctx.householdId) });
  const propertyIds = properties.map((p) => p.id);

  const [members, locations, assets, tasks, logs, projects, projectTasks, projectAssets, expenses, documents, providers, preparedness, files] = await Promise.all([
    db.query.householdMember.findMany({ where: eq(s.householdMember.householdId, ctx.householdId) }),
    propertyIds.length ? db.query.location.findMany({ where: inArray(s.location.propertyId, propertyIds) }) : [],
    propertyIds.length ? db.query.asset.findMany({ where: inArray(s.asset.propertyId, propertyIds) }) : [],
    propertyIds.length ? db.query.maintenanceTask.findMany({ where: inArray(s.maintenanceTask.propertyId, propertyIds) }) : [],
    propertyIds.length ? db.query.maintenanceLog.findMany({ where: inArray(s.maintenanceLog.propertyId, propertyIds) }) : [],
    propertyIds.length ? db.query.project.findMany({ where: inArray(s.project.propertyId, propertyIds) }) : [],
    propertyIds.length ? db.select().from(s.projectTask).innerJoin(s.project, eq(s.project.id, s.projectTask.projectId)).where(inArray(s.project.propertyId, propertyIds)).then((r) => r.map((x) => x.project_task)) : [],
    propertyIds.length ? db.select().from(s.projectAsset).innerJoin(s.project, eq(s.project.id, s.projectAsset.projectId)).where(inArray(s.project.propertyId, propertyIds)).then((r) => r.map((x) => x.project_asset)) : [],
    propertyIds.length ? db.query.expense.findMany({ where: inArray(s.expense.propertyId, propertyIds) }) : [],
    propertyIds.length ? db.query.document.findMany({ where: inArray(s.document.propertyId, propertyIds) }) : [],
    db.query.serviceProvider.findMany({ where: eq(s.serviceProvider.householdId, ctx.householdId) }),
    propertyIds.length ? db.query.preparednessItem.findMany({ where: inArray(s.preparednessItem.propertyId, propertyIds) }) : [],
    db.query.fileObject.findMany({ where: eq(s.fileObject.householdId, ctx.householdId), columns: { id: true, filename: true, contentType: true, sizeBytes: true, sha256: true, isVault: true, createdAt: true } }),
  ]);

  const vaultUnlocked = ctx.vaultUnlocked === true;
  return {
    format: "home-base-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    householdId: ctx.householdId,
    members: members.map((m) => ({ userId: m.userId, role: m.role, joinedAt: m.createdAt })),
    properties,
    locations,
    assets,
    maintenanceTasks: tasks,
    maintenanceHistory: logs,
    projects,
    projectChecklist: projectTasks,
    projectAssets,
    expenses,
    serviceProviders: providers,
    preparedness,
    documents: documents.filter((d) => !d.isVault),
    vaultDocuments: vaultUnlocked ? documents.filter((d) => d.isVault) : "locked",
    files: files
      .filter((f) => !f.isVault || vaultUnlocked)
      .map((f) => ({ ...f, download: `/api/files/${f.id}?download=1` })),
    notes: {
      files: "File bytes are not embedded. Download each file from its `download` path while signed in.",
      vault: vaultUnlocked ? "Vault metadata included (unlocked)." : "Vault documents omitted: unlock the Vault and export again to include their metadata.",
    },
  };
}

/**
 * Deletes the user's account after password confirmation. If they are the
 * only member of their household, the household and everything in it is
 * deleted too (foreign keys cascade). Otherwise only their membership and
 * account go; the household stays with the remaining members.
 */
export async function deleteAccount(db: Db, userId: string, password: string) {
  const ok = await verifyUserPassword(db, userId, password);
  if (!ok) throw new ValidationError("That password is not correct.", { password: "Incorrect password." });
  await db.transaction(async (tx) => {
    const memberships = await tx.query.householdMember.findMany({ where: eq(s.householdMember.userId, userId) });
    for (const m of memberships) {
      const others = await tx.query.householdMember.findMany({ where: eq(s.householdMember.householdId, m.householdId) });
      if (others.length <= 1) {
        await tx.delete(s.household).where(eq(s.household.id, m.householdId));
      } else if (m.role === "owner" && !others.some((o) => o.userId !== userId && o.role === "owner")) {
        // Never leave a shared household without an owner: promote the longest-standing member.
        const heir = others.filter((o) => o.userId !== userId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())[0];
        await tx.update(s.householdMember).set({ role: "owner" }).where(and(eq(s.householdMember.householdId, m.householdId), eq(s.householdMember.userId, heir.userId)));
      }
    }
    await tx.delete(s.user).where(eq(s.user.id, userId));
  });
}
