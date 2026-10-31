import { z } from "zod";
import { isISODate } from "./dates";
import { parseMoneyToCents } from "./money";
import { RECURRENCE_UNITS } from "./recurrence";

/* ----------------------------- primitives -------------------------------- */

/** A parsed input type whose defaulted fields may be omitted by direct (non-form) callers. */
type Loose<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const isoDate = z
  .string()
  .trim()
  .refine((v) => isISODate(v), "Enter a valid date.");

export const optionalIsoDate = isoDate.optional();

/** Money typed by a human ("1,250.00") → integer cents. */
export const money = z
  .string()
  .trim()
  .transform((v, ctx) => {
    const cents = parseMoneyToCents(v);
    if (cents === null) return undefined;
    if (Number.isNaN(cents)) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 125.00." });
      return z.NEVER;
    }
    if (cents < 0) {
      ctx.addIssue({ code: "custom", message: "Amount cannot be negative." });
      return z.NEVER;
    }
    return cents;
  })
  .optional();

export const requiredMoney = z
  .string()
  .trim()
  .min(1, "Enter an amount.")
  .transform((v, ctx) => {
    const cents = parseMoneyToCents(v);
    if (cents === null || Number.isNaN(cents)) {
      ctx.addIssue({ code: "custom", message: "Enter an amount like 125.00." });
      return z.NEVER;
    }
    if (cents < 0) {
      ctx.addIssue({ code: "custom", message: "Amount cannot be negative." });
      return z.NEVER;
    }
    return cents;
  });

const shortText = (max = 120) => z.string().trim().min(1, "This field is required.").max(max, `Keep it under ${max} characters.`);
const optionalText = (max = 500) => z.string().trim().max(max, `Keep it under ${max} characters.`).optional();
const optionalLong = z.string().trim().max(5000, "Keep notes under 5,000 characters.").optional();
const optionalInt = (min: number, max: number) =>
  z.coerce.number().int().min(min).max(max).optional();
const uuid = z.string().trim().min(1).max(64);
const optionalId = uuid.optional();

export const timezone = z
  .string()
  .trim()
  .max(80)
  .refine((tz) => {
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: tz });
      return true;
    } catch {
      return false;
    }
  }, "Unknown time zone.");

/* ------------------------------- property -------------------------------- */

export const HOME_TYPES = [
  "single_family",
  "townhouse",
  "condo",
  "apartment",
  "multi_family",
  "mobile",
  "cabin",
  "other",
] as const;

export const HOME_TYPE_LABELS: Record<(typeof HOME_TYPES)[number], string> = {
  single_family: "Single-family house",
  townhouse: "Townhouse",
  condo: "Condo",
  apartment: "Apartment",
  multi_family: "Multi-family",
  mobile: "Manufactured / mobile home",
  cabin: "Cabin or seasonal home",
  other: "Other",
};

export const propertyInput = z.object({
  name: shortText(80),
  addressLine1: optionalText(120),
  addressLine2: optionalText(120),
  city: optionalText(80),
  region: optionalText(80),
  postalCode: optionalText(20),
  country: optionalText(60),
  homeType: z.enum(HOME_TYPES).optional(),
  yearBuilt: optionalInt(1600, 2100),
  squareFeet: optionalInt(1, 1_000_000),
  bedrooms: optionalInt(0, 100),
  bathrooms: optionalText(10),
  lotSize: optionalText(40),
  purchaseDate: optionalIsoDate,
  purchasePrice: money,
  timezone: timezone.optional(),
  notes: optionalLong,
});
export type PropertyInput = z.infer<typeof propertyInput>;

/* ------------------------------- location -------------------------------- */

export const LOCATION_KINDS = ["room", "area", "exterior", "utility", "storage", "other"] as const;
export const LOCATION_KIND_LABELS: Record<(typeof LOCATION_KINDS)[number], string> = {
  room: "Room",
  area: "Area",
  exterior: "Exterior",
  utility: "Utility space",
  storage: "Storage",
  other: "Other",
};

export type LocationKind = (typeof LOCATION_KINDS)[number];

/** Sentinel `locationId` value meaning "create the location named in newLocationName". */
export const NEW_LOCATION_VALUE = "__new";

/**
 * Best guess at what kind of place a name describes, so "Outside east wall"
 * is filed as exterior and "Hallway" as an area without asking.
 */
