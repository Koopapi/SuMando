CREATE TABLE "recipe_ingredients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipe_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_base" numeric(20, 6) NOT NULL,
	"note" varchar(120),
	"position" integer NOT NULL,
	CONSTRAINT "recipe_ingredients_quantity_positive" CHECK ("recipe_ingredients"."quantity_base" > 0)
);
--> statement-breakpoint
CREATE TABLE "recipe_template_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"full_count" integer NOT NULL,
	"half_count" integer NOT NULL,
	CONSTRAINT "recipe_template_items_counts" CHECK ("recipe_template_items"."full_count" between 0 and 9999 and "recipe_template_items"."half_count" between 0 and 9999)
);
--> statement-breakpoint
CREATE TABLE "recipe_templates" (
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
CREATE TABLE "recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"name" varchar(80) NOT NULL,
	"name_key" varchar(80) NOT NULL,
	"preparation" varchar(4000),
	"half_percent" smallint DEFAULT 50 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recipes_half_percent_range" CHECK ("recipes"."half_percent" between 1 and 100)
);
--> statement-breakpoint
CREATE TABLE "supply_calculation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calculation_id" uuid NOT NULL,
	"recipe_id" uuid NOT NULL,
	"recipe_name" varchar(80) NOT NULL,
	"full_count" integer NOT NULL,
	"half_count" integer NOT NULL,
	"half_percent" smallint NOT NULL,
	CONSTRAINT "supply_calculation_items_counts" CHECK ("supply_calculation_items"."full_count" between 0 and 9999 and "supply_calculation_items"."half_count" between 0 and 9999)
);
--> statement-breakpoint
CREATE TABLE "supply_calculation_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"calculation_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"product_name" varchar(80) NOT NULL,
	"base_unit" varchar(4) NOT NULL,
	"total_base" numeric(26, 8) NOT NULL,
	"purchase_name" varchar(40),
	"purchase_factor" numeric(14, 3),
	"purchase_count" integer,
	"product_archived" boolean DEFAULT false NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supply_calculations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"business_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"created_by" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_template_items" ADD CONSTRAINT "recipe_template_items_template_id_recipe_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."recipe_templates"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_template_items" ADD CONSTRAINT "recipe_template_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_templates" ADD CONSTRAINT "recipe_templates_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_templates" ADD CONSTRAINT "recipe_templates_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_templates" ADD CONSTRAINT "recipe_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_calculation_items" ADD CONSTRAINT "supply_calculation_items_calculation_id_supply_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."supply_calculations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_calculation_items" ADD CONSTRAINT "supply_calculation_items_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_calculation_lines" ADD CONSTRAINT "supply_calculation_lines_calculation_id_supply_calculations_id_fk" FOREIGN KEY ("calculation_id") REFERENCES "public"."supply_calculations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_calculation_lines" ADD CONSTRAINT "supply_calculation_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_calculations" ADD CONSTRAINT "supply_calculations_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_calculations" ADD CONSTRAINT "supply_calculations_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supply_calculations" ADD CONSTRAINT "supply_calculations_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_ingredients_recipe_product_unique" ON "recipe_ingredients" USING btree ("recipe_id","product_id");--> statement-breakpoint
CREATE INDEX "recipe_ingredients_product_idx" ON "recipe_ingredients" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_template_items_template_recipe_unique" ON "recipe_template_items" USING btree ("template_id","recipe_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_templates_active_name_unique" ON "recipe_templates" USING btree ("branch_id","name_key") WHERE archived_at is null;--> statement-breakpoint
CREATE INDEX "recipe_templates_branch_idx" ON "recipe_templates" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "recipes_active_name_unique" ON "recipes" USING btree ("business_id","name_key") WHERE archived_at is null;--> statement-breakpoint
CREATE INDEX "recipes_business_idx" ON "recipes" USING btree ("business_id");--> statement-breakpoint
CREATE INDEX "supply_calculation_items_calc_idx" ON "supply_calculation_items" USING btree ("calculation_id");--> statement-breakpoint
CREATE INDEX "supply_calculation_lines_calc_idx" ON "supply_calculation_lines" USING btree ("calculation_id");--> statement-breakpoint
CREATE INDEX "supply_calculations_branch_idx" ON "supply_calculations" USING btree ("branch_id","created_at");