-- Create survey_responses table for persisting onboarding survey market research data
CREATE TABLE IF NOT EXISTS "survey_responses" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text REFERENCES "profiles"("id") ON DELETE SET NULL,
  "healthcare_situation" text,
  "healthcare_gaps" jsonb,
  "desired_improvements" jsonb,
  "likelihood_rating" integer,
  "likelihood_comment" text,
  "goals" jsonb,
  "budget_range" text,
  "budget_midpoint" integer,
  "referral_source" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "survey_responses_profile_idx" ON "survey_responses" ("profile_id");
