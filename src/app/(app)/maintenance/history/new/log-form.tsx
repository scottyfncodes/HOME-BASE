"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { AssetSelect, LocationSelect, ProviderSelect } from "@/components/forms/pickers";
import { recordMaintenanceAction } from "../../actions";

type Opt = { id: string; name: string };

export function LogForm({ today, assetId, assets, locations, providers }: { today: string; assetId?: string; assets: Opt[]; locations: Opt[]; providers: Opt[] }) {
  return (
    <ActionForm action={recordMaintenanceAction}>
      {(state) => (
        <>
          <FormMessage message={state.ok === false ? state.message : undefined} />
          <FormSection title="What was done">
            <Field label="Work" htmlFor="title" error={state.errors?.title}>
              <Input id="title" name="title" placeholder="Furnace tune-up" defaultValue={state.values?.title} required autoFocus />
            </Field>
            <FormGrid>
              <Field label="Done on" htmlFor="completedOn" error={state.errors?.completedOn}>
                <Input id="completedOn" name="completedOn" type="date" defaultValue={state.values?.completedOn ?? today} max={today} required />
              </Field>
              <Field label="Cost" htmlFor="cost" optional error={state.errors?.cost}>
                <Input id="cost" name="cost" inputMode="decimal" placeholder="0.00" defaultValue={state.values?.cost} />
              </Field>
              <Field label="Item" htmlFor="assetId" optional error={state.errors?.assetId}>
                <AssetSelect assets={assets} defaultValue={state.values?.assetId ?? assetId} />
              </Field>
              <Field label="Room / area" htmlFor="locationId" optional error={state.errors?.locationId}>
                <LocationSelect locations={locations} defaultValue={state.values?.locationId} />
              </Field>
            </FormGrid>
            <Field label="Who did it" htmlFor="providerId" optional error={state.errors?.providerId}>
              <ProviderSelect providers={providers} defaultValue={state.values?.providerId} />
            </Field>
            <Field label="Notes" htmlFor="notes" optional>
              <Textarea id="notes" name="notes" defaultValue={state.values?.notes} rows={3} />
            </Field>
          </FormSection>
          <FormActions>
            <ButtonLink href={assetId ? `/inventory/${assetId}` : "/maintenance?view=history"} variant="secondary">
              Cancel
            </ButtonLink>
            <SubmitButton pendingText="Saving…">Save to history</SubmitButton>
          </FormActions>
        </>
      )}
    </ActionForm>
  );
}
