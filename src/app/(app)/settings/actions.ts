"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCtx } from "@/core/auth/session";
import { getAuth } from "@/core/auth/auth";
import { getHousehold, renameHousehold } from "@/core/services/household";
import { createInvite, INVITE_DAYS, leaveHousehold, removeMember, revokeInvite, setMemberRole } from "@/core/services/invites";
import { deleteCalendarFeed, resetCalendarFeed } from "@/core/services/calendar";
import { setWeeklyDigest } from "@/core/services/digest";
import { sendEmail } from "@/core/email/send";
import { inviteEmail } from "@/core/email/templates";
import { requestOrigin } from "@/lib/origin";
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
  }, formData);
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
  }, formData);
}

/* ------------------------------ household ------------------------------- */

export async function createInviteAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    const email = String(formData.get("email") ?? "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, message: "That email does not look right.", errors: { email: "Check the address." }, values: { email } };
    const { token } = await createInvite(ctx, { email });
    const link = `${await requestOrigin()}/invite/${token}`;
    let message = "Invite link ready. Send it to them however you like. It works once and expires in 7 days.";
    let unsent = false;
    if (email) {
      const household = await getHousehold(ctx);
      const { sent } = await sendEmail({ to: email, ...inviteEmail({ inviterName: ctx.user.name, householdName: household.name, url: link, days: INVITE_DAYS }) });
      unsent = !sent;
      message = sent ? `Invite emailed to ${email}. You can also share the link below.` : "Email is not set up on this server, so nothing was sent. Copy the link below and send it yourself.";
    }
    revalidatePath("/settings");
    return { ok: true, message, data: { link, ...(unsent ? { unsent: "1" } : {}) } };
  }, formData);
}

export async function revokeInviteAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    await revokeInvite(ctx, String(formData.get("id")));
    revalidatePath("/settings");
  });
}

export async function removeMemberAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    await removeMember(ctx, String(formData.get("userId")));
    revalidatePath("/settings");
  });
}

export async function setMemberRoleAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    await setMemberRole(ctx, String(formData.get("userId")), formData.get("role") === "owner" ? "owner" : "member");
    revalidatePath("/settings");
  });
}

export async function leaveHouseholdAction(): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    await leaveHousehold(ctx);
    redirect("/onboarding");
  });
}

/* ------------------------------ reminders ------------------------------- */

export async function createCalendarFeedAction(): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    const token = await resetCalendarFeed(ctx);
    const url = `${await requestOrigin()}/api/calendar/${token}.ics`;
    revalidatePath("/settings");
    return { ok: true, data: { url, webcal: url.replace(/^https?:/, "webcal:") } };
  });
}

export async function deleteCalendarFeedAction(): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    await deleteCalendarFeed(ctx);
    revalidatePath("/settings");
  });
}

export async function setDigestAction(_p: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    const on = formData.get("on") === "1";
    await setWeeklyDigest(ctx, on);
    revalidatePath("/settings");
    return { ok: true, message: on ? "Weekly email on." : "Weekly email off." };
  });
}
