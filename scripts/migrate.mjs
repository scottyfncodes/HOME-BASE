#!/usr/bin/env node
/**
 * Applies pending SQL migrations in ./drizzle to DATABASE_URL.
 * Skips (with a notice) when DATABASE_URL is unset, so `pnpm build` works in
 * environments that have not connected a database yet. Development on the
 * embedded PGlite database migrates itself on first use and never needs this.
 */
import { spawnSync } from "node:child_process";

if (!process.env.DATABASE_URL) {
  console.log("[migrate] DATABASE_URL is not set; skipping migrations.");
  process.exit(0);
}
const result = spawnSync("pnpm", ["exec", "drizzle-kit", "migrate"], { stdio: "inherit", env: process.env });
process.exit(result.status ?? 1);
