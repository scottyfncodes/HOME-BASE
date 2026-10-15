"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCtx, requirePropertyCtx } from "@/core/auth/session";
import { parseForm } from "@/core/domain/form";
import { vaultDocumentInput } from "@/core/domain/validation";
import { createVaultDocument, deleteVaultDocument, updateVaultDocument } from "@/core/services/documents";
import { audit, lockVault, unlockVault } from "@/core/services/vault";
import { echo, runAction, type ActionState } from "@/lib/actions";

export async function unlockVaultAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    const password = String(formData.get("password") ?? "");
    if (!password) return { ok: false, message: "Enter your password.", errors: { password: "Enter your password." } };
    await unlockVault(ctx, ctx.sessionId, password);
    revalidatePath("/vault");
    const next = String(formData.get("next") ?? "");
    redirect(next.startsWith("/vault") ? next : "/vault");
  });
}

export async function lockVaultAction(): Promise<void> {
  const ctx = await requireCtx();
  await lockVault(ctx, ctx.sessionId);
  revalidatePath("/vault");
  redirect("/vault");
}

export async function createVaultDocumentAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    if (!ctx.vaultUnlocked) redirect("/vault?next=/vault/new");
    const parsed = parseForm(vaultDocumentInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    const fileId = String(formData.get("fileId") ?? "") || null;
    const row = await createVaultDocument(ctx, parsed.data, fileId);
    await audit(ctx, "document_create", row.id);
    revalidatePath("/vault");
    redirect(`/vault/${row.id}`);
  });
}

export async function updateVaultDocumentAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    if (!ctx.vaultUnlocked) redirect(`/vault?next=/vault/${id}/edit`);
    const parsed = parseForm(vaultDocumentInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await updateVaultDocument(ctx, id, parsed.data);
    await audit(ctx, "document_update", id);
    revalidatePath("/vault");
    redirect(`/vault/${id}`);
  });
}

export async function deleteVaultDocumentAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    if (!ctx.vaultUnlocked) redirect("/vault");
    await deleteVaultDocument(ctx, id);
    await audit(ctx, "document_delete", id);
    revalidatePath("/vault");
    redirect("/vault");
  });
}
