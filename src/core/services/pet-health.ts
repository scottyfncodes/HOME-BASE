import { and, asc, desc, eq, inArray, isNull, lte, sql } from "drizzle-orm";
import { document, expense, maintenanceTask, pet, petHealthEvent, petMedication, petVaccination } from "../db/schema";
import { NotFoundError, ValidationError } from "../errors";
import { PET_HEALTH_KIND_LABELS, type PetHealthEventInput, type PetMedicationInput, type PetVaccinationInput, type WeightUnit } from "../domain/validation";
import { addDays, compareISODate, todayIn } from "../domain/dates";
import { formatWeight, latestByVaccine, toGrams } from "../domain/pets";
import type { PropertyCtx } from "./context";
import { nullable } from "./context";
import { createDocument } from "./documents";
import { assertProvider } from "./providers";
import { getPet } from "./pets";

/**
 * Health records for a pet: the timeline (visits, conditions, allergies,
 * procedures, tests, weights, injuries), vaccinations and medications.
 *
 * This is recordkeeping only. Nothing here suggests treatments, interprets
 * results or changes a dose; medication fields are stored as the household
 * typed them from the prescription.
 */

/* ------------------------------ health events ----------------------------- */

const eventWith = {
  provider: { columns: { id: true, name: true } },
  expense: { columns: { id: true, amountCents: true } },
  documents: { columns: { id: true, title: true, category: true }, with: { file: { columns: { id: true, filename: true, contentType: true, sizeBytes: true } } } },
} as const;

export async function getHealthEvent(ctx: PropertyCtx, petId: string, id: string) {
  await getPet(ctx, petId);
  const row = await ctx.db.query.petHealthEvent.findFirst({
    where: and(eq(petHealthEvent.id, id), eq(petHealthEvent.petId, petId)),
    with: eventWith,
  });
  if (!row) throw new NotFoundError("Health record not found");
  return row;
}

function eventTitle(input: PetHealthEventInput, unit: WeightUnit, grams: number | null) {
  if (input.title) return input.title;
  if (input.kind === "weight" && grams != null) return `Weighed ${formatWeight(grams, unit)}`;
  return PET_HEALTH_KIND_LABELS[input.kind];
}

/** Keeps the profile's "current weight" equal to the most recent weight reading. */
async function syncCurrentWeight(ctx: PropertyCtx, petId: string) {
  const latest = await ctx.db.query.petHealthEvent.findFirst({
    where: and(eq(petHealthEvent.petId, petId), eq(petHealthEvent.kind, "weight"), sql`${petHealthEvent.weightGrams} is not null`),
    orderBy: [desc(petHealthEvent.occurredOn), desc(petHealthEvent.createdAt)],
    columns: { weightGrams: true },
  });
  if (latest) await ctx.db.update(pet).set({ weightGrams: latest.weightGrams }).where(eq(pet.id, petId));
}

function checkDates(ctx: PropertyCtx, input: PetHealthEventInput) {
  const today = todayIn(ctx.timezone);
  if (compareISODate(input.occurredOn, addDays(today, 1)) > 0 && input.kind !== "vet_visit") {
    throw new ValidationError("That date is in the future.", { occurredOn: "Use today or an earlier date. Schedule upcoming visits as a follow-up instead." });
  }
  if (input.kind === "weight" && input.weight == null) throw new ValidationError("Enter the weight.", { weight: "Enter the weight." });
}

/**
 * Records an entry on the timeline. A cost becomes a pet expense (category
 * "Veterinary care") so spending has one source; an uploaded file becomes a
 * document attached to both the pet and this entry.
 */
