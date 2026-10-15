"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { HOME_TYPES, HOME_TYPE_LABELS } from "@/core/domain/validation";
import { centsToInput } from "@/core/domain/money";
import type { property } from "@/core/db/schema";
import { updatePropertyAction } from "./actions";

type P = typeof property.$inferSelect;

export function PropertyForm({ property: p }: { property: P }) {
  return (
    <ActionForm action={updatePropertyAction}>
      {(state) => {
        const v = (k: string, fallback: string | number | null | undefined) => state.values?.[k] ?? (fallback == null ? "" : String(fallback));
        return (
          <>
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title="Basics">
              <Field label="Name" htmlFor="name" error={state.errors?.name}>
                <Input id="name" name="name" defaultValue={v("name", p.name)} required />
              </Field>
              <FormGrid>
                <Field label="Home type" htmlFor="homeType" optional error={state.errors?.homeType}>
                  <Select id="homeType" name="homeType" defaultValue={v("homeType", p.homeType)}>
                    <option value="">Choose…</option>
                    {HOME_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {HOME_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Time zone" htmlFor="timezone" hint="Due dates use this zone." error={state.errors?.timezone}>
                  <Input id="timezone" name="timezone" defaultValue={v("timezone", p.timezone)} />
                </Field>
              </FormGrid>
            </FormSection>
            <FormSection title="Address">
              <Field label="Street" htmlFor="addressLine1" optional>
                <Input id="addressLine1" name="addressLine1" autoComplete="address-line1" defaultValue={v("addressLine1", p.addressLine1)} />
              </Field>
              <Field label="Unit / line 2" htmlFor="addressLine2" optional>
                <Input id="addressLine2" name="addressLine2" autoComplete="address-line2" defaultValue={v("addressLine2", p.addressLine2)} />
              </Field>
              <FormGrid>
                <Field label="City" htmlFor="city" optional>
                  <Input id="city" name="city" defaultValue={v("city", p.city)} />
                </Field>
                <Field label="State / region" htmlFor="region" optional>
                  <Input id="region" name="region" defaultValue={v("region", p.region)} />
                </Field>
                <Field label="Postal code" htmlFor="postalCode" optional>
                  <Input id="postalCode" name="postalCode" defaultValue={v("postalCode", p.postalCode)} />
                </Field>
                <Field label="Country" htmlFor="country" optional>
                  <Input id="country" name="country" defaultValue={v("country", p.country)} />
                </Field>
              </FormGrid>
            </FormSection>
            <FormSection title="Details" description="Handy for insurance, permits and resale. All optional.">
              <FormGrid>
                <Field label="Year built" htmlFor="yearBuilt" optional error={state.errors?.yearBuilt}>
                  <Input id="yearBuilt" name="yearBuilt" inputMode="numeric" defaultValue={v("yearBuilt", p.yearBuilt)} />
                </Field>
                <Field label="Square feet" htmlFor="squareFeet" optional error={state.errors?.squareFeet}>
                  <Input id="squareFeet" name="squareFeet" inputMode="numeric" defaultValue={v("squareFeet", p.squareFeet)} />
                </Field>
                <Field label="Bedrooms" htmlFor="bedrooms" optional error={state.errors?.bedrooms}>
                  <Input id="bedrooms" name="bedrooms" inputMode="numeric" defaultValue={v("bedrooms", p.bedrooms)} />
                </Field>
                <Field label="Bathrooms" htmlFor="bathrooms" optional>
                  <Input id="bathrooms" name="bathrooms" inputMode="decimal" placeholder="2.5" defaultValue={v("bathrooms", p.bathrooms)} />
                </Field>
                <Field label="Lot size" htmlFor="lotSize" optional>
                  <Input id="lotSize" name="lotSize" placeholder="0.25 acre" defaultValue={v("lotSize", p.lotSize)} />
                </Field>
                <Field label="Purchase date" htmlFor="purchaseDate" optional error={state.errors?.purchaseDate}>
                  <Input id="purchaseDate" name="purchaseDate" type="date" defaultValue={v("purchaseDate", p.purchaseDate)} />
                </Field>
                <Field label="Purchase price" htmlFor="purchasePrice" optional error={state.errors?.purchasePrice}>
                  <Input id="purchasePrice" name="purchasePrice" inputMode="decimal" placeholder="450,000" defaultValue={v("purchasePrice", centsToInput(p.purchasePriceCents))} />
                </Field>
              </FormGrid>
              <Field label="Notes" htmlFor="notes" optional error={state.errors?.notes}>
                <Textarea id="notes" name="notes" defaultValue={v("notes", p.notes)} />
              </Field>
            </FormSection>
            <FormActions>
              <ButtonLink href="/my-home" variant="secondary">
                Cancel
              </ButtonLink>
              <SubmitButton>Save changes</SubmitButton>
            </FormActions>
          </>
        );
      }}
    </ActionForm>
  );
}
