CREATE TABLE "document_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"name_key" varchar(80) NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"validity_months" smallint,
	"position" integer NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_types_validity" CHECK ("document_types"."validity_months" is null or "document_types"."validity_months" between 1 and 120)
);
--> statement-breakpoint
CREATE TABLE "employee_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"document_type_id" uuid NOT NULL,
	"storage_key" varchar(80) NOT NULL,
	"original_name" varchar(200) NOT NULL,
	"content_type" varchar(40) NOT NULL,
	"size_bytes" integer NOT NULL,
	"issued_on" date,
	"uploaded_by" uuid NOT NULL,
	"uploaded_at" timestamp with time zone NOT NULL,
	"replaced_at" timestamp with time zone,
	"replaced_by" uuid,
	"retired_at" timestamp with time zone,
	"retired_by" uuid,
	"retire_reason" varchar(200)
);
--> statement-breakpoint
CREATE TABLE "employee_periods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"employee_id" uuid NOT NULL,
	"hired_on" date NOT NULL,
	"left_on" date,
	"leave_reason" varchar(12),
	"leave_note" varchar(200),
	CONSTRAINT "employee_periods_dates" CHECK ("employee_periods"."left_on" is null or "employee_periods"."left_on" >= "employee_periods"."hired_on")
);
--> statement-breakpoint
CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"name_key" varchar(80) NOT NULL,
	"position_id" uuid NOT NULL,
	"phone" varchar(30),
	"notes" varchar(500),
	"daily_pay_cents" bigint,
	"active" boolean DEFAULT true NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_pay_positive" CHECK ("employees"."daily_pay_cents" is null or "employees"."daily_pay_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "positions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"name_key" varchar(80) NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "document_types" ADD CONSTRAINT "document_types_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_files" ADD CONSTRAINT "employee_files_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_files" ADD CONSTRAINT "employee_files_document_type_id_document_types_id_fk" FOREIGN KEY ("document_type_id") REFERENCES "public"."document_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_files" ADD CONSTRAINT "employee_files_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_files" ADD CONSTRAINT "employee_files_replaced_by_users_id_fk" FOREIGN KEY ("replaced_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_files" ADD CONSTRAINT "employee_files_retired_by_users_id_fk" FOREIGN KEY ("retired_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employee_periods" ADD CONSTRAINT "employee_periods_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_position_id_positions_id_fk" FOREIGN KEY ("position_id") REFERENCES "public"."positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "employees" ADD CONSTRAINT "employees_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "positions" ADD CONSTRAINT "positions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "document_types_active_name_unique" ON "document_types" USING btree ("business_id","name_key") WHERE archived_at is null;--> statement-breakpoint
CREATE INDEX "employee_files_employee_idx" ON "employee_files" USING btree ("employee_id","document_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_files_storage_key_unique" ON "employee_files" USING btree ("storage_key");--> statement-breakpoint
CREATE INDEX "employee_periods_employee_idx" ON "employee_periods" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "employee_periods_open_unique" ON "employee_periods" USING btree ("employee_id") WHERE left_on is null;--> statement-breakpoint
CREATE INDEX "employees_branch_idx" ON "employees" USING btree ("branch_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "positions_active_name_unique" ON "positions" USING btree ("business_id","name_key") WHERE archived_at is null;