# Home Base

**The operating system for your home**, by HaveAnApp. One organized, private
place for the information, responsibilities, records and decisions that come
with owning a home.

Home Base is a mobile-first web application (designed for iPhone Safari and
Home Screen use) with a real backend: authentication, a relational database,
private file storage, and server-side authorization on every operation.

## What it does

| Area | What you get |
| --- | --- |
| **Home** | Dashboard: overdue and upcoming maintenance, active projects, expiring warranties and documents, quick reach to shutoffs. |
| **My Home** | Property profile (type, year built, size, purchase info), rooms and areas, major systems. |
| **Maintenance** | Tasks with due dates and recurrence; completing one records immutable history and schedules the next occurrence; ad-hoc work logs; cost and provider per completion. |
| **Inventory** | One canonical record per appliance or system: manufacturer, model, serial, install/purchase dates, price, replacement value, warranty; search, filter, sort; retire/replace without losing history. |
| **Projects** | Status, priority, dates, budget vs. actual expenses, checklist with milestones, linked items, documents. |
| **Documents** | Manuals, receipts, estimates, warranties, inspections, insurance, HOA, permits, photos. Private uploads attached to items and projects. Searchable. |
| **Pets** | A profile for every animal (dogs and cats first, any species supported): photo, identification, microchip, insurance, care team. Health timeline, vaccination tracker with due reminders, medications as prescribed, daily care routines with one-tap completion, pet spending, pet documents, and every pet named in the emergency plan. See [docs/PETS.md](docs/PETS.md). |
| **Preparedness** | Water/gas/electrical shutoffs, panel notes, detectors, emergency contacts (tap to call), insurance, equipment, instructions. Conservative safety guidance. |
| **Learn** | Curated, cautious homeowner guides linked from items and tasks; one-tap scheduling of common tasks. |
| **Vault** | A separate security boundary for deeds, passports, wills, tax records: password re-authentication, 10-minute unlock window per session, per-file envelope encryption at rest, audit log. |
| **Search** | Global search across rooms, items, tasks, projects, documents, contacts, preparedness and pets (never the Vault). |
| **Reminders** | Private calendar subscription (Apple, Google, Outlook) for due maintenance, warranty end dates and document expirations; optional Monday email. |
| **Spending** | What upkeep and projects cost, by year and month, from recorded maintenance costs and expenses. |
| **Account** | Household sharing by invite link (owners and members; the Vault stays with owners), password reset by email, service providers, JSON export of all data, password-confirmed account deletion. |

There is no sample data, no payments, and no AI dependency.

The pages you need in an emergency (Home, Preparedness, Service providers)
stay readable offline on a device that opened them recently; signing out
clears them.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack), **React 19**, TypeScript
- **Postgres** via **Drizzle ORM** (Neon in production, embedded **PGlite** for zero-config development and tests)
- **Better Auth** (email + password, sessions, rate limiting)
- **Tailwind CSS v4** with a small handcrafted component set; Manrope + Fraunces
- **Vitest** for the core suite (runs against in-memory PGlite), **Playwright** for browser walkthroughs
- Deployed on **Vercel**

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for how the reusable ownership
foundation (`src/core`) is separated from the Home Base product (`src/app`).

## Quick start

```bash
pnpm install
pnpm dev           # http://localhost:3000
```

That is all. Without `DATABASE_URL` the app runs on an embedded PGlite
database in `.data/pglite` (migrations apply automatically) and generates a
dev-only Vault key in `.data/vault.dev.key`. Delete `.data/` to reset.

Optional: copy `.env.example` to `.env.local` to point at a real Postgres or
set your own secrets.

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` | Apply migrations (if `DATABASE_URL` is set) and build for production |
| `pnpm start` | Serve the production build |
| `pnpm test` | Vitest core suite (domain logic, authorization, recurrence, vault, export/deletion) |
| `pnpm typecheck` / `pnpm lint` | TypeScript / ESLint |
| `pnpm check` | typecheck + lint + test |
| `pnpm db:generate` | Generate a SQL migration from schema changes |
| `pnpm db:migrate` | Apply migrations to `DATABASE_URL` |

## Environment variables

All documented in [`.env.example`](.env.example).

| Variable | Required in production | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `BETTER_AUTH_SECRET` | yes | Signs session cookies |
| `APP_URL` | recommended | Public origin for auth callbacks / trusted origins (Vercel URLs are trusted automatically) |
| `VAULT_MASTER_KEY` | for the Vault | 32-byte base64 key wrapping per-file keys |
| `MAX_UPLOAD_MB` | no | Upload size cap (default 4, Vercel request limit) |
| `RESEND_API_KEY` / `EMAIL_FROM` | for email | Password reset, invite and weekly reminder emails via Resend |
| `CRON_SECRET` | for the weekly email | Authorizes the Monday reminder job (`vercel.json` cron) |

Never commit real values. In production the app refuses to start the UI
without the required variables and shows a setup page that names them.

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Short version: link the repo to
a Vercel project, add a Neon Postgres database from the Vercel Storage tab,
set the three secrets, redeploy. The build migrates the database.

## Security and the Vault

Read [docs/SECURITY.md](docs/SECURITY.md) before relying on the Vault. In
one paragraph: every operation is authorized on the server against the
user's household; files are private and served only through an
authenticated route with no-store headers; Vault files are encrypted at
rest with envelope encryption and need the password again to open; this is
**not** end-to-end encryption, and row-level security, email verification,
password reset, passkeys and key rotation are documented as outstanding
work.

## Data export and deletion

See [docs/DATA.md](docs/DATA.md). Export is a JSON download from Settings;
deletion requires the password and removes the whole household when you are
its only member.

## Testing

```bash
pnpm test        # 90 core tests, ~30s, no services needed
```

Two Playwright walkthroughs live in `tests/e2e` (`pnpm e2e`): the core
homeowner flow and the Pets flow.
Desktop and iPhone-sized viewports were exercised with headless Chromium.
Nothing here is a substitute for testing on a physical iPhone.

## Roadmap (not in this release)

Household invitations, email verification and password reset, passkeys as a
Vault convenience, Postgres row-level security, object-storage provider for
large files, Vault key rotation, push reminders, and an AI assistant on top
of the Learn content.
