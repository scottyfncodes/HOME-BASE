import type { ReactNode } from "react";

/**
 * Progressive disclosure for the fields people fill in less often. Uses a
 * native <details>, so it works without JavaScript and opens itself when a
 * field inside it has an error (pass `open`).
 */
export function MoreFields({ title, summary, open, children }: { title: string; summary?: string; open?: boolean; children: ReactNode }) {
  return (
    <details className="group card overflow-hidden" open={open}>
      <summary className="flex items-center justify-between gap-3 px-4 sm:px-5 py-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden hover:bg-surface-2/50">
        <span className="min-w-0">
          <span className="block text-base font-semibold">{title}</span>
          {summary && <span className="block text-sm text-ink-2 mt-0.5">{summary}</span>}
        </span>
        <span aria-hidden className="shrink-0 size-7 rounded-full border border-line-strong flex items-center justify-center text-ink-2 transition-transform group-open:rotate-45">
          <svg viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M8 3v10M3 8h10" /></svg>
        </span>
      </summary>
      <div className="px-4 sm:px-5 pb-5 pt-1 flex flex-col gap-4">{children}</div>
    </details>
  );
}
