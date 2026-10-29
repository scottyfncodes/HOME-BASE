# Architecture

Home Base is a Next.js 16 (App Router) application written in TypeScript. It
is organised as a small, reusable **ownership foundation** plus the
**Home Base product** built on top of it.

```
src/
  core/                 Reusable ownership & asset-management foundation
    db/                 Drizzle schema + database client (Postgres / PGlite)
    auth/               Better Auth configuration, session helpers, client
    domain/             Pure logic: calendar dates, recurrence, money, zod schemas
    storage/            File storage providers + Vault envelope encryption
    services/           Authorised data access, one module per concept
    env.ts              Validated environment + production prerequisites
    errors.ts           AppError hierarchy (not_found, forbidden, validation…)
  features/learn/       Curated homeowner guidance (content, not infra)
  components/           UI primitives, layout shell, forms, documents
  app/                  Routes (Home Base specific). Server actions live next
                        to the pages that use them in `actions.ts` files.
  lib/                  Small helpers for the app layer (action runner, cn)
drizzle/                Generated SQL migrations (source of truth for the DB)
tests/core/             Vitest suite running against in-memory PGlite
```

## The foundation vs. the product

Everything under `src/core` is product-agnostic. A future "vehicles" product
would reuse:

- `household` / `household_member` (account ownership),
- `asset`, `location`, `service_provider`, `file_object`,
- `maintenance_task` / `maintenance_log` (schedules + immutable history),
- `document`, `expense`, `project`,
- the storage providers and the Vault crypto,
- the services, which take an explicit **context** instead of reading globals.

Home Base specifics are the `property` table (home profile), `preparedness_item`,
the Learn content, and every route under `src/app`.

## Request flow

1. A page or server action calls `requirePropertyCtx()` (`src/core/auth/session.ts`).
   It validates the Better Auth session, resolves the user's household
   membership, loads their primary property, and checks the Vault unlock
   window for this session.
2. The resulting `PropertyCtx` (`db`, `userId`, `householdId`, `propertyId`,
   `timezone`, `vaultUnlocked`) is passed to a **service**.
3. Services (`src/core/services/*`) apply authorisation in every query by
   scoping on `propertyId` / `householdId` and by validating every foreign
   reference (`assertAsset`, `assertLocation`, `assertProvider`,
   `assertProject`) against the same property. They throw `AppError`s.
4. Server actions convert `AppError`s into form state (`src/lib/actions.ts`);
   pages convert `not_found` into a 404 (`src/lib/not-found.ts`).

There is no path from the UI to the database that bypasses a service, and
no service that trusts an id from the client without checking ownership.

## Data model highlights

- **Ids** are text UUIDs. **Timestamps** are `timestamptz`. **Calendar dates**
  (`due_on`, `purchase_date`…) are `date` columns handled as `YYYY-MM-DD`
  strings; all date arithmetic is in `src/core/domain/dates.ts` and never
  goes through a JavaScript `Date` in local time.
- **One canonical asset.** Documents, tasks, history, expenses and projects
  reference `asset.id`. Deleting an asset clears those references
  (`on delete set null`) rather than cascading, so history survives.
- **Recurrence** is a JSON rule on the task (`every`, `unit`, `anchor`).
  Completing writes a `maintenance_log` row and advances the single task
  row; nothing is duplicated.
- **Files** are rows in `file_object` plus bytes in `file_blob` (the
  `database` storage provider). Vault files are encrypted before storage.

## Rendering model

Cache Components is disabled; every app page is dynamic and reads the
session. Mutations use Server Actions with `useActionState`; destructive
actions go through `ConfirmForm`, which adds a confirmation step.

## Extension points

- `StorageProvider` (`src/core/storage/provider.ts`): add a private object
  storage backend (S3 / private Blob) without touching services.
- `TASK_SUGGESTIONS` / `GUIDES` (`src/features/learn/guides.ts`): curated content.
- Household members: owners invite by single-use link (`household_invite`,
  token stored hashed). Members can do everything except open the Vault and
  manage the household. A user belongs to one household at a time.
- AI-assisted troubleshooting: Learn is static content; an assistant would
  plug in behind the same guide/asset relationships.
