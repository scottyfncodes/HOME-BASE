import { and, asc, desc, eq, ilike, or, sql } from "drizzle-orm";
import { document } from "../db/schema";
import { ForbiddenError, NotFoundError } from "../errors";
import type { DocumentInput, VaultDocumentInput } from "../domain/validation";
import { DOCUMENT_CATEGORIES, VAULT_CATEGORIES } from "../domain/validation";
import { addDays, todayIn } from "../domain/dates";
import type { PropertyCtx } from "./context";
import { nullable } from "./context";
import { assertAsset } from "./assets";
import { assertProject } from "./projects";
import { deleteFile, getFileMeta } from "./files";
import { assertPet } from "./pets";

export type DocumentFilter = { q?: string; category?: string; assetId?: string; projectId?: string; petId?: string; limit?: number };

const docWith = {
  file: { columns: { id: true, filename: true, contentType: true, sizeBytes: true, isVault: true } },
  asset: { columns: { id: true, name: true } },
  project: { columns: { id: true, name: true } },
  pet: { columns: { id: true, name: true } },
} as const;

export async function listDocuments(ctx: PropertyCtx, filter: DocumentFilter = {}) {
  const conditions = [eq(document.propertyId, ctx.propertyId), eq(document.isVault, false)];
  if (filter.category && (DOCUMENT_CATEGORIES as readonly string[]).includes(filter.category)) conditions.push(eq(document.category, filter.category));
  if (filter.assetId) conditions.push(eq(document.assetId, filter.assetId));
  if (filter.projectId) conditions.push(eq(document.projectId, filter.projectId));
  if (filter.petId) conditions.push(eq(document.petId, filter.petId));
  if (filter.q?.trim()) {
    const term = `%${filter.q.trim().replace(/[%_]/g, "\\$&")}%`;
    conditions.push(or(ilike(document.title, term), ilike(document.notes, term))!);
  }
  return ctx.db.query.document.findMany({
    where: and(...conditions),
    with: docWith,
    orderBy: [desc(document.createdAt)],
    limit: Math.min(filter.limit ?? 300, 500),
  });
}

export async function getDocument(ctx: PropertyCtx, id: string) {
  const row = await ctx.db.query.document.findFirst({
    where: and(eq(document.id, id), eq(document.propertyId, ctx.propertyId)),
    with: docWith,
  });
  if (!row) throw new NotFoundError("Document not found");
  if (row.isVault && !ctx.vaultUnlocked) throw new ForbiddenError("Unlock the Vault to open this document.");
  return row;
}

async function toRow(ctx: PropertyCtx, input: DocumentInput) {
  return {
    title: input.title,
    category: input.category,
    documentDate: nullable(input.documentDate),
    expiresOn: nullable(input.expiresOn),
    assetId: await assertAsset(ctx, input.assetId),
    projectId: await assertProject(ctx, input.projectId),
    petId: await assertPet(ctx, input.petId),
    notes: nullable(input.notes),
  };
}

async function assertFileForDocument(ctx: PropertyCtx, fileId: string | null | undefined, vault: boolean) {
  if (!fileId) return null;
  const meta = await getFileMeta(ctx, fileId);
  if (meta.isVault !== vault) throw new ForbiddenError("File does not match the document's security level.");
  return meta.id;
}

/**
 * Files a document. `links.petHealthEventId` attaches it to an entry on a
 * pet's health timeline; the caller must have verified that entry already.
 */
export async function createDocument(ctx: PropertyCtx, input: DocumentInput, fileId?: string | null, links: { petHealthEventId?: string | null } = {}) {
  const [row] = await ctx.db
    .insert(document)
    .values({ propertyId: ctx.propertyId, isVault: false, fileId: await assertFileForDocument(ctx, fileId, false), petHealthEventId: links.petHealthEventId ?? null, ...(await toRow(ctx, input)) })
    .returning();
  return row;
}

