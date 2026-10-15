"use client";
import { Button } from "@/components/ui/button";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card p-6 flex flex-col gap-3 max-w-lg">
      <h1 className="font-display text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-ink-2">{error.message || "An unexpected error occurred."}</p>
      {error.digest && <p className="text-xs text-ink-3 font-mono">Ref {error.digest}</p>}
      <div>
        <Button variant="secondary" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
