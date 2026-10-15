"use client";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { LOCATION_KINDS, LOCATION_KIND_LABELS } from "@/core/domain/validation";
import { createLocationAction, updateLocationAction } from "./actions";

type L = { id: string; name: string; kind: string; floor: string | null; notes: string | null };

export function LocationForm({ location }: { location?: L }) {
  const editing = Boolean(location);
  return (
    <ActionForm action={editing ? updateLocationAction : createLocationAction}>
      {(state) => (
        <>
          {location && <input type="hidden" name="id" value={location.id} />}
          <FormMessage message={state.ok === false ? state.message : undefined} />
          <FormSection title={editing ? "Room details" : "New room or area"}>
            <Field label="Name" htmlFor="name" error={state.errors?.name}>
              <Input id="name" name="name" defaultValue={state.values?.name ?? location?.name} placeholder="Kitchen" required autoFocus={!editing} />
            </Field>
            <FormGrid>
              <Field label="Kind" htmlFor="kind">
                <Select id="kind" name="kind" defaultValue={state.values?.kind ?? location?.kind ?? "room"}>
                  {LOCATION_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {LOCATION_KIND_LABELS[k]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Floor" htmlFor="floor" optional>
                <Input id="floor" name="floor" placeholder="Main, Upstairs, Basement" defaultValue={state.values?.floor ?? location?.floor ?? ""} />
              </Field>
            </FormGrid>
            <Field label="Notes" htmlFor="notes" optional hint="Paint colors, dimensions, anything worth remembering.">
              <Textarea id="notes" name="notes" defaultValue={state.values?.notes ?? location?.notes ?? ""} />
            </Field>
          </FormSection>
          <FormActions>
            <ButtonLink href={location ? `/my-home/locations/${location.id}` : "/my-home"} variant="secondary">
              Cancel
            </ButtonLink>
            <SubmitButton>{editing ? "Save changes" : "Add room"}</SubmitButton>
          </FormActions>
        </>
      )}
    </ActionForm>
  );
}
