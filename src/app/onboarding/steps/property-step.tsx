"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormGrid, FormMessage, Input, Select } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { TimezoneInput } from "@/components/ui/timezone-input";
import { HOME_TYPES, HOME_TYPE_LABELS } from "@/core/domain/validation";
import { createPropertyAction } from "../actions";

export function PropertyStep() {
  return (
    <ActionForm action={createPropertyAction} className="card p-5 sm:p-6 flex flex-col gap-4 fade-in">
      {(state) => (
        <>
          <div>
            <h1 className="font-display text-2xl font-semibold">Tell us about your home</h1>
            <p className="text-ink-2 mt-1 text-sm">Only a name is required. Everything else can wait.</p>
          </div>
          <FormMessage message={state.ok === false ? state.message : undefined} />
          <TimezoneInput />
          <Field label="What do you call it?" htmlFor="name" error={state.errors?.name} hint='For example "Maple Street" or "The cabin".'>
            <Input id="name" name="name" defaultValue={state.values?.name} required autoFocus />
          </Field>
          <Field label="Home type" htmlFor="homeType" optional error={state.errors?.homeType}>
            <Select id="homeType" name="homeType" defaultValue={state.values?.homeType ?? ""}>
              <option value="">Choose…</option>
              {HOME_TYPES.map((t) => (
                <option key={t} value={t}>
                  {HOME_TYPE_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Street address" htmlFor="addressLine1" optional error={state.errors?.addressLine1}>
            <Input id="addressLine1" name="addressLine1" autoComplete="address-line1" defaultValue={state.values?.addressLine1} />
          </Field>
          <FormGrid>
            <Field label="City" htmlFor="city" optional>
              <Input id="city" name="city" autoComplete="address-level2" defaultValue={state.values?.city} />
            </Field>
            <Field label="State / region" htmlFor="region" optional>
              <Input id="region" name="region" autoComplete="address-level1" defaultValue={state.values?.region} />
            </Field>
            <Field label="Postal code" htmlFor="postalCode" optional>
              <Input id="postalCode" name="postalCode" autoComplete="postal-code" defaultValue={state.values?.postalCode} />
            </Field>
            <Field label="Year built" htmlFor="yearBuilt" optional error={state.errors?.yearBuilt}>
              <Input id="yearBuilt" name="yearBuilt" inputMode="numeric" defaultValue={state.values?.yearBuilt} />
            </Field>
          </FormGrid>
          <SubmitButton size="lg" pendingText="Creating…">
            Continue
          </SubmitButton>
        </>
      )}
    </ActionForm>
  );
}
