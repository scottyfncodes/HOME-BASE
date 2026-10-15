import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/core/db/client";
import { makeUser, testDb } from "../support/db";
import { createAsset, deleteAsset, getAsset, listAssets, updateAsset } from "@/core/services/assets";
import { createLocation, deleteLocation, getLocation } from "@/core/services/locations";
import { createTask, getTask } from "@/core/services/maintenance";
import { createProject, getProject, toggleProjectTask, addProjectTask } from "@/core/services/projects";
import { createDocument, getDocument } from "@/core/services/documents";
import { getFileMeta, readFile, storeFile } from "@/core/services/files";
import { loadPropertyCtx } from "@/core/services/household";
import { createProvider, getProvider } from "@/core/services/providers";

describe("household isolation", () => {
  let db: Db;
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let bob: Awaited<ReturnType<typeof makeUser>>;

  beforeAll(async () => {
    db = await testDb();
    alice = await makeUser(db, { name: "Alice" });
    bob = await makeUser(db, { name: "Bob" });
  });

  it("does not let a user load another household's property", async () => {
    await expect(loadPropertyCtx(bob.ctx, alice.property.id)).rejects.toThrow(/not found/i);
  });

  it("hides assets, locations, tasks, projects, documents and providers across households", async () => {
    const loc = await createLocation(alice.pctx, { name: "Kitchen", kind: "room" });
    const a = await createAsset(alice.pctx, { name: "Fridge", category: "appliance", locationId: loc.id });
    const t = await createTask(alice.pctx, { title: "Clean coils", dueOn: "2026-05-01", priority: "normal" });
    const p = await createProject(alice.pctx, { name: "Kitchen refresh", status: "planned", priority: "normal" });
    const d = await createDocument(alice.pctx, { title: "Fridge manual", category: "manual" });
    const sp = await createProvider(alice.ctx, { name: "Cool Guys HVAC" });

    expect((await listAssets(bob.pctx)).length).toBe(0);
    await expect(getAsset(bob.pctx, a.id)).rejects.toThrow(/not found/i);
    await expect(getLocation(bob.pctx, loc.id)).rejects.toThrow(/not found/i);
    await expect(getTask(bob.pctx, t.id)).rejects.toThrow(/not found/i);
    await expect(getProject(bob.pctx, p.id)).rejects.toThrow(/not found/i);
    await expect(getDocument(bob.pctx, d.id)).rejects.toThrow(/not found/i);
    await expect(getProvider(bob.ctx, sp.id)).rejects.toThrow(/not found/i);

    // Mutations are blocked too, not just reads.
    await expect(updateAsset(bob.pctx, a.id, { name: "Hijacked", category: "appliance" })).rejects.toThrow(/not found/i);
    await expect(deleteAsset(bob.pctx, a.id)).rejects.toThrow(/not found/i);
    await expect(deleteLocation(bob.pctx, loc.id)).rejects.toThrow(/not found/i);
    // Still intact for Alice.
    expect((await getAsset(alice.pctx, a.id)).name).toBe("Fridge");
  });

  it("refuses to attach another household's location or asset to a record", async () => {
    const bobLoc = await createLocation(bob.pctx, { name: "Garage", kind: "room" });
    await expect(createAsset(alice.pctx, { name: "Sneaky", category: "other", locationId: bobLoc.id })).rejects.toThrow(/not found/i);
    const bobAsset = await createAsset(bob.pctx, { name: "Bob's heater", category: "water_heater" });
    await expect(createTask(alice.pctx, { title: "Flush", dueOn: "2026-05-01", priority: "normal", assetId: bobAsset.id })).rejects.toThrow(/not found/i);
  });

  it("scopes project checklist items through the project's property", async () => {
    const p = await createProject(bob.pctx, { name: "Deck", status: "planned", priority: "normal" });
    const item = await addProjectTask(bob.pctx, p.id, { title: "Buy lumber" });
    await expect(toggleProjectTask(alice.pctx, item.id, true)).rejects.toThrow(/not found/i);
    await expect(addProjectTask(alice.pctx, p.id, { title: "Nope" })).rejects.toThrow(/not found/i);
  });

  it("keeps files private to the household", async () => {
    const f = await storeFile(alice.ctx, { bytes: Buffer.from("hello"), filename: "note.txt", contentType: "text/plain" });
    await expect(getFileMeta(bob.ctx, f.id)).rejects.toThrow(/not found/i);
    await expect(readFile(bob.ctx, f.id)).rejects.toThrow(/not found/i);
    const read = await readFile(alice.ctx, f.id);
    expect(read.bytes.toString()).toBe("hello");
  });
});
