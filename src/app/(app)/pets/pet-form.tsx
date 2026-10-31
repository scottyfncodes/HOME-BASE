"use client";
import { useState } from "react";
import { ActionForm } from "@/components/ui/action-form";
import { Field, FormActions, FormGrid, FormMessage, FormSection, Input, Select, Textarea } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { ButtonLink } from "@/components/ui/button";
import { FileUpload } from "@/components/documents/file-upload";
import { ChoiceChips } from "@/components/pets/choice-chips";
import { MoreFields } from "@/components/pets/more-fields";
import { PET_SEX_LABELS, PET_SEXES, PET_SPECIES, PET_SPECIES_LABELS, WEIGHT_UNITS, type PetSpecies, type WeightUnit } from "@/core/domain/validation";
import { weightToInput } from "@/core/domain/pets";
import { createPetAction, updatePetAction } from "./actions";

export type PetFormValues = {
  id?: string;
  name?: string;
  species?: string;
  speciesDetail?: string | null;
  breed?: string | null;
  sex?: string | null;
  birthDate?: string | null;
  birthDateEstimated?: boolean;
  acquiredOn?: string | null;
  acquiredFrom?: string | null;
  color?: string | null;
  markings?: string | null;
  weightGrams?: number | null;
  weightUnit?: string;
  microchipNumber?: string | null;
  microchipProvider?: string | null;
  neutered?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  insuranceProvider?: string | null;
  insurancePolicyNumber?: string | null;
  insurancePhone?: string | null;
  notes?: string | null;
  photo?: { id: string; filename: string; contentType: string; sizeBytes: number } | null;
};

const DETAIL_PROMPT: Partial<Record<PetSpecies, { label: string; placeholder: string }>> = {
  bird: { label: "What kind of bird?", placeholder: "Cockatiel" },
  fish: { label: "What kind of fish?", placeholder: "Betta" },
  reptile: { label: "What kind of reptile?", placeholder: "Leopard gecko" },
  small_mammal: { label: "What kind?", placeholder: "Rabbit, guinea pig, hamster" },
  livestock: { label: "What kind?", placeholder: "Chickens, goat, horse" },
  other: { label: "What kind of animal?", placeholder: "Hermit crab" },
};

const BREED_PLACEHOLDER: Partial<Record<PetSpecies, string>> = { dog: "Golden retriever, or mixed", cat: "Domestic shorthair" };

export function PetForm({ pet, cancelHref, maxUploadMb = 4 }: { pet?: PetFormValues; cancelHref: string; maxUploadMb?: number }) {
  const editing = Boolean(pet?.id);
  return (
    <ActionForm action={editing ? updatePetAction : createPetAction}>
      {(state) => <PetFields pet={pet} state={state} editing={editing} cancelHref={cancelHref} maxUploadMb={maxUploadMb} />}
    </ActionForm>
  );
}

