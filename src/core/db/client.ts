import "server-only";
import path from "node:path";
import fs from "node:fs";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";
import { env } from "../env";

export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

type Holder = { promise?: Promise<Db> };
const g = globalThis as unknown as { __homeBaseDb?: Holder };
const holder: Holder = (g.__homeBaseDb ??= {});

export const MIGRATIONS_FOLDER = path.join(process.cwd(), "drizzle");

/**
 * Returns the application database.
 *
 * - With DATABASE_URL: a node-postgres pool. Migrations are applied by
 *   `pnpm db:migrate` (run automatically before `next build`), never lazily.
 * - Without DATABASE_URL (development only): an embedded PGlite database in
 *   `.data/pglite`, migrated on first use so `pnpm dev` works with zero setup.
 */
export function getDb(): Promise<Db> {
  if (!holder.promise) {
    holder.promise = create().catch((err) => {
      holder.promise = undefined;
      throw err;
    });
  }
  return holder.promise;
}

async function create(): Promise<Db> {
  if (env.databaseUrl) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: env.databaseUrl,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
    });
    return drizzle(pool, { schema, casing: "snake_case" }) as unknown as Db;
  }
  if (env.isProd) {
    throw new Error("DATABASE_URL is required in production.");
  }
  const dir = path.resolve(process.cwd(), env.dataDir, "pglite");
  fs.mkdirSync(dir, { recursive: true });
  return createPgliteDb(dir);
}

/**
 * Creates a PGlite-backed database and applies all migrations. With no
 * `dataDir` the database lives in memory (used by the test suite).
 */
export async function createPgliteDb(dataDir?: string): Promise<Db> {
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = dataDir ? new PGlite(dataDir) : new PGlite();
  await client.waitReady;
  const db = drizzle(client, { schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db as unknown as Db;
}
