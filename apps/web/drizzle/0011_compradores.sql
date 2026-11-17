CREATE TABLE "supplier_buyers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"employee_id" uuid NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "requisition_groups" ADD COLUMN "buyer_employee_id" uuid;--> statement-breakpoint
ALTER TABLE "supplier_buyers" ADD CONSTRAINT "supplier_buyers_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_buyers" ADD CONSTRAINT "supplier_buyers_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_buyers" ADD CONSTRAINT "supplier_buyers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_buyers" ADD CONSTRAINT "supplier_buyers_employee_id_employees_id_fk" FOREIGN KEY ("employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_buyers" ADD CONSTRAINT "supplier_buyers_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_buyers_branch_supplier_unique" ON "supplier_buyers" USING btree ("branch_id","supplier_id");--> statement-breakpoint
ALTER TABLE "requisition_groups" ADD CONSTRAINT "requisition_groups_buyer_employee_id_employees_id_fk" FOREIGN KEY ("buyer_employee_id") REFERENCES "public"."employees"("id") ON DELETE no action ON UPDATE no action;