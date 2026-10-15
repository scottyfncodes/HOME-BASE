"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormMessage, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { createRoomsAction } from "../actions";
import { cn } from "@/lib/cn";

const COMMON = ["Kitchen", "Living room", "Primary bedroom", "Bedroom", "Bathroom", "Hallway", "Entryway", "Laundry", "Garage", "Basement", "Attic", "Utility room", "Office", "Outside (exterior)", "Backyard", "Front yard"];

export function RoomsStep({ existing }: { existing: string[] }) {
  const have = new Set(existing.map((e) => e.toLowerCase()));
  return (
    <ActionForm action={createRoomsAction} className="card p-5 sm:p-6 flex flex-col gap-4 fade-in">
      {(state) => (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold">Which rooms and areas do you have?</h1>
            <p className="text-ink-2 mt-1 text-sm">Pick the ones that apply, including hallways and outside spots. They give your systems and appliances a place to live, and you can add more any time.</p>
          </div>
          <FormMessage message={state.ok === false ? state.message : undefined} />
          {existing.length > 0 && <p className="text-sm text-ink-2">Already added: {existing.join(", ")}.</p>}
          <div className="flex flex-wrap gap-2">
            {COMMON.filter((r) => !have.has(r.toLowerCase())).map((room) => (
              <label key={room} className="cursor-pointer">
                <input type="checkbox" name="room" value={room} className="peer sr-only" />
                <span
                  className={cn(
                    "inline-flex h-10 items-center rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold transition-colors",
                    "peer-checked:bg-brand peer-checked:text-brand-ink peer-checked:border-brand peer-focus-visible:ring-2 peer-focus-visible:ring-brand/40",
                  )}
                >
                  {room}
                </span>
              </label>
            ))}
          </div>
          <Field label="Anything else?" htmlFor="custom" optional hint="One per line, or separated by commas.">
            <Textarea id="custom" name="custom" rows={2} placeholder="Workshop, Guest suite, Pool house" />
          </Field>
          <SubmitButton size="lg" pendingText="Adding…">
            Continue
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
