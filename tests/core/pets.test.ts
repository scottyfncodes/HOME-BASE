import { beforeAll, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { Db } from "@/core/db/client";
import * as schema from "@/core/db/schema";
import { makeUser, testDb } from "../support/db";
import { addDays, todayIn } from "@/core/domain/dates";
import { describeAge, formatWeight, fromGrams, latestByVaccine, possessive, toGrams, vaccineStatus } from "@/core/domain/pets";
import { parseForm } from "@/core/domain/form";
import { petInput, petVaccinationInput } from "@/core/domain/validation";
import { archivePet, countPets, createPet, deletePet, getPet, linkPetProvider, listHouseholdPetProviders, listPetProviders, listPets, restorePet, unlinkPetProvider, updatePet } from "@/core/services/pets";
import {
  createHealthEvent,
  createMedication,
  createVaccination,
  currentVaccinations,
  deleteHealthEvent,
  getHealthEvent,
  getTimeline,
  householdFollowUps,
  householdVaccinesDue,
  listVaccinations,
  stopMedication,
  updateHealthEvent,
  weightHistory,
} from "@/core/services/pet-health";
import { careHistory, completeCare, createCareRoutine, deleteCareRoutine, householdCareDue, lastDoneByRoutine, listCareRoutines } from "@/core/services/pet-care";
import { createPetExpense, deletePetExpense, getPetSpending, listPetExpenses } from "@/core/services/pet-spending";
import { listHistory, listTasks, taskCounts } from "@/core/services/maintenance";
import { createDocument, listDocuments } from "@/core/services/documents";
import { createPreparedness, listPreparedness } from "@/core/services/preparedness";
import { createProvider, deleteProvider } from "@/core/services/providers";
import { storeFile } from "@/core/services/files";
import { getSpending } from "@/core/services/spending";
import { renderCalendarFeed, resetCalendarFeed } from "@/core/services/calendar";
import { buildDigest } from "@/core/services/digest";
import { searchEverything } from "@/core/services/search";
import { exportHousehold } from "@/core/services/account";
import { acceptInvite, createInvite } from "@/core/services/invites";
import { getMembership, loadPropertyCtx } from "@/core/services/household";
import type { Ctx } from "@/core/services/context";

/* ------------------------------- pure logic ------------------------------ */

describe("pet domain helpers", () => {
  it("converts weights through grams without drifting", () => {
    expect(toGrams(10, "lb")).toBe(4536);
    expect(fromGrams(4536, "lb")).toBe(10);
    expect(fromGrams(4536, "kg")).toBe(4.5);
    expect(toGrams(35, "g")).toBe(35);
    expect(formatWeight(4536, "lb")).toBe("10 lb");
    expect(formatWeight(null, "kg")).toBe("");
  });

  it("describes age, and says nothing when the birth date is unknown", () => {
    expect(describeAge(null, "2026-10-31")).toBeNull();
    expect(describeAge("2022-03-15", "2026-10-31")).toBe("4 years");
    expect(describeAge("2022-03-15", "2026-10-31", true)).toBe("about 4 years");
    expect(describeAge("2025-08-01", "2026-10-31")).toBe("1 year, 2 months");
    expect(describeAge("2026-07-30", "2026-10-31")).toBe("3 months");
    expect(describeAge("2026-10-10", "2026-10-31")).toBe("3 weeks");
    expect(describeAge("2027-01-01", "2026-10-31")).toBeNull();
  });

  it("classifies vaccine due dates and keeps only the latest dose per vaccine", () => {
    expect(vaccineStatus(null, "2026-10-31")).toBe("no_due_date");
    expect(vaccineStatus("2026-10-01", "2026-10-31")).toBe("overdue");
    expect(vaccineStatus("2026-11-15", "2026-10-31")).toBe("due_soon");
    expect(vaccineStatus("2027-06-01", "2026-10-31")).toBe("current");
    const latest = latestByVaccine([
      { name: "Rabies", administeredOn: "2023-05-01" },
      { name: "rabies ", administeredOn: "2026-05-01" },
      { name: "DHPP", administeredOn: "2025-01-01" },
    ]);
    expect(latest).toHaveLength(2);
    expect(latest.find((v) => v.name.trim().toLowerCase() === "rabies")!.administeredOn).toBe("2026-05-01");
    expect(possessive("Biscuit")).toBe("Biscuit's");
    expect(possessive("Gus")).toBe("Gus'");
  });

  it("validates profiles from a form with only a name and a species", () => {
    const fd = new FormData();
    fd.set("name", "Pickles");
    fd.set("species", "reptile");
    fd.set("breed", "");
    fd.set("birthDate", "");
    fd.set("weight", "");
    const parsed = parseForm(petInput, fd);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.breed).toBeUndefined();
      expect(parsed.data.birthDate).toBeUndefined();
      expect(parsed.data.weight).toBeUndefined();
    }
    const bad = new FormData();
    bad.set("name", "");
    bad.set("weight", "heavy");
    const r = parseForm(petInput, bad);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name).toBeTruthy();
      expect(r.errors.species).toBeTruthy();
      expect(r.errors.weight).toBeTruthy();
    }
  });

  it("rejects a next-due date that is not after the dose", () => {
    const r = petVaccinationInput.safeParse({ name: "Rabies", administeredOn: "2026-05-01", nextDueOn: "2026-04-01" });
    expect(r.success).toBe(false);
  });
});

