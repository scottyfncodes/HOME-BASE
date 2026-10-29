"use server";
import { redirect } from "next/navigation";
import { requireUser } from "@/core/auth/session";
import { getDb } from "@/core/db/client";
import { acceptInvite } from "@/core/services/invites";
import { runAction, type ActionState } from "@/lib/actions";

export async function acceptInviteAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const s = await requireUser();
    await acceptInvite(await getDb(), s.user.id, String(formData.get("token")), { discardCurrent: formData.get("discardCurrent") === "1" });
    redirect("/home");
  }, formData);
}
