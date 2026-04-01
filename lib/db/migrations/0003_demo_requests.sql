-- Demo requests table (Task #37 — Employer B2B Pipeline)
-- Stores inbound demo request leads from the employer landing page.
-- Idempotent: uses IF NOT EXISTS.

CREATE TABLE IF NOT EXISTS "demo_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "company" text NOT NULL,
  "company_size" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "status" text DEFAULT 'new' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS "demo_requests_email_idx" ON "demo_requests" ("email");
EXCEPTION WHEN duplicate_table THEN null;
END $$;

-- Add demo-request to notification_type enum (if not already present)
DO $$ BEGIN
  ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'demo-request';
EXCEPTION WHEN duplicate_object THEN null;
END $$;
