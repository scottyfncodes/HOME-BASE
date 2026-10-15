"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePropertyCtx } from "@/core/auth/session";
import { parseForm } from "@/core/domain/form";
import { completeTaskInput, isoDate, maintenanceLogInput, maintenanceTaskInput } from "@/core/domain/validation";
import { cancelTask, completeTask, createTask, deleteLog, deleteTask, recordMaintenance, rescheduleTask, updateTask } from "@/core/services/maintenance";
import { recurrenceFromForm } from "@/lib/recurrence-form";
import { echo, runAction, type ActionState } from "@/lib/actions";

function taskPayload(formData: FormData) {
  const parsed = parseForm(maintenanceTaskInput.omit({ recurrence: true }), formData);
  if (!parsed.ok) return parsed;
  return { ok: true as const, data: { ...parsed.data, recurrence: recurrenceFromForm(formData) } };
}

export async function createTaskAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const parsed = taskPayload(formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    const row = await createTask(ctx, parsed.data);
    revalidatePath("/maintenance");
    revalidatePath("/home");
    redirect(`/maintenance/${row.id}`);
  }, formData);
}

export async function updateTaskAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    const parsed = taskPayload(formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await updateTask(ctx, id, parsed.data);
    revalidatePath("/maintenance");
    revalidatePath("/home");
    redirect(`/maintenance/${id}`);
  }, formData);
}

export async function completeTaskAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    const parsed = parseForm(completeTaskInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await completeTask(ctx, id, parsed.data);
    revalidatePath("/maintenance");
    revalidatePath("/home");
    redirect(`/maintenance/${id}?completed=1`);
  }, formData);
}

export async function cancelTaskAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    await cancelTask(ctx, id);
    revalidatePath("/maintenance");
    revalidatePath("/home");
    redirect(`/maintenance/${id}`);
  }, formData);
}

export async function rescheduleTaskAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    const date = isoDate.safeParse(formData.get("dueOn"));
    if (!date.success) return { ok: false, message: "Pick a valid date.", errors: { dueOn: "Enter a valid date." } };
    await rescheduleTask(ctx, id, date.data);
    revalidatePath("/maintenance");
    redirect(`/maintenance/${id}`);
  }, formData);
}

export async function deleteTaskAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    await deleteTask(ctx, String(formData.get("id")));
    revalidatePath("/maintenance");
    revalidatePath("/home");
    redirect("/maintenance");
  }, formData);
}

export async function recordMaintenanceAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const parsed = parseForm(maintenanceLogInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    const row = await recordMaintenance(ctx, parsed.data);
    revalidatePath("/maintenance");
    redirect(row.assetId ? `/inventory/${row.assetId}` : "/maintenance?view=history");
  }, formData);
}

export async function deleteLogAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    await deleteLog(ctx, String(formData.get("id")));
    revalidatePath("/maintenance");
    const back = String(formData.get("back") ?? "/maintenance?view=history");
    redirect(back.startsWith("/") ? back : "/maintenance?view=history");
  }, formData);
}