export function inferLocationKind(name: string): LocationKind {
  const n = name.toLowerCase();
  if (/\b(outside|outdoors?|exterior|yard|patio|deck|porch|driveway|roof|garden|side of (the )?house)\b/.test(n)) return "exterior";
  if (/\b(closet|attic|storage|crawl ?space|pantry|shed)\b/.test(n)) return "storage";
  if (/\b(utility|laundry|mechanical|furnace|boiler)\b/.test(n)) return "utility";
  if (/\b(hall|hallway|entry|entryway|foyer|landing|stairs?|stairway|corridor|mudroom)\b/.test(n)) return "area";
  return "room";
}

/** Fields every form with a location picker may send to create a location inline. */
const newLocationFields = {
  newLocationName: z.string().trim().max(80, "Keep it under 80 characters.").optional(),
  newLocationKind: z.enum(LOCATION_KINDS).optional(),
};

export const locationInput = z.object({
  name: shortText(80),
  kind: z.enum(LOCATION_KINDS).default("room"),
  floor: optionalText(40),
  notes: optionalLong,
});
export type LocationInput = z.infer<typeof locationInput>;

/* --------------------------------- asset --------------------------------- */

export const ASSET_CATEGORIES = [
  "hvac",
  "water_heater",
  "plumbing",
  "electrical",
  "appliance",
  "roofing",
  "exterior",
  "safety",
  "outdoor",
  "structure",
  "windows_doors",
  "electronics",
  "furniture",
  "other",
] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  hvac: "Heating & cooling",
  water_heater: "Water heater",
  plumbing: "Plumbing",
  electrical: "Electrical",
  appliance: "Appliance",
  roofing: "Roof & gutters",
  exterior: "Exterior & siding",
  safety: "Safety devices",
  outdoor: "Yard & outdoor",
  structure: "Structure & foundation",
  windows_doors: "Windows & doors",
  electronics: "Electronics",
  furniture: "Furniture & fixtures",
  other: "Other",
};

export const assetInput = z.object({
  ...newLocationFields,
  name: shortText(120),
  category: z.enum(ASSET_CATEGORIES).default("other"),
  locationId: optionalId,
  manufacturer: optionalText(80),
  model: optionalText(80),
  serialNumber: optionalText(80),
  installDate: optionalIsoDate,
  purchaseDate: optionalIsoDate,
  purchasePrice: money,
  replacementValue: money,
  warrantyExpiresOn: optionalIsoDate,
  notes: optionalLong,
});
export type AssetInput = z.infer<typeof assetInput>;

/* ------------------------------ maintenance ------------------------------ */

export const PRIORITIES = ["low", "normal", "high"] as const;

export const recurrenceInput = z
  .object({
    every: z.coerce.number().int().min(1).max(365),
    unit: z.enum(RECURRENCE_UNITS),
    anchor: z.enum(["due", "completed"]).default("due"),
  })
  .nullable();

export const maintenanceTaskInput = z.object({
  ...newLocationFields,
  title: shortText(120),
  description: optionalLong,
  dueOn: isoDate,
  recurrence: recurrenceInput.optional(),
  priority: z.enum(PRIORITIES).default("normal"),
  assetId: optionalId,
  locationId: optionalId,
  estimatedMinutes: optionalInt(1, 10_000),
  guideSlug: optionalText(80),
});
export type MaintenanceTaskInput = z.infer<typeof maintenanceTaskInput>;

export const completeTaskInput = z.object({
  completedOn: isoDate,
  notes: optionalLong,
  cost: money,
  providerId: optionalId,
});
export type CompleteTaskInput = z.infer<typeof completeTaskInput>;

export const maintenanceLogInput = z.object({
  ...newLocationFields,
  title: shortText(120),
  completedOn: isoDate,
  notes: optionalLong,
  cost: money,
  providerId: optionalId,
  assetId: optionalId,
  locationId: optionalId,
});
export type MaintenanceLogInput = z.infer<typeof maintenanceLogInput>;

/* -------------------------------- projects ------------------------------- */

