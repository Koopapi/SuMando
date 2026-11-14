CREATE TABLE "cash_cut_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cut_id" uuid NOT NULL,
	"method_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"is_cash" boolean NOT NULL,
	"sort" integer NOT NULL,
	"counted_cents" bigint,
	"pos_cents" bigint,
	CONSTRAINT "cash_cut_methods_amounts" CHECK (("cash_cut_methods"."counted_cents" is null or "cash_cut_methods"."counted_cents" >= 0) and ("cash_cut_methods"."pos_cents" is null or "cash_cut_methods"."pos_cents" >= 0))
);
--> statement-breakpoint
CREATE TABLE "cash_cuts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" varchar(8) NOT NULL,
	"opening_fund_cents" bigint NOT NULL,
	"cash_pieces" jsonb,
	"opened_at" timestamp with time zone NOT NULL,
	"opened_by" varchar(160) NOT NULL,
	"opened_user_id" uuid,
	"opened_employee_id" uuid,
	"opened_device_id" uuid,
	"counted_at" timestamp with time zone,
	"counted_by" varchar(160),
	"counted_user_id" uuid,
	"counted_employee_id" uuid,
	"counted_device_id" uuid,
	"pos_at" timestamp with time zone,
	"pos_by" uuid,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"note" varchar(300),
	"snapshot" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_cuts_status_check" CHECK ("cash_cuts"."status" in ('open', 'counted', 'closed')),
	CONSTRAINT "cash_cuts_fund" CHECK ("cash_cuts"."opening_fund_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "cash_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cut_id" uuid NOT NULL,
	"kind" varchar(10) NOT NULL,
	"concept" varchar(80) NOT NULL,
	"amount_cents" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"created_by" varchar(160) NOT NULL,
	"user_id" uuid,
	"employee_id" uuid,
	"device_id" uuid,
	"cancelled_at" timestamp with time zone,
	"cancelled_by" varchar(160),
	"cancel_reason" varchar(200),
	CONSTRAINT "cash_movements_kind_check" CHECK ("cash_movements"."kind" in ('expense', 'withdrawal', 'income')),
	CONSTRAINT "cash_movements_amount" CHECK ("cash_movements"."amount_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "cash_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"mode" varchar(8) NOT NULL,
	"floor_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cash_settings_mode_check" CHECK ("cash_settings"."mode" in ('daily', 'multiple'))
);
--> statement-breakpoint
CREATE TABLE "payment_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" varchar(40) NOT NULL,
	"name_key" varchar(40) NOT NULL,
	"is_cash" boolean DEFAULT false NOT NULL,
	"sort" integer NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_cut_methods" ADD CONSTRAINT "cash_cut_methods_cut_id_cash_cuts_id_fk" FOREIGN KEY ("cut_id") REFERENCES "public"."cash_cuts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_cut_methods" ADD CONSTRAINT "cash_cut_methods_method_id_payment_methods_id_fk" FOREIGN KEY ("method_id") REFERENCES "public"."payment_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD CONSTRAINT "cash_cuts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD CONSTRAINT "cash_cuts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD CONSTRAINT "cash_cuts_opened_user_id_users_id_fk" FOREIGN KEY ("opened_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD CONSTRAINT "cash_cuts_opened_employee_id_employees_id_fk" FOREIGN KEY ("opened_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD CONSTRAINT "cash_cuts_opened_device_id_floor_devices_id_fk" FOREIGN KEY ("opened_device_id") REFERENCES "public"."floor_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD CONSTRAINT "cash_cuts_counted_user_id_users_id_fk" FOREIGN KEY ("counted_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD CONSTRAINT "cash_cuts_counted_employee_id_employees_id_fk" FOREIGN KEY ("counted_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD CONSTRAINT "cash_cuts_counted_device_id_floor_devices_id_fk" FOREIGN KEY ("counted_device_id") REFERENCES "public"."floor_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD CONSTRAINT "cash_cuts_pos_by_users_id_fk" FOREIGN KEY ("pos_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD CONSTRAINT "cash_cuts_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_cut_id_cash_cuts_id_fk" FOREIGN KEY ("cut_id") REFERENCES "public"."cash_cuts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_device_id_floor_devices_id_fk" FOREIGN KEY ("device_id") REFERENCES "public"."floor_devices"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_settings" ADD CONSTRAINT "cash_settings_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_settings" ADD CONSTRAINT "cash_settings_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cash_cut_methods_unique" ON "cash_cut_methods" USING btree ("cut_id","method_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_cuts_one_open_unique" ON "cash_cuts" USING btree ("branch_id") WHERE status <> 'closed';--> statement-breakpoint
CREATE INDEX "cash_cuts_branch_idx" ON "cash_cuts" USING btree ("branch_id","date");--> statement-breakpoint
CREATE INDEX "cash_movements_cut_idx" ON "cash_movements" USING btree ("cut_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cash_settings_branch_unique" ON "cash_settings" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_active_name_unique" ON "payment_methods" USING btree ("branch_id","name_key") WHERE archived_at is null;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_methods_cash_unique" ON "payment_methods" USING btree ("branch_id") WHERE is_cash;