/* ------------------------------- profiles -------------------------------- */

describe("pet profiles", () => {
  let db: Db;
  let u: Awaited<ReturnType<typeof makeUser>>;
  beforeAll(async () => {
    db = await testDb();
    u = await makeUser(db);
  });

  it("supports several pets of different kinds with unknown details", async () => {
    const dog = await createPet(u.pctx, { name: "Biscuit", species: "dog", breed: "Golden retriever", sex: "female", birthDate: "2021-04-02", weight: 62, weightUnit: "lb", microchipNumber: "985112003456789" });
    const cat = await createPet(u.pctx, { name: "Mochi", species: "cat" });
    const fish = await createPet(u.pctx, { name: "Captain", species: "fish", speciesDetail: "Betta" });
    const goat = await createPet(u.pctx, { name: "Clover", species: "livestock", speciesDetail: "Nigerian dwarf goat", birthDate: "2020-01-01", birthDateEstimated: true });

    const list = await listPets(u.pctx);
    expect(list.map((p) => p.name)).toEqual(["Biscuit", "Mochi", "Captain", "Clover"]);
    expect(cat.breed).toBeNull();
    expect(cat.birthDate).toBeNull();
    expect(cat.acquiredOn).toBeNull();
    expect(fish.speciesDetail).toBe("Betta");
    expect(goat.birthDateEstimated).toBe(true);
    expect(dog.weightGrams).toBe(toGrams(62, "lb"));
    // A weight entered on the profile starts the weight history.
    expect((await weightHistory(u.pctx, dog.id)).map((w) => w.weightGrams)).toEqual([toGrams(62, "lb")]);
  });

  it("edits a profile, keeps the photo unless replaced, and deletes a replaced photo", async () => {
    const photo = await storeFile(u.ctx, { bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0]), filename: "rex.jpg", contentType: "image/jpeg" });
    const p = await createPet(u.pctx, { name: "Rex", species: "dog" }, photo.id);
    expect(p.photoFileId).toBe(photo.id);
    const kept = await updatePet(u.pctx, p.id, { name: "Rex", species: "dog", breed: "Mutt" });
    expect(kept.photoFileId).toBe(photo.id);
    expect(kept.breed).toBe("Mutt");
    const photo2 = await storeFile(u.ctx, { bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]), filename: "rex2.png", contentType: "image/png" });
    const replaced = await updatePet(u.pctx, p.id, { name: "Rex", species: "dog" }, photo2.id);
    expect(replaced.photoFileId).toBe(photo2.id);
    expect(await db.query.fileObject.findFirst({ where: eq(schema.fileObject.id, photo.id) })).toBeUndefined();
    const removed = await updatePet(u.pctx, p.id, { name: "Rex", species: "dog" }, null);
    expect(removed.photoFileId).toBeNull();
  });

  it("refuses a non-image file as a photo", async () => {
    const pdf = await storeFile(u.ctx, { bytes: Buffer.from("%PDF-1.4"), filename: "a.pdf", contentType: "application/pdf" });
    await expect(createPet(u.pctx, { name: "Nope", species: "cat" }, pdf.id)).rejects.toThrow(/photo/i);
  });

  it("archives and restores without losing records", async () => {
    const p = await createPet(u.pctx, { name: "Old Tom", species: "cat" });
    await createVaccination(u.pctx, p.id, { name: "FVRCP", administeredOn: "2024-01-01" });
    await archivePet(u.pctx, p.id, "Passed away");
    expect((await listPets(u.pctx)).some((x) => x.id === p.id)).toBe(false);
    const archived = await listPets(u.pctx, { archived: true });
    expect(archived.find((x) => x.id === p.id)?.archivedReason).toBe("Passed away");
    expect((await listVaccinations(u.pctx, p.id)).length).toBe(1);
    await restorePet(u.pctx, p.id);
    expect((await getPet(u.pctx, p.id)).archivedAt).toBeNull();
    const counts = await countPets(u.pctx);
    expect(counts.active).toBeGreaterThanOrEqual(5);
  });

  it("deletes a pet's health and care records but keeps its expenses and documents", async () => {
    const p = await createPet(u.pctx, { name: "Temp", species: "small_mammal", speciesDetail: "Rabbit" });
    const today = todayIn(u.pctx.timezone);
    const visit = await createHealthEvent(u.pctx, p.id, { kind: "vet_visit", title: "Checkup", occurredOn: today, cost: 8000 });
    await createCareRoutine(u.pctx, p.id, { title: "Hay", careKind: "feeding", dueOn: today, recurrence: { every: 1, unit: "day", anchor: "due" } });
    const exp = await createPetExpense(u.pctx, p.id, { title: "Hutch", amount: 12000, spentOn: today, category: "supplies" });
    const doc = await createDocument(u.pctx, { title: "Adoption papers", category: "adoption", petId: p.id });
    await deletePet(u.pctx, p.id);

    expect(await db.query.petHealthEvent.findFirst({ where: eq(schema.petHealthEvent.id, visit.id) })).toBeUndefined();
    expect((await db.query.maintenanceTask.findMany({ where: eq(schema.maintenanceTask.title, "Hay") })).length).toBe(0);
    const keptExpense = await db.query.expense.findFirst({ where: eq(schema.expense.id, exp.id) });
    expect(keptExpense?.petId).toBeNull();
    expect(keptExpense?.amountCents).toBe(12000);
    // The vet visit's cost was an expense too, and survives.
    expect((await db.query.expense.findFirst({ where: eq(schema.expense.id, visit.expenseId!) }))?.amountCents).toBe(8000);
    expect((await db.query.document.findFirst({ where: eq(schema.document.id, doc.id) }))?.petId).toBeNull();
  });
});

