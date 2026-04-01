-- Provider-aware plan items (Task #32)
-- Adds nearby_provider_count column to plan_items for storing the count of
-- providers within commutable distance for each modality in a member's plan.
-- Nullable: null indicates location was unavailable at generation time.
-- Idempotent: uses IF NOT EXISTS / column existence check.

ALTER TABLE "plan_items"
  ADD COLUMN IF NOT EXISTS "nearby_provider_count" integer;
