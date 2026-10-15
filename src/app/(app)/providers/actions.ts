"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCtx } from "@/core/auth/session";
import { parseForm } from "@/core/domain/form";
import { providerInput } from "@/core/domain/validation";
import { createProvider, deleteProvider, updateProvider } from "@/core/services/providers";
import { echo, runAction, type ActionState } from "@/lib/actions";

export async function createProviderAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    const parsed = parseForm(providerInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await createProvider(ctx, parsed.data);
    revalidatePath("/providers");
    const back = String(formData.get("back") ?? "");
    redirect(back.startsWith("/") ? back : "/providers");
  }, formData);
}

export async function updateProviderAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    const id = String(formData.get("id"));
    const parsed = parseForm(providerInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await updateProvider(ctx, id, parsed.data);
    revalidatePath("/providers");
    redirect("/providers");
  }, formData);
}

export async function deleteProviderAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    await deleteProvider(ctx, String(formData.get("id")));
    revalidatePath("/providers");
    redirect("/providers");
  }, formData);
}