/* ------------------------------- care team -------------------------------- */

describe("pet care team", () => {
  let db: Db;
  let u: Awaited<ReturnType<typeof makeUser>>;
  beforeAll(async () => {
    db = await testDb();
    u = await makeUser(db);
  });

  it("links existing providers, creates new ones inline, and keeps one primary vet", async () => {
    const a = await createPet(u.pctx, { name: "Biscuit", species: "dog" });
    const b = await createPet(u.pctx, { name: "Mochi", species: "cat" });
    const clinic = await createProvider(u.ctx, { name: "Maple Street Animal Hospital", trade: "Veterinarian", phone: "555-0100", address: "12 Maple St" });
    await linkPetProvider(u.pctx, a.id, { providerId: clinic.id, role: "primary_vet" });
    await linkPetProvider(u.pctx, b.id, { providerId: clinic.id, role: "primary_vet" });
    const er = await linkPetProvider(u.pctx, a.id, { providerId: "__new", role: "emergency_vet", newName: "Valley 24h Emergency", newPhone: "555-0199", newAfterHoursPhone: "555-0198" });
    const created = await db.query.serviceProvider.findFirst({ where: eq(schema.serviceProvider.id, er) });
    expect(created?.isEmergency).toBe(true);
    expect(created?.afterHoursPhone).toBe("555-0198");

    const second = await createProvider(u.ctx, { name: "Dr. Patel" });
    await linkPetProvider(u.pctx, a.id, { providerId: second.id, role: "primary_vet" });
    const team = await listPetProviders(u.pctx, a.id);
    expect(team.filter((t) => t.role === "primary_vet").map((t) => t.provider.name)).toEqual(["Dr. Patel"]);
    expect(team.find((t) => t.provider.id === clinic.id)?.role).toBe("vet");
    expect((await listHouseholdPetProviders(u.pctx)).length).toBe(4);

    await unlinkPetProvider(u.pctx, a.id, second.id);
    expect((await listPetProviders(u.pctx, a.id)).length).toBe(2);
    await expect(linkPetProvider(u.pctx, a.id, { providerId: "__new", role: "vet" })).rejects.toThrow(/name/i);

    // Deleting a provider removes the link; the pet is untouched.
    await deleteProvider(u.ctx, clinic.id);
    expect((await listPetProviders(u.pctx, b.id)).length).toBe(0);
  });
});

/* ---------------------------- health records ----------------------------- */

