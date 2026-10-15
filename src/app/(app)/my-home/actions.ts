"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePropertyCtx } from "@/core/auth/session";
import { parseForm } from "@/core/domain/form";
import { locationInput, propertyInput } from "@/core/domain/validation";
import { updateProperty } from "@/core/services/property";
import { createLocation, deleteLocation, updateLocation } from "@/core/services/locations";
import { echo, runAction, type ActionState } from "@/lib/actions";

export async function updatePropertyAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const parsed = parseForm(propertyInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await updateProperty(ctx, parsed.data);
    revalidatePath("/", "layout");
    redirect("/my-home");
  }, formData);
}

export async function createLocationAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const parsed = parseForm(locationInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    const row = await createLocation(ctx, parsed.data);
    revalidatePath("/my-home");
    redirect(`/my-home/locations/${row.id}`);
  }, formData);
}

export async function updateLocationAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    const parsed = parseForm(locationInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await updateLocation(ctx, id, parsed.data);
    revalidatePath("/my-home");
    redirect(`/my-home/locations/${id}`);
  }, formData);
}

export async function deleteLocationAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    await deleteLocation(ctx, String(formData.get("id")));
    revalidatePath("/my-home");
    redirect("/my-home");
  }, formData);
}
