"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { ProviderSelect } from "@/components/forms/pickers";
import { FileUpload } from "@/components/documents/file-upload";
import { ChoiceChips } from "@/components/pets/choice-chips";
import { MoreFields } from "@/components/pets/more-fields";
import {
  NEW_PROVIDER_VALUE,
  PET_CARE_KIND_LABELS,
  PET_CARE_KINDS,
  PET_EXPENSE_CATEGORIES,
  PET_EXPENSE_CATEGORY_LABELS,
  PET_HEALTH_KIND_LABELS,
  PET_HEALTH_KINDS,
  PET_PROVIDER_ROLE_LABELS,
  PET_PROVIDER_ROLES,
  type PetHealthKind,
} from "@/core/domain/validation";
import { RECURRENCE_PRESETS, recurrenceToValue } from "@/core/domain/recurrence";
import { centsToInput } from "@/core/domain/money";
import { COMMON_VACCINES } from "@/core/domain/pets";
import type { Recurrence } from "@/core/db/schema";
import type { ActionState } from "@/lib/actions";
import { linkProviderAction, saveCareRoutineAction, saveExpenseAction, saveHealthEventAction, saveMedicationAction, saveVaccinationAction } from "./actions";

type Opt = { id: string; name: string };
type FileRef = { id: string; filename: string; contentType: string; sizeBytes: number };
const val = (state: ActionState) => (k: string, fallback: string | null | undefined) => state.values?.[k] ?? fallback ?? "";

function Footer({ cancelHref, label }: { cancelHref: string; label: string }) {
  return (
    <FormActions>
      <ButtonLink href={cancelHref} variant="secondary">
        Cancel
      </ButtonLink>
      <SubmitButton>{label}</SubmitButton>
    </FormActions>
  );
}

/* ------------------------------ health entry ------------------------------ */

const KIND_COPY: Record<PetHealthKind, { title: string; placeholder: string; date: string; description: string }> = {
  vet_visit: { title: "Reason for the visit", placeholder: "Annual exam", date: "Date", description: "What happened, what the vet said" },
  condition: { title: "Condition", placeholder: "Hip dysplasia", date: "Diagnosed on", description: "Details as recorded by the vet" },
  allergy: { title: "Allergic to", placeholder: "Chicken", date: "Noticed on", description: "Reaction and what to avoid" },
  procedure: { title: "Procedure", placeholder: "Dental cleaning", date: "Date", description: "What was done" },
  test: { title: "Test", placeholder: "Bloodwork", date: "Date", description: "Results as reported" },
  weight: { title: "Note", placeholder: "", date: "Weighed on", description: "" },
  injury: { title: "Injury", placeholder: "Cut paw pad", date: "Date", description: "What happened" },
  other: { title: "Title", placeholder: "", date: "Date", description: "Details" },
};

export type HealthEventValues = {
  id?: string;
  kind?: string;
  title?: string | null;
  occurredOn?: string;
  description?: string | null;
  providerId?: string | null;
  costCents?: number | null;
  weight?: string;
  followUpOn?: string | null;
  notes?: string | null;
};