export async function createHealthEvent(ctx: PropertyCtx, petId: string, input: PetHealthEventInput, fileId?: string | null) {
  const p = await getPet(ctx, petId);
  checkDates(ctx, input);
  const unit = p.weightUnit;
  const grams = input.kind === "weight" && input.weight != null ? toGrams(input.weight, unit) : null;
  const providerId = await assertProvider(ctx, input.providerId);
  const title = eventTitle(input, unit, grams);

  const event = await ctx.db.transaction(async (tx) => {
    let expenseId: string | null = null;
    if (input.cost != null && input.cost > 0) {
      const [e] = await tx
        .insert(expense)
        .values({ propertyId: ctx.propertyId, petId, providerId, title, amountCents: input.cost, spentOn: input.occurredOn, category: "veterinary" })
        .returning({ id: expense.id });
      expenseId = e.id;
    }
    const [row] = await tx
      .insert(petHealthEvent)
      .values({
        petId,
        kind: input.kind,
        title,
        occurredOn: input.occurredOn,
        description: nullable(input.description),
        providerId,
        expenseId,
        weightGrams: grams,
        followUpOn: nullable(input.followUpOn),
        notes: nullable(input.notes),
        createdBy: ctx.userId,
      })
      .returning();
    return row;
  });
  if (grams != null) await syncCurrentWeight(ctx, petId);
  if (fileId) {
    await createDocument(ctx, { title, category: input.kind === "vet_visit" ? "invoice" : "medical", documentDate: input.occurredOn, petId }, fileId, { petHealthEventId: event.id });
  }
  return event;
}

export async function updateHealthEvent(ctx: PropertyCtx, petId: string, id: string, input: PetHealthEventInput, fileId?: string | null) {
  const p = await getPet(ctx, petId);
  const existing = await getHealthEvent(ctx, petId, id);
  checkDates(ctx, input);
  const grams = input.kind === "weight" && input.weight != null ? toGrams(input.weight, p.weightUnit) : null;
  const providerId = await assertProvider(ctx, input.providerId);
  const title = eventTitle(input, p.weightUnit, grams);

  await ctx.db.transaction(async (tx) => {
    let expenseId = existing.expenseId;
    const cost = input.cost != null && input.cost > 0 ? input.cost : null;
    if (cost != null && expenseId) {
      await tx.update(expense).set({ amountCents: cost, title, spentOn: input.occurredOn, providerId }).where(and(eq(expense.id, expenseId), eq(expense.propertyId, ctx.propertyId)));
    } else if (cost != null) {
      const [e] = await tx
        .insert(expense)
        .values({ propertyId: ctx.propertyId, petId, providerId, title, amountCents: cost, spentOn: input.occurredOn, category: "veterinary" })
        .returning({ id: expense.id });
      expenseId = e.id;
    } else if (expenseId) {
      await tx.delete(expense).where(and(eq(expense.id, expenseId), eq(expense.propertyId, ctx.propertyId)));
      expenseId = null;
    }
    await tx
      .update(petHealthEvent)
      .set({
        kind: input.kind,
        title,
        occurredOn: input.occurredOn,
        description: nullable(input.description),
        providerId,
        expenseId,
        weightGrams: grams,
        followUpOn: nullable(input.followUpOn),
        notes: nullable(input.notes),
      })
      .where(and(eq(petHealthEvent.id, id), eq(petHealthEvent.petId, petId)));
  });
  if (grams != null || existing.weightGrams != null) await syncCurrentWeight(ctx, petId);
  if (fileId) {
    await createDocument(ctx, { title, category: input.kind === "vet_visit" ? "invoice" : "medical", documentDate: input.occurredOn, petId }, fileId, { petHealthEventId: id });
  }
}

/** Removes the entry and the expense it created. Attached documents stay on the pet. */
export async function deleteHealthEvent(ctx: PropertyCtx, petId: string, id: string) {
  const existing = await getHealthEvent(ctx, petId, id);
  await ctx.db.transaction(async (tx) => {
    await tx.delete(petHealthEvent).where(and(eq(petHealthEvent.id, id), eq(petHealthEvent.petId, petId)));
    if (existing.expenseId) await tx.delete(expense).where(and(eq(expense.id, existing.expenseId), eq(expense.propertyId, ctx.propertyId)));
  });
  if (existing.weightGrams != null) await syncCurrentWeight(ctx, petId);
}

