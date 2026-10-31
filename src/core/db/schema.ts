/**
 * Home Base database schema.
 *
 * Layout (top to bottom):
 *   1. Authentication tables (owned by Better Auth).
 *   2. Ownership foundation: households, members, properties, locations,
 *      assets, service providers, files. These are product-agnostic and are
 *      the part a future "vehicles" product would reuse.
 *   3. Operations: maintenance tasks + history, documents, projects, expenses.
 *   4. Home Base specific: preparedness records.
 *   5. Vault security tables: unlock windows, audit log.
 *   6. Sharing and reminders.
 *   7. Pets: profiles, care team, health timeline, vaccinations, medications.
 *      Care routines, spending, documents and preparedness reuse the tables
 *      above through a nullable `pet_id`.
 *
 * Conventions: text ids (UUID v4), snake_case columns, timestamps in UTC,
 * calendar dates stored as ISO `YYYY-MM-DD` strings (never shifted by TZ).
 */
import { relations, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/* -------------------------------------------------------------------------- */
/* 1. Authentication (Better Auth)                                             */
/* -------------------------------------------------------------------------- */

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      withTimezone: true,
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      withTimezone: true,
    }),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("verification_identifier_idx").on(t.identifier)],
);

/* -------------------------------------------------------------------------- */
/* 2. Ownership foundation                                                     */
/* -------------------------------------------------------------------------- */

export const household = pgTable("household", {
  id: id(),
  name: text("name").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const householdMember = pgTable(
  "household_member",
  {
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "member"] })
      .notNull()
      .default("member"),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.householdId, t.userId] }),
    index("household_member_user_idx").on(t.userId),
  ],
);

export const property = pgTable(
  "property",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    addressLine1: text("address_line1"),
    addressLine2: text("address_line2"),
    city: text("city"),
    region: text("region"),
    postalCode: text("postal_code"),
    country: text("country"),
    homeType: text("home_type"),
    yearBuilt: integer("year_built"),
    squareFeet: integer("square_feet"),
    bedrooms: integer("bedrooms"),
    bathrooms: text("bathrooms"),
    lotSize: text("lot_size"),
    purchaseDate: date("purchase_date", { mode: "string" }),
    purchasePriceCents: integer("purchase_price_cents"),
    timezone: text("timezone").notNull().default("UTC"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("property_household_idx").on(t.householdId)],
);

export const location = pgTable(
  "location",
  {
    id: id(),
    propertyId: text("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: text("kind", {
      enum: ["room", "area", "exterior", "utility", "storage", "other"],
    })
      .notNull()
      .default("room"),
    floor: text("floor"),
    notes: text("notes"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("location_property_idx").on(t.propertyId)],
);

export const asset = pgTable(
  "asset",
  {
    id: id(),
    propertyId: text("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    locationId: text("location_id").references(() => location.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    category: text("category").notNull().default("other"),
    manufacturer: text("manufacturer"),
    model: text("model"),
    serialNumber: text("serial_number"),
    installDate: date("install_date", { mode: "string" }),
    purchaseDate: date("purchase_date", { mode: "string" }),
    purchasePriceCents: integer("purchase_price_cents"),
    replacementValueCents: integer("replacement_value_cents"),
    warrantyExpiresOn: date("warranty_expires_on", { mode: "string" }),
    status: text("status", { enum: ["active", "retired", "replaced"] })
      .notNull()
      .default("active"),
    retiredOn: date("retired_on", { mode: "string" }),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("asset_property_idx").on(t.propertyId),
    index("asset_location_idx").on(t.locationId),
  ],
);

export const serviceProvider = pgTable(
  "service_provider",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    trade: text("trade"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    address: text("address"),
    /** A separate after-hours or emergency line, when the provider has one. */
    afterHoursPhone: text("after_hours_phone"),
    /** Offers emergency / 24-hour service (an emergency vet clinic, a 24h plumber). */
    isEmergency: boolean("is_emergency").notNull().default(false),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("service_provider_household_idx").on(t.householdId)],
);

/**
 * A stored file. The bytes live wherever the configured storage provider
 * puts them (v1: the `file_blob` table). Vault files are encrypted before
 * they reach the provider; `encryption` records how.
 */
export const fileObject = pgTable(
  "file_object",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    provider: text("provider").notNull().default("database"),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    sha256: text("sha256").notNull(),
    encryption: jsonb("encryption").$type<FileEncryption | null>(),
    isVault: boolean("is_vault").notNull().default(false),
    createdBy: text("created_by").references(() => user.id, {
      onDelete: "set null",
    }),
    createdAt: createdAt(),
  },
  (t) => [index("file_object_household_idx").on(t.householdId)],
);

