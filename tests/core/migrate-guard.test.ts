import { describe, expect, it } from "vitest";
import { migrationDecision } from "../../scripts/migrate-guard.mjs";

const DB = "postgres://user:pass@db.example.test/app";

describe("migration guard", () => {
  it("skips when DATABASE_URL is not set, everywhere", () => {
    expect(migrationDecision({}).migrate).toBe(false);
    expect(migrationDecision({ VERCEL: "1", VERCEL_ENV: "production" }).migrate).toBe(false);
    expect(migrationDecision({ VERCEL: "1", VERCEL_ENV: "preview", ALLOW_PREVIEW_MIGRATIONS: "1" }).migrate).toBe(
      false,
    );
  });

  it("migrates outside Vercel (local development, CI with a local database)", () => {
    expect(migrationDecision({ DATABASE_URL: DB }).migrate).toBe(true);
    expect(migrationDecision({ DATABASE_URL: DB, CI: "true" }).migrate).toBe(true);
  });

  it("migrates on a Vercel Production build", () => {
    expect(migrationDecision({ DATABASE_URL: DB, VERCEL: "1", VERCEL_ENV: "production" }).migrate).toBe(true);
  });

  it("skips on a Vercel Preview build with a clear reason", () => {
    const decision = migrationDecision({ DATABASE_URL: DB, VERCEL: "1", VERCEL_ENV: "preview" });
    expect(decision.migrate).toBe(false);
    expect(decision.reason).toMatch(/^Skipping migrations on a Preview deployment/);
    expect(decision.reason).toContain("Preview shares the production database");
  });

  it("skips on other non-production Vercel builds, including a missing VERCEL_ENV", () => {
    expect(migrationDecision({ DATABASE_URL: DB, VERCEL: "1", VERCEL_ENV: "development" }).migrate).toBe(false);
    expect(migrationDecision({ DATABASE_URL: DB, VERCEL: "1" }).migrate).toBe(false);
  });

  it("migrates a Preview build only with the explicit ALLOW_PREVIEW_MIGRATIONS=1 opt-in", () => {
    const base = { DATABASE_URL: DB, VERCEL: "1", VERCEL_ENV: "preview" };
    expect(migrationDecision({ ...base, ALLOW_PREVIEW_MIGRATIONS: "1" }).migrate).toBe(true);
    expect(migrationDecision({ ...base, ALLOW_PREVIEW_MIGRATIONS: "true" }).migrate).toBe(false);
    expect(migrationDecision({ ...base, ALLOW_PREVIEW_MIGRATIONS: "" }).migrate).toBe(false);
  });

  it("never prints the connection string", () => {
    for (const env of [
      { DATABASE_URL: DB },
      { DATABASE_URL: DB, VERCEL: "1", VERCEL_ENV: "production" },
      { DATABASE_URL: DB, VERCEL: "1", VERCEL_ENV: "preview" },
    ]) {
      expect(migrationDecision(env).reason).not.toContain("pass");
    }
  });
});
