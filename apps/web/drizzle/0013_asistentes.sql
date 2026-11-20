CREATE TABLE "wizard_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"target" text DEFAULT '' NOT NULL,
	"user_id" uuid,
	"floor_device_id" uuid,
	"employee_id" uuid,
	"step" text NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wizard_drafts_one_owner" CHECK (("wizard_drafts"."user_id" is null) <> ("wizard_drafts"."floor_device_id" is null))
);
--> statement-breakpoint
CREATE TABLE "wizard_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" text NOT NULL,
	"view" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wizard_preferences_view" CHECK ("wizard_preferences"."view" in ('wizard', 'full'))
);
--> statement-breakpoint
ALTER TABLE "wizard_drafts" ADD CONSTRAINT "wizard_drafts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizard_drafts" ADD CONSTRAINT "wizard_drafts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizard_drafts" ADD CONSTRAINT "wizard_drafts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizard_drafts" ADD CONSTRAINT "wizard_drafts_floor_device_id_floor_devices_id_fk" FOREIGN KEY ("floor_device_id") REFERENCES "public"."floor_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizard_drafts" ADD CONSTRAINT "wizard_drafts_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wizard_preferences" ADD CONSTRAINT "wizard_preferences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "wizard_drafts_user_unique" ON "wizard_drafts" USING btree ("user_id","branch_id","kind","target") WHERE "wizard_drafts"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "wizard_drafts_floor_unique" ON "wizard_drafts" USING btree ("floor_device_id","employee_id","kind","target") WHERE "wizard_drafts"."floor_device_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "wizard_preferences_user_kind_unique" ON "wizard_preferences" USING btree ("user_id","kind");