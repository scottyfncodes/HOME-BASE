import "server-only";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { isAppError } from "@/core/errors";

/** Shape returned by every form server action. */
export type ActionState = {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
  /** Echo of submitted values so the form can re-render them on error. */
  values?: Record<string, string>;
};

export const idle: ActionState = {};

/**
 * Runs a server action body and converts known errors into ActionState.
 * `redirect()` is rethrown so navigation still works.
 */
export async function runAction(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    const result = await fn();
    return result ?? { ok: true };
  } catch (err) {
    if (isRedirectError(err)) throw err;
    if (isAppError(err)) {
      if (err.code === "validation") {
        const fields = (err as { fields?: Record<string, string> }).fields ?? {};
        return { ok: false, message: err.message, errors: fields };
      }
      return { ok: false, message: err.message };
    }
    console.error("[action] unexpected error", err instanceof Error ? err.message : err);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
}

export function echo(formData: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string" && !k.startsWith("$")) out[k] = v;
  }
  return out;
}
