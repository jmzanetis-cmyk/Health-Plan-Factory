-- Plan Sharing & Viral Growth Cards (Task #41)
-- Adds share_token, share_goal, share_modalities columns to plans table.

ALTER TABLE "plans"
  ADD COLUMN IF NOT EXISTS "share_token" text,
  ADD COLUMN IF NOT EXISTS "share_goal" text,
  ADD COLUMN IF NOT EXISTS "share_modalities" jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS "plans_share_token_idx" ON "plans" ("share_token")
  WHERE "share_token" IS NOT NULL;