export type FileEncryption = {
  algorithm: "aes-256-gcm";
  /** base64, DEK wrapped with the master key (AES-256-GCM) */
  wrappedKey: string;
  wrapIv: string;
  wrapTag: string;
  /** base64 nonce + tag for the payload */
  iv: string;
  tag: string;
  keyVersion: number;
};

export const fileBlob = pgTable("file_blob", {
  fileId: text("file_id")
    .primaryKey()
    .references(() => fileObject.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
});

/* -------------------------------------------------------------------------- */
/* 3. Operations                                                               */
/* -------------------------------------------------------------------------- */

export type Recurrence = {
  every: number;
  unit: "day" | "week" | "month" | "year";
  /** "due": next = previous due + interval. "completed": next = completion + interval. */
  anchor: "due" | "completed";
};

export const maintenanceTask = pgTable(
  "maintenance_task",
  {
    id: id(),
    propertyId: text("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    assetId: text("asset_id").references(() => asset.id, {
      onDelete: "set null",
    }),
    locationId: text("location_id").references(() => location.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    dueOn: date("due_on", { mode: "string" }).notNull(),
    recurrence: jsonb("recurrence").$type<Recurrence | null>(),
    priority: text("priority", { enum: ["low", "normal", "high"] })
      .notNull()
      .default("normal"),
    status: text("status", { enum: ["scheduled", "completed", "cancelled"] })
      .notNull()
      .default("scheduled"),
    estimatedMinutes: integer("estimated_minutes"),
    guideSlug: text("guide_slug"),
    /**
     * Pet care routines are maintenance tasks for an animal: same schedule,
     * same completion history, same calendar feed. A task with `petId` is a
     * care routine and is kept out of the home maintenance lists.
     */
    petId: text("pet_id").references((): AnyPgColumn => pet.id, { onDelete: "cascade" }),
    careKind: text("care_kind"),
    petMedicationId: text("pet_medication_id").references((): AnyPgColumn => petMedication.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("maintenance_task_property_idx").on(t.propertyId),
    index("maintenance_task_asset_idx").on(t.assetId),
    index("maintenance_task_due_idx").on(t.propertyId, t.status, t.dueOn),
    index("maintenance_task_pet_idx").on(t.petId),
  ],
);

/** Immutable history. Survives deletion of the task or the asset. */
export const maintenanceLog = pgTable(
  "maintenance_log",
  {
    id: id(),
    propertyId: text("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    taskId: text("task_id").references(() => maintenanceTask.id, {
      onDelete: "set null",
    }),
    assetId: text("asset_id").references(() => asset.id, {
      onDelete: "set null",
    }),
    locationId: text("location_id").references(() => location.id, {
      onDelete: "set null",
    }),
    providerId: text("provider_id").references(() => serviceProvider.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    completedOn: date("completed_on", { mode: "string" }).notNull(),
    scheduledFor: date("scheduled_for", { mode: "string" }),
    notes: text("notes"),
    costCents: integer("cost_cents"),
    completedBy: text("completed_by").references(() => user.id, {
      onDelete: "set null",
    }),
    /** Care history for one animal (see maintenance_task.pet_id). */
    petId: text("pet_id").references((): AnyPgColumn => pet.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("maintenance_log_property_idx").on(t.propertyId, t.completedOn),
    index("maintenance_log_asset_idx").on(t.assetId),
    index("maintenance_log_task_idx").on(t.taskId),
    index("maintenance_log_pet_idx").on(t.petId, t.completedOn),
  ],
);

export const project = pgTable(
  "project",
  {
    id: id(),
    propertyId: text("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    locationId: text("location_id").references(() => location.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    description: text("description"),
    status: text("status", {
      enum: ["idea", "planned", "in_progress", "on_hold", "completed", "cancelled"],
    })
      .notNull()
      .default("planned"),
    priority: text("priority", { enum: ["low", "normal", "high"] })
      .notNull()
      .default("normal"),
    startOn: date("start_on", { mode: "string" }),
    targetOn: date("target_on", { mode: "string" }),
    completedOn: date("completed_on", { mode: "string" }),
    budgetCents: integer("budget_cents"),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("project_property_idx").on(t.propertyId, t.status)],
);

export const projectTask = pgTable(
  "project_task",
  {
    id: id(),
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    isMilestone: boolean("is_milestone").notNull().default(false),
    dueOn: date("due_on", { mode: "string" }),
    completedOn: date("completed_on", { mode: "string" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index("project_task_project_idx").on(t.projectId)],
);

export const projectAsset = pgTable(
  "project_asset",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    assetId: text("asset_id")
      .notNull()
      .references(() => asset.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.assetId] })],
);

export const projectProvider = pgTable(
  "project_provider",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => project.id, { onDelete: "cascade" }),
    providerId: text("provider_id")
      .notNull()
      .references(() => serviceProvider.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.providerId] })],
);

