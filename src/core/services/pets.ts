import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { pet, petHealthEvent, petProvider, serviceProvider } from "../db/schema";
import { ForbiddenError, NotFoundError, ValidationError } from "../errors";
import { NEW_PROVIDER_VALUE, type PetInput, type PetProviderLinkInput, type PetProviderRole } from "../domain/validation";
import { formatWeight, toGrams } from "../domain/pets";
import { todayIn } from "../domain/dates";
import { isImageType } from "../storage/types";
import type { Ctx } from "./context";
import { nullable } from "./context";
import { deleteFile, getFileMeta } from "./files";
import { assertProvider, createProvider } from "./providers";

/**
 * Pet profiles and their care team. Pets belong to the household; every
 * query here is scoped on `householdId`, and every child record elsewhere
 * is reached through `getPet` / `assertPet` first.
 */

const petWith = { photo: { columns: { id: true, contentType: true, filename: true, sizeBytes: true } } } as const;

export type PetListFilter = { archived?: boolean };

export async function listPets(ctx: Ctx, filter: PetListFilter = {}) {
  return ctx.db.query.pet.findMany({
    where: and(eq(pet.householdId, ctx.householdId), filter.archived ? isNotNull(pet.archivedAt) : isNull(pet.archivedAt)),
    with: petWith,
    orderBy: [asc(pet.createdAt), asc(pet.name)],
    limit: 200,
  });
}

export async function countPets(ctx: Ctx) {
  const [row] = await ctx.db
    .select({ active: sql<number>`count(*) filter (where ${pet.archivedAt} is null)::int`, archived: sql<number>`count(*) filter (where ${pet.archivedAt} is not null)::int` })
    .from(pet)
    .where(eq(pet.householdId, ctx.householdId));
  return row ?? { active: 0, archived: 0 };
}

export async function getPet(ctx: Ctx, id: string) {
  const row = await ctx.db.query.pet.findFirst({
    where: and(eq(pet.id, id), eq(pet.householdId, ctx.householdId)),
    with: petWith,
  });
  if (!row) throw new NotFoundError("Pet not found");
  return row;
}

/** Validates an optional pet reference against the household. Returns the id or null. */
export async function assertPet(ctx: Ctx, id: string | undefined | null) {
  if (!id) return null;
  await getPet(ctx, id);
  return id;
}

async function assertPhoto(ctx: Ctx, fileId: string | null | undefined) {
  if (!fileId) return null;
  const meta = await getFileMeta(ctx, fileId);
  if (meta.isVault) throw new ForbiddenError("That file cannot be used as a photo.");
  if (!isImageType(meta.contentType)) throw new ValidationError("Choose a photo (JPEG, PNG, HEIC or WebP).", { photoFileId: "Choose a photo." });
  return meta.id;
}

function toRow(input: PetInput) {
  return {
    name: input.name,
    species: input.species,
    speciesDetail: nullable(input.speciesDetail),
    breed: nullable(input.breed),
    sex: nullable(input.sex),
    birthDate: nullable(input.birthDate),
    birthDateEstimated: input.birthDate ? (input.birthDateEstimated ?? false) : false,
    acquiredOn: nullable(input.acquiredOn),
    acquiredFrom: nullable(input.acquiredFrom),
    color: nullable(input.color),
    markings: nullable(input.markings),
    weightUnit: input.weightUnit ?? "lb",
    weightGrams: input.weight != null ? toGrams(input.weight, input.weightUnit ?? "lb") : null,
    microchipNumber: nullable(input.microchipNumber),
    microchipProvider: nullable(input.microchipProvider),
    neutered: nullable(input.neutered),
    emergencyContactName: nullable(input.emergencyContactName),
    emergencyContactPhone: nullable(input.emergencyContactPhone),
    insuranceProvider: nullable(input.insuranceProvider),
    insurancePolicyNumber: nullable(input.insurancePolicyNumber),
    insurancePhone: nullable(input.insurancePhone),
    notes: nullable(input.notes),
  };
}

/** Writes a weight reading to the timeline so the profile's weight has a history. */
async function logWeight(ctx: Ctx & { timezone?: string }, petId: string, grams: number, unit: "lb" | "kg" | "g") {
  await ctx.db.insert(petHealthEvent).values({
    petId,
    kind: "weight",
    title: `Weighed ${formatWeight(grams, unit)}`,
    occurredOn: todayIn(ctx.timezone ?? "UTC"),
    weightGrams: grams,
    createdBy: ctx.userId,
  });
}

export async function createPet(ctx: Ctx & { timezone?: string }, input: PetInput, photoFileId?: string | null) {
  const row = toRow(input);
  const [created] = await ctx.db
    .insert(pet)
    .values({ householdId: ctx.householdId, ...row, photoFileId: await assertPhoto(ctx, photoFileId) })
    .returning();
  if (created.weightGrams != null) await logWeight(ctx, created.id, created.weightGrams, created.weightUnit);
  return created;
}

/**
 * Updates a profile. `photoFileId`: undefined keeps the current photo, null
 * removes it, a string replaces it (the old file is deleted).
 */
export async function updatePet(ctx: Ctx & { timezone?: string }, id: string, input: PetInput, photoFileId?: string | null) {
  const existing = await getPet(ctx, id);
  const row = toRow(input);
  const newPhoto = photoFileId === undefined ? existing.photoFileId : await assertPhoto(ctx, photoFileId);
  const [updated] = await ctx.db
    .update(pet)
    .set({ ...row, photoFileId: newPhoto })
    .where(and(eq(pet.id, id), eq(pet.householdId, ctx.householdId)))
    .returning();
  if (existing.photoFileId && existing.photoFileId !== newPhoto) await deleteFile(ctx, existing.photoFileId);
  if (row.weightGrams != null && row.weightGrams !== existing.weightGrams) await logWeight(ctx, id, row.weightGrams, row.weightUnit);
  return updated;
}

