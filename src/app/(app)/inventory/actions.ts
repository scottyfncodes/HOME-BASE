"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePropertyCtx } from "@/core/auth/session";
import { parseForm } from "@/core/domain/form";
import { assetInput } from "@/core/domain/validation";
import { createAsset, deleteAsset, reactivateAsset, retireAsset, updateAsset } from "@/core/services/assets";
import { echo, runAction, type ActionState } from "@/lib/actions";

export async function createAssetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const parsed = parseForm(assetInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    const row = await createAsset(ctx, parsed.data);
    revalidatePath("/inventory");
    redirect(`/inventory/${row.id}`);
  }, formData);
}

export async function updateAssetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    const parsed = parseForm(assetInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await updateAsset(ctx, id, parsed.data);
    revalidatePath("/inventory");
    redirect(`/inventory/${id}`);
  }, formData);
}

export async function retireAssetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    const status = formData.get("status") === "replaced" ? "replaced" : "retired";
    await retireAsset(ctx, id, status);
    revalidatePath("/inventory");
    redirect(`/inventory/${id}`);
  }, formData);
}

export async function reactivateAssetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    await reactivateAsset(ctx, id);
    revalidatePath("/inventory");
    redirect(`/inventory/${id}`);
  }, formData);
}

export async function deleteAssetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    await deleteAsset(ctx, String(formData.get("id")));
    revalidatePath("/inventory");
    redirect("/inventory");
  }, formData);
}
