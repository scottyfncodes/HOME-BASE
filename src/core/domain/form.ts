import type { z } from "zod";

/**
 * Converts FormData to a plain object. Empty strings become `undefined` so
 * optional fields validate cleanly; repeated keys become arrays.
 */
export function formToObject(formData: FormData): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, raw] of formData.entries()) {
    if (key.startsWith("$")) continue; // framework internals
    const value = typeof raw === "string" ? (raw.trim() === "" ? undefined : raw) : raw;
    if (key in out) {
      const prev = out[key];
      out[key] = Array.isArray(prev) ? [...prev, value] : [prev, value];
    } else {
      out[key] = value;
    }
  }
  return out;
}

export type ParseResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Record<string, string>; message: string };

export function parseForm<S extends z.ZodType>(schema: S, formData: FormData | Record<string, unknown>): ParseResult<z.output<S>> {
  const obj = formData instanceof FormData ? formToObject(formData) : formData;
  const result = schema.safeParse(obj);
  if (result.success) return { ok: true, data: result.data };
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.map(String).join(".") || "_";
    if (!(key in errors)) errors[key] = issue.message;
  }
  return { ok: false, errors, message: "Please fix the highlighted fields." };
}
