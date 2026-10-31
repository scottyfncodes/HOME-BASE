"use client";
import { useActionState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { completeCareAction } from "./actions";

/** One tap to mark a routine done. The page refreshes to show the next one. */
export function CareDoneButton({ petId, routineId, compact }: { petId: string; routineId: string; compact?: boolean }) {
  const [state, action] = useActionState(completeCareAction, {});
  return (
    <form action={action} className="shrink-0">
      <input type="hidden" name="petId" value={petId} />
      <input type="hidden" name="id" value={routineId} />
      <Inner compact={compact} done={state.ok === true} />
      {state.ok === false && state.message && (
        <p role="alert" className="text-xs text-danger mt-1">
          {state.message}
        </p>
      )}
    </form>
  );
}

function Inner({ compact, done }: { compact?: boolean; done: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-full font-semibold transition-colors disabled:opacity-60",
        compact ? "h-9 px-3.5 text-sm" : "h-10 px-4 text-[15px]",
        done ? "bg-ok-soft text-ok" : "bg-brand text-brand-ink hover:bg-brand-strong",
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
      {done ? "Done" : "Mark done"}
    </button>
  );
}
