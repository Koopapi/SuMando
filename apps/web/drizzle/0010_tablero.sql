ALTER TABLE "cash_cuts" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD COLUMN "reviewed_by" uuid;--> statement-breakpoint
ALTER TABLE "cash_cuts" ADD CONSTRAINT "cash_cuts_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;