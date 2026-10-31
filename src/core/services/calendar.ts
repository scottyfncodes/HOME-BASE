import { and, eq, lte } from "drizzle-orm";
import type { Db } from "../db/client";
import { asset, calendarFeed, document, maintenanceTask } from "../db/schema";
import { addDays, maxISODate, todayIn } from "../domain/dates";
import { buildCalendar, type CalendarEvent } from "../domain/ical";
import type { Ctx, PropertyCtx } from "./context";
import { householdFollowUps, householdVaccinesDue } from "./pet-health";
import { getMembership, getPrimaryProperty } from "./household";
import { hashToken, newToken } from "./tokens";

/** Reminder time on the day an item is due (9:00 in the subscriber's calendar). */
const ALARM_MINUTES = 9 * 60;

export async function hasCalendarFeed(ctx: Ctx) {
  const row = await ctx.db.query.calendarFeed.findFirst({ where: eq(calendarFeed.userId, ctx.userId), columns: { userId: true, createdAt: true, lastFetchedAt: true } });
  return row ?? null;
}

/** Creates (or replaces) the user's feed and returns the new secret. Any older link stops working. */
export async function resetCalendarFeed(ctx: Ctx) {
  const { token, hash } = newToken();
  await ctx.db
    .insert(calendarFeed)
    .values({ userId: ctx.userId, tokenHash: hash })
    .onConflictDoUpdate({ target: calendarFeed.userId, set: { tokenHash: hash, createdAt: new Date(), lastFetchedAt: null } });
  return token;
}

export async function deleteCalendarFeed(ctx: Ctx) {
  await ctx.db.delete(calendarFeed).where(eq(calendarFeed.userId, ctx.userId));
}

/**
 * Renders the feed behind a secret token, or null when the token is unknown.
 * Contents: scheduled maintenance and pet care routines (overdue items sit on
 * today so they stay visible), warranty end dates, document expirations, pet
 * vaccinations coming due and vet follow-ups. Never the Vault, never
 * archived pets.
 */
export async function renderCalendarFeed(db: Db, token: string, appUrl: string, now: Date = new Date()): Promise<string | null> {
  const feed = await db.query.calendarFeed.findFirst({ where: eq(calendarFeed.tokenHash, hashToken(token)) });
  if (!feed) return null;
  const membership = await getMembership(db, feed.userId);
  if (!membership) return null;
  const ctx: Ctx = { db, userId: feed.userId, householdId: membership.householdId, role: membership.role };
  const prop = await getPrimaryProperty(ctx);
  await db.update(calendarFeed).set({ lastFetchedAt: now }).where(eq(calendarFeed.userId, feed.userId));
  if (!prop) return buildCalendar({ name: "Home Base", events: [], now });

  const today = todayIn(prop.timezone, now);
  const horizon = addDays(today, 400);
  const pctx: PropertyCtx = { ...ctx, propertyId: prop.id, timezone: prop.timezone, vaultUnlocked: false };
  const [tasks, warranties, docs, vaccines, followUps] = await Promise.all([
    db.query.maintenanceTask.findMany({
      where: and(eq(maintenanceTask.propertyId, prop.id), eq(maintenanceTask.status, "scheduled"), lte(maintenanceTask.dueOn, horizon)),
      with: { asset: { columns: { name: true } }, location: { columns: { name: true } }, pet: { columns: { id: true, name: true, archivedAt: true } } },
      limit: 500,
    }),
    db.query.asset.findMany({
      where: and(eq(asset.propertyId, prop.id), eq(asset.status, "active"), lte(asset.warrantyExpiresOn, horizon)),
      columns: { id: true, name: true, warrantyExpiresOn: true },
      limit: 200,
    }),
    db.query.document.findMany({
      where: and(eq(document.propertyId, prop.id), eq(document.isVault, false), lte(document.expiresOn, horizon)),
      columns: { id: true, title: true, expiresOn: true },
      limit: 200,
    }),
    householdVaccinesDue(pctx, 400),
    householdFollowUps(pctx, 400),
  ]);

  const events: CalendarEvent[] = [];
  for (const t of tasks) {
    if (t.pet?.archivedAt) continue;
    const overdue = t.dueOn < today;
    const where = t.asset?.name ?? t.location?.name;
    const title = t.pet ? `${t.pet.name}: ${t.title}` : t.title;
    events.push({
      uid: `task-${t.id}@homebase`,
      date: maxISODate(t.dueOn, today),
      // A missed daily routine is not "overdue maintenance"; it is simply due.
      summary: overdue && !t.pet ? `Overdue: ${title}` : title,
      description: [where, overdue ? `Was due ${t.dueOn}.` : null, "Mark it done in Home Base."].filter(Boolean).join("\n"),
      url: t.pet ? `${appUrl}/pets/${t.pet.id}/care` : `${appUrl}/maintenance/${t.id}`,
      alarmMinutes: ALARM_MINUTES,
    });
  }
  for (const v of vaccines) {
    const overdue = v.nextDueOn < today;
    events.push({
      uid: `vaccination-${v.id}@homebase`,
      date: maxISODate(v.nextDueOn, today),
      summary: overdue ? `Overdue: ${v.petName}'s ${v.name}` : `${v.petName}'s ${v.name} due`,
      description: [overdue ? `Was due ${v.nextDueOn}.` : null, `Last given ${v.administeredOn}.`].filter(Boolean).join("\n"),
      url: `${appUrl}/pets/${v.petId}/health`,
      alarmMinutes: ALARM_MINUTES,
    });
  }
  for (const f of followUps) {
    if (f.followUpOn < today) continue;
    events.push({ uid: `pet-follow-up-${f.id}@homebase`, date: f.followUpOn, summary: `${f.petName}: follow up on ${f.title}`, url: `${appUrl}/pets/${f.petId}/health`, alarmMinutes: ALARM_MINUTES });
  }
  for (const a of warranties) {
    if (!a.warrantyExpiresOn || a.warrantyExpiresOn < today) continue;
    events.push({ uid: `warranty-${a.id}@homebase`, date: a.warrantyExpiresOn, summary: `${a.name} warranty ends`, url: `${appUrl}/inventory/${a.id}` });
  }
  for (const d of docs) {
    if (!d.expiresOn || d.expiresOn < today) continue;
    events.push({ uid: `document-${d.id}@homebase`, date: d.expiresOn, summary: `${d.title} expires`, url: `${appUrl}/documents/${d.id}` });
  }
  return buildCalendar({ name: prop.name, events, now });
}