/** Archived pets leave the active views and reminders; every record is kept. */
export async function archivePet(ctx: Ctx, id: string, reason?: string | null) {
  const res = await ctx.db
    .update(pet)
    .set({ archivedAt: new Date(), archivedReason: reason?.trim() ? reason.trim().slice(0, 120) : null })
    .where(and(eq(pet.id, id), eq(pet.householdId, ctx.householdId)))
    .returning({ id: pet.id });
  if (res.length === 0) throw new NotFoundError("Pet not found");
}

export async function restorePet(ctx: Ctx, id: string) {
  const res = await ctx.db
    .update(pet)
    .set({ archivedAt: null, archivedReason: null })
    .where(and(eq(pet.id, id), eq(pet.householdId, ctx.householdId)))
    .returning({ id: pet.id });
  if (res.length === 0) throw new NotFoundError("Pet not found");
}

/**
 * Permanently deletes a pet. Its health timeline, vaccinations, medications,
 * care routines and care history go with it. Expenses, documents and
 * preparedness notes are kept with the pet reference cleared, so household
 * spending and paperwork stay complete.
 */
export async function deletePet(ctx: Ctx, id: string) {
  const existing = await getPet(ctx, id);
  await ctx.db.delete(pet).where(and(eq(pet.id, id), eq(pet.householdId, ctx.householdId)));
  if (existing.photoFileId) await deleteFile(ctx, existing.photoFileId);
}

/* ------------------------------- care team ------------------------------- */

const ROLE_ORDER: PetProviderRole[] = ["primary_vet", "emergency_vet", "vet", "specialist", "groomer", "boarding", "trainer", "sitter", "other"];

export async function listPetProviders(ctx: Ctx, petId: string) {
  await getPet(ctx, petId);
  const rows = await ctx.db.query.petProvider.findMany({
    where: eq(petProvider.petId, petId),
    with: { provider: true },
  });
  return rows.sort((a, b) => ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) || a.provider.name.localeCompare(b.provider.name));
}

/** Every pet's care team at once, for the landing page and preparedness. */
export async function listHouseholdPetProviders(ctx: Ctx) {
  return ctx.db
    .select({ petId: petProvider.petId, role: petProvider.role, provider: serviceProvider })
    .from(petProvider)
    .innerJoin(pet, eq(pet.id, petProvider.petId))
    .innerJoin(serviceProvider, eq(serviceProvider.id, petProvider.providerId))
    .where(and(eq(pet.householdId, ctx.householdId), isNull(pet.archivedAt)))
    .orderBy(asc(serviceProvider.name));
}

/**
 * Associates a provider with a pet in a role, creating the provider from the
 * inline fields when `providerId` is the "new" sentinel. A pet has at most
 * one primary veterinarian; naming a new one demotes the previous to "vet".
 */
export async function linkPetProvider(ctx: Ctx, petId: string, input: PetProviderLinkInput) {
  await getPet(ctx, petId);
  const role = input.role ?? "vet";
  let providerId: string;
  if (input.providerId === NEW_PROVIDER_VALUE) {
    if (!input.newName) throw new ValidationError("Enter the clinic or person's name.", { newName: "Enter a name." });
    const created = await createProvider(ctx, {
      name: input.newName,
      trade: role === "groomer" ? "Groomer" : role === "boarding" ? "Boarding" : role === "trainer" ? "Trainer" : role === "sitter" ? "Pet sitter" : "Veterinarian",
      phone: input.newPhone,
      afterHoursPhone: input.newAfterHoursPhone,
      address: input.newAddress,
      website: input.newWebsite,
      isEmergency: role === "emergency_vet",
    });
    providerId = created.id;
  } else {
    providerId = (await assertProvider(ctx, input.providerId))!;
  }
  await ctx.db.transaction(async (tx) => {
    if (role === "primary_vet") {
      await tx.update(petProvider).set({ role: "vet" }).where(and(eq(petProvider.petId, petId), eq(petProvider.role, "primary_vet")));
    }
    await tx
      .insert(petProvider)
      .values({ petId, providerId, role })
      .onConflictDoUpdate({ target: [petProvider.petId, petProvider.providerId], set: { role } });
  });
  return providerId;
}

export async function unlinkPetProvider(ctx: Ctx, petId: string, providerId: string) {
  await getPet(ctx, petId);
  const res = await ctx.db
    .delete(petProvider)
    .where(and(eq(petProvider.petId, petId), eq(petProvider.providerId, providerId)))
    .returning({ petId: petProvider.petId });
  if (res.length === 0) throw new NotFoundError("That provider is not linked to this pet.");
}

/** Pets each provider looks after, for the provider pages. */
export async function petsForProvider(ctx: Ctx, providerId: string) {
  return ctx.db
    .select({ id: pet.id, name: pet.name, role: petProvider.role, archivedAt: pet.archivedAt })
    .from(petProvider)
    .innerJoin(pet, eq(pet.id, petProvider.petId))
    .where(and(eq(petProvider.providerId, providerId), eq(pet.householdId, ctx.householdId)))
    .orderBy(desc(pet.archivedAt), asc(pet.name));
}
