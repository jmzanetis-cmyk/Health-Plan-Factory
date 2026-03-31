-- Messaging infrastructure delta (Task #17)
-- Incremental migration for notification_log, magic_links tables and
-- communication_prefs/phone columns added to profiles.
-- All statements are idempotent (IF NOT EXISTS patterns).

-- Notification channel enum
DO $$ BEGIN
  CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification status enum
DO $$ BEGIN
  CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Notification type enum (create new, or add missing values to existing)
DO $$ BEGIN
  CREATE TYPE "public"."notification_type" AS ENUM(
    'welcome', 'plan-ready', 'session-reminder', 'session-confirmed',
    'payment-due', 'payment-confirmed', 'accountability-nudge',
    'referral-invite', 'referral-reward', 'magic-link', 'weekly-summary', 'streak-at-risk'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add new values to notification_type if the type already existed with fewer values
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'session-confirmed'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'referral-reward';   EXCEPTION WHEN others THEN NULL; END $$;

-- Magic link action enum
DO $$ BEGIN
  CREATE TYPE "public"."magic_link_action" AS ENUM('login', 'payment', 'appointment', 'accountability');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Add communication_prefs JSONB column to profiles (matches Drizzle schema)
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "communication_prefs" jsonb DEFAULT '{"email":true,"sms":false}';

-- Add phone text column to profiles (matches Drizzle schema)
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "phone" text;

-- notification_log table — columns match Drizzle schema exactly (metadata jsonb, not subject/body columns)
CREATE TABLE IF NOT EXISTS "notification_log" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "channel" "public"."notification_channel" NOT NULL,
  "type" "public"."notification_type" NOT NULL,
  "status" "public"."notification_status" NOT NULL DEFAULT 'queued',
  "scheduled_for" timestamp,
  "sent_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "notification_log_profile_idx" ON "notification_log" ("profile_id");
CREATE INDEX IF NOT EXISTS "notification_log_type_idx" ON "notification_log" ("type");
CREATE INDEX IF NOT EXISTS "notification_log_status_idx" ON "notification_log" ("status");

-- magic_links table — id is uuid (matches Drizzle schema: uuid().primaryKey().defaultRandom())
CREATE TABLE IF NOT EXISTS "magic_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" text NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "action" "public"."magic_link_action" NOT NULL,
  "payload" jsonb DEFAULT '{}',
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "magic_links_profile_idx" ON "magic_links" ("profile_id");
CREATE INDEX IF NOT EXISTS "magic_links_expires_idx" ON "magic_links" ("expires_at");
