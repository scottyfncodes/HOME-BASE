"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { AssetSelect, ProviderSelect } from "@/components/forms/pickers";
import { EXPENSE_CATEGORIES } from "@/core/domain/validation";
import { createExpenseAction } from "../../../actions";

type Opt = { id: string; name: string };

export function ExpenseForm({ projectId, today, assets, providers }: { projectId: string; today: string; assets: Opt[]; providers: Opt[] }) {
  return (
    <ActionForm action={createExpenseAction}>
      {(state) => (
        <>
          <input type="hidden" name="projectId" value={projectId} />
          <FormMessage message={state.ok === false ? state.message : undefined} />
          <FormSection title="Expense">
            <Field label="What" htmlFor="title" error={state.errors?.title}>
              <Input id="title" name="title" placeholder="Faucet and supply lines" defaultValue={state.values?.title} required autoFocus />
            </Field>
            <FormGrid>
              <Field label="Amount" htmlFor="amount" error={state.errors?.amount}>
                <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" defaultValue={state.values?.amount} required />
              </Field>
              <Field label="Date" htmlFor="spentOn" error={state.errors?.spentOn}>
                <Input id="spentOn" name="spentOn" type="date" defaultValue={state.values?.spentOn ?? today} required />
              </Field>
              <Field label="Category" htmlFor="category">
                <Select id="category" name="category" defaultValue={state.values?.category ?? "materials"}>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c[0].toUpperCase() + c.slice(1)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Paid to" htmlFor="providerId" optional error={state.errors?.providerId}>
                <ProviderSelect providers={providers} defaultValue={state.values?.providerId} />
              </Field>
              <Field label="Related item" htmlFor="assetId" optional error={state.errors?.assetId}>
                <AssetSelect assets={assets} defaultValue={state.values?.assetId} />
              </Field>
            </FormGrid>
            <Field label="Notes" htmlFor="notes" optional>
              <Textarea id="notes" name="notes" defaultValue={state.values?.notes} rows={2} />
            </Field>
          </FormSection>
          <FormActions>
            <ButtonLink href={`/projects/${projectId}`} variant="secondary">
              Cancel
            </ButtonLink>
            <SubmitButton>Add expense</SubmitButton>
          </FormActions>
        </>
      )}
    </ActionForm>
  );
}
