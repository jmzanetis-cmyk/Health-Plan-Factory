ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'review-nudge';--> statement-breakpoint
CREATE TABLE "provider_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"member_id" text NOT NULL,
	"rating" integer NOT NULL,
	"review_text" text,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "provider_reviews" ADD CONSTRAINT "provider_reviews_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "provider_reviews" ADD CONSTRAINT "provider_reviews_member_id_profiles_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "provider_reviews_provider_idx" ON "provider_reviews" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "provider_reviews_member_idx" ON "provider_reviews" USING btree ("member_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "provider_reviews_member_provider_unique_idx" ON "provider_reviews" USING btree ("member_id","provider_id");
