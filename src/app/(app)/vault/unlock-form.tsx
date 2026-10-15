"use client";
import { Lock } from "lucide-react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { unlockVaultAction } from "./actions";

export function UnlockForm({ next, minutes }: { next?: string; minutes: number }) {
  return (
    <ActionForm action={unlockVaultAction} className="card p-5 sm:p-6 flex flex-col gap-4 max-w-md">
      {(state) => (
        <>
          <div className="size-12 rounded-2xl bg-brand-soft text-brand flex items-center justify-center">
            <Lock className="size-6" aria-hidden />
          </div>
          <div>
            <h2 className="font-display text-xl font-semibold">Confirm it is you</h2>
            <p className="text-sm text-ink-2 mt-1">Enter your password to open the Vault for {minutes} minutes on this device. Five wrong attempts lock it for 15 minutes.</p>
          </div>
          {next && <input type="hidden" name="next" value={next} />}
          <FormMessage message={state.ok === false ? state.message : undefined} />
          <Field label="Password" htmlFor="password" error={state.errors?.password}>
            <Input id="password" name="password" type="password" autoComplete="current-password" required autoFocus />
          </Field>
          <SubmitButton size="lg" pendingText="Checking…">
            Unlock Vault
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
