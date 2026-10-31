"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePropertyCtx } from "@/core/auth/session";
import { parseForm } from "@/core/domain/form";
import { petCareInput, petExpenseInput, petHealthEventInput, petInput, petMedicationInput, petProviderLinkInput, petVaccinationInput } from "@/core/domain/validation";
import { archivePet, createPet, deletePet, linkPetProvider, restorePet, unlinkPetProvider, updatePet } from "@/core/services/pets";
import { createHealthEvent, createMedication, createVaccination, deleteHealthEvent, deleteMedication, deleteVaccination, stopMedication, updateHealthEvent, updateMedication, updateVaccination } from "@/core/services/pet-health";
import { completeCare, createCareRoutine, deleteCareRoutine, updateCareRoutine } from "@/core/services/pet-care";
import { createPetExpense, deletePetExpense, updatePetExpense } from "@/core/services/pet-spending";
import { echo, runAction, type ActionState } from "@/lib/actions";
import { recurrenceFromForm } from "@/lib/recurrence-form";

/** Every pet mutation refreshes the pet's pages, the Pets landing and the Home dashboard. */
function refresh(petId?: string) {
  revalidatePath("/pets", "layout");
  revalidatePath("/home");
  revalidatePath("/preparedness");
  if (petId) revalidatePath(`/pets/${petId}`, "layout");
}

function str(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

/** undefined = keep the current file; null = remove it; string = new upload. */
function fileChange(formData: FormData, key: string): string | null | undefined {
  const id = str(formData, key);
  if (id) return id;
  return formData.get(`${key}Removed`) === "1" ? null : undefined;
}

function invalid(parsed: { message: string; errors: Record<string, string> }, formData: FormData): ActionState {
  return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
}

/* -------------------------------- profiles -------------------------------- */

export async function createPetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const parsed = parseForm(petInput, formData);
    if (!parsed.ok) return invalid(parsed, formData);
    const row = await createPet(ctx, parsed.data, str(formData, "photoFileId") || null);
    refresh(row.id);
    redirect(`/pets/${row.id}`);
  }, formData);
}

export async function updatePetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = str(formData, "id");
    const parsed = parseForm(petInput, formData);
    if (!parsed.ok) return invalid(parsed, formData);
    await updatePet(ctx, id, parsed.data, fileChange(formData, "photoFileId"));
    refresh(id);
    redirect(`/pets/${id}`);
  }, formData);
}

export async function archivePetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = str(formData, "id");
    await archivePet(ctx, id, str(formData, "reason") || null);
    refresh(id);
    redirect(`/pets/${id}`);
  }, formData);
}

export async function restorePetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = str(formData, "id");
    await restorePet(ctx, id);
    refresh(id);
    redirect(`/pets/${id}`);
  }, formData);
}

export async function deletePetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    await deletePet(ctx, str(formData, "id"));
    refresh();
    revalidatePath("/documents");
    redirect("/pets");
  }, formData);
}

/* -------------------------------- care team ------------------------------- */

export async function linkProviderAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    const parsed = parseForm(petProviderLinkInput, formData);
    if (!parsed.ok) return invalid(parsed, formData);
    await linkPetProvider(ctx, petId, parsed.data);
    refresh(petId);
    revalidatePath("/providers");
    redirect(`/pets/${petId}`);
  }, formData);
}

export async function unlinkProviderAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    await unlinkPetProvider(ctx, petId, str(formData, "providerId"));
    refresh(petId);
    redirect(`/pets/${petId}`);
  }, formData);
}

/* --------------------------------- health --------------------------------- */

export async function saveHealthEventAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    const id = str(formData, "id");
    const parsed = parseForm(petHealthEventInput, formData);
    if (!parsed.ok) return invalid(parsed, formData);
    const fileId = str(formData, "fileId") || null;
    if (id) await updateHealthEvent(ctx, petId, id, parsed.data, fileId);
    else await createHealthEvent(ctx, petId, parsed.data, fileId);
    refresh(petId);
    revalidatePath("/documents");
    redirect(`/pets/${petId}/health`);
  }, formData);
}

export async function deleteHealthEventAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    await deleteHealthEvent(ctx, petId, str(formData, "id"));
    refresh(petId);
    redirect(`/pets/${petId}/health`);
  }, formData);
}

export async function saveVaccinationAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    const id = str(formData, "id");
    const parsed = parseForm(petVaccinationInput, formData);
    if (!parsed.ok) return invalid(parsed, formData);
    const fileId = str(formData, "fileId") || null;
    if (id) await updateVaccination(ctx, petId, id, parsed.data, fileId);
    else await createVaccination(ctx, petId, parsed.data, fileId);
    refresh(petId);
    revalidatePath("/documents");
    redirect(`/pets/${petId}/health`);
  }, formData);
}

export async function deleteVaccinationAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    await deleteVaccination(ctx, petId, str(formData, "id"));
    refresh(petId);
    redirect(`/pets/${petId}/health`);
  }, formData);
}

export async function saveMedicationAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    const id = str(formData, "id");
    const parsed = parseForm(petMedicationInput, formData);
    if (!parsed.ok) return invalid(parsed, formData);
    if (id) await updateMedication(ctx, petId, id, parsed.data);
    else await createMedication(ctx, petId, parsed.data);
    refresh(petId);
    redirect(`/pets/${petId}/health`);
  }, formData);
}

export async function stopMedicationAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    await stopMedication(ctx, petId, str(formData, "id"));
    refresh(petId);
    redirect(`/pets/${petId}/health`);
  }, formData);
}

export async function deleteMedicationAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    await deleteMedication(ctx, petId, str(formData, "id"));
    refresh(petId);
    redirect(`/pets/${petId}/health`);
  }, formData);
}

/* ---------------------------------- care ---------------------------------- */

export async function saveCareRoutineAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    const id = str(formData, "id");
    const parsed = parseForm(petCareInput.omit({ recurrence: true }), formData);
    if (!parsed.ok) return invalid(parsed, formData);
    const input = { ...parsed.data, recurrence: recurrenceFromForm(formData) };
    if (id) await updateCareRoutine(ctx, petId, id, input);
    else await createCareRoutine(ctx, petId, input);
    refresh(petId);
    redirect(`/pets/${petId}/care`);
  }, formData);
}

export async function deleteCareRoutineAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    await deleteCareRoutine(ctx, petId, str(formData, "id"));
    refresh(petId);
    redirect(`/pets/${petId}/care`);
  }, formData);
}

/** One-tap "Done". Stays on the page it was pressed on. */
export async function completeCareAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    const result = await completeCare(ctx, petId, str(formData, "id"));
    refresh(petId);
    return { ok: true, message: "Done", data: { nextDue: result.nextDue ?? "" } };
  }, formData);
}

/* -------------------------------- expenses -------------------------------- */

export async function saveExpenseAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    const id = str(formData, "id");
    const parsed = parseForm(petExpenseInput, formData);
    if (!parsed.ok) return invalid(parsed, formData);
    if (id) await updatePetExpense(ctx, petId, id, parsed.data);
    else await createPetExpense(ctx, petId, parsed.data);
    refresh(petId);
    revalidatePath("/my-home/spending");
    redirect(`/pets/${petId}/expenses`);
  }, formData);
}

export async function deleteExpenseAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const petId = str(formData, "petId");
    await deletePetExpense(ctx, petId, str(formData, "id"));
    refresh(petId);
    revalidatePath("/my-home/spending");
    redirect(`/pets/${petId}/expenses`);
  }, formData);
}
