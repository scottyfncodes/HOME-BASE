import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db/client";
import { env } from "../env";
import * as schema from "../db/schema";
import { ensureHouseholdForUser } from "../services/household";
import { sendEmail } from "../email/send";
import { passwordResetEmail } from "../email/templates";

const RESET_TOKEN_MINUTES = 60;

type Auth = ReturnType<typeof buildAuth>;

type Holder = { promise?: Promise<Auth> };
const g = globalThis as unknown as { __homeBaseAuth?: Holder };
const holder: Holder = (g.__homeBaseAuth ??= {});

function buildAuth(db: Awaited<ReturnType<typeof getDb>>) {
  const secret = env.authSecret ?? (env.isProd ? undefined : "home-base-development-secret-do-not-use-in-production");
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required in production.");

  const baseURL = env.appUrl ?? "http://localhost:3000";
  const staticOrigins = [baseURL];
  if (process.env.VERCEL_URL) staticOrigins.push(`https://${process.env.VERCEL_URL}`);
  if (process.env.VERCEL_BRANCH_URL) staticOrigins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) staticOrigins.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);

  /**
   * Same-origin requests are always trusted: the origin a request arrives at
   * (production domain, git-branch alias, preview URL) is by definition one
   * we serve. Cross-origin requests must still match a configured origin.
   */
  const trustedOrigins = (request?: Request) => {
    const here = originOf(request);
    return here ? [...staticOrigins, here] : staticOrigins;
  };

  return betterAuth({
    appName: "Home Base",
    secret,
    baseURL,
    trustedOrigins,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      maxPasswordLength: 128,
      autoSignIn: true,
      resetPasswordTokenExpiresIn: RESET_TOKEN_MINUTES * 60,
      // A reset signs out every other device, in case the old password leaked.
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }, request) => {
        // Link back to the site the request came from, but only if it is one we
        // serve: a forged Host header must never put the token on someone else's domain.
        const here = originOf(request);
        const base = here && staticOrigins.includes(here) ? here : (env.publicUrl ?? baseURL);
        const url = `${base}/reset-password?token=${encodeURIComponent(token)}`;
        await sendEmail({ to: user.email, ...passwordResetEmail({ name: user.name, url, minutes: RESET_TOKEN_MINUTES }) });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh once a day
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 30,
      customRules: {
        "/sign-in/email": { window: 60, max: 8 },
        "/sign-up/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 300, max: 3 },
        "/reset-password": { window: 60, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: env.isProd,
      cookiePrefix: "homebase",
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await ensureHouseholdForUser(db, user.id, user.name);
          },
        },
      },
    },
  });
}

function originOf(request?: Request) {
  const host = request?.headers.get("x-forwarded-host") ?? request?.headers.get("host");
  if (!host) return undefined;
  const proto = request?.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Lazily-built Better Auth instance (the database is created asynchronously). */
export function getAuth(): Promise<Auth> {
  if (!holder.promise) {
    holder.promise = getDb()
      .then((db) => buildAuth(db))
      .catch((err) => {
        holder.promise = undefined;
        throw err;
      });
  }
  return holder.promise;
}
