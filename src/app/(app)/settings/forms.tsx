"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormMessage, Input } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { deleteAccountAction, renameHouseholdAction } from "./actions";

export function RenameHouseholdForm({ name }: { name: string }) {
  return (
    <ActionForm action={renameHouseholdAction} className="flex flex-col gap-2">
      {(state) => (
        <>
          <div className="flex items-end gap-2">
            <Field label="Household name" htmlFor="name" error={state.errors?.name} className="flex-1">
              <Input id="name" name="name" defaultValue={name} required />
            </Field>
            <SubmitButton variant="secondary">Save</SubmitButton>
          </div>
          {state.ok && state.message && <FormMessage message={state.message} ok />}
        </>
      )}
    </ActionForm>
  );
}

export function DeleteAccountForm() {
  return (
    <ActionForm action={deleteAccountAction} className="flex flex-col gap-3 max-w-sm">
      {(state) => (
        <>
          <FormMessage message={state.ok === false ? state.message : undefined} />
          <Field label="Your password" htmlFor="password" error={state.errors?.password}>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </Field>
          <Field label="Type DELETE to confirm" htmlFor="confirm" error={state.errors?.confirm}>
            <Input id="confirm" name="confirm" autoCapitalize="characters" autoComplete="off" required />
          </Field>
          <div>
            <SubmitButton variant="danger" pendingText="Deleting…">
              Delete my account
            </SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
