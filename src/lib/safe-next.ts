/** Accepts only same-site paths ("/invite/abc"), never "//host" or "https://...". */
export function safeNext(next: string | null | undefined): string | undefined {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return undefined;
  return next;
}
