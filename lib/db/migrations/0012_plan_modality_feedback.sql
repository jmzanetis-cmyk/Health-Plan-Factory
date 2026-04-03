CREATE TABLE IF NOT EXISTS "plan_modality_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"profile_id" text NOT NULL,
	"plan_id" text NOT NULL,
	"modality_id" text NOT NULL,
	"feedback" text NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "pmf_feedback_check" CHECK ("feedback" IN ('helpful', 'not_helpful'))
);
--> statement-breakpoint
ALTER TABLE "plan_modality_feedback" ADD CONSTRAINT "plan_modality_feedback_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "plan_modality_feedback" ADD CONSTRAINT "plan_modality_feedback_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "plan_modality_feedback" ADD CONSTRAINT "plan_modality_feedback_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "pmf_profile_plan_modality_idx" ON "plan_modality_feedback" USING btree ("profile_id","plan_id","modality_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "pmf_plan_idx" ON "plan_modality_feedback" USING btree ("plan_id");
