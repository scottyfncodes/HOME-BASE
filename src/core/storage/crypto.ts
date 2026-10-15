import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { env } from "../env";
import type { FileEncryption } from "../db/schema";

/**
 * Envelope encryption for Vault files.
 *
 *   file bytes  --AES-256-GCM(DEK)-->  ciphertext
 *   DEK         --AES-256-GCM(master)-->  wrappedKey
 *
 * The master key comes from VAULT_MASTER_KEY. In development, when it is
 * unset, a key is generated once and kept in `.data/vault.dev.key` so local
 * Vault uploads survive restarts. Production never falls back.
 *
 * This is encryption AT REST on the server. The server holds the master key,
 * so it is not end-to-end encryption; see docs/SECURITY.md.
 */

const KEY_VERSION = 1;

let cachedMaster: Buffer | null | undefined;

export function getMasterKey(): Buffer | null {
  if (cachedMaster !== undefined) return cachedMaster;
  if (env.vaultMasterKey) {
    const buf = Buffer.from(env.vaultMasterKey, "base64");
    if (buf.length !== 32) throw new Error("VAULT_MASTER_KEY must be 32 bytes, base64 encoded (openssl rand -base64 32).");
    cachedMaster = buf;
    return buf;
  }
  if (env.isProd) {
    cachedMaster = null;
    return null;
  }
  const dir = path.resolve(process.cwd(), env.dataDir);
  const file = path.join(dir, "vault.dev.key");
  try {
    const existing = fs.readFileSync(file, "utf8").trim();
    const buf = Buffer.from(existing, "base64");
    if (buf.length === 32) {
      cachedMaster = buf;
      return buf;
    }
  } catch {
    /* generate below */
  }
  fs.mkdirSync(dir, { recursive: true });
  const fresh = crypto.randomBytes(32);
  fs.writeFileSync(file, fresh.toString("base64"), { mode: 0o600 });
  cachedMaster = fresh;
  return fresh;
}

export function vaultAvailable(): boolean {
  return getMasterKey() !== null;
}

export function encryptBytes(plain: Buffer): { ciphertext: Buffer; meta: FileEncryption } {
  const master = getMasterKey();
  if (!master) throw new Error("Vault master key is not configured.");
  const dek = crypto.randomBytes(32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();

  const wrapIv = crypto.randomBytes(12);
  const wrap = crypto.createCipheriv("aes-256-gcm", master, wrapIv);
  const wrappedKey = Buffer.concat([wrap.update(dek), wrap.final()]);
  const wrapTag = wrap.getAuthTag();
  dek.fill(0);

  return {
    ciphertext,
    meta: {
      algorithm: "aes-256-gcm",
      wrappedKey: wrappedKey.toString("base64"),
      wrapIv: wrapIv.toString("base64"),
      wrapTag: wrapTag.toString("base64"),
      iv: iv.toString("base64"),
      tag: tag.toString("base64"),
      keyVersion: KEY_VERSION,
    },
  };
}

export function decryptBytes(ciphertext: Buffer, meta: FileEncryption): Buffer {
  const master = getMasterKey();
  if (!master) throw new Error("Vault master key is not configured.");
  const unwrap = crypto.createDecipheriv("aes-256-gcm", master, Buffer.from(meta.wrapIv, "base64"));
  unwrap.setAuthTag(Buffer.from(meta.wrapTag, "base64"));
  const dek = Buffer.concat([unwrap.update(Buffer.from(meta.wrappedKey, "base64")), unwrap.final()]);
  const decipher = crypto.createDecipheriv("aes-256-gcm", dek, Buffer.from(meta.iv, "base64"));
  decipher.setAuthTag(Buffer.from(meta.tag, "base64"));
  const plain = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  dek.fill(0);
  return plain;
}

export function sha256(bytes: Buffer): string {
  return crypto.createHash("sha256").update(bytes).digest("hex");
}