describe("health timeline, vaccinations and medications", () => {
  let db: Db;
  let u: Awaited<ReturnType<typeof makeUser>>;
  let petId: string;
  let today: string;
  beforeAll(async () => {
    db = await testDb();
    u = await makeUser(db);
    today = todayIn(u.pctx.timezone);
    petId = (await createPet(u.pctx, { name: "Biscuit", species: "dog", weightUnit: "lb" })).id;
  });

  it("records, edits and deletes timeline entries; a cost becomes a pet expense", async () => {
    const vet = await createProvider(u.ctx, { name: "Maple Vet" });
    const e = await createHealthEvent(u.pctx, petId, { kind: "vet_visit", title: "Annual exam", occurredOn: addDays(today, -10), providerId: vet.id, cost: 18500, followUpOn: addDays(today, 20), description: "All good." });
    expect(e.expenseId).toBeTruthy();
    const exp = await db.query.expense.findFirst({ where: eq(schema.expense.id, e.expenseId!) });
    expect(exp).toMatchObject({ amountCents: 18500, petId, category: "veterinary", providerId: vet.id });

    await updateHealthEvent(u.pctx, petId, e.id, { kind: "vet_visit", title: "Annual exam", occurredOn: addDays(today, -10), providerId: vet.id, cost: 20000 });
    expect((await db.query.expense.findFirst({ where: eq(schema.expense.id, e.expenseId!) }))?.amountCents).toBe(20000);
    await updateHealthEvent(u.pctx, petId, e.id, { kind: "vet_visit", title: "Annual exam", occurredOn: addDays(today, -10) });
    expect(await db.query.expense.findFirst({ where: eq(schema.expense.id, e.expenseId!) })).toBeUndefined();
    expect((await getHealthEvent(u.pctx, petId, e.id)).expenseId).toBeNull();

    const allergy = await createHealthEvent(u.pctx, petId, { kind: "allergy", title: "Chicken", occurredOn: addDays(today, -400) });
    await deleteHealthEvent(u.pctx, petId, allergy.id);
    await expect(getHealthEvent(u.pctx, petId, allergy.id)).rejects.toThrow(/not found/i);
  });

  it("titles weight readings, keeps the profile weight on the latest reading, and requires a value", async () => {
    await createHealthEvent(u.pctx, petId, { kind: "weight", occurredOn: addDays(today, -30), weight: 60 });
    const latest = await createHealthEvent(u.pctx, petId, { kind: "weight", occurredOn: addDays(today, -1), weight: 63.5 });
    expect(latest.title).toBe("Weighed 63.5 lb");
    // An older reading entered later does not overwrite the current weight.
    await createHealthEvent(u.pctx, petId, { kind: "weight", occurredOn: addDays(today, -200), weight: 40 });
    expect((await getPet(u.pctx, petId)).weightGrams).toBe(toGrams(63.5, "lb"));
    await deleteHealthEvent(u.pctx, petId, latest.id);
    expect((await getPet(u.pctx, petId)).weightGrams).toBe(toGrams(60, "lb"));
    await expect(createHealthEvent(u.pctx, petId, { kind: "weight", occurredOn: today })).rejects.toThrow(/weight/i);
  });

  it("allows a future vet visit (an appointment) but not a future injury", async () => {
    const appt = await createHealthEvent(u.pctx, petId, { kind: "vet_visit", title: "Dental cleaning", occurredOn: addDays(today, 14) });
    expect(appt.occurredOn).toBe(addDays(today, 14));
    await expect(createHealthEvent(u.pctx, petId, { kind: "injury", title: "Limp", occurredOn: addDays(today, 5) })).rejects.toThrow(/future/i);
  });

  it("attaches an uploaded file to the entry and to the pet's documents", async () => {
    const f = await storeFile(u.ctx, { bytes: Buffer.from("%PDF-1.4 invoice"), filename: "invoice.pdf", contentType: "application/pdf" });
    const e = await createHealthEvent(u.pctx, petId, { kind: "test", title: "Bloodwork", occurredOn: addDays(today, -3) }, f.id);
    const withDocs = await getHealthEvent(u.pctx, petId, e.id);
    expect(withDocs.documents.map((d) => d.file?.filename)).toEqual(["invoice.pdf"]);
    expect((await listDocuments(u.pctx, { petId })).some((d) => d.title === "Bloodwork")).toBe(true);
  });

  it("tracks vaccinations by latest dose and reports what is due across pets", async () => {
    const cat = await createPet(u.pctx, { name: "Mochi", species: "cat" });
    await createVaccination(u.pctx, petId, { name: "Rabies", administeredOn: addDays(today, -1100), nextDueOn: addDays(today, -5) });
    await createVaccination(u.pctx, petId, { name: "Rabies", administeredOn: addDays(today, -5), nextDueOn: addDays(today, 1090) });
    await createVaccination(u.pctx, petId, { name: "Bordetella", administeredOn: addDays(today, -350), nextDueOn: addDays(today, 15) });
    const cert = await storeFile(u.ctx, { bytes: Buffer.from("%PDF-1.4 cert"), filename: "fvrcp.pdf", contentType: "application/pdf" });
    const fv = await createVaccination(u.pctx, cat.id, { name: "FVRCP", administeredOn: addDays(today, -400), nextDueOn: addDays(today, -35) }, cert.id);
    expect(fv.documentId).toBeTruthy();

    const current = await currentVaccinations(u.pctx, petId);
    expect(current.map((v) => v.name)).toEqual(["Bordetella", "Rabies"]);
    const due = await householdVaccinesDue(u.pctx, 30);
    expect(due.map((d) => `${d.petName}:${d.name}`)).toEqual(["Mochi:FVRCP", "Biscuit:Bordetella"]);
    // The superseded overdue Rabies dose is not reported.
    expect(due.some((d) => d.name === "Rabies")).toBe(false);
    await archivePet(u.pctx, cat.id);
    expect((await householdVaccinesDue(u.pctx, 30)).some((d) => d.petName === "Mochi")).toBe(false);
    await restorePet(u.pctx, cat.id);
  });

  it("stores medications as prescribed and stopping one ends its reminders", async () => {
    const med = await createMedication(u.pctx, petId, { name: "Carprofen", dosage: "75 mg tablet", frequency: "Twice daily with food", startedOn: addDays(today, -7), instructions: "Give with breakfast and dinner." });
    expect(med).toMatchObject({ dosage: "75 mg tablet", frequency: "Twice daily with food", active: true });
    const routine = await createCareRoutine(u.pctx, petId, { title: "Carprofen", careKind: "medication", dueOn: today, recurrence: { every: 1, unit: "day", anchor: "due" }, medicationId: med.id });
    expect(routine.petMedicationId).toBe(med.id);
    await stopMedication(u.pctx, petId, med.id);
    const stopped = await db.query.petMedication.findFirst({ where: eq(schema.petMedication.id, med.id) });
    expect(stopped?.active).toBe(false);
    expect(stopped?.endedOn).toBe(today);
    expect(stopped?.dosage).toBe("75 mg tablet");
    expect((await listCareRoutines(u.pctx, petId)).some((r) => r.id === routine.id)).toBe(false);

    // A medication from another pet cannot be attached to this pet's routine.
    const other = await createPet(u.pctx, { name: "Pip", species: "bird" });
    const otherMed = await createMedication(u.pctx, other.id, { name: "Drops" });
    await expect(createCareRoutine(u.pctx, petId, { title: "Wrong", dueOn: today, medicationId: otherMed.id })).rejects.toThrow(/not found/i);
  });

  it("merges events, vaccinations and medications into one timeline, newest first", async () => {
    const timeline = await getTimeline(u.pctx, petId);
    expect(timeline.length).toBeGreaterThan(5);
    for (let i = 1; i < timeline.length; i++) expect(timeline[i - 1].on >= timeline[i].on).toBe(true);
    expect(new Set(timeline.map((t) => t.type))).toEqual(new Set(["event", "vaccination", "medication"]));
    await createHealthEvent(u.pctx, petId, { kind: "procedure", title: "Stitches", occurredOn: addDays(today, -2), followUpOn: addDays(today, 8) });
    const follow = await householdFollowUps(u.pctx, 60);
    expect(follow.map((f) => f.title)).toEqual(["Stitches"]);
  });
});

