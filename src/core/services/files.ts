import { and, eq } from "drizzle-orm";
import { fileObject } from "../db/schema";
import { ForbiddenError, NotFoundError, UnavailableError, ValidationError } from "../errors";
import { env } from "../env";
import { decryptBytes, encryptBytes, sha256, vaultAvailable } from "../storage/crypto";
import { getStorageProvider } from "../storage/provider";
import { formatBytes, normalizeContentType, safeFilename } from "../storage/types";
import type { Ctx, PropertyCtx } from "./context";

export type StoreFileInput = {
  bytes: Buffer;
  filename: string;
  contentType: string | null | undefined;
  vault?: boolean;
};

/**
 * Stores a file for the household. Vault files are encrypted before they
 * reach the storage provider; the plaintext hash is kept for integrity checks.
 */
export async function storeFile(ctx: Ctx, input: StoreFileInput) {
  if (input.bytes.length === 0) throw new ValidationError("The file is empty.", { file: "The file is empty." });
  if (input.bytes.length > env.maxUploadBytes) {
    throw new ValidationError(`Files must be under ${formatBytes(env.maxUploadBytes)}.`, { file: `Files must be under ${formatBytes(env.maxUploadBytes)}.` });
  }
  const filename = safeFilename(input.filename);
  const contentType = normalizeContentType(input.contentType, filename);
  if (!contentType) throw new ValidationError("That file type is not supported.", { file: "Use an image, PDF, text, Word or Excel file." });
  const vault = input.vault === true;
  if (vault && !vaultAvailable()) throw new UnavailableError("The Vault is not configured on this server.");

  const hash = sha256(input.bytes);
  let payload = input.bytes;
  let encryption = null;
  if (vault) {
    const enc = encryptBytes(input.bytes);
    payload = enc.ciphertext;
    encryption = enc.meta;
  }
  const provider = getStorageProvider("database");
  return ctx.db.transaction(async (tx) => {
    const [row] = await tx
      .insert(fileObject)
      .values({
        householdId: ctx.householdId,
        provider: provider.name,
        storageKey: "", // set below once the id is known
        filename,
        contentType,
        sizeBytes: input.bytes.length,
        sha256: hash,
        encryption,
        isVault: vault,
        createdBy: ctx.userId,
      })
      .returning();
    await tx.update(fileObject).set({ storageKey: row.id }).where(eq(fileObject.id, row.id));
    await provider.put(tx, row.id, payload);
    return { ...row, storageKey: row.id };
  });
}

export async function getFileMeta(ctx: Ctx, fileId: string) {
  const row = await ctx.db.query.fileObject.findFirst({
    where: and(eq(fileObject.id, fileId), eq(fileObject.householdId, ctx.householdId)),
  });
  if (!row) throw new NotFoundError("File not found");
  return row;
}

/**
 * Reads a file's bytes. Household membership is always required; Vault files
 * additionally require a fresh Vault unlock on this session.
 */
export async function readFile(ctx: Ctx & { vaultUnlocked?: boolean }, fileId: string) {
  const meta = await getFileMeta(ctx, fileId);
  if (meta.isVault && !ctx.vaultUnlocked) throw new ForbiddenError("Unlock the Vault to open this file.");
  const provider = getStorageProvider(meta.provider);
  const stored = await provider.get(ctx.db, meta.storageKey);
  if (!stored) throw new NotFoundError("File contents are missing");
  const bytes = meta.encryption ? decryptBytes(stored, meta.encryption) : stored;
  if (sha256(bytes) !== meta.sha256) throw new Error("File integrity check failed");
  return { meta, bytes };
}

export async function deleteFile(ctx: Ctx, fileId: string) {
  const meta = await ctx.db.query.fileObject.findFirst({
    where: and(eq(fileObject.id, fileId), eq(fileObject.householdId, ctx.householdId)),
  });
  if (!meta) return;
  const provider = getStorageProvider(meta.provider);
  await ctx.db.transaction(async (tx) => {
    await provider.remove(tx, meta.storageKey);
    await tx.delete(fileObject).where(eq(fileObject.id, meta.id));
  });
}

export function fileUrl(fileId: string, opts: { download?: boolean } = {}) {
  return `/api/files/${fileId}${opts.download ? "?download=1" : ""}`;
}

export type { PropertyCtx };
