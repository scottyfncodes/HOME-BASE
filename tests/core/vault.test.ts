import { beforeAll, describe, expect, it } from "vitest";
import type { Db } from "@/core/db/client";
import { makeUser, testDb } from "../support/db";
import { readFile, storeFile } from "@/core/services/files";
import { createVaultDocument, getDocument, listVaultDocuments } from "@/core/services/documents";
import { getVaultUnlock, lockVault, unlockVault } from "@/core/services/vault";
import { loadPropertyCtx } from "@/core/services/household";
import { session as sessionTable } from "@/core/db/schema";
import { deleteAccount, exportHousehold } from "@/core/services/account";
import { user as userTable } from "@/core/db/schema";
import { eq } from "drizzle-orm";

process.env.HOME_BASE_DATA_DIR = ".data-test";

describe("secure vault", () => {
  let db: Db;
  let u: Awaited<ReturnType<typeof makeUser>>;
  let sessionId: string;

  beforeAll(async () => {
    db = await testDb();
    u = await makeUser(db, { password: "vault-password-123" });
    sessionId = `sess-${u.userId}`;
    await db.insert(sessionTable).values({ id: sessionId, token: `tok-${u.userId}`, userId: u.userId, expiresAt: new Date(Date.now() + 86_400_000) });
  });

  it("requires an unlock to list, create or read vault documents", async () => {
    await expect(listVaultDocuments(u.pctx)).rejects.toThrow(/unlock/i);
    await expect(createVaultDocument(u.pctx, { title: "Deed", category: "deed" })).rejects.toThrow(/unlock/i);
  });

  it("rejects a wrong password and then unlocks with the right one, per session", async () => {
    await expect(unlockVault(u.ctx, sessionId, "wrong")).rejects.toThrow(/not correct/i);
    expect(await getVaultUnlock(db, sessionId)).toBeNull();
    const until = await unlockVault(u.ctx, sessionId, "vault-password-123");
    expect(until.getTime()).toBeGreaterThan(Date.now());
    expect(await getVaultUnlock(db, sessionId)).not.toBeNull();
    expect(await getVaultUnlock(db, "some-other-session")).toBeNull();
  });

  it("encrypts vault files at rest and refuses reads without an unlock", async () => {
    const unlocked = await loadPropertyCtx(u.ctx, u.property.id, true);
    const secret = Buffer.from("PASSPORT NUMBER 123456789");
    const file = await storeFile(unlocked, { bytes: secret, filename: "passport.pdf", contentType: "application/pdf", vault: true });
    expect(file.isVault).toBe(true);
    expect(file.encryption?.algorithm).toBe("aes-256-gcm");

    // Raw stored bytes must not contain the plaintext.
    const { fileBlob } = await import("@/core/db/schema");
    const raw = await db.query.fileBlob.findFirst({ where: eq(fileBlob.fileId, file.id) });
    expect(Buffer.from(raw!.data as unknown as Uint8Array).includes(secret)).toBe(false);

    const doc = await createVaultDocument(unlocked, { title: "Passport", category: "identity" }, file.id);
    await expect(readFile({ ...u.ctx, vaultUnlocked: false }, file.id)).rejects.toThrow(/unlock/i);
    await expect(getDocument(u.pctx, doc.id)).rejects.toThrow(/unlock/i);
    const read = await readFile({ ...u.ctx, vaultUnlocked: true }, file.id);
    expect(read.bytes.equals(secret)).toBe(true);

    // Vault files cannot be attached to ordinary documents and vice versa.
    const { createDocument } = await import("@/core/services/documents");
    await expect(createDocument(unlocked, { title: "Leak", category: "other" }, file.id)).rejects.toThrow(/security level/i);
  });

  it("never surfaces vault documents in search or locked exports", async () => {
    const { searchEverything } = await import("@/core/services/search");
    expect((await searchEverything(u.pctx, "passport")).length).toBe(0);
    const locked = await exportHousehold(u.ctx);
    expect(locked.vaultDocuments).toBe("locked");
    expect(locked.files.some((f) => f.filename === "passport.pdf")).toBe(false);
    const open = await exportHousehold({ ...u.ctx, vaultUnlocked: true });
    expect(Array.isArray(open.vaultDocuments)).toBe(true);
  });

  it("locks out after repeated failures", async () => {
    const victim = await makeUser(db, { password: "another-password-9" });
    const sid = `sess-${victim.userId}`;
    await db.insert(sessionTable).values({ id: sid, token: `tok-${victim.userId}`, userId: victim.userId, expiresAt: new Date(Date.now() + 86_400_000) });
    for (let i = 0; i < 5; i++) {
      await expect(unlockVault(victim.ctx, sid, "nope")).rejects.toThrow();
    }
    await expect(unlockVault(victim.ctx, sid, "another-password-9")).rejects.toThrow(/too many/i);
  });

  it("locks the vault and deletes the account with everything in it", async () => {
    await lockVault(u.ctx, sessionId);
    expect(await getVaultUnlock(db, sessionId)).toBeNull();
    await expect(deleteAccount(db, u.userId, "wrong")).rejects.toThrow(/not correct/i);
    await deleteAccount(db, u.userId, "vault-password-123");
    expect(await db.query.user.findFirst({ where: eq(userTable.id, u.userId) })).toBeUndefined();
    const { property } = await import("@/core/db/schema");
    expect(await db.query.property.findFirst({ where: eq(property.id, u.property.id) })).toBeUndefined();
    const { fileObject } = await import("@/core/db/schema");
    expect((await db.query.fileObject.findMany({ where: eq(fileObject.householdId, u.ctx.householdId) })).length).toBe(0);
  });
});
