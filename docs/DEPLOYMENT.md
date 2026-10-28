# Deployment (Vercel + Neon)

## One-time setup

1. **Vercel project** linked to this GitHub repository (framework: Next.js,
   Node 22 or 24). Pushes to `main` deploy production; pull requests get
   preview URLs.
2. **Database**: in the Vercel project, Storage → Create Database → **Neon**
   (Postgres). Connecting it injects `DATABASE_URL` (and friends) into the
   project's environment. Any Postgres works; only `DATABASE_URL` is read.
3. **Environment variables** (Settings → Environment Variables), for
   Production and Preview:

   | Name | Value |
   | --- | --- |
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
   | `VAULT_MASTER_KEY` | `openssl rand -base64 32` (32 bytes, base64). Back it up. |
   | `APP_URL` | The production origin, e.g. `https://home-base-haveanapp.vercel.app` |
   | `MAX_UPLOAD_MB` | optional, default `4` |

   Preview deployments can share the same secrets but should use a separate
   database branch if you want isolation (Neon branches work well).
4. **Redeploy.** The build runs `pnpm db:migrate` against `DATABASE_URL`
   before `next build`, so the schema is created automatically.

   On Vercel only **Production** builds migrate. Preview builds print
   "Skipping migrations on a Preview deployment" and continue, because
   Preview currently shares the production database and a pull request must
   not change its schema. Once Preview has its own database, set
   `ALLOW_PREVIEW_MIGRATIONS=1` for Preview only. Outside Vercel (local
   development, CI) migrations run whenever `DATABASE_URL` is set. The rule
   lives in `scripts/migrate-guard.mjs`.

Until step 2 is done, the deployed app shows a "needs setup" page listing
exactly which variables are missing (`/` and `/api/health`).

## Checks

- `GET /api/health` → `{ ok: true, database: "ok" }` when everything is wired.
- Sign up, complete onboarding, add an item, upload a photo, open the Vault.

## iPhone

Open the production URL in Safari → Share → **Add to Home Screen**. The app
ships a web manifest and Apple touch icon and renders standalone with safe
areas respected. Sessions persist in the Home Screen app.

## Local development

```
pnpm install
cp .env.example .env.local   # optional; everything has a dev default
pnpm dev                     # http://localhost:3000, embedded PGlite DB
```

No credentials are needed: without `DATABASE_URL` the app uses an embedded
PGlite database in `.data/pglite` and a generated dev-only Vault key in
`.data/vault.dev.key`. Delete `.data/` to start fresh.

To develop against real Postgres, set `DATABASE_URL` in `.env.local` and run
`pnpm db:migrate`.
