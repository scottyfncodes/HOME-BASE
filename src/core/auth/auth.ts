import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "../db/client";
import { env } from "../env";
import * as schema from "../db/schema";
import { ensureHouseholdForUser } from "../services/household";

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
    const host = request?.headers.get("x-forwarded-host") ?? request?.headers.get("host");
    if (!host) return staticOrigins;
    const proto = request?.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    return [...staticOrigins, `${proto}://${host}`];
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