export function HealthEventForm({ petId, petName, event, providers, weightUnit, cancelHref, today, maxMb }: { petId: string; petName: string; event?: HealthEventValues; providers: Opt[]; weightUnit: string; cancelHref: string; today: string; maxMb: number }) {
  const [kind, setKind] = useState<PetHealthKind>((event?.kind as PetHealthKind) ?? "vet_visit");
  const copy = KIND_COPY[kind];
  const isWeight = kind === "weight";
  return (
    <ActionForm action={saveHealthEventAction}>
      {(state) => {
        const v = val(state);
        const err = state.errors ?? {};
        return (
          <>
            <input type="hidden" name="petId" value={petId} />
            {event?.id && <input type="hidden" name="id" value={event.id} />}
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title="What kind of record?">
              <ChoiceChips name="kind" label="Record type" value={kind} onChange={setKind} options={PET_HEALTH_KINDS.map((k) => ({ value: k, label: PET_HEALTH_KIND_LABELS[k] }))} />
            </FormSection>
            <FormSection title={isWeight ? `${petName}'s weight` : "Details"}>
              {isWeight ? (
                <FormGrid>
                  <Field label={`Weight (${weightUnit})`} htmlFor="weight" error={err.weight}>
                    <Input id="weight" name="weight" inputMode="decimal" autoFocus defaultValue={v("weight", event?.weight)} />
                  </Field>
                  <Field label={copy.date} htmlFor="occurredOn" error={err.occurredOn}>
                    <Input id="occurredOn" name="occurredOn" type="date" defaultValue={v("occurredOn", event?.occurredOn ?? today)} />
                  </Field>
                </FormGrid>
              ) : (
                <>
                  <Field label={copy.title} htmlFor="title" error={err.title} optional>
                    <Input id="title" name="title" placeholder={copy.placeholder} defaultValue={v("title", event?.title)} />
                  </Field>
                  <FormGrid>
                    <Field label={copy.date} htmlFor="occurredOn" error={err.occurredOn} hint={kind === "vet_visit" ? "A future date records an upcoming appointment." : undefined}>
                      <Input id="occurredOn" name="occurredOn" type="date" defaultValue={v("occurredOn", event?.occurredOn ?? today)} />
                    </Field>
                    <Field label={kind === "vet_visit" ? "Veterinarian" : "Vet or provider"} htmlFor="providerId" optional error={err.providerId}>
                      <ProviderSelect providers={providers} defaultValue={v("providerId", event?.providerId)} />
                    </Field>
                    {(kind === "vet_visit" || kind === "procedure" || kind === "test" || kind === "injury" || kind === "other") && (
                      <Field label="Cost" htmlFor="cost" optional error={err.cost} hint="Added to pet expenses.">
                        <Input id="cost" name="cost" inputMode="decimal" placeholder="0.00" defaultValue={v("cost", centsToInput(event?.costCents))} />
                      </Field>
                    )}
                    <Field label="Follow up on" htmlFor="followUpOn" optional error={err.followUpOn} hint="A recheck or next appointment. It appears in reminders.">
                      <Input id="followUpOn" name="followUpOn" type="date" defaultValue={v("followUpOn", event?.followUpOn)} />
                    </Field>
                  </FormGrid>
                  <Field label="Description" htmlFor="description" optional hint={copy.description}>
                    <Textarea id="description" name="description" rows={3} defaultValue={v("description", event?.description)} />
                  </Field>
                </>
              )}
            </FormSection>
            {!isWeight && (
              <MoreFields title="Attach a document" summary="Invoice, discharge notes, lab results" open={false}>
                <FileUpload maxMb={maxMb} detail={`Filed under ${petName}'s documents · up to ${maxMb} MB`} />
              </MoreFields>
            )}
            <MoreFields title="Private notes" summary="Anything else worth remembering" open={Boolean(event?.notes)}>
              <Field label="Notes" htmlFor="notes" optional>
                <Textarea id="notes" name="notes" rows={3} defaultValue={v("notes", event?.notes)} />
              </Field>
            </MoreFields>
            <Footer cancelHref={cancelHref} label={event?.id ? "Save changes" : "Save record"} />
          </>
        );
      }}
    </ActionForm>
  );
}

/* ------------------------------- vaccination ------------------------------ */

export type VaccinationValues = { id?: string; name?: string; administeredOn?: string; nextDueOn?: string | null; providerId?: string | null; notes?: string | null; document?: { id: string; title: string } | null };

