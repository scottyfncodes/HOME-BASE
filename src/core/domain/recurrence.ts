import type { Recurrence } from "../db/schema";
import { addDays, addMonths, addYears, compareISODate, type ISODate } from "./dates";

export const RECURRENCE_UNITS = ["day", "week", "month", "year"] as const;

export function advance(date: ISODate, rule: Recurrence): ISODate {
  const n = Math.max(1, Math.floor(rule.every));
  switch (rule.unit) {
    case "day":
      return addDays(date, n);
    case "week":
      return addDays(date, n * 7);
    case "month":
      return addMonths(date, n);
    case "year":
      return addYears(date, n);
  }
}

/**
 * Computes the next due date after a completion.
 *
 * - anchor "completed": completion date + interval (e.g. "change the filter
 *   3 months after you last changed it").
 * - anchor "due": previous due date + interval, skipping forward until the
 *   result is after the completion date so an overdue task is not immediately
 *   overdue again (e.g. "every April 1" semantics).
 */
export function nextDueDate(
  previousDue: ISODate,
  completedOn: ISODate,
  rule: Recurrence,
): ISODate {
  if (rule.anchor === "completed") {
    return advance(completedOn, rule);
  }
  let next = advance(previousDue, rule);
  let guard = 0;
  while (compareISODate(next, completedOn) <= 0 && guard < 1000) {
    next = advance(next, rule);
    guard++;
  }
  return next;
}

export function describeRecurrence(rule: Recurrence | null | undefined): string {
  if (!rule) return "One time";
  const n = rule.every;
  const unit = rule.unit;
  if (n === 1) {
    const word = { day: "Daily", week: "Weekly", month: "Monthly", year: "Yearly" }[unit];
    return word;
  }
  return `Every ${n} ${unit}s`;
}

/** Common presets offered in the UI. */
export const RECURRENCE_PRESETS: { label: string; value: string; rule: Recurrence | null }[] = [
  { label: "One time", value: "", rule: null },
  { label: "Weekly", value: "1-week", rule: { every: 1, unit: "week", anchor: "due" } },
  { label: "Monthly", value: "1-month", rule: { every: 1, unit: "month", anchor: "due" } },
  { label: "Every 3 months", value: "3-month", rule: { every: 3, unit: "month", anchor: "due" } },
  { label: "Every 6 months", value: "6-month", rule: { every: 6, unit: "month", anchor: "due" } },
  { label: "Yearly", value: "1-year", rule: { every: 1, unit: "year", anchor: "due" } },
  { label: "Every 2 years", value: "2-year", rule: { every: 2, unit: "year", anchor: "due" } },
];

export function parseRecurrenceValue(value: string | null | undefined, anchor: "due" | "completed" = "due"): Recurrence | null {
  if (!value) return null;
  const m = /^(\d{1,3})-(day|week|month|year)$/.exec(value);
  if (!m) return null;
  const every = Number(m[1]);
  if (every < 1) return null;
  return { every, unit: m[2] as Recurrence["unit"], anchor };
}

export function recurrenceToValue(rule: Recurrence | null | undefined): string {
  if (!rule) return "";
  return `${rule.every}-${rule.unit}`;
}
