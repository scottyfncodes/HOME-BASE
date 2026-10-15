import { eq } from "drizzle-orm";
import type { Db } from "../db/client";
import { fileBlob } from "../db/schema";

/**
 * Where file bytes live. v1 ships one implementation that stores bytes in
 * Postgres, which is private by construction (nothing is reachable without
 * going through the app's authorization). An object-storage implementation
 * (private bucket + short-lived server-side reads) can be added here without
 * touching the services.
 */
export interface StorageProvider {
  readonly name: string;
  put(db: Db, key: string, bytes: Buffer): Promise<void>;
  get(db: Db, key: string): Promise<Buffer | null>;
  remove(db: Db, key: string): Promise<void>;
}

export const databaseStorage: StorageProvider = {
  name: "database",
  async put(db, key, bytes) {
    await db.insert(fileBlob).values({ fileId: key, data: bytes }).onConflictDoUpdate({ target: fileBlob.fileId, set: { data: bytes } });
  },
  async get(db, key) {
    const row = await db.query.fileBlob.findFirst({ where: eq(fileBlob.fileId, key) });
    if (!row) return null;
    // node-postgres returns Buffer, PGlite returns Uint8Array.
    return Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data as unknown as Uint8Array);
  },
  async remove(db, key) {
    await db.delete(fileBlob).where(eq(fileBlob.fileId, key));
  },
};

export function getStorageProvider(name: string = "database"): StorageProvider {
  if (name === "database") return databaseStorage;
  throw new Error(`Unknown storage provider: ${name}`);
}
