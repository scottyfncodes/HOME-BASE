"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePropertyCtx } from "@/core/auth/session";
import { parseForm } from "@/core/domain/form";
import { documentInput } from "@/core/domain/validation";
import { createDocument, deleteDocument, updateDocument } from "@/core/services/documents";
import { echo, runAction, type ActionState } from "@/lib/actions";

export async function createDocumentAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const parsed = parseForm(documentInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    const fileId = String(formData.get("fileId") ?? "") || null;
    const row = await createDocument(ctx, parsed.data, fileId);
    revalidatePath("/documents");
    const back = String(formData.get("back") ?? "");
    redirect(back.startsWith("/") ? back : `/documents/${row.id}`);
  });
}

export async function updateDocumentAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    const parsed = parseForm(documentInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    const fileIdRaw = String(formData.get("fileId") ?? "");
    const removed = formData.get("fileIdRemoved") === "1";
    // undefined = keep the current file; null = detach; string = replace.
    const fileId = fileIdRaw ? fileIdRaw : removed ? null : undefined;
    await updateDocument(ctx, id, parsed.data, fileId);
    revalidatePath("/documents");
    redirect(`/documents/${id}`);
  });
}

export async function deleteDocumentAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    await deleteDocument(ctx, String(formData.get("id")));
    revalidatePath("/documents");
    redirect("/documents");
  });
}
