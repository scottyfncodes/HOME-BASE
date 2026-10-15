/**
 * Calendar-date utilities.
 *
 * Home Base stores calendar dates (due dates, purchase dates...) as ISO
 * `YYYY-MM-DD` strings and does arithmetic on the calendar fields directly.
 * JavaScript `Date` is only used at the edges (today in a time zone, display).
 * This keeps a task due "March 1" from becoming "February 28" because of a
 * UTC conversion.
 */

export type ISODate = string; // YYYY-MM-DD

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string") return false;
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysInMonth(y, mo);
}

export function daysInMonth(year: number, month: number): number {
  // month is 1-12. Day 0 of the next month is the last day of this month.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function parseISODate(value: ISODate): { y: number; m: number; d: number } {
  const m = ISO_RE.exec(value);
  if (!m) throw new Error(`Invalid ISO date: ${value}`);
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

export function formatISODate(y: number, m: number, d: number): ISODate {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** Today's calendar date in an IANA time zone. */
export function todayIn(timeZone: string, now: Date = new Date()): ISODate {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: safeTimeZone(timeZone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA yields YYYY-MM-DD
  return fmt.format(now);
}

export function safeTimeZone(timeZone: string | null | undefined): string {
  if (!timeZone) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return "UTC";
  }
}

export function addDays(date: ISODate, days: number): ISODate {
  const { y, m, d } = parseISODate(date);
  const t = Date.UTC(y, m - 1, d + days);
  const dt = new Date(t);
  return formatISODate(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

/** Adds months, clamping the day to the end of the target month (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(date: ISODate, months: number): ISODate {
  const { y, m, d } = parseISODate(date);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const nd = Math.min(d, daysInMonth(ny, nm));
  return formatISODate(ny, nm, nd);
}

export function addYears(date: ISODate, years: number): ISODate {
  return addMonths(date, years * 12);
}

/** Whole days from a to b (positive when b is later). */
export function diffDays(a: ISODate, b: ISODate): number {
  const pa = parseISODate(a);
  const pb = parseISODate(b);
  const ta = Date.UTC(pa.y, pa.m - 1, pa.d);
  const tb = Date.UTC(pb.y, pb.m - 1, pb.d);
  return Math.round((tb - ta) / 86_400_000);
}

export function compareISODate(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxISODate(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

/** Human display, e.g. "Mar 4, 2026" (no time zone shifting). */
export function formatDate(
  date: ISODate | null | undefined,
  opts: { month?: "short" | "long"; year?: boolean } = {},
): string {
  if (!date || !isISODate(date)) return "";
  const { y, m, d } = parseISODate(date);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC",
    month: opts.month ?? "short",
    day: "numeric",
    year: opts.year === false ? undefined : "numeric",
  }).format(dt);
}

/** "Today", "Tomorrow", "in 3 days", "4 days overdue"... relative to `today`. */
export function describeDue(date: ISODate, today: ISODate): string {
  const diff = diffDays(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${-diff} days overdue`;
  if (diff < 14) return `In ${diff} days`;
  if (diff < 60) return `In ${Math.round(diff / 7)} weeks`;
  return formatDate(date, { year: parseISODate(date).y !== parseISODate(today).y });
}