export const PROJECT_STATUSES = ["idea", "planned", "in_progress", "on_hold", "completed", "cancelled"] as const;
export const PROJECT_STATUS_LABELS: Record<(typeof PROJECT_STATUSES)[number], string> = {
  idea: "Idea",
  planned: "Planned",
  in_progress: "In progress",
  on_hold: "On hold",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const projectInput = z.object({
  ...newLocationFields,
  name: shortText(120),
  description: optionalLong,
  status: z.enum(PROJECT_STATUSES).default("planned"),
  priority: z.enum(PRIORITIES).default("normal"),
  startOn: optionalIsoDate,
  targetOn: optionalIsoDate,
  completedOn: optionalIsoDate,
  budget: money,
  locationId: optionalId,
  notes: optionalLong,
});
export type ProjectInput = z.infer<typeof projectInput>;

export const projectTaskInput = z.object({
  title: shortText(160),
  isMilestone: z.coerce.boolean().default(false),
  dueOn: optionalIsoDate,
});

export const EXPENSE_CATEGORIES = ["materials", "labor", "permits", "service", "appliance", "other"] as const;

export const expenseInput = z.object({
  title: shortText(120),
  amount: requiredMoney,
  spentOn: isoDate,
  category: z.enum(EXPENSE_CATEGORIES).default("other"),
  projectId: optionalId,
  assetId: optionalId,
  providerId: optionalId,
  notes: optionalLong,
});
export type ExpenseInput = z.infer<typeof expenseInput>;

/* ------------------------------- documents ------------------------------- */

export const DOCUMENT_CATEGORIES = [
  "manual",
  "receipt",
  "invoice",
  "estimate",
  "warranty",
  "inspection",
  "insurance",
  "hoa",
  "permit",
  "photo",
  "plan",
  "vaccination",
  "medical",
  "prescription",
  "adoption",
  "microchip",
  "other",
] as const;
export const DOCUMENT_CATEGORY_LABELS: Record<(typeof DOCUMENT_CATEGORIES)[number], string> = {
  manual: "Manual",
  receipt: "Receipt",
  invoice: "Invoice",
  estimate: "Estimate",
  warranty: "Warranty",
  inspection: "Inspection report",
  insurance: "Insurance",
  hoa: "HOA",
  permit: "Permit",
  photo: "Photo",
  plan: "Plan or drawing",
  vaccination: "Vaccination certificate",
  medical: "Medical record",
  prescription: "Prescription",
  adoption: "Adoption or registration",
  microchip: "Microchip registration",
  other: "Other",
};

/** The document categories offered first when filing something for a pet. */
export const PET_DOCUMENT_CATEGORIES = ["vaccination", "invoice", "medical", "prescription", "adoption", "microchip", "insurance", "receipt", "photo", "other"] as const;

export const VAULT_CATEGORIES = [
  "identity",
  "deed",
  "estate",
  "tax",
  "financial",
  "medical",
  "other",
] as const;
export const VAULT_CATEGORY_LABELS: Record<(typeof VAULT_CATEGORIES)[number], string> = {
  identity: "Identity (passport, birth certificate)",
  deed: "Deed or title",
  estate: "Will or estate",
  tax: "Tax record",
  financial: "Financial",
  medical: "Medical",
  other: "Other",
};

export const documentInput = z.object({
  title: shortText(140),
  category: z.enum(DOCUMENT_CATEGORIES).default("other"),
  documentDate: optionalIsoDate,
  expiresOn: optionalIsoDate,
  assetId: optionalId,
  projectId: optionalId,
  petId: optionalId,
  notes: optionalLong,
});
export type DocumentInput = z.infer<typeof documentInput>;

export const vaultDocumentInput = z.object({
  title: shortText(140),
  category: z.enum(VAULT_CATEGORIES).default("other"),
  documentDate: optionalIsoDate,
  expiresOn: optionalIsoDate,
  notes: optionalLong,
});
export type VaultDocumentInput = z.infer<typeof vaultDocumentInput>;

/* ------------------------------- providers ------------------------------- */

export const providerInput = z.object({
  name: shortText(100),
  trade: optionalText(60),
  phone: optionalText(40),
  email: z.string().trim().max(120).email("Enter a valid email.").optional().or(z.literal("").transform(() => undefined)),
  website: optionalText(200),
  address: optionalText(300),
  afterHoursPhone: optionalText(40),
  isEmergency: z.preprocess((v) => v === "on" || v === "1" || v === "true" || v === true, z.boolean()).default(false),
  notes: optionalLong,
});
export type ProviderInput = Loose<z.infer<typeof providerInput>, "isEmergency">;

/* ----------------------------- preparedness ------------------------------ */

export const PREPAREDNESS_KINDS = [
  "water_shutoff",
  "gas_shutoff",
  "electrical_panel",
  "detector",
  "contact",
  "insurance",
  "equipment",
  "note",
  "pet",
] as const;
export type PreparednessKind = (typeof PREPAREDNESS_KINDS)[number];
export const PREPAREDNESS_KIND_LABELS: Record<PreparednessKind, string> = {
  water_shutoff: "Water shutoff",
  gas_shutoff: "Gas shutoff",
  electrical_panel: "Electrical panel",
  detector: "Smoke / CO detector",
  contact: "Emergency contact",
  insurance: "Insurance",
  equipment: "Emergency equipment",
  note: "Instructions / note",
  pet: "Pets",
};

export const preparednessInput = z.object({
  ...newLocationFields,
  kind: z.enum(PREPAREDNESS_KINDS),
  title: shortText(120),
  locationId: optionalId,
  whereText: optionalText(200),
  instructions: optionalLong,
  phone: optionalText(40),
  details: optionalLong,
  petId: optionalId,
});
export type PreparednessInput = z.infer<typeof preparednessInput>;


/* ---------------------------------- pets --------------------------------- */

export const PET_SPECIES = ["dog", "cat", "bird", "fish", "reptile", "small_mammal", "livestock", "other"] as const;
export type PetSpecies = (typeof PET_SPECIES)[number];
export const PET_SPECIES_LABELS: Record<PetSpecies, string> = {
  dog: "Dog",
  cat: "Cat",
  bird: "Bird",
  fish: "Fish",
  reptile: "Reptile",
  small_mammal: "Small mammal",
  livestock: "Livestock",
  other: "Other",
};

export const PET_SEXES = ["female", "male", "unknown"] as const;
export const PET_SEX_LABELS: Record<(typeof PET_SEXES)[number], string> = { female: "Female", male: "Male", unknown: "Unknown" };

export const PET_NEUTERED = ["yes", "no", "unknown"] as const;

export const WEIGHT_UNITS = ["lb", "kg", "g"] as const;
export type WeightUnit = (typeof WEIGHT_UNITS)[number];

/** A weight typed by a human in the pet's unit ("12.5") → grams. Blank stays blank. */
export const weight = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return undefined;
    const n = Number(v.replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0 || n > 100_000) {
      ctx.addIssue({ code: "custom", message: "Enter a weight like 12.5." });
      return z.NEVER;
    }
    return n;
  })
  .optional();

