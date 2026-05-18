-- Idempotency log for Stripe webhook events.
-- Prevents replayed webhooks from double-granting Plus subscriptions or
-- re-activating cancelled employer accounts.
CREATE TABLE IF NOT EXISTS "processed_webhooks" (
  "event_id"      TEXT        PRIMARY KEY,
  "event_type"    TEXT        NOT NULL,
  "processed_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "payload"       JSONB
);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at
  ON "processed_webhooks" ("processed_at");
