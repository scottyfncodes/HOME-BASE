CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "asset" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"location_id" text,
	"name" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"manufacturer" text,
	"model" text,
	"serial_number" text,
	"install_date" date,
	"purchase_date" date,
	"purchase_price_cents" integer,
	"replacement_value_cents" integer,
	"warranty_expires_on" date,
	"status" text DEFAULT 'active' NOT NULL,
	"retired_on" date,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"asset_id" text,
	"project_id" text,
	"file_id" text,
	"title" text NOT NULL,
	"category" text DEFAULT 'other' NOT NULL,
	"document_date" date,
	"expires_on" date,
	"notes" text,
	"is_vault" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "expense" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"project_id" text,
	"asset_id" text,
	"provider_id" text,
	"title" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"spent_on" date NOT NULL,
	"category" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_blob" (
	"file_id" text PRIMARY KEY NOT NULL,
	"data" "bytea" NOT NULL
);
--> statement-breakpoint
CREATE TABLE "file_object" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"provider" text DEFAULT 'database' NOT NULL,
	"storage_key" text NOT NULL,
	"filename" text NOT NULL,
	"content_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"sha256" text NOT NULL,
	"encryption" jsonb,
	"is_vault" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "household_member" (
	"household_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "household_member_household_id_user_id_pk" PRIMARY KEY("household_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'room' NOT NULL,
	"floor" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_log" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"task_id" text,
	"asset_id" text,
	"location_id" text,
	"provider_id" text,
	"title" text NOT NULL,
	"completed_on" date NOT NULL,
	"scheduled_for" date,
	"notes" text,
	"cost_cents" integer,
	"completed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maintenance_task" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"asset_id" text,
	"location_id" text,
	"title" text NOT NULL,
	"description" text,
	"due_on" date NOT NULL,
	"recurrence" jsonb,
	"priority" text DEFAULT 'normal' NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"estimated_minutes" integer,
	"guide_slug" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "preparedness_item" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"location_id" text,
	"where_text" text,
	"instructions" text,
	"phone" text,
	"details" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" text PRIMARY KEY NOT NULL,
	"property_id" text NOT NULL,
	"location_id" text,
	"name" text NOT NULL,
	"description" text,
	"status" text DEFAULT 'planned' NOT NULL,
	"priority" text DEFAULT 'normal' NOT NULL,
	"start_on" date,
	"target_on" date,
	"completed_on" date,
	"budget_cents" integer,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_asset" (
	"project_id" text NOT NULL,
	"asset_id" text NOT NULL,
	CONSTRAINT "project_asset_project_id_asset_id_pk" PRIMARY KEY("project_id","asset_id")
);
--> statement-breakpoint
CREATE TABLE "project_provider" (
	"project_id" text NOT NULL,
	"provider_id" text NOT NULL,
	CONSTRAINT "project_provider_project_id_provider_id_pk" PRIMARY KEY("project_id","provider_id")
);
--> statement-breakpoint
CREATE TABLE "project_task" (
	"id" text PRIMARY KEY NOT NULL,
	"project_id" text NOT NULL,
	"title" text NOT NULL,
	"is_milestone" boolean DEFAULT false NOT NULL,
	"due_on" date,
	"completed_on" date,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"region" text,
	"postal_code" text,
	"country" text,
	"home_type" text,
	"year_built" integer,
	"square_feet" integer,
	"bedrooms" integer,
	"bathrooms" text,
	"lot_size" text,
	"purchase_date" date,
	"purchase_price_cents" integer,
	"timezone" text DEFAULT 'UTC' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_provider" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"trade" text,
	"phone" text,
	"email" text,
	"website" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vault_attempt" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"succeeded" boolean NOT NULL,
	"attempted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_audit" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"user_id" text,
	"action" text NOT NULL,
	"document_id" text,
	"at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vault_unlock" (
	"session_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"unlocked_until" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "asset" ADD CONSTRAINT "asset_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_file_id_file_object_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_object"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_provider_id_service_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_provider"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_blob" ADD CONSTRAINT "file_blob_file_id_file_object_id_fk" FOREIGN KEY ("file_id") REFERENCES "public"."file_object"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_object" ADD CONSTRAINT "file_object_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "file_object" ADD CONSTRAINT "file_object_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_member" ADD CONSTRAINT "household_member_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "household_member" ADD CONSTRAINT "household_member_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD CONSTRAINT "maintenance_log_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD CONSTRAINT "maintenance_log_task_id_maintenance_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."maintenance_task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD CONSTRAINT "maintenance_log_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD CONSTRAINT "maintenance_log_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD CONSTRAINT "maintenance_log_provider_id_service_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_provider"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD CONSTRAINT "maintenance_log_completed_by_user_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_task" ADD CONSTRAINT "maintenance_task_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_task" ADD CONSTRAINT "maintenance_task_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_task" ADD CONSTRAINT "maintenance_task_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparedness_item" ADD CONSTRAINT "preparedness_item_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparedness_item" ADD CONSTRAINT "preparedness_item_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_property_id_property_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."property"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project" ADD CONSTRAINT "project_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_asset" ADD CONSTRAINT "project_asset_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_asset" ADD CONSTRAINT "project_asset_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_provider" ADD CONSTRAINT "project_provider_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_provider" ADD CONSTRAINT "project_provider_provider_id_service_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_provider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_task" ADD CONSTRAINT "project_task_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "property" ADD CONSTRAINT "property_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_provider" ADD CONSTRAINT "service_provider_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_attempt" ADD CONSTRAINT "vault_attempt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_audit" ADD CONSTRAINT "vault_audit_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_audit" ADD CONSTRAINT "vault_audit_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_unlock" ADD CONSTRAINT "vault_unlock_session_id_session_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vault_unlock" ADD CONSTRAINT "vault_unlock_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "asset_property_idx" ON "asset" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "asset_location_idx" ON "asset" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "document_property_idx" ON "document" USING btree ("property_id","is_vault");--> statement-breakpoint
CREATE INDEX "document_asset_idx" ON "document" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "document_project_idx" ON "document" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "expense_property_idx" ON "expense" USING btree ("property_id","spent_on");--> statement-breakpoint
CREATE INDEX "expense_project_idx" ON "expense" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "file_object_household_idx" ON "file_object" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "household_member_user_idx" ON "household_member" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "location_property_idx" ON "location" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "maintenance_log_property_idx" ON "maintenance_log" USING btree ("property_id","completed_on");--> statement-breakpoint
CREATE INDEX "maintenance_log_asset_idx" ON "maintenance_log" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "maintenance_log_task_idx" ON "maintenance_log" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "maintenance_task_property_idx" ON "maintenance_task" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "maintenance_task_asset_idx" ON "maintenance_task" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX "maintenance_task_due_idx" ON "maintenance_task" USING btree ("property_id","status","due_on");--> statement-breakpoint
CREATE INDEX "preparedness_property_idx" ON "preparedness_item" USING btree ("property_id","kind");--> statement-breakpoint
CREATE INDEX "project_property_idx" ON "project" USING btree ("property_id","status");--> statement-breakpoint
CREATE INDEX "project_task_project_idx" ON "project_task" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "property_household_idx" ON "property" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "service_provider_household_idx" ON "service_provider" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "vault_attempt_user_idx" ON "vault_attempt" USING btree ("user_id","attempted_at");--> statement-breakpoint
CREATE INDEX "vault_audit_household_idx" ON "vault_audit" USING btree ("household_id","at");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");