const yesNo = z.preprocess((v) => v === "on" || v === "1" || v === "true" || v === true, z.boolean());

export const petInput = z.object({
  name: shortText(60),
  species: z.enum(PET_SPECIES, { message: "Choose what kind of animal." }),
  speciesDetail: optionalText(60),
  breed: optionalText(80),
  sex: z.enum(PET_SEXES).optional(),
  birthDate: optionalIsoDate,
  birthDateEstimated: yesNo.default(false),
  acquiredOn: optionalIsoDate,
  acquiredFrom: optionalText(120),
  color: optionalText(80),
  markings: optionalText(500),
  weight: weight,
  weightUnit: z.enum(WEIGHT_UNITS).default("lb"),
  microchipNumber: optionalText(40),
  microchipProvider: optionalText(80),
  neutered: z.enum(PET_NEUTERED).optional(),
  emergencyContactName: optionalText(80),
  emergencyContactPhone: optionalText(40),
  insuranceProvider: optionalText(80),
  insurancePolicyNumber: optionalText(60),
  insurancePhone: optionalText(40),
  notes: optionalLong,
});
export type PetInput = Loose<z.infer<typeof petInput>, "birthDateEstimated" | "weightUnit">;

export const PET_PROVIDER_ROLES = ["primary_vet", "vet", "emergency_vet", "specialist", "groomer", "boarding", "trainer", "sitter", "other"] as const;
export type PetProviderRole = (typeof PET_PROVIDER_ROLES)[number];
export const PET_PROVIDER_ROLE_LABELS: Record<PetProviderRole, string> = {
  primary_vet: "Primary veterinarian",
  vet: "Veterinarian",
  emergency_vet: "Emergency clinic",
  specialist: "Specialist",
  groomer: "Groomer",
  boarding: "Boarding",
  trainer: "Trainer",
  sitter: "Sitter or walker",
  other: "Other",
};

/** Sentinel providerId meaning "create the provider described in the new* fields". */
export const NEW_PROVIDER_VALUE = "__new";

export const petProviderLinkInput = z.object({
  providerId: uuid,
  role: z.enum(PET_PROVIDER_ROLES).default("vet"),
  newName: optionalText(100),
  newPhone: optionalText(40),
  newAfterHoursPhone: optionalText(40),
  newAddress: optionalText(300),
  newWebsite: optionalText(200),
});
export type PetProviderLinkInput = Loose<z.infer<typeof petProviderLinkInput>, "role">;

