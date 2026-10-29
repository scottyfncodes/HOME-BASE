/**
 * Central, validated view of the environment. Nothing here is ever sent to
 * the browser; import only from server code.
 */
import "server-only";

const isProd = process.env.NODE_ENV === "production";

function optional(name: string): string | undefined {
  const v = process.env[name];
  return v && v.trim() !== "" ? v.trim() : undefined;
}

export const env = {
  isProd,
  databaseUrl: optional("DATABASE_URL"),
  authSecret: optional("BETTER_AUTH_SECRET"),
  appUrl: optional("APP_URL") ?? optional("BETTER_AUTH_URL") ?? (optional("VERCEL_URL") ? `https://${optional("VERCEL_URL")}` : undefined),
  /** Canonical public origin for links in emails sent outside a request (weekly digest). */
  publicUrl:
    optional("APP_URL") ??
    (optional("VERCEL_PROJECT_PRODUCTION_URL") ? `https://${optional("VERCEL_PROJECT_PRODUCTION_URL")}` : undefined) ??
    (optional("VERCEL_URL") ? `https://${optional("VERCEL_URL")}` : undefined),
  vaultMasterKey: optional("VAULT_MASTER_KEY"),
  resendApiKey: optional("RESEND_API_KEY"),
  emailFrom: optional("EMAIL_FROM"),
  cronSecret: optional("CRON_SECRET"),
  maxUploadBytes: Math.max(1, Number(optional("MAX_UPLOAD_MB") ?? "4")) * 1024 * 1024,
  /** Where the embedded dev database and dev-only keys live. */
  dataDir: optional("HOME_BASE_DATA_DIR") ?? ".data",
};

export type SetupProblem = { code: string; message: string; fatal: boolean };

/** Production prerequisites that the app checks at runtime and reports honestly. */
export function setupProblems(): SetupProblem[] {
  const problems: SetupProblem[] = [];
  if (isProd && !env.databaseUrl) {
    problems.push({
      code: "DATABASE_URL",
      message: "DATABASE_URL is not set. Connect a Postgres database (for Vercel: Storage → Create Database → Neon) and redeploy.",
      fatal: true,
    });
  }
  if (isProd && !env.authSecret) {
    problems.push({
      code: "BETTER_AUTH_SECRET",
      message: "BETTER_AUTH_SECRET is not set. Generate one with `openssl rand -base64 32`.",
      fatal: true,
    });
  }
  if (isProd && !env.vaultMasterKey) {
    problems.push({
      code: "VAULT_MASTER_KEY",
      message: "VAULT_MASTER_KEY is not set. The Secure Vault stays disabled until it is.",
      fatal: false,
    });
  }
  if (isProd && (!env.resendApiKey || !env.emailFrom)) {
    problems.push({
      code: "RESEND_API_KEY",
      message: "RESEND_API_KEY and EMAIL_FROM are not set. Password reset, invite and reminder emails cannot be sent until they are.",
      fatal: false,
    });
  }
  return problems;
}