/* ---------------------------- care routines ------------------------------ */

describe("care routines reuse the maintenance schedule", () => {
  let db: Db;
  let u: Awaited<ReturnType<typeof makeUser>>;
  let today: string;
  beforeAll(async () => {
    db = await testDb();
    u = await makeUser(db);
    today = todayIn(u.pctx.timezone);
  });

  it("completes a daily routine, advances it, and records history", async () => {
    const p = await createPet(u.pctx, { name: "Biscuit", species: "dog" });
    const walk = await createCareRoutine(u.pctx, p.id, { title: "Morning walk", careKind: "walking", dueOn: today, recurrence: { every: 1, unit: "day", anchor: "due" } });
    const nails = await createCareRoutine(u.pctx, p.id, { title: "Trim nails", careKind: "nails", dueOn: addDays(today, 10), recurrence: { every: 3, unit: "week", anchor: "completed" } });
    const once = await createCareRoutine(u.pctx, p.id, { title: "Buy a new collar", dueOn: today });

    const result = await completeCare(u.pctx, p.id, walk.id);
    expect(result.nextDue).toBe(addDays(today, 1));
    await completeCare(u.pctx, p.id, nails.id);
    await completeCare(u.pctx, p.id, once.id);

    const routines = await listCareRoutines(u.pctx, p.id);
    expect(routines.map((r) => r.title)).toEqual(["Morning walk", "Trim nails"]);
    expect(routines.find((r) => r.id === nails.id)?.dueOn).toBe(addDays(today, 21));
    const history = await careHistory(u.pctx, p.id);
    expect(history.map((h) => h.title).sort()).toEqual(["Buy a new collar", "Morning walk", "Trim nails"]);
    expect(history.every((h) => h.petId === p.id)).toBe(true);
    expect((await lastDoneByRoutine(u.pctx, p.id)).get(walk.id)).toBe(today);

    // Deleting the routine keeps its history on the pet.
    await deleteCareRoutine(u.pctx, p.id, walk.id);
    expect((await careHistory(u.pctx, p.id)).some((h) => h.title === "Morning walk")).toBe(true);
  });

  it("keeps pet routines out of home maintenance lists and counts", async () => {
    const p = await createPet(u.pctx, { name: "Mochi", species: "cat" });
    await createCareRoutine(u.pctx, p.id, { title: "Scoop litter", careKind: "litter", dueOn: addDays(today, -2), recurrence: { every: 1, unit: "day", anchor: "due" } });
    expect((await listTasks(u.pctx, "all")).some((t) => t.title === "Scoop litter")).toBe(false);
    expect((await listTasks(u.pctx, "overdue")).length).toBe(0);
    expect((await taskCounts(u.pctx)).overdue).toBe(0);
    expect((await listHistory(u.pctx)).some((h) => h.petId)).toBe(false);
    const due = await householdCareDue(u.pctx, 0);
    expect(due.map((d) => d.title)).toContain("Scoop litter");
    expect(due.find((d) => d.title === "Scoop litter")?.petName).toBe("Mochi");
    await archivePet(u.pctx, p.id);
    expect((await householdCareDue(u.pctx, 0)).some((d) => d.title === "Scoop litter")).toBe(false);
  });
});