export const PET_HEALTH_KINDS = ["vet_visit", "condition", "allergy", "procedure", "test", "weight", "injury", "other"] as const;
export type PetHealthKind = (typeof PET_HEALTH_KINDS)[number];
export const PET_HEALTH_KIND_LABELS: Record<PetHealthKind, string> = {
  vet_visit: "Vet visit",
  condition: "Medical condition",
  allergy: "Allergy",
  procedure: "Surgery or procedure",
  test: "Diagnostic test",
  weight: "Weight",
  injury: "Injury",
  other: "Other",
};

export const petHealthEventInput = z.object({
  kind: z.enum(PET_HEALTH_KINDS),
  title: optionalText(140),
  occurredOn: isoDate,
  description: optionalLong,
  providerId: optionalId,
  cost: money,
  weight: weight,
  followUpOn: optionalIsoDate,
  notes: optionalLong,
});
export type PetHealthEventInput = z.infer<typeof petHealthEventInput>;

export const petVaccinationInput = z
  .object({
    name: shortText(100),
    administeredOn: isoDate,
    nextDueOn: optionalIsoDate,
    providerId: optionalId,
    notes: optionalLong,
  })
  .refine((v) => !v.nextDueOn || v.nextDueOn > v.administeredOn, { message: "The next due date should be after the date given.", path: ["nextDueOn"] });
export type PetVaccinationInput = z.infer<typeof petVaccinationInput>;

export const petMedicationInput = z
  .object({
    name: shortText(100),
    dosage: optionalText(120),
    frequency: optionalText(120),
    startedOn: optionalIsoDate,
    endedOn: optionalIsoDate,
    providerId: optionalId,
    instructions: optionalLong,
    notes: optionalLong,
    active: yesNo.default(true),
  })
  .refine((v) => !v.startedOn || !v.endedOn || v.endedOn >= v.startedOn, { message: "The end date is before the start date.", path: ["endedOn"] });
export type PetMedicationInput = Loose<z.infer<typeof petMedicationInput>, "active">;

export const PET_CARE_KINDS = ["feeding", "walking", "grooming", "medication", "dental", "litter", "aquarium", "nails", "preventative", "other"] as const;
export type PetCareKind = (typeof PET_CARE_KINDS)[number];
export const PET_CARE_KIND_LABELS: Record<PetCareKind, string> = {
  feeding: "Feeding",
  walking: "Walk or exercise",
  grooming: "Grooming",
  medication: "Medication",
  dental: "Dental care",
  litter: "Litter box",
  aquarium: "Aquarium or habitat",
  nails: "Nail trim",
  preventative: "Flea, tick or heartworm",
  other: "Other",
};

export const petCareInput = z.object({
  title: shortText(120),
  careKind: z.enum(PET_CARE_KINDS).default("other"),
  dueOn: isoDate,
  recurrence: recurrenceInput.optional(),
  description: optionalLong,
  medicationId: optionalId,
});
export type PetCareInput = Loose<z.infer<typeof petCareInput>, "careKind">;

export const PET_EXPENSE_CATEGORIES = ["veterinary", "medication", "food", "supplies", "grooming", "boarding", "insurance", "training", "other"] as const;
export type PetExpenseCategory = (typeof PET_EXPENSE_CATEGORIES)[number];
export const PET_EXPENSE_CATEGORY_LABELS: Record<PetExpenseCategory, string> = {
  veterinary: "Veterinary care",
  medication: "Medication",
  food: "Food",
  supplies: "Supplies",
  grooming: "Grooming",
  boarding: "Boarding",
  insurance: "Insurance",
  training: "Training",
  other: "Other",
};

export const petExpenseInput = z.object({
  title: shortText(120),
  amount: requiredMoney,
  spentOn: isoDate,
  category: z.enum(PET_EXPENSE_CATEGORIES).default("other"),
  providerId: optionalId,
  notes: optionalLong,
});
export type PetExpenseInput = Loose<z.infer<typeof petExpenseInput>, "category">;

/* -------------------------------- account -------------------------------- */

export const signUpInput = z.object({
  name: shortText(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(10, "Use at least 10 characters.").max(128),
});
export const signInInput = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email."),
  password: z.string().min(1, "Enter your password.").max(128),
});