export async function listHealthEvents(ctx: PropertyCtx, petId: string, opts: { kind?: string; limit?: number } = {}) {
  await getPet(ctx, petId);
  const conditions = [eq(petHealthEvent.petId, petId)];
  if (opts.kind) conditions.push(eq(petHealthEvent.kind, opts.kind as never));
  return ctx.db.query.petHealthEvent.findMany({
    where: and(...conditions),
    with: eventWith,
    orderBy: [desc(petHealthEvent.occurredOn), desc(petHealthEvent.createdAt)],
    limit: Math.min(opts.limit ?? 300, 500),
  });
}

export type TimelineEntry =
  | { type: "event"; id: string; on: string; event: Awaited<ReturnType<typeof listHealthEvents>>[number] }
  | { type: "vaccination"; id: string; on: string; vaccination: Awaited<ReturnType<typeof listVaccinations>>[number] }
  | { type: "medication"; id: string; on: string; medication: Awaited<ReturnType<typeof listMedications>>[number] };

/** Everything that happened to a pet's health, newest first. */
export async function getTimeline(ctx: PropertyCtx, petId: string, opts: { limit?: number } = {}): Promise<TimelineEntry[]> {
  const [events, vaccinations, medications] = await Promise.all([listHealthEvents(ctx, petId), listVaccinations(ctx, petId), listMedications(ctx, petId)]);
  const entries: TimelineEntry[] = [
    ...events.map((e) => ({ type: "event" as const, id: e.id, on: e.occurredOn, event: e })),
    ...vaccinations.map((v) => ({ type: "vaccination" as const, id: v.id, on: v.administeredOn, vaccination: v })),
    ...medications.filter((m) => m.startedOn).map((m) => ({ type: "medication" as const, id: m.id, on: m.startedOn!, medication: m })),
  ];
  entries.sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0));
  return opts.limit ? entries.slice(0, opts.limit) : entries;
}

export async function weightHistory(ctx: PropertyCtx, petId: string) {
  await getPet(ctx, petId);
  return ctx.db.query.petHealthEvent.findMany({
    where: and(eq(petHealthEvent.petId, petId), eq(petHealthEvent.kind, "weight"), sql`${petHealthEvent.weightGrams} is not null`),
    columns: { id: true, occurredOn: true, weightGrams: true },
    orderBy: [asc(petHealthEvent.occurredOn), asc(petHealthEvent.createdAt)],
    limit: 120,
  });
}

/* ------------------------------ vaccinations ------------------------------ */

const vaccinationWith = {
  provider: { columns: { id: true, name: true } },
  document: { columns: { id: true, title: true }, with: { file: { columns: { id: true, filename: true, contentType: true, sizeBytes: true } } } },
} as const;

export async function listVaccinations(ctx: PropertyCtx, petId: string) {
  await getPet(ctx, petId);
  return ctx.db.query.petVaccination.findMany({
    where: eq(petVaccination.petId, petId),
    with: vaccinationWith,
    orderBy: [desc(petVaccination.administeredOn), desc(petVaccination.createdAt)],
  });
}

export async function getVaccination(ctx: PropertyCtx, petId: string, id: string) {
  await getPet(ctx, petId);
  const row = await ctx.db.query.petVaccination.findFirst({ where: and(eq(petVaccination.id, id), eq(petVaccination.petId, petId)), with: vaccinationWith });
  if (!row) throw new NotFoundError("Vaccination not found");
  return row;
}

async function attachCertificate(ctx: PropertyCtx, petId: string, name: string, administeredOn: string, fileId: string | null | undefined) {
  if (!fileId) return null;
  const doc = await createDocument(ctx, { title: `${name} certificate`, category: "vaccination", documentDate: administeredOn, petId }, fileId);
  return doc.id;
}

