import { and, eq, gte, isNull, lt, lte, or } from "drizzle-orm";
import type { Db } from "../db/client";
import { asset, document, maintenanceTask, user, userPreference } from "../db/schema";
import { addDays, describeDue, formatDate, todayIn } from "../domain/dates";
import { digestEmail, type DigestLine } from "../email/templates";
import type { Email } from "../email/send";
import type { Ctx } from "./context";
import { getMembership, getPrimaryProperty } from "./household";

export async function getPreferences(ctx: Ctx) {
  const row = await ctx.db.query.userPreference.findFirst({ where: eq(userPreference.userId, ctx.userId) });
  return { weeklyDigest: row?.weeklyDigest ?? false, lastDigestSentAt: row?.lastDigestSentAt ?? null };
}

export async function setWeeklyDigest(ctx: Ctx, on: boolean) {
  await ctx.db
    .insert(userPreference)
    .values({ userId: ctx.userId, weeklyDigest: on })
    .onConflictDoUpdate({ target: userPreference.userId, set: { weeklyDigest: on } });
}

/** The digest for one user, or null when nothing needs attention. */
export async function buildDigest(db: Db, userId: string, appUrl: string, now: Date = new Date()): Promise<Omit<Email, "to"> | null> {
  const u = await db.query.user.findFirst({ where: eq(user.id, userId), columns: { name: true } });
  const membership = await getMembership(db, userId);
  if (!u || !membership) return null;
  const prop = await getPrimaryProperty({ db, userId, householdId: membership.householdId, role: membership.role });
  if (!prop) return null;
  const today = todayIn(prop.timezone, now);
  const week = addDays(today, 7);
  const month = addDays(today, 30);

  const [tasks, warranties, docs] = await Promise.all([
    db.query.maintenanceTask.findMany({
      where: and(eq(maintenanceTask.propertyId, prop.id), eq(maintenanceTask.status, "scheduled"), lte(maintenanceTask.dueOn, week)),
      orderBy: (t, { asc }) => [asc(t.dueOn)],
      limit: 40,
    }),
    db.query.asset.findMany({
      where: and(eq(asset.propertyId, prop.id), eq(asset.status, "active"), gte(asset.warrantyExpiresOn, today), lte(asset.warrantyExpiresOn, month)),
      columns: { id: true, name: true, warrantyExpiresOn: true },
    }),
    db.query.document.findMany({
      where: and(eq(document.propertyId, prop.id), eq(document.isVault, false), gte(document.expiresOn, today), lte(document.expiresOn, month)),
      columns: { id: true, title: true, expiresOn: true },
    }),
  ]);

  const line = (t: (typeof tasks)[number]): DigestLine => ({ title: t.title, when: describeDue(t.dueOn, today), href: `${appUrl}/maintenance/${t.id}` });
  const overdue = tasks.filter((t) => t.dueOn < today).map(line);
  const upcoming = tasks.filter((t) => t.dueOn >= today).map(line);
  const expiring: DigestLine[] = [
    ...warranties.map((a) => ({ title: `${a.name} warranty`, when: `ends ${formatDate(a.warrantyExpiresOn)}`, href: `${appUrl}/inventory/${a.id}` })),
    ...docs.map((d) => ({ title: d.title, when: `expires ${formatDate(d.expiresOn)}`, href: `${appUrl}/documents/${d.id}` })),
  ];
  if (!overdue.length && !upcoming.length && !expiring.length) return null;
  return digestEmail({ name: u.name, propertyName: prop.name, overdue, upcoming, expiring, appUrl });
}

/**
 * Sends the weekly email to everyone who turned it on and has not had one in
 * the last six days (so a retried or doubled cron run never double-sends).
 */
export async function sendWeeklyDigests(db: Db, appUrl: string, send: (email: Email) => Promise<{ sent: boolean }>, now: Date = new Date()) {
  const cutoff = new Date(now.getTime() - 6 * 86_400_000);
  const due = await db
    .select({ userId: userPreference.userId, email: user.email })
    .from(userPreference)
    .innerJoin(user, eq(user.id, userPreference.userId))
    .where(and(eq(userPreference.weeklyDigest, true), or(isNull(userPreference.lastDigestSentAt), lt(userPreference.lastDigestSentAt, cutoff))))
    .limit(500);
  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const r of due) {
    const digest = await buildDigest(db, r.userId, appUrl, now);
    if (!digest) {
      skipped++;
      continue;
    }
    const result = await send({ to: r.email, ...digest });
    if (result.sent) {
      sent++;
      await db.update(userPreference).set({ lastDigestSentAt: now }).where(eq(userPreference.userId, r.userId));
    } else failed++;
  }
  return { considered: due.length, sent, skipped, failed };
}
