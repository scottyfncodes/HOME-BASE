/**
 * Pure helpers for the Pets module: weights, ages and vaccine status.
 * Nothing here gives health advice; it only formats what the household
 * recorded and compares dates.
 */
import { diffDays, isISODate, parseISODate, type ISODate } from "./dates";
import { PET_SPECIES_LABELS, type PetSpecies, type WeightUnit } from "./validation";

const GRAMS_PER: Record<WeightUnit, number> = { lb: 453.59237, kg: 1000, g: 1 };

/** A weight in the given unit, as whole grams (the storage unit). */
export function toGrams(value: number, unit: WeightUnit): number {
  return Math.round(value * GRAMS_PER[unit]);
}

/** Grams as a number in `unit`, rounded for display (1 decimal; whole grams for g). */
export function fromGrams(grams: number, unit: WeightUnit): number {
  const v = grams / GRAMS_PER[unit];
  return unit === "g" ? Math.round(v) : Math.round(v * 10) / 10;
}

export function formatWeight(grams: number | null | undefined, unit: WeightUnit): string {
  if (grams == null) return "";
  return `${fromGrams(grams, unit).toLocaleString("en-US")} ${unit}`;
}

/** The value to prefill a weight input with, in the pet's unit. */
export function weightToInput(grams: number | null | undefined, unit: WeightUnit): string {
  if (grams == null) return "";
  return String(fromGrams(grams, unit));
}

/** Whole months between two dates, counting a month only once its day has passed. */
export function monthsBetween(from: ISODate, to: ISODate): number {
  const a = parseISODate(from);
  const b = parseISODate(to);
  let months = (b.y - a.y) * 12 + (b.m - a.m);
  if (b.d < a.d) months -= 1;
  return Math.max(0, months);
}

/**
 * "4 years", "about 7 months", "3 weeks". Returns null without a birth date:
 * not knowing a pet's age is normal and never shown as missing data.
 */
export function describeAge(birthDate: ISODate | null | undefined, today: ISODate, estimated = false): string | null {
  if (!birthDate || !isISODate(birthDate) || birthDate > today) return null;
  const prefix = estimated ? "about " : "";
  const months = monthsBetween(birthDate, today);
  if (months >= 24) return `${prefix}${Math.floor(months / 12)} years`;
  if (months >= 12) {
    const rest = months - 12;
    return estimated || rest === 0 ? `${prefix}1 year` : `1 year, ${rest} month${rest === 1 ? "" : "s"}`;
  }
  if (months >= 1) return `${prefix}${months} month${months === 1 ? "" : "s"}`;
  const weeks = Math.floor(diffDays(birthDate, today) / 7);
  if (weeks >= 1) return `${prefix}${weeks} week${weeks === 1 ? "" : "s"}`;
  return "Newborn";
}

export function speciesLabel(species: string, detail?: string | null): string {
  if (detail?.trim()) return detail.trim();
  return PET_SPECIES_LABELS[species as PetSpecies] ?? "Animal";
}

export type VaccineStatus = "overdue" | "due_soon" | "current" | "no_due_date";

/** How a vaccination stands today, given its next due date. "Soon" means within `soonDays`. */
export function vaccineStatus(nextDueOn: ISODate | null | undefined, today: ISODate, soonDays = 30): VaccineStatus {
  if (!nextDueOn) return "no_due_date";
  const d = diffDays(today, nextDueOn);
  if (d < 0) return "overdue";
  if (d <= soonDays) return "due_soon";
  return "current";
}

/**
 * Collapses a vaccination history to the latest dose per vaccine (matched by
 * name, ignoring case and spacing). An older dose's due date no longer
 * matters once a newer dose was recorded.
 */
export function latestByVaccine<T extends { name: string; administeredOn: string; createdAt?: Date }>(rows: T[]): T[] {
  const latest = new Map<string, T>();
  for (const r of rows) {
    const key = r.name.trim().toLowerCase().replace(/\s+/g, " ");
    const cur = latest.get(key);
    if (!cur || r.administeredOn > cur.administeredOn || (r.administeredOn === cur.administeredOn && (r.createdAt?.getTime() ?? 0) > (cur.createdAt?.getTime() ?? 0))) {
      latest.set(key, r);
    }
  }
  return [...latest.values()];
}

