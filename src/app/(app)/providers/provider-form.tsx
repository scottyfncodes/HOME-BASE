"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { ConfirmForm } from "@/components/ui/confirm-form";
import { createProviderAction, deleteProviderAction, updateProviderAction } from "./actions";

type P = { id?: string; name?: string; trade?: string | null; phone?: string | null; email?: string | null; website?: string | null; address?: string | null; afterHoursPhone?: string | null; isEmergency?: boolean; notes?: string | null };

export function ProviderForm({ provider, back }: { provider?: P; back?: string }) {
  const editing = Boolean(provider?.id);
  return (
    <div className="flex flex-col gap-6">
      <ActionForm action={editing ? updateProviderAction : createProviderAction}>
        {(state) => {
          const v = (k: string, fallback: string | null | undefined) => state.values?.[k] ?? fallback ?? "";
          return (
            <>
              {provider?.id && <input type="hidden" name="id" value={provider.id} />}
              {back && <input type="hidden" name="back" value={back} />}
              <FormMessage message={state.ok === false ? state.message : undefined} />
              <FormSection title={editing ? "Provider" : "New service provider"} description="Plumbers, electricians, HVAC techs, veterinarians, groomers, the handyman who knows your house.">
                <FormGrid>
                  <Field label="Name or company" htmlFor="name" error={state.errors?.name}>
                    <Input id="name" name="name" defaultValue={v("name", provider?.name)} required autoFocus={!editing} />
                  </Field>
                  <Field label="Trade" htmlFor="trade" optional>
                    <Input id="trade" name="trade" placeholder="Plumber" defaultValue={v("trade", provider?.trade)} />
                  </Field>
                  <Field label="Phone" htmlFor="phone" optional>
                    <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={v("phone", provider?.phone)} />
                  </Field>
                  <Field label="Email" htmlFor="email" optional error={state.errors?.email}>
                    <Input id="email" name="email" type="email" inputMode="email" defaultValue={v("email", provider?.email)} />
                  </Field>
                  <Field label="Website" htmlFor="website" optional>
                    <Input id="website" name="website" inputMode="url" defaultValue={v("website", provider?.website)} />
                  </Field>
                  <Field label="After-hours phone" htmlFor="afterHoursPhone" optional hint="An emergency or after-hours line, if different.">
                    <Input id="afterHoursPhone" name="afterHoursPhone" type="tel" inputMode="tel" defaultValue={v("afterHoursPhone", provider?.afterHoursPhone)} />
                  </Field>
                </FormGrid>
                <Field label="Address" htmlFor="address" optional>
                  <Textarea id="address" name="address" rows={2} defaultValue={v("address", provider?.address)} />
                </Field>
                <label className="inline-flex items-center gap-2 text-[15px] w-fit">
                  <input type="checkbox" name="isEmergency" defaultChecked={state.values ? state.values.isEmergency === "on" : provider?.isEmergency} className="size-4 accent-[var(--brand)]" />
                  Offers emergency or 24-hour service
                </label>
                <Field label="Notes" htmlFor="notes" optional hint="Account number, who to ask for, what they have worked on.">
                  <Textarea id="notes" name="notes" defaultValue={v("notes", provider?.notes)} rows={3} />
                </Field>
              </FormSection>
              <FormActions>
                <ButtonLink href={back ?? "/providers"} variant="secondary">
                  Cancel
                </ButtonLink>
                <SubmitButton>{editing ? "Save changes" : "Add provider"}</SubmitButton>
              </FormActions>
            </>
          );
        }}
      </ActionForm>
      {provider?.id && (
        <div className="pt-4 border-t border-line">
          <ConfirmForm action={deleteProviderAction} hidden={{ id: provider.id }} confirm={`Delete ${provider.name}? Past work and expenses keep their records.`} variant="danger" size="sm">
            Delete provider
          </ConfirmForm>
        </div>
      )}
    </div>
  );
}
