CREATE TABLE "loan_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"loan_id" uuid NOT NULL,
	"week_id" uuid NOT NULL,
	"amount_cents" bigint NOT NULL,
	"applied" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loan_payments_amount" CHECK ("loan_payments"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"lent_on" date NOT NULL,
	"amount_cents" bigint NOT NULL,
	"weekly_cents" bigint NOT NULL,
	"balance_cents" bigint NOT NULL,
	"settled_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loans_amounts" CHECK ("loans"."amount_cents" > 0 and "loans"."weekly_cents" > 0 and "loans"."weekly_cents" <= "loans"."amount_cents" and "loans"."balance_cents" >= 0 and "loans"."balance_cents" <= "loans"."amount_cents")
);
--> statement-breakpoint
CREATE TABLE "payroll_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"line_id" uuid NOT NULL,
	"day" smallint NOT NULL,
	"state" varchar(6) NOT NULL,
	"late" boolean DEFAULT false NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_days_day_range" CHECK ("payroll_days"."day" between 0 and 6),
	CONSTRAINT "payroll_days_state_check" CHECK ("payroll_days"."state" in ('worked', 'half'))
);
--> statement-breakpoint
CREATE TABLE "payroll_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"extras_cents" bigint DEFAULT 0 NOT NULL,
	"bonus_cents" bigint DEFAULT 0 NOT NULL,
	"bonus_concept" varchar(80),
	"meal_cents" bigint DEFAULT 0 NOT NULL,
	"daily_pay_cents" bigint,
	"position_name" varchar(80),
	"days_count" smallint,
	"half_count" smallint,
	"late_count" smallint,
	"days_cents" bigint,
	"late_cents" bigint,
	"loan_cents" bigint,
	"net_cents" bigint,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_lines_amounts" CHECK ("payroll_lines"."extras_cents" >= 0 and "payroll_lines"."bonus_cents" >= 0 and "payroll_lines"."meal_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "payroll_weeks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"week_start" date NOT NULL,
	"status" varchar(6) NOT NULL,
	"total_cents" bigint,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payroll_weeks_status_check" CHECK ("payroll_weeks"."status" in ('open', 'closed')),
	CONSTRAINT "payroll_weeks_monday" CHECK (extract(isodow from "payroll_weeks"."week_start") = 1)
);
--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_loan_id_loans_id_fk" FOREIGN KEY ("loan_id") REFERENCES "public"."loans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loan_payments" ADD CONSTRAINT "loan_payments_week_id_payroll_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."payroll_weeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_days" ADD CONSTRAINT "payroll_days_line_id_payroll_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."payroll_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_days" ADD CONSTRAINT "payroll_days_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_week_id_payroll_weeks_id_fk" FOREIGN KEY ("week_id") REFERENCES "public"."payroll_weeks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_lines" ADD CONSTRAINT "payroll_lines_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_weeks" ADD CONSTRAINT "payroll_weeks_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_weeks" ADD CONSTRAINT "payroll_weeks_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_weeks" ADD CONSTRAINT "payroll_weeks_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_weeks" ADD CONSTRAINT "payroll_weeks_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "loan_payments_loan_week_unique" ON "loan_payments" USING btree ("loan_id","week_id");--> statement-breakpoint
CREATE INDEX "loan_payments_week_idx" ON "loan_payments" USING btree ("week_id");--> statement-breakpoint
CREATE INDEX "loans_employee_idx" ON "loans" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_days_line_day_unique" ON "payroll_days" USING btree ("line_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_lines_week_employee_unique" ON "payroll_lines" USING btree ("week_id","employee_id");--> statement-breakpoint
CREATE INDEX "payroll_lines_employee_idx" ON "payroll_lines" USING btree ("employee_id");--> statement-breakpoint
CREATE UNIQUE INDEX "payroll_weeks_branch_start_unique" ON "payroll_weeks" USING btree ("branch_id","week_start");