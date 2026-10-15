"use client";
import { LocationField } from "@/components/forms/location-field";
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { PREPAREDNESS_KINDS, PREPAREDNESS_KIND_LABELS, type PreparednessKind } from "@/core/domain/validation";
import { createPreparednessAction, updatePreparednessAction } from "./actions";

export type PrepFormValues = {
  id?: string;
  kind?: string;
  title?: string;
  locationId?: string | null;
  whereText?: string | null;
  instructions?: string | null;
  phone?: string | null;
  details?: string | null;
};

const HINTS: Record<PreparednessKind, { title: string; where: string; instructions: string }> = {
  water_shutoff: { title: "Main water shutoff", where: "Basement, north wall, behind the water heater", instructions: "Quarter turn clockwise on the red lever. Also note the street-side valve for the utility." },
  gas_shutoff: { title: "Gas meter shutoff", where: "Outside, east wall, next to the meter", instructions: "Only in an emergency: quarter turn with a wrench so the bar is crosswise to the pipe. Never turn it back on yourself; call the utility." },
  electrical_panel: { title: "Main electrical panel", where: "Garage, left of the door", instructions: "Main breaker at top. Breaker 12 = kitchen outlets, 14 = furnace…" },
  detector: { title: "Smoke alarms, upstairs hallway", where: "Hallway ceiling outside bedrooms", instructions: "Interconnected, hard-wired with 9V backup. Manufactured 2022." },
  contact: { title: "Plumber: Smith & Sons", where: "", instructions: "24-hour line. Have the account number from the last invoice handy." },
  insurance: { title: "Homeowner's insurance", where: "", instructions: "Policy number and claims line. The declarations page lives under Documents." },
  equipment: { title: "Fire extinguisher", where: "Kitchen, under the sink", instructions: "ABC rated. Check the gauge yearly." },
  note: { title: "If the basement floods", where: "", instructions: "Step by step: what to switch off, who to call, where the sump pump breaker is." },
};

export function PreparednessForm({ item, locations, cancelHref }: { item?: PrepFormValues; locations: Array<{ id: string; name: string }>; cancelHref: string }) {
  const editing = Boolean(item?.id);
  const [kind, setKind] = useState<PreparednessKind>((item?.kind as PreparednessKind) ?? "water_shutoff");
  const hint = HINTS[kind];
  const isContact = kind === "contact" || kind === "insurance";
  return (
    <ActionForm action={editing ? updatePreparednessAction : createPreparednessAction}>
      {(state) => {
        const v = (k: string, fallback: string | null | undefined) => state.values?.[k] ?? fallback ?? "";
        return (
          <>
            {item?.id && <input type="hidden" name="id" value={item.id} />}
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title={editing ? "Record" : "New record"}>
              <Field label="Type" htmlFor="kind">
                <Select id="kind" name="kind" value={kind} onChange={(e) => setKind(e.target.value as PreparednessKind)}>
                  {PREPAREDNESS_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {PREPAREDNESS_KIND_LABELS[k]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Title" htmlFor="title" error={state.errors?.title}>
                <Input id="title" name="title" placeholder={hint.title} defaultValue={v("title", item?.title)} required />
              </Field>
              {isContact ? (
                <Field label="Phone" htmlFor="phone" optional error={state.errors?.phone}>
                  <Input id="phone" name="phone" type="tel" inputMode="tel" defaultValue={v("phone", item?.phone)} />
                </Field>
              ) : (
                <FormGrid>
                  <LocationField locations={locations} label="Room / area" defaultValue={v("locationId", item?.locationId)} defaultNewName={state.values?.newLocationName} defaultNewKind={state.values?.newLocationKind} error={state.errors?.locationId} newNameError={state.errors?.newLocationName} />
                  <Field label="Exactly where" htmlFor="whereText" optional error={state.errors?.whereText} hint="Describe it so a visitor could find it.">
                    <Input id="whereText" name="whereText" placeholder={hint.where} defaultValue={v("whereText", item?.whereText)} />
                  </Field>
                </FormGrid>
              )}
              <Field label={isContact ? "Notes" : "How to use it"} htmlFor="instructions" optional error={state.errors?.instructions}>
                <Textarea id="instructions" name="instructions" placeholder={hint.instructions} defaultValue={v("instructions", item?.instructions)} rows={4} />
              </Field>
              <Field label="Details" htmlFor="details" optional hint="Policy or account numbers, breaker map, model numbers.">
                <Textarea id="details" name="details" defaultValue={v("details", item?.details)} rows={3} />
              </Field>
            </FormSection>
            <FormActions>
              <ButtonLink href={cancelHref} variant="secondary">
                Cancel
              </ButtonLink>
              <SubmitButton>{editing ? "Save changes" : "Save record"}</SubmitButton>
            </FormActions>
          </>
        );
      }}
    </ActionForm>
  );
}
