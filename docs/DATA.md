# Data: schema, migrations, export, deletion

## Schema

Defined in `src/core/db/schema.ts` (Drizzle). Tables:

| Area | Tables |
| --- | --- |
| Auth (Better Auth) | `user`, `session`, `account`, `verification` |
| Ownership | `household`, `household_member`, `property`, `location`, `asset`, `service_provider`, `file_object`, `file_blob` |
| Operations | `maintenance_task`, `maintenance_log`, `project`, `project_task`, `project_asset`, `project_provider`, `expense`, `document` |
| Home Base | `preparedness_item` |
| Vault | `vault_unlock`, `vault_attempt`, `vault_audit` |

Deletion policy: deleting a household cascades everything. Deleting an
asset, location, project, provider or task **clears references** on
history, documents and expenses instead of deleting them.

## Migrations

- SQL migrations live in `drizzle/` and are generated from the schema:
  `pnpm db:generate` (commit the result).
- Apply to `DATABASE_URL`: `pnpm db:migrate` (runs `drizzle-kit migrate`).
  `pnpm build` runs this first and skips when `DATABASE_URL` is unset, so a
  Vercel deployment with a connected database migrates itself on build.
- The development database (PGlite in `.data/pglite`) and the test database
  (PGlite in memory) apply the same migration folder on start-up.

## Export

`GET /api/export` (signed in) returns a JSON document with every record in
the household: properties, locations, assets, maintenance tasks and history,
projects with checklists and linked items, expenses, providers, preparedness
records, documents and file metadata. File bytes are not embedded; each file
lists a `download` path that works while signed in. Vault documents and
files are included only when the Vault is unlocked on the exporting session.
Settings → "Export my data" links to it.

## Account deletion

Settings → Delete account. Requires the current password and typing
`DELETE`. If the user is the household's only member, the household and all
of its data (including file bytes) are deleted in one transaction. Otherwise
only the membership and the user are removed. The session is signed out and
the user lands on the public page.

## Pets in the export

The export includes `pets`, `petCareTeam`, `petHealthEvents`,
`petVaccinations` and `petMedications`. Pet care routines and their history
appear under `maintenanceTasks` / `maintenanceHistory` (rows with a `petId`),
pet spending under `expenses`, and pet documents under `documents`.
