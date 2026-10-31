CREATE TABLE "pet" (
	"id" text PRIMARY KEY NOT NULL,
	"household_id" text NOT NULL,
	"name" text NOT NULL,
	"species" text NOT NULL,
	"species_detail" text,
	"breed" text,
	"sex" text,
	"birth_date" date,
	"birth_date_estimated" boolean DEFAULT false NOT NULL,
	"acquired_on" date,
	"acquired_from" text,
	"color" text,
	"markings" text,
	"weight_grams" integer,
	"weight_unit" text DEFAULT 'lb' NOT NULL,
	"microchip_number" text,
	"microchip_provider" text,
	"neutered" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"insurance_provider" text,
	"insurance_policy_number" text,
	"insurance_phone" text,
	"photo_file_id" text,
	"notes" text,
	"archived_at" timestamp with time zone,
	"archived_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_health_event" (
	"id" text PRIMARY KEY NOT NULL,
	"pet_id" text NOT NULL,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"occurred_on" date NOT NULL,
	"description" text,
	"provider_id" text,
	"expense_id" text,
	"weight_grams" integer,
	"follow_up_on" date,
	"notes" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_medication" (
	"id" text PRIMARY KEY NOT NULL,
	"pet_id" text NOT NULL,
	"name" text NOT NULL,
	"dosage" text,
	"frequency" text,
	"started_on" date,
	"ended_on" date,
	"provider_id" text,
	"instructions" text,
	"notes" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pet_provider" (
	"pet_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"role" text DEFAULT 'vet' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pet_provider_pet_id_provider_id_pk" PRIMARY KEY("pet_id","provider_id")
);
--> statement-breakpoint
CREATE TABLE "pet_vaccination" (
	"id" text PRIMARY KEY NOT NULL,
	"pet_id" text NOT NULL,
	"name" text NOT NULL,
	"administered_on" date NOT NULL,
	"next_due_on" date,
	"provider_id" text,
	"document_id" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "pet_id" text;--> statement-breakpoint
ALTER TABLE "document" ADD COLUMN "pet_health_event_id" text;--> statement-breakpoint
ALTER TABLE "expense" ADD COLUMN "pet_id" text;--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD COLUMN "pet_id" text;--> statement-breakpoint
ALTER TABLE "maintenance_task" ADD COLUMN "pet_id" text;--> statement-breakpoint
ALTER TABLE "maintenance_task" ADD COLUMN "care_kind" text;--> statement-breakpoint
ALTER TABLE "maintenance_task" ADD COLUMN "pet_medication_id" text;--> statement-breakpoint
ALTER TABLE "preparedness_item" ADD COLUMN "pet_id" text;--> statement-breakpoint
ALTER TABLE "service_provider" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "service_provider" ADD COLUMN "after_hours_phone" text;--> statement-breakpoint
ALTER TABLE "service_provider" ADD COLUMN "is_emergency" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "pet" ADD CONSTRAINT "pet_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet" ADD CONSTRAINT "pet_photo_file_id_file_object_id_fk" FOREIGN KEY ("photo_file_id") REFERENCES "public"."file_object"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_health_event" ADD CONSTRAINT "pet_health_event_pet_id_pet_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_health_event" ADD CONSTRAINT "pet_health_event_provider_id_service_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_provider"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_health_event" ADD CONSTRAINT "pet_health_event_expense_id_expense_id_fk" FOREIGN KEY ("expense_id") REFERENCES "public"."expense"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_health_event" ADD CONSTRAINT "pet_health_event_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_medication" ADD CONSTRAINT "pet_medication_pet_id_pet_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_medication" ADD CONSTRAINT "pet_medication_provider_id_service_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_provider"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_provider" ADD CONSTRAINT "pet_provider_pet_id_pet_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_provider" ADD CONSTRAINT "pet_provider_provider_id_service_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_provider"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_vaccination" ADD CONSTRAINT "pet_vaccination_pet_id_pet_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_vaccination" ADD CONSTRAINT "pet_vaccination_provider_id_service_provider_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."service_provider"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pet_vaccination" ADD CONSTRAINT "pet_vaccination_document_id_document_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."document"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "pet_household_idx" ON "pet" USING btree ("household_id","archived_at");--> statement-breakpoint
CREATE INDEX "pet_health_event_pet_idx" ON "pet_health_event" USING btree ("pet_id","occurred_on");--> statement-breakpoint
CREATE INDEX "pet_health_event_follow_up_idx" ON "pet_health_event" USING btree ("follow_up_on");--> statement-breakpoint
CREATE INDEX "pet_medication_pet_idx" ON "pet_medication" USING btree ("pet_id","active");--> statement-breakpoint
CREATE INDEX "pet_provider_provider_idx" ON "pet_provider" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "pet_vaccination_pet_idx" ON "pet_vaccination" USING btree ("pet_id","administered_on");--> statement-breakpoint
CREATE INDEX "pet_vaccination_due_idx" ON "pet_vaccination" USING btree ("next_due_on");--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_pet_id_pet_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document" ADD CONSTRAINT "document_pet_health_event_id_pet_health_event_id_fk" FOREIGN KEY ("pet_health_event_id") REFERENCES "public"."pet_health_event"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense" ADD CONSTRAINT "expense_pet_id_pet_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_log" ADD CONSTRAINT "maintenance_log_pet_id_pet_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_task" ADD CONSTRAINT "maintenance_task_pet_id_pet_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maintenance_task" ADD CONSTRAINT "maintenance_task_pet_medication_id_pet_medication_id_fk" FOREIGN KEY ("pet_medication_id") REFERENCES "public"."pet_medication"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "preparedness_item" ADD CONSTRAINT "preparedness_item_pet_id_pet_id_fk" FOREIGN KEY ("pet_id") REFERENCES "public"."pet"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_pet_idx" ON "document" USING btree ("pet_id");--> statement-breakpoint
CREATE INDEX "expense_pet_idx" ON "expense" USING btree ("pet_id","spent_on");--> statement-breakpoint
CREATE INDEX "maintenance_log_pet_idx" ON "maintenance_log" USING btree ("pet_id","completed_on");--> statement-breakpoint
CREATE INDEX "maintenance_task_pet_idx" ON "maintenance_task" USING btree ("pet_id");