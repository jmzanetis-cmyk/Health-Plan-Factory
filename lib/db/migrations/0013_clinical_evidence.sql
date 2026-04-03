-- Clinical evidence corpus for evidence-based plan scoring
CREATE TYPE "public"."clinical_evidence_grade" AS ENUM('A', 'B', 'C', 'D');
CREATE TYPE "public"."effect_size" AS ENUM('large', 'moderate', 'small', 'minimal');
CREATE TYPE "public"."evidence_target_type" AS ENUM('condition', 'goal');

CREATE TABLE "clinical_evidence" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "modality_id" text NOT NULL REFERENCES "modalities"("id") ON DELETE CASCADE,
  "target_type" "evidence_target_type" NOT NULL,
  "target_id" text NOT NULL,
  "evidence_grade" "clinical_evidence_grade" NOT NULL,
  "effect_size" "effect_size" NOT NULL,
  "study_types" jsonb DEFAULT '[]' NOT NULL,
  "num_studies_approx" integer DEFAULT 0 NOT NULL,
  "clinical_notes" text NOT NULL,
  "contraindications" jsonb DEFAULT '[]' NOT NULL,
  "weeks_to_benefit" integer DEFAULT 4 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE UNIQUE INDEX "ce_modality_target_idx" ON "clinical_evidence" ("modality_id","target_type","target_id");
CREATE INDEX "ce_modality_idx" ON "clinical_evidence" ("modality_id");
CREATE INDEX "ce_target_idx" ON "clinical_evidence" ("target_type","target_id");
