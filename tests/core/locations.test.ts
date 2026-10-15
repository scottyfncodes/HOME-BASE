import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/core/db/client";
import { makeUser, testDb } from "../support/db";
import { createAsset, getAsset } from "@/core/services/assets";
import { createLocation, createLocations, getLocation, listLocations } from "@/core/services/locations";
import { createPreparedness, getPreparedness } from "@/core/services/preparedness";
import { createTask, getTask } from "@/core/services/maintenance";
import { inferLocationKind, NEW_LOCATION_VALUE } from "@/core/domain/validation";

describe("adding a location while adding a record", () => {
  let db: Db;
  let u: Awaited<ReturnType<typeof makeUser>>;
  let other: Awaited<ReturnType<typeof makeUser>>;

  beforeAll(async () => {
    db = await testDb();
    u = await makeUser(db);
    other = await makeUser(db);
  });

  it("creates the location from the item form and links the item to it", async () => {
    const panel = await createAsset(u.pctx, {
      name: "Electrical panel",
      category: "electrical",
      locationId: NEW_LOCATION_VALUE,
      newLocationName: "Hallway",
      newLocationKind: "area",
    });
    const item = await getAsset(u.pctx, panel.id);
    expect(item.location?.name).toBe("Hallway");
    expect(item.location?.kind).toBe("area");
  });

  it("reuses an existing location with the same name instead of duplicating it", async () => {
    const before = await listLocations(u.pctx);
    const task = await createTask(u.pctx, {
      title: "Label breakers",
      dueOn: "2026-11-01",
      priority: "normal",
      locationId: NEW_LOCATION_VALUE,
      newLocationName: "  hallway ",
    });
    const after = await listLocations(u.pctx);
    expect(after.length).toBe(before.length);
    expect((await getTask(u.pctx, task.id)).location?.name).toBe("Hallway");
  });

  it("infers the kind when none is picked, e.g. an outdoor panel", async () => {
    const rec = await createPreparedness(u.pctx, {
      kind: "electrical_panel",
      title: "Main electrical panel",
      locationId: NEW_LOCATION_VALUE,
      newLocationName: "Outside east wall",
    });
    const loc = await getLocation(u.pctx, (await getPreparedness(u.pctx, rec.id)).locationId!);
    expect(loc.kind).toBe("exterior");
  });

  it("requires a name for a new location", async () => {
    await expect(
      createAsset(u.pctx, { name: "Sub-panel", category: "electrical", locationId: NEW_LOCATION_VALUE }),
    ).rejects.toThrow(/name the new location/i);
  });

  it("still refuses a location id that belongs to another household", async () => {
    const theirs = await createLocation(other.pctx, { name: "Their garage", kind: "room" });
    await expect(createAsset(u.pctx, { name: "Sneaky", category: "other", locationId: theirs.id })).rejects.toThrow(/not found/i);
  });

  it("files onboarding rooms under a sensible kind", async () => {
    const rows = await createLocations(other.pctx, ["Entryway", "Outside (exterior)", "Kitchen"]);
    expect(Object.fromEntries(rows.map((r) => [r.name, r.kind]))).toEqual({ Entryway: "area", "Outside (exterior)": "exterior", Kitchen: "room" });
  });
});

describe("inferLocationKind", () => {
  it.each([
    ["Hallway", "area"],
    ["Upstairs hall", "area"],
    ["Outside east wall", "exterior"],
    ["Back patio", "exterior"],
    ["Hall closet", "storage"],
    ["Laundry room", "utility"],
    ["Kitchen", "room"],
    ["", "room"],
  ])("%s → %s", (name, kind) => {
    expect(inferLocationKind(name)).toBe(kind);
  });
});