/** A first name possessive that reads naturally: "Biscuit's", "Gus'". */
export function possessive(name: string): string {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

/**
 * Vaccine names offered as typing suggestions. Only names, never schedules:
 * which vaccines a pet needs, and when, is the veterinarian's call.
 */
export const COMMON_VACCINES: Record<string, string[]> = {
  dog: ["Rabies", "DHPP", "Bordetella", "Leptospirosis", "Lyme", "Canine influenza"],
  cat: ["Rabies", "FVRCP", "FeLV"],
};

/** Starting points for routines, by species. The household names and schedules them. */
export const CARE_SUGGESTIONS: Record<string, Array<{ title: string; kind: string; recurrence: string }>> = {
  dog: [
    { title: "Breakfast", kind: "feeding", recurrence: "1-day" },
    { title: "Dinner", kind: "feeding", recurrence: "1-day" },
    { title: "Walk", kind: "walking", recurrence: "1-day" },
    { title: "Flea and tick treatment", kind: "preventative", recurrence: "1-month" },
    { title: "Heartworm preventive", kind: "preventative", recurrence: "1-month" },
    { title: "Brush teeth", kind: "dental", recurrence: "1-week" },
    { title: "Nail trim", kind: "nails", recurrence: "1-month" },
    { title: "Bath and brush", kind: "grooming", recurrence: "1-month" },
  ],
  cat: [
    { title: "Breakfast", kind: "feeding", recurrence: "1-day" },
    { title: "Dinner", kind: "feeding", recurrence: "1-day" },
    { title: "Scoop the litter box", kind: "litter", recurrence: "1-day" },
    { title: "Change all the litter", kind: "litter", recurrence: "2-week" },
    { title: "Flea treatment", kind: "preventative", recurrence: "1-month" },
    { title: "Nail trim", kind: "nails", recurrence: "1-month" },
    { title: "Brush", kind: "grooming", recurrence: "1-week" },
  ],
  bird: [
    { title: "Fresh food and water", kind: "feeding", recurrence: "1-day" },
    { title: "Clean the cage", kind: "aquarium", recurrence: "1-week" },
  ],
  fish: [
    { title: "Feed", kind: "feeding", recurrence: "1-day" },
    { title: "Partial water change", kind: "aquarium", recurrence: "1-week" },
    { title: "Test the water", kind: "aquarium", recurrence: "1-week" },
    { title: "Replace the filter media", kind: "aquarium", recurrence: "1-month" },
  ],
  reptile: [
    { title: "Feed", kind: "feeding", recurrence: "2-day" },
    { title: "Mist the enclosure", kind: "aquarium", recurrence: "1-day" },
    { title: "Deep clean the enclosure", kind: "aquarium", recurrence: "1-month" },
  ],
  small_mammal: [
    { title: "Fresh food and water", kind: "feeding", recurrence: "1-day" },
    { title: "Spot clean the habitat", kind: "aquarium", recurrence: "1-day" },
    { title: "Full habitat clean", kind: "aquarium", recurrence: "1-week" },
  ],
  livestock: [
    { title: "Morning feed and water", kind: "feeding", recurrence: "1-day" },
    { title: "Evening feed and water", kind: "feeding", recurrence: "1-day" },
    { title: "Hoof trim", kind: "nails", recurrence: "2-month" },
  ],
  other: [{ title: "Feed", kind: "feeding", recurrence: "1-day" }],
};

/** Pet records the Preparedness page asks for until each exists. */
export const PET_PREP_SUGGESTIONS = [
  { title: "Carriers, crates and leashes", instructions: "Where each carrier, crate and leash is kept, and which pet it is for." },
  { title: "Food and medication supply", instructions: "Where the backup food, water and medications are, and roughly how many days they cover." },
  { title: "Pet evacuation plan", instructions: "Who grabs which pet, where you would go, and which hotels, shelters or friends accept animals." },
  { title: "Emergency pet caregiver", instructions: "Someone who can collect and care for the pets if you cannot get home." },
];
