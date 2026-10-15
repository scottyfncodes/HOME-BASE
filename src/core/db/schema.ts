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
 *
 * Conventions: text ids (UUID v4), snake_case columns, timestamps in UTC,
 * calendar dates stored as ISO `YYYY-MM-DD` strings (never shifted by TZ).
 */
import { relations, sql } from "drizzle-orm";
import {
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
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("maintenance_task_property_idx").on(t.propertyId),
    index("maintenance_task_asset_idx").on(t.assetId),
    index("maintenance_task_due_idx").on(t.propertyId, t.status, t.dueOn),
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
    createdAt: createdAt(),
  },
  (t) => [
    index("maintenance_log_property_idx").on(t.propertyId, t.completedOn),
    index("maintenance_log_asset_idx").on(t.assetId),
    index("maintenance_log_task_idx").on(t.taskId),
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
    createdAt: createdAt(),
  },
  (t) => [
    index("expense_property_idx").on(t.propertyId, t.spentOn),
    index("expense_project_idx").on(t.projectId),
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
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("document_property_idx").on(t.propertyId, t.isVault),
    index("document_asset_idx").on(t.assetId),
    index("document_project_idx").on(t.projectId),
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
  logs: many(maintenanceLog),
}));

export const maintenanceLogRelations = relations(maintenanceLog, ({ one }) => ({
  task: one(maintenanceTask, { fields: [maintenanceLog.taskId], references: [maintenanceTask.id] }),
  asset: one(asset, { fields: [maintenanceLog.assetId], references: [asset.id] }),
  provider: one(serviceProvider, { fields: [maintenanceLog.providerId], references: [serviceProvider.id] }),
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
}));

export const documentRelations = relations(document, ({ one }) => ({
  asset: one(asset, { fields: [document.assetId], references: [asset.id] }),
  project: one(project, { fields: [document.projectId], references: [project.id] }),
  file: one(fileObject, { fields: [document.fileId], references: [fileObject.id] }),
}));

export const preparednessRelations = relations(preparednessItem, ({ one }) => ({
  location: one(location, { fields: [preparednessItem.locationId], references: [location.id] }),
}));

// Keep `sql` imported for future check constraints without an unused-import lint error.
void sql;
