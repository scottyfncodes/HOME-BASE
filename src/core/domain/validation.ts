import { z } from "zod";
import { isISODate } from "./dates";
import { parseMoneyToCents } from "./money";
import { RECURRENCE_UNITS } from "./recurrence";

/* ----------------------------- primitives -------------------------------- */

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
  other: "Other",
};

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
  notes: optionalLong,
});
export type ProviderInput = z.infer<typeof providerInput>;

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
});
export type PreparednessInput = z.infer<typeof preparednessInput>;

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
