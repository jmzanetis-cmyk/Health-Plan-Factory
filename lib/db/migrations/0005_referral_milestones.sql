ALTER TYPE "public"."credit_source" ADD VALUE IF NOT EXISTS 'milestone';--> statement-breakpoint
ALTER TYPE "public"."credit_source" ADD VALUE IF NOT EXISTS 'invite-sent';--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "referral_milestones" (
        "id" text PRIMARY KEY NOT NULL,
        "profile_id" text NOT NULL,
        "milestone" text NOT NULL,
        "rewarded_at" timestamp DEFAULT now() NOT NULL,
        "bonus_credit_cents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "referral_milestones" ADD CONSTRAINT "referral_milestones_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "referral_milestones_profile_idx" ON "referral_milestones" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "referral_milestones_profile_milestone_idx" ON "referral_milestones" USING btree ("profile_id","milestone");