function checkVaccineDate(ctx: PropertyCtx, input: PetVaccinationInput) {
  if (compareISODate(input.administeredOn, addDays(todayIn(ctx.timezone), 1)) > 0) {
    throw new ValidationError("The date given is in the future.", { administeredOn: "Use today or an earlier date." });
  }
}

export async function createVaccination(ctx: PropertyCtx, petId: string, input: PetVaccinationInput, fileId?: string | null) {
  await getPet(ctx, petId);
  checkVaccineDate(ctx, input);
  const providerId = await assertProvider(ctx, input.providerId);
  const documentId = await attachCertificate(ctx, petId, input.name, input.administeredOn, fileId);
  const [row] = await ctx.db
    .insert(petVaccination)
    .values({ petId, name: input.name, administeredOn: input.administeredOn, nextDueOn: nullable(input.nextDueOn), providerId, documentId, notes: nullable(input.notes) })
    .returning();
  return row;
}

export async function updateVaccination(ctx: PropertyCtx, petId: string, id: string, input: PetVaccinationInput, fileId?: string | null) {
  const existing = await getVaccination(ctx, petId, id);
  checkVaccineDate(ctx, input);
  const providerId = await assertProvider(ctx, input.providerId);
  const documentId = fileId ? await attachCertificate(ctx, petId, input.name, input.administeredOn, fileId) : existing.documentId;
  const [row] = await ctx.db
    .update(petVaccination)
    .set({ name: input.name, administeredOn: input.administeredOn, nextDueOn: nullable(input.nextDueOn), providerId, documentId, notes: nullable(input.notes) })
    .where(and(eq(petVaccination.id, id), eq(petVaccination.petId, petId)))
    .returning();
  return row;
}

/** The certificate document, if any, is kept under the pet's documents. */
export async function deleteVaccination(ctx: PropertyCtx, petId: string, id: string) {
  await getVaccination(ctx, petId, id);
  await ctx.db.delete(petVaccination).where(and(eq(petVaccination.id, id), eq(petVaccination.petId, petId)));
}

/** One row per vaccine: its latest dose, soonest due first. */
export async function currentVaccinations(ctx: PropertyCtx, petId: string) {
  const rows = await listVaccinations(ctx, petId);
  return latestByVaccine(rows).sort((a, b) => (a.nextDueOn ?? "9999") .localeCompare(b.nextDueOn ?? "9999") || a.name.localeCompare(b.name));
}

/**
 * Vaccines due within `days` (or already overdue) across the household's
 * active pets, using only each vaccine's latest dose.
 */
export async function householdVaccinesDue(ctx: PropertyCtx, days = 30) {
  const until = addDays(todayIn(ctx.timezone), days);
  const rows = await ctx.db
    .select({ v: petVaccination, petName: pet.name, petId: pet.id })
    .from(petVaccination)
    .innerJoin(pet, eq(pet.id, petVaccination.petId))
    .where(and(eq(pet.householdId, ctx.householdId), isNull(pet.archivedAt)))
    .limit(2000);
  const byPet = new Map<string, typeof rows>();
  for (const r of rows) byPet.set(r.petId, [...(byPet.get(r.petId) ?? []), r]);
  const out: Array<{ id: string; petId: string; petName: string; name: string; nextDueOn: string; administeredOn: string }> = [];
  for (const list of byPet.values()) {
    const latest = latestByVaccine(list.map((r) => ({ ...r.v, petName: r.petName })));
    for (const v of latest) {
      if (v.nextDueOn && v.nextDueOn <= until) out.push({ id: v.id, petId: v.petId, petName: v.petName, name: v.name, nextDueOn: v.nextDueOn, administeredOn: v.administeredOn });
    }
  }
  return out.sort((a, b) => a.nextDueOn.localeCompare(b.nextDueOn));
}

