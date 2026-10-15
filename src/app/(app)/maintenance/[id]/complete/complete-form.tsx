"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { ProviderSelect } from "@/components/forms/pickers";
import { completeTaskAction } from "../../actions";

export function CompleteForm({ id, today, providers }: { id: string; today: string; providers: Array<{ id: string; name: string }> }) {
  return (
    <ActionForm action={completeTaskAction}>
      {(state) => (
        <>
          <input type="hidden" name="id" value={id} />
          <FormMessage message={state.ok === false ? state.message : undefined} />
          <FormSection title="What happened">
            <FormGrid>
              <Field label="Completed on" htmlFor="completedOn" error={state.errors?.completedOn}>
                <Input id="completedOn" name="completedOn" type="date" defaultValue={state.values?.completedOn ?? today} max={today} required />
              </Field>
              <Field label="Cost" htmlFor="cost" optional error={state.errors?.cost}>
                <Input id="cost" name="cost" inputMode="decimal" placeholder="0.00" defaultValue={state.values?.cost} />
              </Field>
            </FormGrid>
            <Field label="Who did the work" htmlFor="providerId" optional error={state.errors?.providerId}>
              <ProviderSelect providers={providers} defaultValue={state.values?.providerId} />
            </Field>
            <Field label="Notes" htmlFor="notes" optional hint="What you found, parts used, anything for next time.">
              <Textarea id="notes" name="notes" defaultValue={state.values?.notes} rows={3} />
            </Field>
          </FormSection>
          <FormActions>
            <ButtonLink href={`/maintenance/${id}`} variant="secondary">
              Cancel
            </ButtonLink>
            <SubmitButton pendingText="Recording…">Record completion</SubmitButton>
          </FormActions>
        </>
      )}
    </ActionForm>
  );
}
