ALTER TABLE "businesses" ADD COLUMN "logo_key" varchar(80);--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "logo_width" integer;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "logo_height" integer;--> statement-breakpoint
ALTER TABLE "businesses" ADD COLUMN "logo_updated_at" timestamp with time zone;