"use client";
import { LocationField } from "@/components/forms/location-field";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { CategorySelect } from "@/components/forms/pickers";
import { centsToInput } from "@/core/domain/money";
import { createAssetAction, updateAssetAction } from "./actions";

export type AssetFormValues = {
  id?: string;
  name?: string;
  category?: string;
  locationId?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  installDate?: string | null;
  purchaseDate?: string | null;
  purchasePriceCents?: number | null;
  replacementValueCents?: number | null;
  warrantyExpiresOn?: string | null;
  notes?: string | null;
};

export function AssetForm({ asset, locations, cancelHref }: { asset?: AssetFormValues; locations: Array<{ id: string; name: string }>; cancelHref: string }) {
  const editing = Boolean(asset?.id);
  return (
    <ActionForm action={editing ? updateAssetAction : createAssetAction}>
      {(state) => {
        const v = (k: string, fallback: string | null | undefined) => state.values?.[k] ?? fallback ?? "";
        return (
          <>
            {asset?.id && <input type="hidden" name="id" value={asset.id} />}
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title="What is it?">
              <Field label="Name" htmlFor="name" error={state.errors?.name}>
                <Input id="name" name="name" placeholder="Water heater" defaultValue={v("name", asset?.name)} required autoFocus={!editing} />
              </Field>
              <FormGrid>
                <Field label="Category" htmlFor="category" error={state.errors?.category}>
                  <CategorySelect defaultValue={v("category", asset?.category ?? "appliance")} />
                </Field>
                <LocationField locations={locations} label="Location" hint="Where it lives: a room, a hallway, outside." defaultValue={v("locationId", asset?.locationId)} defaultNewName={state.values?.newLocationName} defaultNewKind={state.values?.newLocationKind} error={state.errors?.locationId} newNameError={state.errors?.newLocationName} />
              </FormGrid>
            </FormSection>
            <FormSection title="Identification" description="From the data plate or receipt. Useful when ordering parts or filing a warranty claim.">
              <FormGrid>
                <Field label="Manufacturer" htmlFor="manufacturer" optional>
                  <Input id="manufacturer" name="manufacturer" defaultValue={v("manufacturer", asset?.manufacturer)} />
                </Field>
                <Field label="Model" htmlFor="model" optional>
                  <Input id="model" name="model" defaultValue={v("model", asset?.model)} />
                </Field>
                <Field label="Serial number" htmlFor="serialNumber" optional>
                  <Input id="serialNumber" name="serialNumber" autoCapitalize="characters" defaultValue={v("serialNumber", asset?.serialNumber)} />
                </Field>
                <Field label="Installed on" htmlFor="installDate" optional error={state.errors?.installDate}>
                  <Input id="installDate" name="installDate" type="date" defaultValue={v("installDate", asset?.installDate)} />
                </Field>
              </FormGrid>
            </FormSection>
            <FormSection title="Purchase & warranty">
              <FormGrid>
                <Field label="Purchased on" htmlFor="purchaseDate" optional error={state.errors?.purchaseDate}>
                  <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={v("purchaseDate", asset?.purchaseDate)} />
                </Field>
                <Field label="Purchase price" htmlFor="purchasePrice" optional error={state.errors?.purchasePrice}>
                  <Input id="purchasePrice" name="purchasePrice" inputMode="decimal" placeholder="1,299.00" defaultValue={v("purchasePrice", centsToInput(asset?.purchasePriceCents))} />
                </Field>
                <Field label="Replacement value" htmlFor="replacementValue" optional error={state.errors?.replacementValue} hint="What it would cost to replace today.">
                  <Input id="replacementValue" name="replacementValue" inputMode="decimal" defaultValue={v("replacementValue", centsToInput(asset?.replacementValueCents))} />
                </Field>
                <Field label="Warranty expires" htmlFor="warrantyExpiresOn" optional error={state.errors?.warrantyExpiresOn}>
                  <Input id="warrantyExpiresOn" name="warrantyExpiresOn" type="date" defaultValue={v("warrantyExpiresOn", asset?.warrantyExpiresOn)} />
                </Field>
              </FormGrid>
              <Field label="Notes" htmlFor="notes" optional error={state.errors?.notes} hint="Filter size, quirks, where the shutoff is, who installed it.">
                <Textarea id="notes" name="notes" defaultValue={v("notes", asset?.notes)} />
              </Field>
            </FormSection>
            <FormActions>
              <ButtonLink href={cancelHref} variant="secondary">
                Cancel
              </ButtonLink>
              <SubmitButton>{editing ? "Save changes" : "Add item"}</SubmitButton>
            </FormActions>
          </>
        );
      }}
    </ActionForm>
  );
}
