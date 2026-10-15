import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/core/db/client";
import { makeUser, testDb } from "../support/db";
import { createAsset, getAssetDetail, listAssets } from "@/core/services/assets";
import { createLocation, deleteLocation, listLocationsWithCounts } from "@/core/services/locations";
import { createDocument, deleteDocument, getDocument, listDocuments } from "@/core/services/documents";
import { getFileMeta, storeFile } from "@/core/services/files";
import { addProjectTask, createExpense, createProject, deleteProject, getProject, linkProjectAsset, listProjects, setProjectStatus, toggleProjectTask } from "@/core/services/projects";
import { searchEverything } from "@/core/services/search";
import { createPreparedness, listPreparedness } from "@/core/services/preparedness";
import { exportHousehold } from "@/core/services/account";

describe("inventory, documents, projects, search", () => {
  let db: Db;
  let u: Awaited<ReturnType<typeof makeUser>>;

  beforeAll(async () => {
    db = await testDb();
    u = await makeUser(db);
  });

  it("links one canonical asset to documents, tasks, projects and expenses", async () => {
    const kitchen = await createLocation(u.pctx, { name: "Kitchen", kind: "room" });
    const fridge = await createAsset(u.pctx, { name: "Refrigerator", category: "appliance", locationId: kitchen.id, manufacturer: "Acme", model: "CF-2000", warrantyExpiresOn: "2030-01-01" });
    const file = await storeFile(u.ctx, { bytes: Buffer.from("%PDF-1.4 fake"), filename: "manual.pdf", contentType: "application/pdf" });
    const doc = await createDocument(u.pctx, { title: "Fridge manual", category: "manual", assetId: fridge.id }, file.id);
    const project = await createProject(u.pctx, { name: "Kitchen refresh", status: "in_progress", priority: "normal", budget: 500000 });
    await linkProjectAsset(u.pctx, project.id, fridge.id);
    await createExpense(u.pctx, { title: "Water line", amount: 4599, spentOn: "2026-02-02", category: "materials", projectId: project.id, assetId: fridge.id });

    const detail = await getAssetDetail(u.pctx, fridge.id);
    expect(detail.documents.map((d) => d.id)).toEqual([doc.id]);
    expect(detail.documents[0].file?.filename).toBe("manual.pdf");
    expect(detail.expenses).toHaveLength(1);

    const counts = await listLocationsWithCounts(u.pctx);
    expect(counts.find((l) => l.id === kitchen.id)?.assetCount).toBe(1);

    const p = await getProject(u.pctx, project.id);
    expect(p.assets[0].asset.name).toBe("Refrigerator");
    expect(p.spentCents).toBe(4599);
  });

  it("searches, filters and sorts inventory", async () => {
    await createAsset(u.pctx, { name: "Water heater", category: "water_heater", serialNumber: "WH-777" });
    expect((await listAssets(u.pctx, { q: "wh-7" })).map((a) => a.name)).toEqual(["Water heater"]);
    expect((await listAssets(u.pctx, { category: "appliance" })).map((a) => a.name)).toEqual(["Refrigerator"]);
    expect((await listAssets(u.pctx, { sort: "warranty" }))[0].name).toBe("Refrigerator");
    const hits = await searchEverything(u.pctx, "kitchen");
    expect(hits.map((h) => h.kind).sort()).toEqual(["location", "project"]);
  });

  it("deleting a document removes its file; deleting a location keeps assets", async () => {
    const docs = await listDocuments(u.pctx);
    const doc = docs.find((d) => d.title === "Fridge manual")!;
    const fileId = doc.file!.id;
    await deleteDocument(u.pctx, doc.id);
    await expect(getDocument(u.pctx, doc.id)).rejects.toThrow(/not found/i);
    await expect(getFileMeta(u.ctx, fileId)).rejects.toThrow(/not found/i);

    const [kitchen] = await listLocationsWithCounts(u.pctx);
    await deleteLocation(u.pctx, kitchen.id);
    const fridge = (await listAssets(u.pctx, { q: "Refrigerator" }))[0];
    expect(fridge.locationId).toBeNull();
  });

  it("tracks project checklist progress, status and spend", async () => {
    const project = (await listProjects(u.pctx, "open"))[0];
    const item = await addProjectTask(u.pctx, project.id, { title: "Pick paint" });
    await toggleProjectTask(u.pctx, item.id, true);
    const list = await listProjects(u.pctx, "open");
    const row = list.find((p) => p.id === project.id)!;
    expect(row.taskCount).toBe(1);
    expect(row.doneCount).toBe(1);
    expect(row.spentCents).toBe(4599);
    expect(row.budgetCents).toBe(500000);
    await setProjectStatus(u.pctx, project.id, "completed");
    expect((await listProjects(u.pctx, "open")).find((p) => p.id === project.id)).toBeUndefined();
    expect((await listProjects(u.pctx, "closed")).find((p) => p.id === project.id)?.completedOn).toBeTruthy();
    // Deleting the project keeps its expense (reference cleared).
    await deleteProject(u.pctx, project.id);
    const exported = await exportHousehold(u.ctx);
    expect(exported.expenses.find((e) => e.title === "Water line")?.projectId).toBeNull();
  });

  it("stores preparedness records and includes everything in export", async () => {
    await createPreparedness(u.pctx, { kind: "water_shutoff", title: "Main water shutoff", whereText: "Basement, north wall" });
    expect((await listPreparedness(u.pctx)).length).toBe(1);
    const exported = await exportHousehold(u.ctx);
    expect(exported.preparedness).toHaveLength(1);
    expect(exported.vaultDocuments).toBe("locked");
    expect(exported.files.every((f) => !f.isVault)).toBe(true);
  });
});
