"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePropertyCtx } from "@/core/auth/session";
import { parseForm } from "@/core/domain/form";
import { preparednessInput } from "@/core/domain/validation";
import { createPreparedness, deletePreparedness, updatePreparedness } from "@/core/services/preparedness";
import { echo, runAction, type ActionState } from "@/lib/actions";

export async function createPreparednessAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const parsed = parseForm(preparednessInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await createPreparedness(ctx, parsed.data);
    revalidatePath("/preparedness");
    revalidatePath("/home");
    redirect("/preparedness");
  });
}

export async function updatePreparednessAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    const parsed = parseForm(preparednessInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await updatePreparedness(ctx, id, parsed.data);
    revalidatePath("/preparedness");
    revalidatePath("/home");
    redirect(`/preparedness/${id}`);
  });
}

export async function deletePreparednessAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    await deletePreparedness(ctx, String(formData.get("id")));
    revalidatePath("/preparedness");
    revalidatePath("/home");
    redirect("/preparedness");
  });
}
