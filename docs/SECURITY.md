# Security

This document is the honest state of Home Base's security as implemented in
this repository. It lists what is enforced, what is assumed, and what is not
done yet.

## Threat model

Home Base stores personal, moderately sensitive data (home details, serial
numbers, receipts) and, in the Vault, highly sensitive documents (identity
and legal records). The main threats we design against:

1. **Another user of the service** reading or modifying your household's data.
2. **A leaked link or cached response** exposing a private document.
3. **Someone with momentary access to your unlocked phone** opening the Vault.
4. **Credential stuffing / brute force** against sign-in or the Vault.
5. **A database backup or dump** leaking Vault file contents.

Out of scope for v1: a malicious or compromised service operator (the server
holds the Vault master key), physical access to a signed-in session with the
Vault already unlocked, and client-device malware.

## What is enforced

- **Authentication**: Better Auth, email + password (scrypt hashes), HTTP-only
  session cookies (`Secure` in production), 30-day sessions refreshed daily.
  Rate limits on sign-in (8/min) and sign-up (5/min) per IP.
- **Authorisation on the server for every operation.** Every service call
  receives a context derived from the session and scopes every query by
  household or property. Foreign references supplied by the client (asset,
  location, provider, project ids) are checked against the same property.
  Tests in `tests/core/authorization.test.ts` prove reads and writes across
  households fail.
- **Private files.** Bytes live in Postgres and are only served by
  `GET /api/files/:id` after membership is verified. Responses carry
  `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`, a
  sandboxing CSP, and `Content-Disposition` (attachment for non-image/PDF
  types). There are no public URLs, signed or otherwise.
- **Upload validation.** Size limit (`MAX_UPLOAD_MB`, default 4), content-type
  allowlist with extension fallback, filename sanitisation, SHA-256 integrity
  check on read.
- **Vault**
  - Separate flag on documents and files; Vault records are excluded from
    search, dashboards, ordinary document lists, and locked exports.
  - **Re-authentication**: opening the Vault requires the password again.
    The unlock is stored server-side, bound to the session id, and expires
    after 10 minutes. 5 failed attempts in 15 minutes block further attempts.
  - **Encryption at rest**: each file gets a random 256-bit data key
    (AES-256-GCM); the data key is wrapped with the master key
    (`VAULT_MASTER_KEY`, AES-256-GCM). A database dump without the master key
    yields ciphertext only.
  - **Audit log** of unlocks, failures, reads, and document changes.
- **Input validation** with zod on every form; money and dates parsed
  explicitly; SQL via Drizzle's parameterised builder (no string
  concatenation of user input).
- **CSRF**: Server Actions are protected by Next.js's origin checks; Better
  Auth checks `trustedOrigins`. The file upload route accepts only
  `multipart/form-data` from an authenticated session cookie with `SameSite`
  defaults.
- **XSS**: React escaping throughout; no `dangerouslySetInnerHTML` with user
  data (the two inline scripts are static strings).
- **Headers**: `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`, `X-Powered-By` removed.
- **Secrets**: never in browser code; `src/core/env.ts` is server-only.
  `.env*` is git-ignored; `.env.example` holds placeholders only.
- **Logging**: errors are logged by message only; file contents, passwords
  and tokens are never logged.
- **Account deletion** requires the password; cascades through the household
  when the user is the only member. **Export** is available at any time.

## Encryption terms, precisely

- **In transit**: TLS, provided by the host (Vercel) — not by this code.
- **At rest (Vault)**: yes, server-side envelope encryption as above.
- **At rest (everything else)**: whatever the database provider offers
  (Neon encrypts storage volumes). Ordinary documents are **not** encrypted
  by the app.
- **End-to-end**: **no.** The server decrypts Vault files to show them to
  you. Do not describe the Vault as end-to-end encrypted.

## Known gaps and production prerequisites

- **Row-level security** is not enabled. Isolation is enforced in the
  application layer (tested), not by Postgres policies. Adding RLS with a
  per-request `SET LOCAL` is the recommended next hardening step.
- **Email verification / password reset** are not wired up (no email
  provider). Until they are, a forgotten password means a support process.
- **Key rotation**: `keyVersion` is stored per file, but no rotation tool
  exists yet. Losing `VAULT_MASTER_KEY` makes Vault files unrecoverable;
  keep it in a secret manager with a backup.
- **Biometrics / passkeys** are not implemented. Better Auth's passkey plugin
  is the intended path, as a convenience layered on the password re-auth.
- **Rate limiting** for Better Auth is in-memory per instance; on serverless
  it is per-warm-instance. The Vault limiter is database-backed and
  therefore global.
- **Upload size** is capped at 4 MB by default because Vercel functions
  reject larger request bodies; photos are downscaled in the browser first.
- **Recovery**: there is no account recovery that preserves the Vault other
  than the password. A recovery flow must re-authenticate strongly before
  restoring access; it must never bypass the master-key encryption or
  silently reset the unlock requirement.
- **Multi-member households**: supported by the schema and services; the
  invitation flow does not exist yet, so every household has one member.
