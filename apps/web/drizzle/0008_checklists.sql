CREATE TABLE "checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"section_id" uuid NOT NULL,
	"text" varchar(200) NOT NULL,
	"kind" varchar(8) NOT NULL,
	"is_key" boolean DEFAULT false NOT NULL,
	"sort" integer NOT NULL,
	"archived_at" timestamp with time zone,
	CONSTRAINT "checklist_items_kind_check" CHECK ("checklist_items"."kind" in ('check', 'photo', 'comment')),
	CONSTRAINT "checklist_items_key_kind" CHECK (not "checklist_items"."is_key" or "checklist_items"."kind" <> 'comment')
);
--> statement-breakpoint
CREATE TABLE "checklist_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"position_id" uuid,
	"sort" integer NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "checklist_sheet_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sheet_section_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"text" varchar(200) NOT NULL,
	"kind" varchar(8) NOT NULL,
	"is_key" boolean NOT NULL,
	"sort" integer NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"comment" varchar(500),
	"photo_key" varchar(80),
	"photo_type" varchar(40),
	"marked_at" timestamp with time zone,
	"marked_by" varchar(160),
	"marked_user_id" uuid,
	"marked_employee_id" uuid,
	"marked_device_id" uuid
);
--> statement-breakpoint
CREATE TABLE "checklist_sheet_sections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sheet_id" uuid NOT NULL,
	"section_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"position_id" uuid,
	"sort" integer NOT NULL,
	"ready_at" timestamp with time zone,
	"ready_by" varchar(160),
	"ready_user_id" uuid,
	"ready_employee_id" uuid,
	"ready_device_id" uuid
);
--> statement-breakpoint
CREATE TABLE "checklist_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"date" date NOT NULL,
	"template_name" varchar(80) NOT NULL,
	"status" varchar(6) NOT NULL,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"pending" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checklist_sheets_status_check" CHECK ("checklist_sheets"."status" in ('open', 'closed'))
);
--> statement-breakpoint
CREATE TABLE "checklist_template_branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"name_key" varchar(80) NOT NULL,
	"days_mask" smallint NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "checklist_templates_days" CHECK ("checklist_templates"."days_mask" between 1 and 127)
);
--> statement-breakpoint
CREATE TABLE "floor_devices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"token_hash" text NOT NULL,
	"enabled_by" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_used_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"disabled_by" uuid
);
--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_section_id_checklist_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."checklist_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sections" ADD CONSTRAINT "checklist_sections_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sections" ADD CONSTRAINT "checklist_sections_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheet_items" ADD CONSTRAINT "checklist_sheet_items_sheet_section_id_checklist_sheet_sections_id_fk" FOREIGN KEY ("sheet_section_id") REFERENCES "public"."checklist_sheet_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheet_items" ADD CONSTRAINT "checklist_sheet_items_item_id_checklist_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."checklist_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheet_items" ADD CONSTRAINT "checklist_sheet_items_marked_user_id_users_id_fk" FOREIGN KEY ("marked_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheet_items" ADD CONSTRAINT "checklist_sheet_items_marked_employee_id_employees_id_fk" FOREIGN KEY ("marked_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheet_items" ADD CONSTRAINT "checklist_sheet_items_marked_device_id_floor_devices_id_fk" FOREIGN KEY ("marked_device_id") REFERENCES "public"."floor_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheet_sections" ADD CONSTRAINT "checklist_sheet_sections_sheet_id_checklist_sheets_id_fk" FOREIGN KEY ("sheet_id") REFERENCES "public"."checklist_sheets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheet_sections" ADD CONSTRAINT "checklist_sheet_sections_section_id_checklist_sections_id_fk" FOREIGN KEY ("section_id") REFERENCES "public"."checklist_sections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheet_sections" ADD CONSTRAINT "checklist_sheet_sections_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheet_sections" ADD CONSTRAINT "checklist_sheet_sections_ready_user_id_users_id_fk" FOREIGN KEY ("ready_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheet_sections" ADD CONSTRAINT "checklist_sheet_sections_ready_employee_id_employees_id_fk" FOREIGN KEY ("ready_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheet_sections" ADD CONSTRAINT "checklist_sheet_sections_ready_device_id_floor_devices_id_fk" FOREIGN KEY ("ready_device_id") REFERENCES "public"."floor_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheets" ADD CONSTRAINT "checklist_sheets_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheets" ADD CONSTRAINT "checklist_sheets_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheets" ADD CONSTRAINT "checklist_sheets_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_sheets" ADD CONSTRAINT "checklist_sheets_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_template_branches" ADD CONSTRAINT "checklist_template_branches_template_id_checklist_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."checklist_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_template_branches" ADD CONSTRAINT "checklist_template_branches_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_devices" ADD CONSTRAINT "floor_devices_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_devices" ADD CONSTRAINT "floor_devices_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_devices" ADD CONSTRAINT "floor_devices_enabled_by_users_id_fk" FOREIGN KEY ("enabled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "floor_devices" ADD CONSTRAINT "floor_devices_disabled_by_users_id_fk" FOREIGN KEY ("disabled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "checklist_items_section_idx" ON "checklist_items" USING btree ("section_id");--> statement-breakpoint
CREATE INDEX "checklist_sections_template_idx" ON "checklist_sections" USING btree ("template_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_sheet_items_unique" ON "checklist_sheet_items" USING btree ("sheet_section_id","item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_sheet_items_photo_unique" ON "checklist_sheet_items" USING btree ("photo_key");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_sheet_sections_unique" ON "checklist_sheet_sections" USING btree ("sheet_id","section_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_sheets_day_unique" ON "checklist_sheets" USING btree ("template_id","branch_id","date");--> statement-breakpoint
CREATE INDEX "checklist_sheets_branch_idx" ON "checklist_sheets" USING btree ("branch_id","date");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_template_branches_unique" ON "checklist_template_branches" USING btree ("template_id","branch_id");--> statement-breakpoint
CREATE INDEX "checklist_template_branches_branch_idx" ON "checklist_template_branches" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_templates_active_name_unique" ON "checklist_templates" USING btree ("business_id","name_key") WHERE archived_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX "floor_devices_token_hash_unique" ON "floor_devices" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "floor_devices_branch_idx" ON "floor_devices" USING btree ("branch_id");