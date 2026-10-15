"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requirePropertyCtx } from "@/core/auth/session";
import { parseForm } from "@/core/domain/form";
import { expenseInput, projectInput, projectTaskInput, PROJECT_STATUSES } from "@/core/domain/validation";
import {
  addProjectTask,
  createExpense,
  createProject,
  deleteExpense,
  deleteProject,
  deleteProjectTask,
  linkProjectAsset,
  setProjectStatus,
  toggleProjectTask,
  unlinkProjectAsset,
  updateProject,
} from "@/core/services/projects";
import { echo, runAction, type ActionState } from "@/lib/actions";

export async function createProjectAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const parsed = parseForm(projectInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    const row = await createProject(ctx, parsed.data);
    revalidatePath("/projects");
    redirect(`/projects/${row.id}`);
  });
}

export async function updateProjectAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    const parsed = parseForm(projectInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await updateProject(ctx, id, parsed.data);
    revalidatePath("/projects");
    redirect(`/projects/${id}`);
  });
}

export async function setProjectStatusAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const id = String(formData.get("id"));
    const status = String(formData.get("status"));
    if (!(PROJECT_STATUSES as readonly string[]).includes(status)) return { ok: false, message: "Unknown status." };
    await setProjectStatus(ctx, id, status as (typeof PROJECT_STATUSES)[number]);
    revalidatePath("/projects");
    revalidatePath("/home");
    redirect(`/projects/${id}`);
  });
}

export async function deleteProjectAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    await deleteProject(ctx, String(formData.get("id")));
    revalidatePath("/projects");
    redirect("/projects");
  });
}

export async function addProjectTaskAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const projectId = String(formData.get("projectId"));
    const parsed = parseForm(projectTaskInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await addProjectTask(ctx, projectId, parsed.data);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  });
}

export async function toggleProjectTaskAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const projectId = await toggleProjectTask(ctx, String(formData.get("taskId")), formData.get("done") === "1");
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  });
}

export async function deleteProjectTaskAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const projectId = await deleteProjectTask(ctx, String(formData.get("taskId")));
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  });
}

export async function linkAssetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const projectId = String(formData.get("projectId"));
    const assetId = String(formData.get("assetId") ?? "");
    if (!assetId) return { ok: false, message: "Pick an item to link." };
    await linkProjectAsset(ctx, projectId, assetId);
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  });
}

export async function unlinkAssetAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const projectId = String(formData.get("projectId"));
    await unlinkProjectAsset(ctx, projectId, String(formData.get("assetId")));
    revalidatePath(`/projects/${projectId}`);
    return { ok: true };
  });
}

export async function createExpenseAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const parsed = parseForm(expenseInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    const row = await createExpense(ctx, parsed.data);
    revalidatePath("/projects");
    redirect(row.projectId ? `/projects/${row.projectId}` : row.assetId ? `/inventory/${row.assetId}` : "/projects");
  });
}

export async function deleteExpenseAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const res = await deleteExpense(ctx, String(formData.get("id")));
    revalidatePath("/projects");
    if (res.projectId) revalidatePath(`/projects/${res.projectId}`);
    return { ok: true };
  });
}
