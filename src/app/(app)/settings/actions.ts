"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCtx } from "@/core/auth/session";
import { getAuth } from "@/core/auth/auth";
import { renameHousehold } from "@/core/services/household";
import { deleteAccount } from "@/core/services/account";
import { runAction, type ActionState } from "@/lib/actions";
import { headers } from "next/headers";

export async function renameHouseholdAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    const name = String(formData.get("name") ?? "").trim();
    if (!name || name.length > 80) return { ok: false, message: "Enter a name under 80 characters.", errors: { name: "Enter a name." } };
    await renameHousehold(ctx, name);
    revalidatePath("/settings");
    return { ok: true, message: "Saved." };
  });
}

export async function deleteAccountAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    const password = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (confirm !== "DELETE") return { ok: false, message: 'Type DELETE to confirm.', errors: { confirm: "Type DELETE exactly." } };
    await deleteAccount(ctx.db, ctx.userId, password);
    const auth = await getAuth();
    await auth.api.signOut({ headers: await headers() }).catch(() => undefined);
    redirect("/?deleted=1");
  });
}
