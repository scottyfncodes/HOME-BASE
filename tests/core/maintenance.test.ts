import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/core/db/client";
import { makeUser, testDb } from "../support/db";
import { createAsset, deleteAsset, retireAsset } from "@/core/services/assets";
import { cancelTask, completeTask, createTask, deleteTask, getTask, getTaskHistory, listHistory, listTasks, taskCounts } from "@/core/services/maintenance";
import { todayIn } from "@/core/domain/dates";

describe("maintenance scheduling and history", () => {
  let db: Db;
  let u: Awaited<ReturnType<typeof makeUser>>;
  let today: string;

  beforeAll(async () => {
    db = await testDb();
    u = await makeUser(db);
    today = todayIn(u.pctx.timezone);
  });

  it("completing a one-time task closes it and writes one history entry", async () => {
    const t = await createTask(u.pctx, { title: "Replace smoke detector batteries", dueOn: today, priority: "normal" });
    const { nextDue } = await completeTask(u.pctx, t.id, { completedOn: today, cost: 1299, notes: "9V x3" });
    expect(nextDue).toBeNull();
    expect((await getTask(u.pctx, t.id)).status).toBe("completed");
    const history = await getTaskHistory(u.pctx, t.id);
    expect(history).toHaveLength(1);
    expect(history[0].costCents).toBe(1299);
    expect(history[0].scheduledFor).toBe(today);
    // Cannot complete twice.
    await expect(completeTask(u.pctx, t.id, { completedOn: today })).rejects.toThrow(/not scheduled/i);
  });

  it("completing a recurring task keeps history and schedules the next occurrence", async () => {
    const t = await createTask(u.pctx, {
      title: "Change HVAC filter",
      dueOn: "2026-01-15",
      priority: "normal",
      recurrence: { every: 3, unit: "month", anchor: "due" },
    });
    const first = await completeTask(u.pctx, t.id, { completedOn: "2026-01-16" });
    expect(first.nextDue).toBe("2026-04-15");
    const after = await getTask(u.pctx, t.id);
    expect(after.status).toBe("scheduled");
    expect(after.dueOn).toBe("2026-04-15");

    const second = await completeTask(u.pctx, t.id, { completedOn: "2026-04-20" });
    expect(second.nextDue).toBe("2026-07-15");
    const history = await getTaskHistory(u.pctx, t.id);
    expect(history.map((h) => h.completedOn)).toEqual(["2026-04-20", "2026-01-16"]);
    // Exactly one scheduled task still exists for the series: no duplicates.
    const scheduled = (await listTasks(u.pctx, "all")).filter((x) => x.title === "Change HVAC filter");
    expect(scheduled).toHaveLength(1);
  });

  it("rejects completion dates in the future", async () => {
    const t = await createTask(u.pctx, { title: "Future", dueOn: today, priority: "low" });
    await expect(completeTask(u.pctx, t.id, { completedOn: "2999-01-01" })).rejects.toThrow(/future/i);
  });

  it("classifies overdue vs upcoming by the property's local date", async () => {
    await createTask(u.pctx, { title: "Overdue one", dueOn: "2020-01-01", priority: "high" });
    await createTask(u.pctx, { title: "Upcoming one", dueOn: "2999-01-01", priority: "low" });
    const overdue = await listTasks(u.pctx, "overdue");
    const upcoming = await listTasks(u.pctx, "upcoming");
    expect(overdue.some((t) => t.title === "Overdue one")).toBe(true);
    expect(overdue.some((t) => t.title === "Upcoming one")).toBe(false);
    expect(upcoming.some((t) => t.title === "Upcoming one")).toBe(true);
    const counts = await taskCounts(u.pctx);
    expect(counts.overdue).toBeGreaterThanOrEqual(1);
  });

  it("cancelling and deleting a task preserves its history", async () => {
    const t = await createTask(u.pctx, { title: "Gutters", dueOn: "2026-03-01", priority: "normal", recurrence: { every: 1, unit: "year", anchor: "due" } });
    await completeTask(u.pctx, t.id, { completedOn: "2026-03-02" });
    await cancelTask(u.pctx, t.id);
    expect((await getTask(u.pctx, t.id)).status).toBe("cancelled");
    await deleteTask(u.pctx, t.id);
    await expect(getTask(u.pctx, t.id)).rejects.toThrow(/not found/i);
    const history = await listHistory(u.pctx);
    const kept = history.find((h) => h.title === "Gutters");
    expect(kept).toBeDefined();
    expect(kept!.taskId).toBeNull();
  });

  it("retiring or deleting an asset keeps its maintenance history", async () => {
    const a = await createAsset(u.pctx, { name: "Old furnace", category: "hvac" });
    const t = await createTask(u.pctx, { title: "Furnace tune-up", dueOn: "2026-02-01", priority: "normal", assetId: a.id, recurrence: { every: 1, unit: "year", anchor: "due" } });
    await completeTask(u.pctx, t.id, { completedOn: "2026-02-01", cost: 15000 });
    await retireAsset(u.pctx, a.id, "replaced");
    expect((await getTask(u.pctx, t.id)).status).toBe("cancelled");
    await deleteAsset(u.pctx, a.id);
    const history = await listHistory(u.pctx);
    const kept = history.find((h) => h.title === "Furnace tune-up");
    expect(kept).toBeDefined();
    expect(kept!.assetId).toBeNull();
    expect(kept!.costCents).toBe(15000);
  });
});