/* ------------------------- expenses and documents ------------------------ */

describe("pet expenses, documents and preparedness", () => {
  let db: Db;
  let u: Awaited<ReturnType<typeof makeUser>>;
  let today: string;
  beforeAll(async () => {
    db = await testDb();
    u = await makeUser(db);
    today = todayIn(u.pctx.timezone);
  });

  it("summarizes spending by month, year, category and pet, and feeds household spending", async () => {
    const a = await createPet(u.pctx, { name: "Biscuit", species: "dog" });
    const b = await createPet(u.pctx, { name: "Mochi", species: "cat" });
    const monthStart = `${today.slice(0, 7)}-01`;
    await createPetExpense(u.pctx, a.id, { title: "Kibble", amount: 6499, spentOn: today, category: "food" });
    await createPetExpense(u.pctx, a.id, { title: "Groomer", amount: 7000, spentOn: monthStart, category: "grooming" });
    await createPetExpense(u.pctx, b.id, { title: "Litter", amount: 2500, spentOn: today, category: "supplies" });
    const old = await createPetExpense(u.pctx, b.id, { title: "Last year food", amount: 9999, spentOn: `${Number(today.slice(0, 4)) - 1}-06-01`, category: "food" });
    await createHealthEvent(u.pctx, b.id, { kind: "vet_visit", title: "Exam", occurredOn: today, cost: 9000 });

    const all = await getPetSpending(u.pctx);
    expect(all.month).toBe(6499 + 7000 + 2500 + 9000);
    expect(all.yearToDate).toBe(all.month >= 0 ? 6499 + 7000 + 2500 + 9000 : 0);
    expect(all.byCategory[0]).toEqual({ category: "veterinary", cents: 9000 });
    expect(all.byPet.map((p) => p.name)).toEqual(["Biscuit", "Mochi"]);
    expect(all.lines.length).toBe(5);
    expect(all.years).toContain(Number(today.slice(0, 4)) - 1);

    const justMochi = await getPetSpending(u.pctx, { petId: b.id });
    expect(justMochi.yearToDate).toBe(2500 + 9000);
    expect((await listPetExpenses(u.pctx, b.id)).length).toBe(3);

    const household = await getSpending(u.pctx, Number(today.slice(0, 4)));
    expect(household.pets).toBe(6499 + 7000 + 2500 + 9000);
    expect(household.lines.find((l) => l.title === "Kibble")?.petName).toBe("Biscuit");

    await deletePetExpense(u.pctx, b.id, old.id);
    expect((await listPetExpenses(u.pctx, b.id)).length).toBe(2);
    await expect(deletePetExpense(u.pctx, a.id, old.id)).rejects.toThrow(/not found/i);
  });

  it("files documents against a pet and lists them by pet", async () => {
    const p = await createPet(u.pctx, { name: "Pip", species: "bird" });
    const f = await storeFile(u.ctx, { bytes: Buffer.from("%PDF-1.4 chip"), filename: "chip.pdf", contentType: "application/pdf" });
    await createDocument(u.pctx, { title: "Microchip registration", category: "microchip", petId: p.id, expiresOn: addDays(today, 300) }, f.id);
    await createDocument(u.pctx, { title: "Fridge manual", category: "manual" });
    const docs = await listDocuments(u.pctx, { petId: p.id });
    expect(docs.map((d) => d.title)).toEqual(["Microchip registration"]);
    expect(docs[0].pet?.name).toBe("Pip");
  });

  it("records pet preparedness for one pet or every pet", async () => {
    const p = await createPet(u.pctx, { name: "Clover", species: "livestock" });
    await createPreparedness(u.pctx, { kind: "pet", title: "Carriers and crates", whereText: "Garage shelf", petId: undefined });
    await createPreparedness(u.pctx, { kind: "pet", title: "Clover's trailer plan", petId: p.id, instructions: "Neighbor has a trailer." });
    // A pet reference on a non-pet record is ignored.
    const water = await createPreparedness(u.pctx, { kind: "water_shutoff", title: "Main", petId: p.id });
    expect(water.petId).toBeNull();
    const list = await listPreparedness(u.pctx);
    expect(list.filter((i) => i.kind === "pet").map((i) => i.pet?.name ?? "all")).toEqual(["all", "Clover"]);
  });
});

