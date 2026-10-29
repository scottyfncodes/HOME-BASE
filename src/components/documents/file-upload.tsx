"use client";
import { useRef, useState } from "react";
import { FileText, Image as ImageIcon, Loader2, Upload, X } from "lucide-react";
import { ACCEPT_ATTRIBUTE, formatBytes } from "@/core/storage/types";
import { cn } from "@/lib/cn";

type Uploaded = { id: string; filename: string; contentType: string; sizeBytes: number };

/**
 * Picks a file, shrinks large photos in the browser, uploads to /api/files,
 * and leaves the resulting file id in a hidden input for the parent form.
 */
export function FileUpload({ name = "fileId", vault = false, existing, maxMb = 4, accept = ACCEPT_ATTRIBUTE, capture, prompt, detail }: { name?: string; vault?: boolean; existing?: Uploaded | null; maxMb?: number; accept?: string; capture?: boolean; prompt?: string; detail?: string }) {
  const [file, setFile] = useState<Uploaded | null>(existing ?? null);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function onPick(picked: File | undefined) {
    if (!picked) return;
    setError(null);
    setBusy(true);
    try {
      let toSend: Blob = picked;
      let filename = picked.name;
      if (picked.type.startsWith("image/")) {
        const shrunk = await shrinkImage(picked, 2000, 0.85).catch(() => null);
        if (shrunk) {
          toSend = shrunk;
          filename = filename.replace(/\.[^.]+$/, "") + ".jpg";
        }
      }
      if (toSend.size > maxMb * 1024 * 1024) {
        setError(`That file is ${formatBytes(toSend.size)}. The limit is ${maxMb} MB.`);
        return;
      }
      const fd = new FormData();
      fd.append("file", toSend, filename);
      if (vault) fd.append("vault", "1");
      const res = await fetch("/api/files", { method: "POST", body: fd });
      const json = (await res.json().catch(() => ({}))) as Partial<Uploaded> & { error?: string };
      if (!res.ok || !json.id) {
        setError(json.error ?? "Upload failed. Please try again.");
        return;
      }
      setFile(json as Uploaded);
      setRemoved(false);
      if (toSend.type.startsWith("image/")) setPreview(URL.createObjectURL(toSend));
      else setPreview(null);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const current = removed ? null : file;
  const isImage = current?.contentType.startsWith("image/");

  return (
    <div className="flex flex-col gap-2">
      <input type="hidden" name={name} value={current?.id ?? ""} />
      {removed && existing && <input type="hidden" name={`${name}Removed`} value="1" />}
      {current ? (
        <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2/60 p-3">
          {isImage ? (
            preview || !vault ? (
              <a href={preview ?? `/api/files/${current.id}`} target="_blank" rel="noreferrer" className="shrink-0" aria-label="Open the photo full size">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview ?? `/api/files/${current.id}`} alt="" className="size-14 rounded-lg object-cover" />
              </a>
            ) : (
              <ImageIcon className="size-6 text-ink-3 shrink-0" aria-hidden />
            )
          ) : (
            <FileText className="size-6 text-accent shrink-0" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{current.filename}</div>
            <div className="text-sm text-ink-2">{formatBytes(current.sizeBytes)}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              setRemoved(true);
              setPreview(null);
            }}
            className="size-9 rounded-lg hover:bg-surface-2 text-ink-2 flex items-center justify-center"
            aria-label="Remove file"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <label
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-surface p-6 text-center cursor-pointer hover:border-brand/60 hover:bg-brand-soft/30",
            busy && "pointer-events-none opacity-70",
          )}
        >
          <input ref={inputRef} type="file" accept={accept} className="sr-only" capture={capture ? "environment" : undefined} onChange={(e) => onPick(e.target.files?.[0])} disabled={busy} />
          {busy ? <Loader2 className="size-6 animate-spin text-brand" aria-hidden /> : <Upload className="size-6 text-brand" aria-hidden />}
          <span className="font-semibold text-sm">{busy ? "Uploading…" : (prompt ?? "Choose a file or take a photo")}</span>
          <span className="text-xs text-ink-3">{detail ?? `Images, PDF, Word, Excel or text · up to ${maxMb} MB`}</span>
        </label>
      )}
      {error && (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

async function shrinkImage(file: File, maxSide: number, quality: number): Promise<Blob | null> {
  if (file.size < 600 * 1024) return null; // small enough already
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.type === "image/jpeg") {
    bitmap.close();
    return null;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", quality));
}
