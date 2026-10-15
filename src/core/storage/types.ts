/** Upload rules shared by the server and the upload UI. */

export const ALLOWED_CONTENT_TYPES: Record<string, { ext: string[]; inline: boolean; image: boolean }> = {
  "image/jpeg": { ext: ["jpg", "jpeg"], inline: true, image: true },
  "image/png": { ext: ["png"], inline: true, image: true },
  "image/webp": { ext: ["webp"], inline: true, image: true },
  "image/gif": { ext: ["gif"], inline: true, image: true },
  "image/heic": { ext: ["heic"], inline: false, image: true },
  "image/heif": { ext: ["heif"], inline: false, image: true },
  "application/pdf": { ext: ["pdf"], inline: true, image: false },
  "text/plain": { ext: ["txt"], inline: false, image: false },
  "text/csv": { ext: ["csv"], inline: false, image: false },
  "application/msword": { ext: ["doc"], inline: false, image: false },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { ext: ["docx"], inline: false, image: false },
  "application/vnd.ms-excel": { ext: ["xls"], inline: false, image: false },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { ext: ["xlsx"], inline: false, image: false },
};

export const ACCEPT_ATTRIBUTE = "image/*,.pdf,.txt,.csv,.doc,.docx,.xls,.xlsx";

export function normalizeContentType(contentType: string | null | undefined, filename: string): string | null {
  const ct = (contentType ?? "").split(";")[0].trim().toLowerCase();
  if (ct && ALLOWED_CONTENT_TYPES[ct]) return ct;
  // Fall back to the extension (browsers often send application/octet-stream).
  const ext = filename.toLowerCase().split(".").pop() ?? "";
  for (const [type, info] of Object.entries(ALLOWED_CONTENT_TYPES)) {
    if (info.ext.includes(ext)) return type;
  }
  return null;
}

export function isImageType(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES[contentType]?.image ?? false;
}

export function canInline(contentType: string): boolean {
  return ALLOWED_CONTENT_TYPES[contentType]?.inline ?? false;
}

/** Strips path separators and control characters from a user-supplied filename. */
export function safeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file";
  const cleaned = base.replace(/[\u0000-\u001f\u007f"]/g, "").trim();
  return (cleaned || "file").slice(0, 150);
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
