"use client";
import { LocationField } from "@/components/forms/location-field";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ASSET_CATEGORIES, ASSET_CATEGORY_LABELS } from "@/core/domain/validation";
import { createFirstAssetAction } from "../actions";

export function FirstAssetStep({ locations, assetCount }: { locations: Array<{ id: string; name: string }>; assetCount: number }) {
  return (
    <ActionForm action={createFirstAssetAction} className="card p-5 sm:p-6 flex flex-col gap-4 fade-in">
      {(state) => (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold">Add one system or appliance</h1>
            <p className="text-ink-2 mt-1 text-sm">
              Start with the thing you think about most: the furnace, the water heater, the fridge. {assetCount > 0 && `You have ${assetCount} so far.`}
            </p>
          </div>
          <FormMessage message={state.ok === false ? state.message : undefined} />
          <Field label="Name" htmlFor="name" error={state.errors?.name}>
            <Input id="name" name="name" placeholder="Furnace" defaultValue={state.values?.name} required autoFocus />
          </Field>
          <FormGrid>
            <Field label="Category" htmlFor="category" error={state.errors?.category}>
              <Select id="category" name="category" defaultValue={state.values?.category ?? "hvac"}>
                {ASSET_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {ASSET_CATEGORY_LABELS[c]}
                  </option>
                ))}
              </Select>
            </Field>
            <LocationField locations={locations} label="Location" hint="Where it lives: a room, a hallway, outside." defaultValue={state.values?.locationId} defaultNewName={state.values?.newLocationName} defaultNewKind={state.values?.newLocationKind} error={state.errors?.locationId} newNameError={state.errors?.newLocationName} />
            <Field label="Manufacturer" htmlFor="manufacturer" optional>
              <Input id="manufacturer" name="manufacturer" defaultValue={state.values?.manufacturer} />
            </Field>
            <Field label="Model" htmlFor="model" optional>
              <Input id="model" name="model" defaultValue={state.values?.model} />
            </Field>
          </FormGrid>
          <SubmitButton size="lg" pendingText="Adding…">
            Add it
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
