import { describe, expect, it } from "vitest";
import { addDays, addMonths, describeDue, diffDays, formatDate, isISODate, todayIn } from "@/core/domain/dates";
import { nextDueDate, parseRecurrenceValue } from "@/core/domain/recurrence";
import { formatCents, parseMoneyToCents } from "@/core/domain/money";

describe("calendar dates", () => {
  it("validates ISO dates including leap days", () => {
    expect(isISODate("2024-02-29")).toBe(true);
    expect(isISODate("2023-02-29")).toBe(false);
    expect(isISODate("2024-13-01")).toBe(false);
    expect(isISODate("03/04/2024")).toBe(false);
  });

  it("adds days across month and year boundaries without time zone drift", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-01-01", "2026-01-31")).toBe(30);
  });

  it("clamps month arithmetic to the end of the month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(addMonths("2026-05-31", 12)).toBe("2027-05-31");
  });

  it("computes today in a time zone (late evening in Denver is still the same date)", () => {
    // 2026-03-02T05:30:00Z is 2026-03-01 22:30 in Denver (UTC-7).
    const at = new Date("2026-03-02T05:30:00Z");
    expect(todayIn("America/Denver", at)).toBe("2026-03-01");
    expect(todayIn("UTC", at)).toBe("2026-03-02");
    expect(todayIn("Not/AZone", at)).toBe("2026-03-02");
  });

  it("formats without shifting the day", () => {
    expect(formatDate("2026-03-01")).toBe("Mar 1, 2026");
    expect(describeDue("2026-03-01", "2026-03-01")).toBe("Today");
    expect(describeDue("2026-02-26", "2026-03-01")).toBe("3 days overdue");
    expect(describeDue("2026-03-05", "2026-03-01")).toBe("In 4 days");
  });
});

describe("recurrence", () => {
  it("advances from the due date, skipping past occurrences when completed late", () => {
    const rule = parseRecurrenceValue("3-month")!;
    expect(nextDueDate("2026-01-15", "2026-01-20", rule)).toBe("2026-04-15");
    // Completed 8 months late: skips Apr, Jul, lands on Oct.
    expect(nextDueDate("2026-01-15", "2026-09-20", rule)).toBe("2026-10-15");
  });

  it("advances from the completion date when anchored on completion", () => {
    const rule = parseRecurrenceValue("1-month", "completed")!;
    expect(nextDueDate("2026-01-15", "2026-02-03", rule)).toBe("2026-03-03");
  });

  it("rejects malformed recurrence strings", () => {
    expect(parseRecurrenceValue("0-month")).toBeNull();
    expect(parseRecurrenceValue("monthly")).toBeNull();
    expect(parseRecurrenceValue("")).toBeNull();
  });
});

describe("money", () => {
  it("parses human amounts into cents", () => {
    expect(parseMoneyToCents("1,250.5")).toBe(125050);
    expect(parseMoneyToCents("$12")).toBe(1200);
    expect(parseMoneyToCents("")).toBeNull();
    expect(parseMoneyToCents("abc")).toBeNaN();
    expect(parseMoneyToCents("0.1")).toBe(10);
  });
  it("formats cents", () => {
    expect(formatCents(125050)).toBe("$1,250.50");
    expect(formatCents(120000, { compact: true })).toBe("$1,200");
  });
});
