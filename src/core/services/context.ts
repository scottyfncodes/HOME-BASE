import type { Db } from "../db/client";

/** Who is acting, on behalf of which household. Built by the app layer after authentication. */
export type Ctx = {
  db: Db;
  userId: string;
  householdId: string;
  role: "owner" | "member";
};

/** A Ctx narrowed to one property the household owns (verified by `loadPropertyCtx`). */
export type PropertyCtx = Ctx & {
  propertyId: string;
  timezone: string;
  /** Whether the current session has recently re-authenticated for the Vault. */
  vaultUnlocked: boolean;
};

export function nullable<T>(v: T | undefined): T | null {
  return v === undefined ? null : v;
}