export function VaccinationForm({ petId, species, vaccination, providers, cancelHref, today, maxMb }: { petId: string; species: string; vaccination?: VaccinationValues; providers: Opt[]; cancelHref: string; today: string; maxMb: number }) {
  const suggestions = COMMON_VACCINES[species] ?? [];
  return (
    <ActionForm action={saveVaccinationAction}>
      {(state) => {
        const v = val(state);
        const err = state.errors ?? {};
        return (
          <>
            <input type="hidden" name="petId" value={petId} />
            {vaccination?.id && <input type="hidden" name="id" value={vaccination.id} />}
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title="Vaccination" description="Copy the details from the vet's certificate or invoice.">
              <Field label="Vaccine" htmlFor="name" error={err.name}>
                <Input id="name" name="name" list="vaccine-suggestions" defaultValue={v("name", vaccination?.name)} autoComplete="off" required />
                {suggestions.length > 0 && (
                  <datalist id="vaccine-suggestions">
                    {suggestions.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                )}
              </Field>
              <FormGrid>
                <Field label="Given on" htmlFor="administeredOn" error={err.administeredOn}>
                  <Input id="administeredOn" name="administeredOn" type="date" defaultValue={v("administeredOn", vaccination?.administeredOn ?? today)} />
                </Field>
                <Field label="Next due" htmlFor="nextDueOn" optional error={err.nextDueOn} hint="From the certificate. You will be reminded.">
                  <Input id="nextDueOn" name="nextDueOn" type="date" defaultValue={v("nextDueOn", vaccination?.nextDueOn)} />
                </Field>
                <Field label="Given by" htmlFor="providerId" optional>
                  <ProviderSelect providers={providers} defaultValue={v("providerId", vaccination?.providerId)} />
                </Field>
              </FormGrid>
            </FormSection>
            <FormSection title="Certificate" description={vaccination?.document ? `Currently attached: ${vaccination.document.title}. Upload to add a newer one.` : "Optional. Filed under the pet's documents."}>
              <FileUpload maxMb={maxMb} prompt="Add the certificate" />
            </FormSection>
            <MoreFields title="Notes" summary="Lot number, reactions, anything else" open={Boolean(vaccination?.notes)}>
              <Field label="Notes" htmlFor="notes" optional>
                <Textarea id="notes" name="notes" rows={3} defaultValue={v("notes", vaccination?.notes)} />
              </Field>
            </MoreFields>
            <Footer cancelHref={cancelHref} label={vaccination?.id ? "Save changes" : "Save vaccination"} />
          </>
        );
      }}
    </ActionForm>
  );
}

/* ------------------------------- medication ------------------------------- */

export type MedicationValues = { id?: string; name?: string; dosage?: string | null; frequency?: string | null; startedOn?: string | null; endedOn?: string | null; providerId?: string | null; instructions?: string | null; notes?: string | null; active?: boolean };

export function MedicationForm({ petId, medication, providers, cancelHref, today }: { petId: string; medication?: MedicationValues; providers: Opt[]; cancelHref: string; today: string }) {
  return (
    <ActionForm action={saveMedicationAction}>
      {(state) => {
        const v = val(state);
        const err = state.errors ?? {};
        const active = state.values ? state.values.active === "on" : (medication?.active ?? true);
        return (
          <>
            <input type="hidden" name="petId" value={petId} />
            {medication?.id && <input type="hidden" name="id" value={medication.id} />}
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title="Medication" description="Enter it exactly as written on the prescription label. Home Base keeps the record; it never changes a dose.">
              <Field label="Name" htmlFor="name" error={err.name}>
                <Input id="name" name="name" defaultValue={v("name", medication?.name)} autoComplete="off" required />
              </Field>
              <FormGrid>
                <Field label="Dosage" htmlFor="dosage" optional>
                  <Input id="dosage" name="dosage" placeholder="As on the label" defaultValue={v("dosage", medication?.dosage)} />
                </Field>
                <Field label="How often" htmlFor="frequency" optional>
                  <Input id="frequency" name="frequency" placeholder="As on the label" defaultValue={v("frequency", medication?.frequency)} />
                </Field>
                <Field label="Started" htmlFor="startedOn" optional error={err.startedOn}>
                  <Input id="startedOn" name="startedOn" type="date" defaultValue={v("startedOn", medication?.startedOn ?? (medication?.id ? "" : today))} />
                </Field>
                <Field label="Ends" htmlFor="endedOn" optional error={err.endedOn}>
                  <Input id="endedOn" name="endedOn" type="date" defaultValue={v("endedOn", medication?.endedOn)} />
                </Field>
                <Field label="Prescribed by" htmlFor="providerId" optional>
                  <ProviderSelect providers={providers} defaultValue={v("providerId", medication?.providerId)} />
                </Field>
              </FormGrid>
              <Field label="Instructions" htmlFor="instructions" optional hint="With food, shake well, keep refrigerated.">
                <Textarea id="instructions" name="instructions" rows={3} defaultValue={v("instructions", medication?.instructions)} />
              </Field>
              <label className="inline-flex items-center gap-2 text-[15px] w-fit">
                <input type="checkbox" name="active" defaultChecked={active} className="size-4 accent-[var(--brand)]" />
                Currently giving this medication
              </label>
            </FormSection>
            <MoreFields title="Notes" summary="Pharmacy, refills, side effects you noticed" open={Boolean(medication?.notes)}>
              <Field label="Notes" htmlFor="notes" optional>
                <Textarea id="notes" name="notes" rows={3} defaultValue={v("notes", medication?.notes)} />
              </Field>
            </MoreFields>
            <Footer cancelHref={cancelHref} label={medication?.id ? "Save changes" : "Save medication"} />
          </>
        );
      }}
    </ActionForm>
  );
}

/* ------------------------------ care routine ------------------------------ */

export type CareValues = { id?: string; title?: string; careKind?: string | null; dueOn?: string; recurrence?: Recurrence | null; recurrenceValue?: string; description?: string | null; medicationId?: string | null };

const CARE_PRESETS = [
  { label: "Every day", value: "1-day" },
  { label: "Every week", value: "1-week" },
  { label: "Every 2 weeks", value: "2-week" },
  { label: "Every month", value: "1-month" },
  { label: "Every 3 months", value: "3-month" },
  { label: "Every year", value: "1-year" },
];

export function CareRoutineForm({ petId, routine, medications, cancelHref, today }: { petId: string; routine?: CareValues; medications: Opt[]; cancelHref: string; today: string }) {
  const initial = routine?.recurrenceValue ?? (routine?.id ? recurrenceToValue(routine.recurrence) : "1-day");
  const known = [...CARE_PRESETS, ...RECURRENCE_PRESETS].some((p) => p.value === initial);
  const [recurrence, setRecurrence] = useState(known ? initial : initial ? "custom" : "");
  const [careKind, setCareKind] = useState(routine?.careKind ?? "feeding");
  const custom = !known && initial ? initial.split("-") : ["2", "day"];
  return (
    <ActionForm action={saveCareRoutineAction}>
      {(state) => {
        const v = val(state);
        const err = state.errors ?? {};
        return (
          <>
            <input type="hidden" name="petId" value={petId} />
            {routine?.id && <input type="hidden" name="id" value={routine.id} />}
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title="Routine">
              <Field label="Kind of care" htmlFor="careKind">
                <Select id="careKind" name="careKind" value={careKind} onChange={(e) => setCareKind(e.target.value)}>
                  {PET_CARE_KINDS.map((k) => (
                    <option key={k} value={k}>
                      {PET_CARE_KIND_LABELS[k]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Name it" htmlFor="title" error={err.title} hint="Short and specific: Breakfast, Evening walk, Heartworm chew.">
                <Input id="title" name="title" defaultValue={v("title", routine?.title)} required />
              </Field>
              <FormGrid>
                <Field label="Repeats" htmlFor="recurrence">
                  <Select id="recurrence" name="recurrence" value={recurrence} onChange={(e) => setRecurrence(e.target.value)}>
                    {CARE_PRESETS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                    <option value="">Just once</option>
                    <option value="custom">Custom…</option>
                  </Select>
                </Field>
                <Field label={routine?.id ? "Next due" : "Starts"} htmlFor="dueOn" error={err.dueOn}>
                  <Input id="dueOn" name="dueOn" type="date" defaultValue={v("dueOn", routine?.dueOn ?? today)} />
                </Field>
              </FormGrid>
              {recurrence === "custom" && (
                <FormGrid>
                  <Field label="Every" htmlFor="every">
                    <Input id="every" name="every" inputMode="numeric" defaultValue={v("every", custom[0])} />
                  </Field>
                  <Field label="Unit" htmlFor="unit">
                    <Select id="unit" name="unit" defaultValue={v("unit", custom[1])}>
                      <option value="day">Days</option>
                      <option value="week">Weeks</option>
                      <option value="month">Months</option>
                      <option value="year">Years</option>
                    </Select>
                  </Field>
                </FormGrid>
              )}
              {recurrence !== "" && recurrence !== "1-day" && (
                <Field label="Count the next one from" htmlFor="anchor">
                  <Select id="anchor" name="anchor" defaultValue={v("anchor", routine?.recurrence?.anchor ?? "completed")}>
                    <option value="completed">When it was last done</option>
                    <option value="due">The scheduled date</option>
                  </Select>
                </Field>
              )}
              {careKind === "medication" && medications.length > 0 && (
                <Field label="For which medication" htmlFor="medicationId" optional hint="Its reminders stop when the medication is marked as stopped.">
                  <Select id="medicationId" name="medicationId" defaultValue={v("medicationId", routine?.medicationId)}>
                    <option value="">Not linked</option>
                    {medications.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}
            </FormSection>
            <MoreFields title="Instructions" summary="Amounts, where things are kept, who usually does it" open={Boolean(routine?.description)}>
              <Field label="Instructions" htmlFor="description" optional>
                <Textarea id="description" name="description" rows={3} defaultValue={v("description", routine?.description)} />
              </Field>
            </MoreFields>
            <Footer cancelHref={cancelHref} label={routine?.id ? "Save changes" : "Add routine"} />
          </>
        );
      }}
    </ActionForm>
  );
}

/* --------------------------------- expense -------------------------------- */

export type ExpenseValues = { id?: string; title?: string; amountCents?: number; spentOn?: string; category?: string | null; providerId?: string | null; notes?: string | null };

export function PetExpenseForm({ petId, expense, providers, cancelHref, today, defaultCategory }: { petId: string; expense?: ExpenseValues; providers: Opt[]; cancelHref: string; today: string; defaultCategory?: string }) {
  return (
    <ActionForm action={saveExpenseAction}>
      {(state) => {
        const v = val(state);
        const err = state.errors ?? {};
        return (
          <>
            <input type="hidden" name="petId" value={petId} />
            {expense?.id && <input type="hidden" name="id" value={expense.id} />}
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title="Expense">
              <Field label="Category" error={err.category}>
                <ChoiceChips name="category" label="Category" defaultValue={(v("category", expense?.category ?? defaultCategory ?? "food") || "food") as (typeof PET_EXPENSE_CATEGORIES)[number]} options={PET_EXPENSE_CATEGORIES.map((c) => ({ value: c, label: PET_EXPENSE_CATEGORY_LABELS[c] }))} />
              </Field>
              <FormGrid>
                <Field label="What for" htmlFor="title" error={err.title}>
                  <Input id="title" name="title" placeholder="30 lb bag of food" defaultValue={v("title", expense?.title)} required />
                </Field>
                <Field label="Amount" htmlFor="amount" error={err.amount}>
                  <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" defaultValue={v("amount", centsToInput(expense?.amountCents))} required />
                </Field>
                <Field label="Date" htmlFor="spentOn" error={err.spentOn}>
                  <Input id="spentOn" name="spentOn" type="date" defaultValue={v("spentOn", expense?.spentOn ?? today)} />
                </Field>
                <Field label="Paid to" htmlFor="providerId" optional>
                  <ProviderSelect providers={providers} defaultValue={v("providerId", expense?.providerId)} />
                </Field>
              </FormGrid>
              <Field label="Notes" htmlFor="notes" optional>
                <Textarea id="notes" name="notes" rows={2} defaultValue={v("notes", expense?.notes)} />
              </Field>
            </FormSection>
            <Footer cancelHref={cancelHref} label={expense?.id ? "Save changes" : "Save expense"} />
          </>
        );
      }}
    </ActionForm>
  );
}

/* -------------------------------- care team ------------------------------- */

export function LinkProviderForm({ petId, providers, cancelHref, defaultRole }: { petId: string; providers: Opt[]; cancelHref: string; defaultRole?: string }) {
  const [providerId, setProviderId] = useState(providers.length === 0 ? NEW_PROVIDER_VALUE : "");
  const isNew = providerId === NEW_PROVIDER_VALUE;
  return (
    <ActionForm action={linkProviderAction}>
      {(state) => {
        const v = val(state);
        const err = state.errors ?? {};
        return (
          <>
            <input type="hidden" name="petId" value={petId} />
            <FormMessage message={state.ok === false ? state.message : undefined} />
            <FormSection title="Who" description="Providers are shared across the household, so a clinic you add here is available for every pet.">
              <FormGrid>
                <Field label="Role" htmlFor="role">
                  <Select id="role" name="role" defaultValue={v("role", defaultRole ?? "primary_vet")}>
                    {PET_PROVIDER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {PET_PROVIDER_ROLE_LABELS[r]}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Provider" htmlFor="providerId" error={err.providerId}>
                  <Select id="providerId" name="providerId" value={providerId} onChange={(e) => setProviderId(e.target.value)} required>
                    {providers.length > 0 && <option value="">Choose…</option>}
                    {providers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                    <option value={NEW_PROVIDER_VALUE}>Someone new…</option>
                  </Select>
                </Field>
              </FormGrid>
            </FormSection>
            {isNew && (
              <FormSection title="New provider">
                <Field label="Clinic or person" htmlFor="newName" error={err.newName}>
                  <Input id="newName" name="newName" defaultValue={v("newName", "")} autoFocus required />
                </Field>
                <FormGrid>
                  <Field label="Phone" htmlFor="newPhone" optional>
                    <Input id="newPhone" name="newPhone" type="tel" inputMode="tel" defaultValue={v("newPhone", "")} />
                  </Field>
                  <Field label="After-hours phone" htmlFor="newAfterHoursPhone" optional>
                    <Input id="newAfterHoursPhone" name="newAfterHoursPhone" type="tel" inputMode="tel" defaultValue={v("newAfterHoursPhone", "")} />
                  </Field>
                  <Field label="Website" htmlFor="newWebsite" optional>
                    <Input id="newWebsite" name="newWebsite" inputMode="url" defaultValue={v("newWebsite", "")} />
                  </Field>
                </FormGrid>
                <Field label="Address" htmlFor="newAddress" optional>
                  <Textarea id="newAddress" name="newAddress" rows={2} defaultValue={v("newAddress", "")} />
                </Field>
              </FormSection>
            )}
            <Footer cancelHref={cancelHref} label="Add to care team" />
          </>
        );
      }}
    </ActionForm>
  );
}

export type { FileRef };