/** Health follow-ups (rechecks, appointments) due within `days`, across active pets. */
export async function householdFollowUps(ctx: PropertyCtx, days = 60) {
  const today = todayIn(ctx.timezone);
  const rows = await ctx.db
    .select({ id: petHealthEvent.id, petId: pet.id, petName: pet.name, title: petHealthEvent.title, kind: petHealthEvent.kind, followUpOn: petHealthEvent.followUpOn, occurredOn: petHealthEvent.occurredOn })
    .from(petHealthEvent)
    .innerJoin(pet, eq(pet.id, petHealthEvent.petId))
    .where(and(eq(pet.householdId, ctx.householdId), isNull(pet.archivedAt), sql`${petHealthEvent.followUpOn} is not null`, sql`${petHealthEvent.followUpOn} >= ${addDays(today, -14)}`, lte(petHealthEvent.followUpOn, addDays(today, days))))
    .orderBy(asc(petHealthEvent.followUpOn))
    .limit(50);
  return rows.map((r) => ({ ...r, followUpOn: r.followUpOn! }));
}

/** Vet visits dated today or later (appointments), across active pets. */
export async function householdUpcomingVisits(ctx: PropertyCtx, days = 90) {
  const today = todayIn(ctx.timezone);
  return ctx.db
    .select({ id: petHealthEvent.id, petId: pet.id, petName: pet.name, title: petHealthEvent.title, on: petHealthEvent.occurredOn })
    .from(petHealthEvent)
    .innerJoin(pet, eq(pet.id, petHealthEvent.petId))
    .where(and(eq(pet.householdId, ctx.householdId), isNull(pet.archivedAt), eq(petHealthEvent.kind, "vet_visit"), sql`${petHealthEvent.occurredOn} >= ${today}`, lte(petHealthEvent.occurredOn, addDays(today, days))))
    .orderBy(asc(petHealthEvent.occurredOn))
    .limit(20);
}

/** Recent health activity (today or earlier) across active pets, for the landing page. */
export async function householdRecentHealth(ctx: PropertyCtx, limit = 6) {
  const [events, vaccinations] = await Promise.all([
    ctx.db
      .select({ id: petHealthEvent.id, petId: pet.id, petName: pet.name, title: petHealthEvent.title, kind: petHealthEvent.kind, on: petHealthEvent.occurredOn })
      .from(petHealthEvent)
      .innerJoin(pet, eq(pet.id, petHealthEvent.petId))
      .where(and(eq(pet.householdId, ctx.householdId), isNull(pet.archivedAt), lte(petHealthEvent.occurredOn, todayIn(ctx.timezone))))
      .orderBy(desc(petHealthEvent.occurredOn), desc(petHealthEvent.createdAt))
      .limit(limit),
    ctx.db
      .select({ id: petVaccination.id, petId: pet.id, petName: pet.name, title: petVaccination.name, on: petVaccination.administeredOn })
      .from(petVaccination)
      .innerJoin(pet, eq(pet.id, petVaccination.petId))
      .where(and(eq(pet.householdId, ctx.householdId), isNull(pet.archivedAt)))
      .orderBy(desc(petVaccination.administeredOn))
      .limit(limit),
  ]);
  return [...events.map((e) => ({ ...e, kind: e.kind as string })), ...vaccinations.map((v) => ({ ...v, kind: "vaccination" }))]
    .sort((a, b) => (a.on < b.on ? 1 : a.on > b.on ? -1 : 0))
    .slice(0, limit);
}

/* ------------------------------- medications ------------------------------ */

export async function listMedications(ctx: PropertyCtx, petId: string) {
  await getPet(ctx, petId);
  return ctx.db.query.petMedication.findMany({
    where: eq(petMedication.petId, petId),
    with: { provider: { columns: { id: true, name: true } } },
    orderBy: [desc(petMedication.active), sql`${petMedication.startedOn} desc nulls last`, asc(petMedication.name)],
  });
}

export async function getMedication(ctx: PropertyCtx, petId: string, id: string) {
  await getPet(ctx, petId);
  const row = await ctx.db.query.petMedication.findFirst({ where: and(eq(petMedication.id, id), eq(petMedication.petId, petId)), with: { provider: { columns: { id: true, name: true } } } });
  if (!row) throw new NotFoundError("Medication not found");
  return row;
}