export const expense = pgTable(
  "expense",
  {
    id: id(),
    propertyId: text("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    assetId: text("asset_id").references(() => asset.id, {
      onDelete: "set null",
    }),
    providerId: text("provider_id").references(() => serviceProvider.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    amountCents: integer("amount_cents").notNull(),
    spentOn: date("spent_on", { mode: "string" }).notNull(),
    category: text("category"),
    notes: text("notes"),
    /** Spending for one animal. Kept (reference cleared) if the pet is deleted. */
    petId: text("pet_id").references((): AnyPgColumn => pet.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [
    index("expense_property_idx").on(t.propertyId, t.spentOn),
    index("expense_project_idx").on(t.projectId),
    index("expense_pet_idx").on(t.petId, t.spentOn),
  ],
);

export const document = pgTable(
  "document",
  {
    id: id(),
    propertyId: text("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    assetId: text("asset_id").references(() => asset.id, {
      onDelete: "set null",
    }),
    projectId: text("project_id").references(() => project.id, {
      onDelete: "set null",
    }),
    fileId: text("file_id").references(() => fileObject.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    category: text("category").notNull().default("other"),
    documentDate: date("document_date", { mode: "string" }),
    expiresOn: date("expires_on", { mode: "string" }),
    notes: text("notes"),
    isVault: boolean("is_vault").notNull().default(false),
    petId: text("pet_id").references((): AnyPgColumn => pet.id, { onDelete: "set null" }),
    petHealthEventId: text("pet_health_event_id").references((): AnyPgColumn => petHealthEvent.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("document_property_idx").on(t.propertyId, t.isVault),
    index("document_asset_idx").on(t.assetId),
    index("document_project_idx").on(t.projectId),
    index("document_pet_idx").on(t.petId),
  ],
);

/* -------------------------------------------------------------------------- */
/* 4. Home Base specific                                                       */
/* -------------------------------------------------------------------------- */

export const preparednessItem = pgTable(
  "preparedness_item",
  {
    id: id(),
    propertyId: text("property_id")
      .notNull()
      .references(() => property.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: [
        "water_shutoff",
        "gas_shutoff",
        "electrical_panel",
        "detector",
        "contact",
        "insurance",
        "equipment",
        "note",
        "pet",
      ],
    }).notNull(),
    title: text("title").notNull(),
    locationId: text("location_id").references(() => location.id, {
      onDelete: "set null",
    }),
    whereText: text("where_text"),
    instructions: text("instructions"),
    phone: text("phone"),
    details: text("details"),
    /** For kind "pet": the animal this applies to, or null for every pet. */
    petId: text("pet_id").references((): AnyPgColumn => pet.id, { onDelete: "set null" }),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("preparedness_property_idx").on(t.propertyId, t.kind)],
);

/* -------------------------------------------------------------------------- */
/* 5. Vault security                                                           */
/* -------------------------------------------------------------------------- */

/** A short-lived, server-side unlock window tied to one session. */
export const vaultUnlock = pgTable("vault_unlock", {
  sessionId: text("session_id")
    .primaryKey()
    .references(() => session.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  unlockedUntil: timestamp("unlocked_until", { withTimezone: true }).notNull(),
  createdAt: createdAt(),
});

export const vaultAttempt = pgTable(
  "vault_attempt",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    succeeded: boolean("succeeded").notNull(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("vault_attempt_user_idx").on(t.userId, t.attemptedAt)],
);

export const vaultAudit = pgTable(
  "vault_audit",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => user.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    documentId: text("document_id"),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vault_audit_household_idx").on(t.householdId, t.at)],
);

/* -------------------------------------------------------------------------- */
/* 6. Sharing and reminders                                                    */
/* -------------------------------------------------------------------------- */

/**
 * A link that lets someone join a household. Only the SHA-256 of the token is
 * stored; the link itself is shown once to the owner who made it.
 */
export const householdInvite = pgTable(
  "household_invite",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    email: text("email"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    acceptedBy: text("accepted_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("household_invite_household_idx").on(t.householdId)],
);

/** A private calendar subscription URL, one per user. Only the token's hash is stored. */
export const calendarFeed = pgTable("calendar_feed", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  lastFetchedAt: timestamp("last_fetched_at", { withTimezone: true }),
  createdAt: createdAt(),
});

/** Per-user notification settings. */
export const userPreference = pgTable("user_preference", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  weeklyDigest: boolean("weekly_digest").notNull().default(false),
  lastDigestSentAt: timestamp("last_digest_sent_at", { withTimezone: true }),
  updatedAt: updatedAt(),
});


/* -------------------------------------------------------------------------- */
/* 7. Pets                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * An animal in the household. Pets belong to the household (they move with
 * the family), not to a property. Every optional fact is genuinely optional:
 * many animals have no known birthday, breed or adoption history.
 */
export const pet = pgTable(
  "pet",
  {
    id: id(),
    householdId: text("household_id")
      .notNull()
      .references(() => household.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    species: text("species", {
      enum: ["dog", "cat", "bird", "fish", "reptile", "small_mammal", "livestock", "other"],
    }).notNull(),
    /** Free text for "other" or to be more specific ("Rabbit", "Bearded dragon"). */
    speciesDetail: text("species_detail"),
    breed: text("breed"),
    sex: text("sex", { enum: ["female", "male", "unknown"] }),
    birthDate: date("birth_date", { mode: "string" }),
    birthDateEstimated: boolean("birth_date_estimated").notNull().default(false),
    acquiredOn: date("acquired_on", { mode: "string" }),
    acquiredFrom: text("acquired_from"),
    color: text("color"),
    markings: text("markings"),
    /** Current weight, stored in grams; shown in `weightUnit`. */
    weightGrams: integer("weight_grams"),
    weightUnit: text("weight_unit", { enum: ["lb", "kg", "g"] }).notNull().default("lb"),
    microchipNumber: text("microchip_number"),
    microchipProvider: text("microchip_provider"),
    neutered: text("neutered", { enum: ["yes", "no", "unknown"] }),
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactPhone: text("emergency_contact_phone"),
    insuranceProvider: text("insurance_provider"),
    insurancePolicyNumber: text("insurance_policy_number"),
    insurancePhone: text("insurance_phone"),
    photoFileId: text("photo_file_id").references(() => fileObject.id, { onDelete: "set null" }),
    notes: text("notes"),
    /** Archived pets keep every record but leave the active views. */
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedReason: text("archived_reason"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("pet_household_idx").on(t.householdId, t.archivedAt)],
);

/** Which of the household's providers care for which pet, and in what role. */
export const petProvider = pgTable(
  "pet_provider",
  {
    petId: text("pet_id")
      .notNull()
      .references(() => pet.id, { onDelete: "cascade" }),
    providerId: text("provider_id")
      .notNull()
      .references(() => serviceProvider.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["primary_vet", "vet", "emergency_vet", "specialist", "groomer", "boarding", "trainer", "sitter", "other"],
    })
      .notNull()
      .default("vet"),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.petId, t.providerId] }), index("pet_provider_provider_idx").on(t.providerId)],
);

/**
 * The health timeline: visits, conditions, allergies, procedures, tests,
 * weights, injuries. Costs live in `expense` (linked by `expenseId`) so
 * spending has one source of truth.
 */
export const petHealthEvent = pgTable(
  "pet_health_event",
  {
    id: id(),
    petId: text("pet_id")
      .notNull()
      .references(() => pet.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: ["vet_visit", "condition", "allergy", "procedure", "test", "weight", "injury", "other"],
    }).notNull(),
    title: text("title").notNull(),
    occurredOn: date("occurred_on", { mode: "string" }).notNull(),
    description: text("description"),
    providerId: text("provider_id").references(() => serviceProvider.id, { onDelete: "set null" }),
    expenseId: text("expense_id").references(() => expense.id, { onDelete: "set null" }),
    weightGrams: integer("weight_grams"),
    followUpOn: date("follow_up_on", { mode: "string" }),
    notes: text("notes"),
    createdBy: text("created_by").references(() => user.id, { onDelete: "set null" }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("pet_health_event_pet_idx").on(t.petId, t.occurredOn), index("pet_health_event_follow_up_idx").on(t.followUpOn)],
);

export const petVaccination = pgTable(
  "pet_vaccination",
  {
    id: id(),
    petId: text("pet_id")
      .notNull()
      .references(() => pet.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    administeredOn: date("administered_on", { mode: "string" }).notNull(),
    nextDueOn: date("next_due_on", { mode: "string" }),
    providerId: text("provider_id").references(() => serviceProvider.id, { onDelete: "set null" }),
    documentId: text("document_id").references(() => document.id, { onDelete: "set null" }),
    notes: text("notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("pet_vaccination_pet_idx").on(t.petId, t.administeredOn), index("pet_vaccination_due_idx").on(t.nextDueOn)],
);

/** A prescription or ongoing medication, recorded as prescribed. Never altered by the app. */
export const petMedication = pgTable(
  "pet_medication",
  {
    id: id(),
    petId: text("pet_id")
      .notNull()
      .references(() => pet.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    dosage: text("dosage"),
    frequency: text("frequency"),
    startedOn: date("started_on", { mode: "string" }),
    endedOn: date("ended_on", { mode: "string" }),
    providerId: text("provider_id").references(() => serviceProvider.id, { onDelete: "set null" }),
    instructions: text("instructions"),
    notes: text("notes"),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("pet_medication_pet_idx").on(t.petId, t.active)],
);

/* -------------------------------------------------------------------------- */
/* Relations (used for relational queries)                                     */
/* -------------------------------------------------------------------------- */

export const householdRelations = relations(household, ({ many }) => ({
  members: many(householdMember),
  properties: many(property),
}));

export const propertyRelations = relations(property, ({ one, many }) => ({
  household: one(household, {
    fields: [property.householdId],
    references: [household.id],
  }),
  locations: many(location),
  assets: many(asset),
}));

export const assetRelations = relations(asset, ({ one, many }) => ({
  property: one(property, { fields: [asset.propertyId], references: [property.id] }),
  location: one(location, { fields: [asset.locationId], references: [location.id] }),
  tasks: many(maintenanceTask),
  logs: many(maintenanceLog),
  documents: many(document),
}));

export const locationRelations = relations(location, ({ one, many }) => ({
  property: one(property, { fields: [location.propertyId], references: [property.id] }),
  assets: many(asset),
}));

export const maintenanceTaskRelations = relations(maintenanceTask, ({ one, many }) => ({
  asset: one(asset, { fields: [maintenanceTask.assetId], references: [asset.id] }),
  location: one(location, { fields: [maintenanceTask.locationId], references: [location.id] }),
  pet: one(pet, { fields: [maintenanceTask.petId], references: [pet.id] }),
  medication: one(petMedication, { fields: [maintenanceTask.petMedicationId], references: [petMedication.id] }),
  logs: many(maintenanceLog),
}));

export const maintenanceLogRelations = relations(maintenanceLog, ({ one }) => ({
  task: one(maintenanceTask, { fields: [maintenanceLog.taskId], references: [maintenanceTask.id] }),
  asset: one(asset, { fields: [maintenanceLog.assetId], references: [asset.id] }),
  provider: one(serviceProvider, { fields: [maintenanceLog.providerId], references: [serviceProvider.id] }),
  pet: one(pet, { fields: [maintenanceLog.petId], references: [pet.id] }),
  completedByUser: one(user, { fields: [maintenanceLog.completedBy], references: [user.id] }),
}));

export const projectRelations = relations(project, ({ one, many }) => ({
  location: one(location, { fields: [project.locationId], references: [location.id] }),
  tasks: many(projectTask),
  expenses: many(expense),
  assets: many(projectAsset),
  documents: many(document),
}));

export const projectTaskRelations = relations(projectTask, ({ one }) => ({
  project: one(project, { fields: [projectTask.projectId], references: [project.id] }),
}));

export const projectAssetRelations = relations(projectAsset, ({ one }) => ({
  project: one(project, { fields: [projectAsset.projectId], references: [project.id] }),
  asset: one(asset, { fields: [projectAsset.assetId], references: [asset.id] }),
}));

export const expenseRelations = relations(expense, ({ one }) => ({
  project: one(project, { fields: [expense.projectId], references: [project.id] }),
  asset: one(asset, { fields: [expense.assetId], references: [asset.id] }),
  provider: one(serviceProvider, { fields: [expense.providerId], references: [serviceProvider.id] }),
  pet: one(pet, { fields: [expense.petId], references: [pet.id] }),
}));

export const documentRelations = relations(document, ({ one }) => ({
  asset: one(asset, { fields: [document.assetId], references: [asset.id] }),
  project: one(project, { fields: [document.projectId], references: [project.id] }),
  file: one(fileObject, { fields: [document.fileId], references: [fileObject.id] }),
  pet: one(pet, { fields: [document.petId], references: [pet.id] }),
  healthEvent: one(petHealthEvent, { fields: [document.petHealthEventId], references: [petHealthEvent.id] }),
}));

export const preparednessRelations = relations(preparednessItem, ({ one }) => ({
  location: one(location, { fields: [preparednessItem.locationId], references: [location.id] }),
  pet: one(pet, { fields: [preparednessItem.petId], references: [pet.id] }),
}));

export const petRelations = relations(pet, ({ one, many }) => ({
  household: one(household, { fields: [pet.householdId], references: [household.id] }),
  photo: one(fileObject, { fields: [pet.photoFileId], references: [fileObject.id] }),
  providers: many(petProvider),
  healthEvents: many(petHealthEvent),
  vaccinations: many(petVaccination),
  medications: many(petMedication),
}));

export const petProviderRelations = relations(petProvider, ({ one }) => ({
  pet: one(pet, { fields: [petProvider.petId], references: [pet.id] }),
  provider: one(serviceProvider, { fields: [petProvider.providerId], references: [serviceProvider.id] }),
}));

export const petHealthEventRelations = relations(petHealthEvent, ({ one, many }) => ({
  pet: one(pet, { fields: [petHealthEvent.petId], references: [pet.id] }),
  provider: one(serviceProvider, { fields: [petHealthEvent.providerId], references: [serviceProvider.id] }),
  expense: one(expense, { fields: [petHealthEvent.expenseId], references: [expense.id] }),
  documents: many(document),
}));

export const petVaccinationRelations = relations(petVaccination, ({ one }) => ({
  pet: one(pet, { fields: [petVaccination.petId], references: [pet.id] }),
  provider: one(serviceProvider, { fields: [petVaccination.providerId], references: [serviceProvider.id] }),
  document: one(document, { fields: [petVaccination.documentId], references: [document.id] }),
}));

export const petMedicationRelations = relations(petMedication, ({ one }) => ({
  pet: one(pet, { fields: [petMedication.petId], references: [pet.id] }),
  provider: one(serviceProvider, { fields: [petMedication.providerId], references: [serviceProvider.id] }),
}));

// Keep `sql` imported for future check constraints without an unused-import lint error.
void sql;
