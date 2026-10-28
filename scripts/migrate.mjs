#!/usr/bin/env node
/**
 * Applies pending SQL migrations in ./drizzle to DATABASE_URL.
 * Skips (with a notice) when DATABASE_URL is unset, so `pnpm build` works in
 * environments that have not connected a database yet. Development on the
 * embedded PGlite database migrates itself on first use and never needs this.
 * On Vercel only Production builds migrate unless ALLOW_PREVIEW_MIGRATIONS=1
 * (see scripts/migrate-guard.mjs).
 */
import { spawnSync } from "node:child_process";
import { migrationDecision } from "./migrate-guard.mjs";

const decision = migrationDecision(process.env);
console.log(`[migrate] ${decision.reason}`);
if (!decision.migrate) {
  process.exit(0);
}
const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