/* -------------------------- reminders and search ------------------------- */

describe("pets in reminders, search and export", () => {
  let db: Db;
  beforeAll(async () => {
    db = await testDb();
  });

  it("puts routines, vaccines and follow-ups on the calendar, skipping archived pets", async () => {
    const u = await makeUser(db);
    const today = todayIn(u.pctx.timezone);
    const dog = await createPet(u.pctx, { name: "Biscuit", species: "dog" });
    const gone = await createPet(u.pctx, { name: "Ghost", species: "cat" });
    const walk = await createCareRoutine(u.pctx, dog.id, { title: "Evening walk", careKind: "walking", dueOn: addDays(today, -1), recurrence: { every: 1, unit: "day", anchor: "due" } });
    await createCareRoutine(u.pctx, gone.id, { title: "Ghost dinner", dueOn: today });
    const vac = await createVaccination(u.pctx, dog.id, { name: "Rabies", administeredOn: addDays(today, -360), nextDueOn: addDays(today, 5) });
    await createHealthEvent(u.pctx, dog.id, { kind: "vet_visit", title: "Exam", occurredOn: addDays(today, -2), followUpOn: addDays(today, 12) });
    await archivePet(u.pctx, gone.id);

    const token = await resetCalendarFeed(u.ctx);
    const ics = (await renderCalendarFeed(db, token, "https://hb.test"))!;
    expect(ics).toContain(`UID:task-${walk.id}@homebase`);
    expect(ics).toContain("SUMMARY:Biscuit: Evening walk");
    expect(ics).not.toContain("Overdue: Biscuit: Evening walk");
    expect(ics).toContain("https://hb.test/pets/" + dog.id + "/care");
    expect(ics).toContain(`UID:vaccination-${vac.id}@homebase`);
    expect(ics).toContain("SUMMARY:Biscuit's Rabies due");
    expect(ics).toContain("follow up on Exam");
    expect(ics).not.toContain("Ghost dinner");
  });

  it("lists vaccines and weekly-or-slower routines in the weekly email, not daily chores", async () => {
    const u = await makeUser(db);
    const today = todayIn(u.pctx.timezone);
    const dog = await createPet(u.pctx, { name: "Biscuit", species: "dog" });
    await createCareRoutine(u.pctx, dog.id, { title: "Breakfast", careKind: "feeding", dueOn: today, recurrence: { every: 1, unit: "day", anchor: "due" } });
    await createCareRoutine(u.pctx, dog.id, { title: "Flea treatment", careKind: "preventative", dueOn: addDays(today, 3), recurrence: { every: 1, unit: "month", anchor: "due" } });
    await createVaccination(u.pctx, dog.id, { name: "Leptospirosis", administeredOn: addDays(today, -370), nextDueOn: addDays(today, -5) });
    const digest = (await buildDigest(db, u.userId, "https://hb.test"))!;
    expect(digest.text).toContain("Biscuit: Flea treatment");
    expect(digest.text).toContain("Biscuit's Leptospirosis");
    expect(digest.text).not.toContain("Breakfast");
  });

  it("finds pets in global search and includes them in the export", async () => {
    const u = await makeUser(db);
    const p = await createPet(u.pctx, { name: "Waffles", species: "dog", breed: "Corgi", microchipNumber: "900111222333444" });
    await createVaccination(u.pctx, p.id, { name: "Rabies", administeredOn: "2026-01-01" });
    const hits = await searchEverything(u.pctx, "corgi");
    expect(hits).toContainEqual(expect.objectContaining({ kind: "pet", title: "Waffles", href: `/pets/${p.id}` }));
    expect((await searchEverything(u.pctx, "900111")).some((h) => h.kind === "pet")).toBe(true);
    const out = await exportHousehold(u.ctx);
    expect(out.pets.map((x) => x.name)).toEqual(["Waffles"]);
    expect(out.petVaccinations.length).toBe(1);
  });
});

/* ------------------------- household isolation --------------------------- */

