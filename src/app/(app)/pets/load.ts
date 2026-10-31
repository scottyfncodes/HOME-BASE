import "server-only";
import { requirePropertyCtx } from "@/core/auth/session";
import { getPet } from "@/core/services/pets";
import { orNotFound } from "@/lib/not-found";

/** The signed-in household's context plus one of its pets, or a 404. */
export async function loadPet(id: string) {
  const ctx = await requirePropertyCtx();
  const pet = await orNotFound(getPet(ctx, id));
  return { ctx, pet };
}