function PetFields({ pet, state, editing, cancelHref, maxUploadMb }: { pet?: PetFormValues; state: { ok?: boolean; message?: string; errors?: Record<string, string>; values?: Record<string, string> }; editing: boolean; cancelHref: string; maxUploadMb: number }) {
  const v = (k: string, fallback: string | null | undefined) => state.values?.[k] ?? fallback ?? "";
  const [species, setSpecies] = useState<PetSpecies | undefined>((state.values?.species ?? pet?.species) as PetSpecies | undefined);
  const unit = (v("weightUnit", pet?.weightUnit ?? "lb") || "lb") as WeightUnit;
  const err = state.errors ?? {};
  const detail = species ? DETAIL_PROMPT[species] : undefined;
  const hasAny = (...keys: (keyof PetFormValues)[]) => keys.some((k) => pet?.[k] != null && pet?.[k] !== "");

  return (
    <>
      {pet?.id && <input type="hidden" name="id" value={pet.id} />}
      <FormMessage message={state.ok === false ? state.message : undefined} />

      <FormSection title="Photo" description="A clear face photo makes every page about them easier to scan.">
        <FileUpload name="photoFileId" accept="image/*" existing={pet?.photo ?? null} maxMb={maxUploadMb} prompt={pet?.photo ? "Choose a new photo" : "Add a photo"} detail="Optional · from your library or camera" />
      </FormSection>

      <FormSection title="The basics">
        <Field label="Name" htmlFor="name" error={err.name}>
          <Input id="name" name="name" defaultValue={v("name", pet?.name)} autoComplete="off" autoCapitalize="words" required autoFocus={!editing} />
        </Field>
        <Field label="Animal" error={err.species}>
          <ChoiceChips name="species" label="Animal" value={species} onChange={setSpecies} options={PET_SPECIES.map((s) => ({ value: s, label: PET_SPECIES_LABELS[s] }))} />
        </Field>
        {detail && (
          <Field label={detail.label} htmlFor="speciesDetail" optional error={err.speciesDetail}>
            <Input id="speciesDetail" name="speciesDetail" placeholder={detail.placeholder} defaultValue={v("speciesDetail", pet?.speciesDetail)} />
          </Field>
        )}
        <FormGrid>
          <Field label="Breed" htmlFor="breed" optional error={err.breed}>
            <Input id="breed" name="breed" placeholder={species ? BREED_PLACEHOLDER[species] : undefined} defaultValue={v("breed", pet?.breed)} />
          </Field>
          <Field label="Sex" htmlFor="sex" optional>
            <Select id="sex" name="sex" defaultValue={v("sex", pet?.sex)}>
              <option value="">Not set</option>
              {PET_SEXES.map((s) => (
                <option key={s} value={s}>
                  {PET_SEX_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex flex-col gap-2">
            <Field label="Birthday" htmlFor="birthDate" optional error={err.birthDate} hint="Leave blank if nobody knows.">
              <Input id="birthDate" name="birthDate" type="date" defaultValue={v("birthDate", pet?.birthDate)} />
            </Field>
            <label className="inline-flex items-center gap-2 text-sm text-ink-2 w-fit">
              <input type="checkbox" name="birthDateEstimated" defaultChecked={state.values ? state.values.birthDateEstimated === "on" : pet?.birthDateEstimated} className="size-4 accent-[var(--brand)]" />
              This is an estimate
            </label>
          </div>
        </FormGrid>
      </FormSection>

      <MoreFields title="Appearance and ID" summary="Color, markings, microchip, weight" open={hasAny("color", "markings", "microchipNumber", "weightGrams") || Boolean(err.weight || err.microchipNumber)}>
        <FormGrid>
          <Field label="Color" htmlFor="color" optional>
            <Input id="color" name="color" placeholder="Red and white" defaultValue={v("color", pet?.color)} />
          </Field>
          <Field label="Current weight" htmlFor="weight" optional error={err.weight}>
            <div className="flex gap-2">
              <Input id="weight" name="weight" inputMode="decimal" placeholder="0" defaultValue={v("weight", weightToInput(pet?.weightGrams, (pet?.weightUnit as WeightUnit) ?? "lb"))} className="flex-1" />
              <Select name="weightUnit" defaultValue={unit} aria-label="Weight unit" className="w-20">
                {WEIGHT_UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </Select>
            </div>
          </Field>
        </FormGrid>
        <Field label="Distinguishing features" htmlFor="markings" optional hint="What would help someone recognize them: a white blaze, a notched ear, a limp.">
          <Textarea id="markings" name="markings" rows={2} defaultValue={v("markings", pet?.markings)} />
        </Field>
        <FormGrid>
          <Field label="Microchip number" htmlFor="microchipNumber" optional error={err.microchipNumber}>
            <Input id="microchipNumber" name="microchipNumber" inputMode="numeric" autoComplete="off" defaultValue={v("microchipNumber", pet?.microchipNumber)} />
          </Field>
          <Field label="Microchip registry" htmlFor="microchipProvider" optional>
            <Input id="microchipProvider" name="microchipProvider" placeholder="Where the chip is registered" defaultValue={v("microchipProvider", pet?.microchipProvider)} />
          </Field>
          <Field label="Spayed or neutered" htmlFor="neutered" optional>
            <Select id="neutered" name="neutered" defaultValue={v("neutered", pet?.neutered)}>
              <option value="">Not set</option>
              <option value="yes">Yes</option>
              <option value="no">No</option>
              <option value="unknown">Not sure</option>
            </Select>
          </Field>
        </FormGrid>
      </MoreFields>

      <MoreFields title="How they joined the family" summary="Adoption or acquisition date and where from" open={hasAny("acquiredOn", "acquiredFrom")}>
        <FormGrid>
          <Field label="Date" htmlFor="acquiredOn" optional error={err.acquiredOn}>
            <Input id="acquiredOn" name="acquiredOn" type="date" defaultValue={v("acquiredOn", pet?.acquiredOn)} />
          </Field>
          <Field label="From" htmlFor="acquiredFrom" optional>
            <Input id="acquiredFrom" name="acquiredFrom" placeholder="County shelter, a breeder, found as a stray" defaultValue={v("acquiredFrom", pet?.acquiredFrom)} />
          </Field>
        </FormGrid>
      </MoreFields>

      <MoreFields title="Emergency and insurance" summary="Who to call, and the policy details" open={hasAny("emergencyContactName", "emergencyContactPhone", "insuranceProvider", "insurancePolicyNumber")}>
        <FormGrid>
          <Field label="Emergency contact" htmlFor="emergencyContactName" optional hint="Someone who can step in if you cannot.">
            <Input id="emergencyContactName" name="emergencyContactName" autoComplete="off" defaultValue={v("emergencyContactName", pet?.emergencyContactName)} />
          </Field>
          <Field label="Their phone" htmlFor="emergencyContactPhone" optional>
            <Input id="emergencyContactPhone" name="emergencyContactPhone" type="tel" inputMode="tel" defaultValue={v("emergencyContactPhone", pet?.emergencyContactPhone)} />
          </Field>
          <Field label="Insurance company" htmlFor="insuranceProvider" optional>
            <Input id="insuranceProvider" name="insuranceProvider" defaultValue={v("insuranceProvider", pet?.insuranceProvider)} />
          </Field>
          <Field label="Policy number" htmlFor="insurancePolicyNumber" optional>
            <Input id="insurancePolicyNumber" name="insurancePolicyNumber" autoComplete="off" defaultValue={v("insurancePolicyNumber", pet?.insurancePolicyNumber)} />
          </Field>
          <Field label="Claims phone" htmlFor="insurancePhone" optional>
            <Input id="insurancePhone" name="insurancePhone" type="tel" inputMode="tel" defaultValue={v("insurancePhone", pet?.insurancePhone)} />
          </Field>
        </FormGrid>
        <p className="text-sm text-ink-2">Add their veterinarian from the profile once it is saved.</p>
      </MoreFields>

      <MoreFields title="Notes" summary="Temperament, quirks, what a sitter should know" open={hasAny("notes")}>
        <Field label="Notes" htmlFor="notes" optional>
          <Textarea id="notes" name="notes" rows={4} placeholder="Afraid of thunder. Hides under the bed. Loves the blue ball." defaultValue={v("notes", pet?.notes)} />
        </Field>
      </MoreFields>

      <FormActions>
        <ButtonLink href={cancelHref} variant="secondary">
          Cancel
        </ButtonLink>
        <SubmitButton>{editing ? "Save changes" : "Add pet"}</SubmitButton>
      </FormActions>
    </>
  );
}
