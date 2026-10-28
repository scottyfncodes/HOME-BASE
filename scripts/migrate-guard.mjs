/**
 * Decides whether `scripts/migrate.mjs` may apply migrations in this
 * environment. Pure (reads only the env object it is given) so it can be
 * unit-tested.
 *
 * Preview deployments on Vercel currently share the production database, and
 * `pnpm build` runs migrations before `next build`. Without this guard every
 * pull request preview build would apply that branch's migrations to the
 * production database. Migrations therefore run only:
 *   - on a Vercel Production build (VERCEL_ENV=production),
 *   - outside Vercel (local development, CI against a local database), or
 *   - on any other Vercel build when ALLOW_PREVIEW_MIGRATIONS=1 is set, which
 *     is meant for after Preview has its own database.
 *
 * @param {Record<string, string | undefined>} env
 * @returns {{ migrate: boolean, reason: string }}
 */
export function migrationDecision(env) {
  if (!env.DATABASE_URL) {
    return { migrate: false, reason: "DATABASE_URL is not set; skipping migrations." };
  }
  if (!env.VERCEL) {
    return { migrate: true, reason: "Not on Vercel; applying migrations to DATABASE_URL." };
  }
  if (env.VERCEL_ENV === "production") {
    return { migrate: true, reason: "Vercel Production build; applying migrations." };
  }
  const target = env.VERCEL_ENV || "unknown";
  if (env.ALLOW_PREVIEW_MIGRATIONS === "1") {
    return {
      migrate: true,
      reason: `Vercel ${target} build with ALLOW_PREVIEW_MIGRATIONS=1; applying migrations.`,
    };
  }
  return {
    migrate: false,
    reason:
      `Skipping migrations on a Preview deployment (VERCEL_ENV=${target}): Preview shares the production ` +
      "database, so only Production builds migrate it. Set ALLOW_PREVIEW_MIGRATIONS=1 for Preview once it " +
      "has its own database.",
  };
}
