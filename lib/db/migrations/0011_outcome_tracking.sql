-- Add outcome tracking columns to plans table
-- Tracks member-reported health goal achievement after following their wellness plan.
-- outcomeStatus: achieved | partially_achieved | not_achieved
-- outcomeLabel: short categorisation chosen from a preset list
-- outcomeNote: optional free-text note (max 500 chars)
-- outcomeAt: timestamp when the outcome was recorded

ALTER TABLE "plans"
  ADD COLUMN IF NOT EXISTS "outcome_status" text,
  ADD COLUMN IF NOT EXISTS "outcome_label" text,
  ADD COLUMN IF NOT EXISTS "outcome_note" text,
  ADD COLUMN IF NOT EXISTS "outcome_at" timestamp;

-- Enforce allowed values at DB level (NULL is also valid — means no outcome set yet)
ALTER TABLE "plans"
  DROP CONSTRAINT IF EXISTS "plans_outcome_status_check";

ALTER TABLE "plans"
  ADD CONSTRAINT "plans_outcome_status_check"
  CHECK (
    outcome_status IS NULL
    OR outcome_status IN ('achieved', 'partially_achieved', 'not_achieved')
  );
