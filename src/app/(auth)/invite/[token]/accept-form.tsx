"use client";
import { ActionForm } from "@/components/ui/action-form";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { acceptInviteAction } from "./actions";

export function AcceptInviteForm({ token, signedInAs, mustDiscard }: { token: string; signedInAs: string; mustDiscard: boolean }) {
  return (
    <ActionForm action={acceptInviteAction} className="flex flex-col gap-3">
      {(state) => (
        <>
          <input type="hidden" name="token" value={token} />
          <FormMessage message={state.ok === false ? state.message : undefined} />
          <p className="text-sm text-ink-2">
            Signed in as <strong className="text-ink">{signedInAs}</strong>.
          </p>
          {mustDiscard && (
            <label className="flex items-start gap-3 rounded-xl bg-danger-soft text-danger p-3 text-sm">
              <input type="checkbox" name="discardCurrent" value="1" required className="mt-0.5 size-4 accent-current" />
              <span>
                You already have a home set up in Home Base. Joining replaces it, and <strong>its records and files are deleted</strong>. Export them from Settings first if you want a copy.
              </span>
            </label>
          )}
          <SubmitButton size="lg" pendingText="Joining…">
            Join household
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
