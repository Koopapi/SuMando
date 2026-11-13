CREATE TABLE "purchase_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"presentation_id" uuid,
	"supplier_id" uuid,
	"quantity_base" numeric(20, 6) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"name_key" varchar(80) NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "requisition_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"requisition_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"actor_id" uuid NOT NULL,
	"at" timestamp with time zone NOT NULL,
	"detail" jsonb
);
--> statement-breakpoint
CREATE TABLE "requisition_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requisition_id" uuid NOT NULL,
	"supplier_id" uuid,
	"buyer" varchar(60),
	"purchased_at" timestamp with time zone,
	"purchased_by" uuid,
	"total_cents" bigint,
	CONSTRAINT "requisition_groups_total_non_negative" CHECK ("requisition_groups"."total_cents" is null or "requisition_groups"."total_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "requisition_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requisition_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"supplier_id" uuid,
	"presentation_id" uuid,
	"requested_base" numeric(20, 6) NOT NULL,
	"quantity_base" numeric(20, 6) NOT NULL,
	"received_base" numeric(20, 6) DEFAULT '0' NOT NULL,
	"amount_cents" bigint,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"close_reason" varchar(200),
	"position" integer NOT NULL,
	CONSTRAINT "requisition_lines_quantity_positive" CHECK ("requisition_lines"."quantity_base" > 0),
	CONSTRAINT "requisition_lines_amount_non_negative" CHECK ("requisition_lines"."amount_cents" is null or "requisition_lines"."amount_cents" >= 0)
);
--> statement-breakpoint
CREATE TABLE "requisitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"folio" integer NOT NULL,
	"status" varchar(10) NOT NULL,
	"note" varchar(200),
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "requisitions_status_check" CHECK ("requisitions"."status" in ('requested', 'approved', 'rejected', 'cancelled', 'closed'))
);
--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD COLUMN "requisition_id" uuid;--> statement-breakpoint
ALTER TABLE "purchase_template_items" ADD CONSTRAINT "purchase_template_items_template_id_purchase_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."purchase_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_template_items" ADD CONSTRAINT "purchase_template_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_template_items" ADD CONSTRAINT "purchase_template_items_presentation_id_product_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."product_presentations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_template_items" ADD CONSTRAINT "purchase_template_items_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_templates" ADD CONSTRAINT "purchase_templates_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_templates" ADD CONSTRAINT "purchase_templates_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_templates" ADD CONSTRAINT "purchase_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_events" ADD CONSTRAINT "requisition_events_requisition_id_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_events" ADD CONSTRAINT "requisition_events_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_groups" ADD CONSTRAINT "requisition_groups_requisition_id_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_groups" ADD CONSTRAINT "requisition_groups_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_groups" ADD CONSTRAINT "requisition_groups_purchased_by_users_id_fk" FOREIGN KEY ("purchased_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_lines" ADD CONSTRAINT "requisition_lines_requisition_id_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_lines" ADD CONSTRAINT "requisition_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_lines" ADD CONSTRAINT "requisition_lines_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_lines" ADD CONSTRAINT "requisition_lines_presentation_id_product_presentations_id_fk" FOREIGN KEY ("presentation_id") REFERENCES "public"."product_presentations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisition_lines" ADD CONSTRAINT "requisition_lines_closed_by_users_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requisitions" ADD CONSTRAINT "requisitions_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_template_items_unique" ON "purchase_template_items" USING btree ("template_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_templates_active_name_unique" ON "purchase_templates" USING btree ("branch_id","name_key") WHERE archived_at is null;--> statement-breakpoint
CREATE INDEX "requisition_events_requisition_idx" ON "requisition_events" USING btree ("requisition_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "requisition_groups_supplier_unique" ON "requisition_groups" USING btree ("requisition_id","supplier_id") WHERE "requisition_groups"."supplier_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "requisition_groups_no_supplier_unique" ON "requisition_groups" USING btree ("requisition_id") WHERE "requisition_groups"."supplier_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "requisition_lines_product_unique" ON "requisition_lines" USING btree ("requisition_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "requisitions_business_folio_unique" ON "requisitions" USING btree ("business_id","folio");--> statement-breakpoint
CREATE INDEX "requisitions_branch_idx" ON "requisitions" USING btree ("branch_id","created_at");--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_requisition_id_requisitions_id_fk" FOREIGN KEY ("requisition_id") REFERENCES "public"."requisitions"("id") ON DELETE no action ON UPDATE no action;