export async function updateDocument(ctx: PropertyCtx, id: string, input: DocumentInput, fileId?: string | null) {
  const existing = await getDocument(ctx, id);
  if (existing.isVault) throw new ForbiddenError("Use the Vault to edit this document.");
  const newFileId = fileId === undefined ? existing.fileId : await assertFileForDocument(ctx, fileId, false);
  const [row] = await ctx.db
    .update(document)
    .set({ ...(await toRow(ctx, input)), fileId: newFileId })
    .where(and(eq(document.id, id), eq(document.propertyId, ctx.propertyId)))
    .returning();
  if (fileId !== undefined && existing.fileId && existing.fileId !== newFileId) await deleteFile(ctx, existing.fileId);
  return row;
}

export async function deleteDocument(ctx: PropertyCtx, id: string) {
  const existing = await getDocument(ctx, id);
  await ctx.db.delete(document).where(and(eq(document.id, id), eq(document.propertyId, ctx.propertyId)));
  if (existing.fileId) await deleteFile(ctx, existing.fileId);
}

export async function documentsExpiringSoon(ctx: PropertyCtx, days = 60) {
  const today = todayIn(ctx.timezone);
  return ctx.db.query.document.findMany({
    where: and(
      eq(document.propertyId, ctx.propertyId),
      eq(document.isVault, false),
      sql`${document.expiresOn} is not null and ${document.expiresOn} >= ${today} and ${document.expiresOn} <= ${addDays(today, days)}`,
    ),
    with: docWith,
    orderBy: [asc(document.expiresOn)],
    limit: 10,
  });
}

/* --------------------------------- vault --------------------------------- */

function requireUnlocked(ctx: PropertyCtx) {
  if (!ctx.vaultUnlocked) throw new ForbiddenError("Unlock the Vault first.");
}

export async function listVaultDocuments(ctx: PropertyCtx, filter: { q?: string; category?: string } = {}) {
  requireUnlocked(ctx);
  const conditions = [eq(document.propertyId, ctx.propertyId), eq(document.isVault, true)];
  if (filter.category && (VAULT_CATEGORIES as readonly string[]).includes(filter.category)) conditions.push(eq(document.category, filter.category));
  if (filter.q?.trim()) {
    const term = `%${filter.q.trim().replace(/[%_]/g, "\\$&")}%`;
    conditions.push(or(ilike(document.title, term), ilike(document.notes, term))!);
  }
  return ctx.db.query.document.findMany({
    where: and(...conditions),
    with: { file: { columns: { id: true, filename: true, contentType: true, sizeBytes: true, isVault: true } } },
    orderBy: [asc(document.category), asc(document.title)],
  });
}

export async function countVaultDocuments(ctx: PropertyCtx) {
  const [row] = await ctx.db
    .select({ n: sql<number>`count(*)::int` })
    .from(document)
    .where(and(eq(document.propertyId, ctx.propertyId), eq(document.isVault, true)));
  return row?.n ?? 0;
}

export async function createVaultDocument(ctx: PropertyCtx, input: VaultDocumentInput, fileId?: string | null) {
  requireUnlocked(ctx);
  const [row] = await ctx.db
    .insert(document)
    .values({
      propertyId: ctx.propertyId,
      isVault: true,
      fileId: await assertFileForDocument(ctx, fileId, true),
      title: input.title,
      category: input.category,
      documentDate: nullable(input.documentDate),
      expiresOn: nullable(input.expiresOn),
      notes: nullable(input.notes),
    })
    .returning();
  return row;
}

export async function updateVaultDocument(ctx: PropertyCtx, id: string, input: VaultDocumentInput) {
  requireUnlocked(ctx);
  const [row] = await ctx.db
    .update(document)
    .set({ title: input.title, category: input.category, documentDate: nullable(input.documentDate), expiresOn: nullable(input.expiresOn), notes: nullable(input.notes) })
    .where(and(eq(document.id, id), eq(document.propertyId, ctx.propertyId), eq(document.isVault, true)))
    .returning();
  if (!row) throw new NotFoundError("Vault document not found");
  return row;
}

export async function deleteVaultDocument(ctx: PropertyCtx, id: string) {
  requireUnlocked(ctx);
  const existing = await ctx.db.query.document.findFirst({
    where: and(eq(document.id, id), eq(document.propertyId, ctx.propertyId), eq(document.isVault, true)),
  });
  if (!existing) throw new NotFoundError("Vault document not found");
  await ctx.db.delete(document).where(eq(document.id, id));
  if (existing.fileId) await deleteFile(ctx, existing.fileId);
}
