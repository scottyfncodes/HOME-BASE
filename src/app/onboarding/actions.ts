"use server";
import { redirect } from "next/navigation";
import { requireCtx, requirePropertyCtx } from "@/core/auth/session";
import { parseForm } from "@/core/domain/form";
import { assetInput, propertyInput } from "@/core/domain/validation";
import { getPrimaryProperty } from "@/core/services/household";
import { createProperty } from "@/core/services/property";
import { createLocations } from "@/core/services/locations";
import { createAsset } from "@/core/services/assets";
import { echo, runAction, type ActionState } from "@/lib/actions";

export async function createPropertyAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requireCtx();
    if (await getPrimaryProperty(ctx)) redirect("/onboarding?step=rooms");
    const parsed = parseForm(propertyInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await createProperty(ctx, parsed.data);
    redirect("/onboarding?step=rooms");
  });
}

export async function createRoomsAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const picked = formData.getAll("room").map(String);
    const custom = String(formData.get("custom") ?? "")
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    await createLocations(ctx, [...picked, ...custom]);
    redirect("/onboarding?step=first");
  });
}

export async function createFirstAssetAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  return runAction(async () => {
    const ctx = await requirePropertyCtx();
    const parsed = parseForm(assetInput, formData);
    if (!parsed.ok) return { ok: false, message: parsed.message, errors: parsed.errors, values: echo(formData) };
    await createAsset(ctx, parsed.data);
    redirect("/onboarding?step=done");
  });
}