describe("pet household isolation", () => {
  let db: Db;
  let alice: Awaited<ReturnType<typeof makeUser>>;
  let bob: Awaited<ReturnType<typeof makeUser>>;
  beforeAll(async () => {
    db = await testDb();
    alice = await makeUser(db, { name: "Alice" });
    bob = await makeUser(db, { name: "Bob" });
  });

  it("never shows or changes another household's pets or their records", async () => {
    const today = todayIn(alice.pctx.timezone);
    const p = await createPet(alice.pctx, { name: "Biscuit", species: "dog" });
    const e = await createHealthEvent(alice.pctx, p.id, { kind: "vet_visit", title: "Exam", occurredOn: today, cost: 5000 });
    const v = await createVaccination(alice.pctx, p.id, { name: "Rabies", administeredOn: today, nextDueOn: addDays(today, 10) });
    const r = await createCareRoutine(alice.pctx, p.id, { title: "Walk", dueOn: today });
    const x = await createPetExpense(alice.pctx, p.id, { title: "Food", amount: 1000, spentOn: today });

    expect(await listPets(bob.pctx)).toEqual([]);
    await expect(getPet(bob.pctx, p.id)).rejects.toThrow(/not found/i);
    await expect(updatePet(bob.pctx, p.id, { name: "Stolen", species: "dog" })).rejects.toThrow(/not found/i);
    await expect(archivePet(bob.pctx, p.id)).rejects.toThrow(/not found/i);
    await expect(deletePet(bob.pctx, p.id)).rejects.toThrow(/not found/i);
    await expect(getHealthEvent(bob.pctx, p.id, e.id)).rejects.toThrow(/not found/i);
    await expect(deleteHealthEvent(bob.pctx, p.id, e.id)).rejects.toThrow(/not found/i);
    await expect(getTimeline(bob.pctx, p.id)).rejects.toThrow(/not found/i);
    await expect(createVaccination(bob.pctx, p.id, { name: "X", administeredOn: today })).rejects.toThrow(/not found/i);
    await expect(completeCare(bob.pctx, p.id, r.id)).rejects.toThrow(/not found/i);
    await expect(createPetExpense(bob.pctx, p.id, { title: "X", amount: 1, spentOn: today })).rejects.toThrow(/not found/i);
    await expect(deletePetExpense(bob.pctx, p.id, x.id)).rejects.toThrow(/not found/i);
    await expect(getPetSpending(bob.pctx, { petId: p.id })).rejects.toThrow(/not found/i);
    await expect(createDocument(bob.pctx, { title: "Sneaky", category: "medical", petId: p.id })).rejects.toThrow(/not found/i);
    await expect(createPreparedness(bob.pctx, { kind: "pet", title: "Sneaky", petId: p.id })).rejects.toThrow(/not found/i);
    await expect(linkPetProvider(bob.pctx, p.id, { providerId: "__new", newName: "X" })).rejects.toThrow(/not found/i);

    // Bob's own pet cannot be pointed at Alice's records either.
    const bobPet = await createPet(bob.pctx, { name: "Rex", species: "dog" });
    await expect(getHealthEvent(bob.pctx, bobPet.id, e.id)).rejects.toThrow(/not found/i);
    await expect(completeCare(bob.pctx, bobPet.id, r.id)).rejects.toThrow(/not found/i);
    const aliceVet = await createProvider(alice.ctx, { name: "Alice's vet" });
    await expect(linkPetProvider(bob.pctx, bobPet.id, { providerId: aliceVet.id })).rejects.toThrow(/not found/i);
    await expect(createHealthEvent(bob.pctx, bobPet.id, { kind: "vet_visit", occurredOn: today, providerId: aliceVet.id })).rejects.toThrow(/not found/i);
    const alicePhoto = await storeFile(alice.ctx, { bytes: Buffer.from([0xff, 0xd8]), filename: "a.jpg", contentType: "image/jpeg" });
    await expect(updatePet(bob.pctx, bobPet.id, { name: "Rex", species: "dog" }, alicePhoto.id)).rejects.toThrow(/not found/i);

    // Household-wide views stay separate.
    expect((await householdVaccinesDue(bob.pctx, 30)).length).toBe(0);
    expect((await householdCareDue(bob.pctx, 0)).length).toBe(0);
    expect((await getPetSpending(bob.pctx)).yearToDate).toBe(0);
    expect((await searchEverything(bob.pctx, "Biscuit")).length).toBe(0);

    // Alice's data is intact.
    expect((await getPet(alice.pctx, p.id)).name).toBe("Biscuit");
    expect((await listVaccinations(alice.pctx, p.id)).map((y) => y.id)).toEqual([v.id]);
  });

  it("lets a household member (not just the owner) care for the household's pets", async () => {
    const owner = await makeUser(db, { name: "Owner" });
    const member = await makeUser(db, { name: "Member" });
    const p = await createPet(owner.pctx, { name: "Shared", species: "cat" });
    const { token } = await createInvite(owner.ctx, {});
    await acceptInvite(db, member.userId, token, { discardCurrent: true });
    const m = await getMembership(db, member.userId);
    const mctx: Ctx = { db, userId: member.userId, householdId: m!.householdId, role: m!.role };
    const mp = await loadPropertyCtx(mctx, owner.property.id);
    const today = todayIn(mp.timezone);
    const routine = await createCareRoutine(mp, p.id, { title: "Dinner", dueOn: today });
    await completeCare(mp, p.id, routine.id);
    const history = await careHistory(owner.pctx, p.id);
    expect(history[0].completedByUser?.name).toBe("Member");
  });
});
