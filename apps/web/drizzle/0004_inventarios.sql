CREATE TABLE "area_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"area_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_count_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"count_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"expected_base" numeric(20, 6) NOT NULL,
	"counted_base" numeric(20, 6) NOT NULL,
	"difference_base" numeric(20, 6) NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "inventory_count_lines_counted_non_negative" CHECK ("inventory_count_lines"."counted_base" >= 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"area_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movement_lines" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"movement_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"delta_base" numeric(20, 6) NOT NULL,
	"balance_after" numeric(20, 6) NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid,
	"warehouse_id" uuid NOT NULL,
	"kind" varchar(14) NOT NULL,
	"reason" varchar(10),
	"supplier_id" uuid,
	"reference" varchar(40),
	"note" varchar(200),
	"transfer_id" uuid,
	"count_id" uuid,
	"reverses_id" uuid,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "inventory_movements_kind_check" CHECK ("inventory_movements"."kind" in ('entry', 'exit', 'adjustment', 'transfer_out', 'transfer_in', 'count', 'reversal')),
	CONSTRAINT "inventory_movements_reason_check" CHECK ("inventory_movements"."reason" is null or "inventory_movements"."reason" in ('waste', 'expired', 'staff', 'courtesy', 'other'))
);
--> statement-breakpoint
CREATE TABLE "inventory_transfer_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"from_product_id" uuid NOT NULL,
	"product_name" varchar(80) NOT NULL,
	"base_unit" varchar(4) NOT NULL,
	"quantity_sent" numeric(20, 6) NOT NULL,
	"to_product_id" uuid,
	"quantity_received" numeric(20, 6),
	"position" integer NOT NULL,
	CONSTRAINT "inventory_transfer_lines_sent_positive" CHECK ("inventory_transfer_lines"."quantity_sent" > 0)
);
--> statement-breakpoint
CREATE TABLE "inventory_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_business_id" uuid NOT NULL,
	"from_warehouse_id" uuid NOT NULL,
	"to_business_id" uuid NOT NULL,
	"to_warehouse_id" uuid NOT NULL,
	"status" varchar(12) NOT NULL,
	"note" varchar(200),
	"sent_by" uuid NOT NULL,
	"sent_at" timestamp with time zone NOT NULL,
	"received_by" uuid,
	"received_at" timestamp with time zone,
	"cancelled_by" uuid,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" varchar(200),
	CONSTRAINT "inventory_transfers_distinct" CHECK ("inventory_transfers"."from_warehouse_id" <> "inventory_transfers"."to_warehouse_id"),
	CONSTRAINT "inventory_transfers_status_check" CHECK ("inventory_transfers"."status" in ('done', 'in_transit', 'received', 'cancelled'))
);
--> statement-breakpoint
CREATE TABLE "product_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"from_product_id" uuid NOT NULL,
	"to_business_id" uuid NOT NULL,
	"to_product_id" uuid NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_base" numeric(20, 6) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "areas" ADD COLUMN "warehouse_id" uuid;--> statement-breakpoint
ALTER TABLE "area_products" ADD CONSTRAINT "area_products_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "area_products" ADD CONSTRAINT "area_products_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_count_id_inventory_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_count_lines" ADD CONSTRAINT "inventory_count_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_area_id_areas_id_fk" FOREIGN KEY ("area_id") REFERENCES "public"."areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movement_lines" ADD CONSTRAINT "inventory_movement_lines_movement_id_inventory_movements_id_fk" FOREIGN KEY ("movement_id") REFERENCES "public"."inventory_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movement_lines" ADD CONSTRAINT "inventory_movement_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_transfer_id_inventory_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."inventory_transfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_count_id_inventory_counts_id_fk" FOREIGN KEY ("count_id") REFERENCES "public"."inventory_counts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_reverses_id_inventory_movements_id_fk" FOREIGN KEY ("reverses_id") REFERENCES "public"."inventory_movements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfer_lines" ADD CONSTRAINT "inventory_transfer_lines_transfer_id_inventory_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."inventory_transfers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfer_lines" ADD CONSTRAINT "inventory_transfer_lines_from_product_id_products_id_fk" FOREIGN KEY ("from_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfer_lines" ADD CONSTRAINT "inventory_transfer_lines_to_product_id_products_id_fk" FOREIGN KEY ("to_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_from_business_id_businesses_id_fk" FOREIGN KEY ("from_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_from_warehouse_id_warehouses_id_fk" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_to_business_id_businesses_id_fk" FOREIGN KEY ("to_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_to_warehouse_id_warehouses_id_fk" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_sent_by_users_id_fk" FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transfers" ADD CONSTRAINT "inventory_transfers_cancelled_by_users_id_fk" FOREIGN KEY ("cancelled_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_links" ADD CONSTRAINT "product_links_from_product_id_products_id_fk" FOREIGN KEY ("from_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_links" ADD CONSTRAINT "product_links_to_business_id_businesses_id_fk" FOREIGN KEY ("to_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_links" ADD CONSTRAINT "product_links_to_product_id_products_id_fk" FOREIGN KEY ("to_product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_links" ADD CONSTRAINT "product_links_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock" ADD CONSTRAINT "stock_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "area_products_area_product_unique" ON "area_products" USING btree ("area_id","product_id");--> statement-breakpoint
CREATE INDEX "area_products_product_idx" ON "area_products" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "inventory_count_lines_count_idx" ON "inventory_count_lines" USING btree ("count_id");--> statement-breakpoint
CREATE INDEX "inventory_counts_area_idx" ON "inventory_counts" USING btree ("area_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_movement_lines_movement_idx" ON "inventory_movement_lines" USING btree ("movement_id");--> statement-breakpoint
CREATE INDEX "inventory_movement_lines_product_idx" ON "inventory_movement_lines" USING btree ("product_id","id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_movements_reverses_unique" ON "inventory_movements" USING btree ("reverses_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_warehouse_idx" ON "inventory_movements" USING btree ("warehouse_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_business_idx" ON "inventory_movements" USING btree ("business_id","created_at");--> statement-breakpoint
CREATE INDEX "inventory_transfer_lines_transfer_idx" ON "inventory_transfer_lines" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "inventory_transfers_to_idx" ON "inventory_transfers" USING btree ("to_warehouse_id","status");--> statement-breakpoint
CREATE INDEX "inventory_transfers_from_idx" ON "inventory_transfers" USING btree ("from_warehouse_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "product_links_from_business_unique" ON "product_links" USING btree ("from_product_id","to_business_id");--> statement-breakpoint
CREATE UNIQUE INDEX "stock_warehouse_product_unique" ON "stock" USING btree ("warehouse_id","product_id");--> statement-breakpoint
CREATE INDEX "stock_business_idx" ON "stock" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "stock_product_idx" ON "stock" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "areas" ADD CONSTRAINT "areas_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;