/** Validates a medication reference for a care routine: it must belong to the same pet. */
export async function assertMedication(ctx: PropertyCtx, petId: string, id: string | null | undefined) {
  if (!id) return null;
  await getMedication(ctx, petId, id);
  return id;
}

async function medicationRow(ctx: PropertyCtx, input: PetMedicationInput) {
  return {
    name: input.name,
    dosage: nullable(input.dosage),
    frequency: nullable(input.frequency),
    startedOn: nullable(input.startedOn),
    endedOn: nullable(input.endedOn),
    providerId: await assertProvider(ctx, input.providerId),
    instructions: nullable(input.instructions),
    notes: nullable(input.notes),
    active: input.active ?? true,
  };
}

/** Stops the reminders that belong to a medication that is no longer given. */
async function cancelMedicationRoutines(ctx: PropertyCtx, medicationIds: string[]) {
  if (medicationIds.length === 0) return;
  await ctx.db
    .update(maintenanceTask)
    .set({ status: "cancelled" })
    .where(and(inArray(maintenanceTask.petMedicationId, medicationIds), eq(maintenanceTask.propertyId, ctx.propertyId), eq(maintenanceTask.status, "scheduled")));
}

export async function createMedication(ctx: PropertyCtx, petId: string, input: PetMedicationInput) {
  await getPet(ctx, petId);
  const [row] = await ctx.db.insert(petMedication).values({ petId, ...(await medicationRow(ctx, input)) }).returning();
  return row;
}

export async function updateMedication(ctx: PropertyCtx, petId: string, id: string, input: PetMedicationInput) {
  await getMedication(ctx, petId, id);
  const [row] = await ctx.db
    .update(petMedication)
    .set(await medicationRow(ctx, input))
    .where(and(eq(petMedication.id, id), eq(petMedication.petId, petId)))
    .returning();
  if (!row.active) await cancelMedicationRoutines(ctx, [id]);
  return row;
}

/** Marks a medication as no longer given. Its end date defaults to today; its reminders stop. */
export async function stopMedication(ctx: PropertyCtx, petId: string, id: string) {
  const existing = await getMedication(ctx, petId, id);
  await ctx.db
    .update(petMedication)
    .set({ active: false, endedOn: existing.endedOn ?? todayIn(ctx.timezone) })
    .where(and(eq(petMedication.id, id), eq(petMedication.petId, petId)));
  await cancelMedicationRoutines(ctx, [id]);
}

export async function deleteMedication(ctx: PropertyCtx, petId: string, id: string) {
  await getMedication(ctx, petId, id);
  await cancelMedicationRoutines(ctx, [id]);
  await ctx.db.delete(petMedication).where(and(eq(petMedication.id, id), eq(petMedication.petId, petId)));
}

/** Medications currently being given, across active pets (for the emergency grab list). */
export async function householdActiveMedications(ctx: PropertyCtx) {
  return ctx.db
    .select({ id: petMedication.id, petId: pet.id, name: petMedication.name, dosage: petMedication.dosage })
    .from(petMedication)
    .innerJoin(pet, eq(pet.id, petMedication.petId))
    .where(and(eq(pet.householdId, ctx.householdId), isNull(pet.archivedAt), eq(petMedication.active, true)))
    .orderBy(asc(petMedication.name));
}

/** Documents attached to one health entry (for its edit page). */
export async function documentsForHealthEvent(ctx: PropertyCtx, petId: string, eventId: string) {
  await getHealthEvent(ctx, petId, eventId);
  return ctx.db.query.document.findMany({
    where: and(eq(document.petHealthEventId, eventId), eq(document.propertyId, ctx.propertyId), eq(document.isVault, false)),
    with: { file: { columns: { id: true, filename: true, contentType: true, sizeBytes: true } } },
  });
}
