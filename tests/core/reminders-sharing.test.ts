import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/core/db/client";
import * as schema from "@/core/db/schema";
import { makeUser, testDb } from "../support/db";
import { buildCalendar, escapeText, foldLine } from "@/core/domain/ical";
import { addDays, todayIn } from "@/core/domain/dates";
import { createTask, completeTask } from "@/core/services/maintenance";
import { createAsset } from "@/core/services/assets";
import { createDocument, createVaultDocument } from "@/core/services/documents";
import { deleteCalendarFeed, renderCalendarFeed, resetCalendarFeed } from "@/core/services/calendar";
import { acceptInvite, createInvite, leaveHousehold, listPendingInvites, previewInvite, removeMember, revokeInvite, setMemberRole } from "@/core/services/invites";
import { getMembership, listMembers, loadPropertyCtx } from "@/core/services/household";
import { deleteAccount } from "@/core/services/account";
import { unlockVault } from "@/core/services/vault";
import { buildDigest, sendWeeklyDigests, setWeeklyDigest } from "@/core/services/digest";
import { getSpending } from "@/core/services/spending";
import { createExpense, createProject } from "@/core/services/projects";
import type { Ctx } from "@/core/services/context";

describe("iCalendar writer", () => {
  it("escapes text and folds long lines at 75 octets without splitting characters", () => {
    expect(escapeText("a, b; c\\d\nnext")).toBe("a\\, b\; c\\\\d\\nnext");
    const long = "SUMMARY:" + "é".repeat(60);
    const folded = foldLine(long);
    for (const part of folded.split("\r\n")) expect(new TextEncoder().encode(part).length).toBeLessThanOrEqual(75);
    expect(folded.replace(/\r\n /g, "")).toBe(long);
  });

  it("writes all-day events with an exclusive end date and a same-day alarm", () => {
    const ics = buildCalendar({ name: "Test", now: new Date("2026-01-01T00:00:00Z"), events: [{ uid: "x@hb", date: "2026-02-28", summary: "Filter", alarmMinutes: 540 }] });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260228\r\n");
    expect(ics).toContain("DTEND;VALUE=DATE:20260301\r\n");
    expect(ics).toContain("TRIGGER;RELATED=START:PT9H\r\n");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("calendar feed", () => {
  let db: Db;
  beforeAll(async () => {
    db = await testDb();
  });

  it("serves scheduled tasks behind a token, moves overdue to today, and never includes the Vault", async () => {
    const u = await makeUser(db);
    const today = todayIn(u.pctx.timezone);
    const late = await createTask(u.pctx, { title: "Clean gutters", dueOn: "2020-05-01", priority: "normal" });
    await createTask(u.pctx, { title: "Flush water heater", dueOn: addDays(today, 10), priority: "normal" });
    const done = await createTask(u.pctx, { title: "One-off", dueOn: today, priority: "low" });
    await completeTask(u.pctx, done.id, { completedOn: today });
    await createAsset(u.pctx, { name: "Fridge", category: "appliance", warrantyExpiresOn: addDays(today, 40) } as never);
    await createDocument(u.pctx, { title: "Home insurance", category: "insurance", expiresOn: addDays(today, 90) });
    await createVaultDocument({ ...u.pctx, vaultUnlocked: true }, { title: "Passport", category: "other", expiresOn: addDays(today, 20) } as never).catch(() => undefined);

    const token = await resetCalendarFeed(u.ctx);
    const ics = (await renderCalendarFeed(db, token, "https://hb.test"))!;
    expect(ics).toContain(`UID:task-${late.id}@homebase`);
    expect(ics).toContain("SUMMARY:Overdue: Clean gutters");
    expect(ics).toContain(`DTSTART;VALUE=DATE:${today.replace(/-/g, "")}`);
    expect(ics).toContain("SUMMARY:Flush water heater");
    expect(ics).not.toContain("One-off");
    expect(ics).toContain("SUMMARY:Fridge warranty ends");
    expect(ics).toContain("SUMMARY:Home insurance expires");
    expect(ics).not.toContain("Passport");

    // Resetting the link kills the old one; deleting kills it entirely.
    const token2 = await resetCalendarFeed(u.ctx);
    expect(await renderCalendarFeed(db, token, "https://hb.test")).toBeNull();
    expect(await renderCalendarFeed(db, token2, "https://hb.test")).not.toBeNull();
    await deleteCalendarFeed(u.ctx);
    expect(await renderCalendarFeed(db, token2, "https://hb.test")).toBeNull();
    expect(await renderCalendarFeed(db, "not-a-real-token-at-all", "https://hb.test")).toBeNull();
  });
});

describe("household invites", () => {
  let db: Db;
  beforeAll(async () => {
    db = await testDb();
  });

  async function ctxFor(userId: string): Promise<Ctx> {
    const m = (await getMembership(db, userId))!;
    return { db, userId, householdId: m.householdId, role: m.role };
  }

  it("lets a new person join with an empty household, once, and share the owner's records", async () => {
    const owner = await makeUser(db, { name: "Olive Owner" });
    await createTask(owner.pctx, { title: "Test detectors", dueOn: "2030-01-01", priority: "normal" });
    const { token, invite } = await createInvite(owner.ctx, { email: "new@example.com" });
    expect((await listPendingInvites(owner.ctx)).map((i) => i.id)).toContain(invite.id);

    // A brand-new account has a household with no home yet.
    const joinerId = "joiner-1";
    await db.insert(schema.user).values({ id: joinerId, name: "Jo Joiner", email: "jo@example.com" });
    const { ensureHouseholdForUser } = await import("@/core/services/household");
    const ownOld = await ensureHouseholdForUser(db, joinerId, "Jo");

    const preview = await previewInvite(db, token, joinerId);
    expect(preview?.householdName).toBeTruthy();
    expect(preview?.current).toMatchObject({ alreadyMember: false, soleMember: true, hasHome: false });

    await acceptInvite(db, joinerId, token);
    const jctx = await ctxFor(joinerId);
    expect(jctx.householdId).toBe(owner.ctx.householdId);
    expect(jctx.role).toBe("member");
    expect(await db.query.household.findFirst({ where: eq(schema.household.id, ownOld) })).toBeUndefined();
    expect((await listMembers(owner.ctx)).map((m) => m.userId).sort()).toEqual([owner.userId, joinerId].sort());

    // Same records.
    const { listTasks } = await import("@/core/services/maintenance");
    const jp = await loadPropertyCtx(jctx, owner.property.id);
    expect((await listTasks(jp, "all")).map((t) => t.title)).toContain("Test detectors");

    // Single use.
    await expect(acceptInvite(db, "someone-else", token)).rejects.toThrow(/expired|used/i);
    expect(await previewInvite(db, token)).toBeNull();
  });

  it("requires confirmation before discarding a home the joiner already set up", async () => {
    const owner = await makeUser(db);
    const other = await makeUser(db);
    const { token } = await createInvite(owner.ctx);
    await expect(acceptInvite(db, other.userId, token)).rejects.toThrow(/delete your current home/i);
    // The failed attempt did not use up the invite.
    expect(await previewInvite(db, token)).not.toBeNull();
    await acceptInvite(db, other.userId, token, { discardCurrent: true });
    expect((await ctxFor(other.userId)).householdId).toBe(owner.ctx.householdId);
    expect(await db.query.property.findFirst({ where: eq(schema.property.id, other.property.id) })).toBeUndefined();
  });

  it("limits management to owners and keeps the Vault with owners", async () => {
    const owner = await makeUser(db);
    const member = await makeUser(db);
    const { token } = await createInvite(owner.ctx);
    await acceptInvite(db, member.userId, token, { discardCurrent: true });
    const mctx = await ctxFor(member.userId);
    await expect(createInvite(mctx)).rejects.toThrow(/owner/i);
    await expect(removeMember(mctx, owner.userId)).rejects.toThrow(/owner/i);
    await expect(unlockVault(mctx, "no-session", member.password)).rejects.toThrow(/limited to household owners/i);

    // Promote, then the original owner can leave; last owner cannot.
    await expect(leaveHousehold(owner.ctx)).rejects.toThrow(/another member an owner/i);
    await setMemberRole(owner.ctx, member.userId, "owner");
    await leaveHousehold(owner.ctx);
    expect(await getMembership(db, owner.userId)).toBeNull();

    const revocable = await createInvite(await ctxFor(member.userId));
    await revokeInvite(await ctxFor(member.userId), revocable.invite.id);
    expect(await previewInvite(db, revocable.token)).toBeNull();
  });

  it("promotes a remaining member when the only owner deletes their account", async () => {
    const owner = await makeUser(db);
    const member = await makeUser(db);
    const { token } = await createInvite(owner.ctx);
    await acceptInvite(db, member.userId, token, { discardCurrent: true });
    await deleteAccount(db, owner.userId, owner.password);
    const m = await getMembership(db, member.userId);
    expect(m?.householdId).toBe(owner.ctx.householdId);
    expect(m?.role).toBe("owner");
  });
});

describe("weekly digest", () => {
  it("sends only to people who opted in, only when there is something to say, and not twice in a week", async () => {
    const db = await testDb();
    const busy = await makeUser(db, { name: "Busy Bea" });
    const quiet = await makeUser(db);
    const off = await makeUser(db);
    const today = todayIn(busy.pctx.timezone);
    await createTask(busy.pctx, { title: "Replace HVAC filter", dueOn: addDays(today, -3), priority: "normal" });
    await createTask(busy.pctx, { title: "Test sump pump", dueOn: addDays(today, 2), priority: "normal" });
    await createTask(busy.pctx, { title: "Far away", dueOn: addDays(today, 60), priority: "normal" });
    await createTask(off.pctx, { title: "Due", dueOn: today, priority: "normal" });
    await setWeeklyDigest(busy.ctx, true);
    await setWeeklyDigest(quiet.ctx, true);

    const digest = (await buildDigest(db, busy.userId, "https://hb.test"))!;
    expect(digest.subject).toMatch(/1 overdue, 1 due this week/);
    expect(digest.text).toContain("Replace HVAC filter");
    expect(digest.text).not.toContain("Far away");
    expect(digest.html).toContain("https://hb.test/maintenance/");
    expect(await buildDigest(db, quiet.userId, "https://hb.test")).toBeNull();

    const outbox: string[] = [];
    const send = async (e: { to: string }) => {
      outbox.push(e.to);
      return { sent: true };
    };
    const first = await sendWeeklyDigests(db, "https://hb.test", send);
    expect(first).toMatchObject({ considered: 2, sent: 1, skipped: 1 });
    expect(outbox).toEqual([`${busy.userId}@example.com`]);
    const again = await sendWeeklyDigests(db, "https://hb.test", send);
    expect(again.sent).toBe(0);
    const nextWeek = await sendWeeklyDigests(db, "https://hb.test", send, new Date(Date.now() + 7 * 86_400_000));
    expect(nextWeek.sent).toBe(1);
  });
});

describe("spending", () => {
  it("adds up maintenance costs and expenses for one year, by month", async () => {
    const db = await testDb();
    const u = await makeUser(db);
    const heater = await createAsset(u.pctx, { name: "Water heater", category: "water_heater" } as never);
    const t = await createTask(u.pctx, { title: "Flush heater", dueOn: "2025-03-01", priority: "normal", assetId: heater.id });
    await completeTask(u.pctx, t.id, { completedOn: "2025-03-02", cost: 15000 });
    const p = await createProject(u.pctx, { name: "Deck", status: "in_progress", priority: "normal" } as never);
    await createExpense(u.pctx, { title: "Lumber", amount: 82000, spentOn: "2025-06-10", projectId: p.id } as never);
    await createExpense(u.pctx, { title: "Old year", amount: 999, spentOn: "2024-12-31" } as never);

    const s = await getSpending(u.pctx, 2025);
    expect(s.total).toBe(97000);
    expect(s.maintenance).toBe(15000);
    expect(s.projects).toBe(82000);
    expect(s.byMonth[2]).toBe(15000);
    expect(s.byMonth[5]).toBe(82000);
    expect(s.topAssets[0]).toMatchObject({ name: "Water heater", cents: 15000 });
    expect(s.years).toEqual([2025, 2024]);
  });
});
