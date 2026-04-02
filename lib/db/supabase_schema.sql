-- =============================================================================
-- Health Plan Factory — Complete Supabase Schema
-- Consolidates all migrations: 0000 through 0008
-- Idempotent: safe to run on an empty or partially-migrated database.
--
-- HOW TO APPLY:
--   1. Open the Supabase SQL Editor:
--      https://app.supabase.com/project/rlugmlnozbertfuonlwp/sql
--   2. Paste this entire file into the editor.
--   3. Click "Run". All statements use IF NOT EXISTS / DO...EXCEPTION
--      patterns so they are safe to run multiple times.
--
-- =============================================================================

-- ── Enums ────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "public"."credit_source" AS ENUM('referral', 'promo', 'milestone', 'invite-sent');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."credit_source" ADD VALUE IF NOT EXISTS 'milestone'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."credit_source" ADD VALUE IF NOT EXISTS 'invite-sent'; EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."evidence_level" AS ENUM('Strong', 'Moderate', 'Emerging');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."magic_link_action" AS ENUM('login', 'payment', 'appointment', 'accountability');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."member_role" AS ENUM('member', 'provider', 'admin', 'employer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."modality_category" AS ENUM('manual', 'movement', 'mind-body', 'nutrition', 'medical', 'telehealth');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."notification_type" AS ENUM(
    'welcome', 'plan-ready', 'session-reminder', 'session-confirmed',
    'payment-due', 'payment-confirmed', 'accountability-nudge',
    'referral-invite', 'referral-reward', 'magic-link', 'weekly-summary', 'streak-at-risk'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'session-confirmed'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'referral-reward'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'demo-request'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'review-nudge'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 're-engagement-day3'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 're-engagement-day7'; EXCEPTION WHEN others THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE "public"."notification_type" ADD VALUE IF NOT EXISTS 'booking-request'; EXCEPTION WHEN others THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."plan_status" AS ENUM('generated', 'saved', 'active');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."provider_status" AS ENUM('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "public"."referral_status" AS ENUM('pending', 'rewarded');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Core tables ───────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "admin_settings" (
  "key" text PRIMARY KEY NOT NULL,
  "value" jsonb,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "users" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar,
  "first_name" varchar,
  "last_name" varchar,
  "profile_image_url" varchar,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "profiles" (
  "id" text PRIMARY KEY NOT NULL,
  "email" text NOT NULL,
  "display_name" text,
  "avatar_url" text,
  "role" "member_role" DEFAULT 'member' NOT NULL,
  "stripe_customer_id" text,
  "subscription_status" text DEFAULT 'free',
  "lmn_status" text DEFAULT 'none' NOT NULL,
  "referral_code" text,
  "referral_count" integer DEFAULT 0 NOT NULL,
  "phone" text,
  "communication_prefs" jsonb DEFAULT '{"email":true,"sms":false}'::jsonb,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "communication_prefs" jsonb DEFAULT '{"email":true,"sms":false}';
ALTER TABLE "profiles" ADD COLUMN IF NOT EXISTS "phone" text;

CREATE TABLE IF NOT EXISTS "modalities" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "emoji" text DEFAULT '✨' NOT NULL,
  "category" "modality_category" NOT NULL,
  "evidence_level" "evidence_level" NOT NULL,
  "cost_low" integer NOT NULL,
  "cost_high" integer NOT NULL,
  "typical_frequency" text NOT NULL,
  "hsa_eligible" boolean DEFAULT false NOT NULL,
  "lmn_eligible" boolean DEFAULT false NOT NULL,
  "description" text NOT NULL,
  "goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "preference_match" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "exclusion_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "evidence_summary" text,
  "meta_description" text,
  "related_modalities" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "providers" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text,
  "name" text NOT NULL,
  "bio" text,
  "city" text,
  "state" text,
  "zip_code" text,
  "lat" numeric(9, 6),
  "lng" numeric(9, 6),
  "phone" text,
  "website" text,
  "avatar_url" text,
  "status" "provider_status" DEFAULT 'pending' NOT NULL,
  "verification_status" text DEFAULT 'draft' NOT NULL,
  "accepts_insurance" boolean DEFAULT false NOT NULL,
  "offers_telehealth" boolean DEFAULT false NOT NULL,
  "offers_in_person" boolean DEFAULT true NOT NULL,
  "service_radius_miles" integer,
  "cost_per_session" integer,
  "rejection_reason" text,
  "credential_doc_path" text,
  "availability_notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_credentials" (
  "id" text PRIMARY KEY NOT NULL,
  "provider_id" text NOT NULL,
  "credential_name" text NOT NULL,
  "issuing_body" text,
  "license_number" text,
  "expires_at" timestamp,
  "verified_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_modalities" (
  "provider_id" text NOT NULL,
  "modality_id" text NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "cost_min" integer,
  "cost_max" integer
);

CREATE TABLE IF NOT EXISTS "member_intakes" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text,
  "budget" integer NOT NULL,
  "goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "preferences" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "exclusions" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "zip_code" text,
  "radius" integer DEFAULT 25 NOT NULL,
  "telehealth" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "plans" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text,
  "intake_id" text,
  "status" "plan_status" DEFAULT 'generated' NOT NULL,
  "total_monthly_cost" integer NOT NULL,
  "budget_utilization" integer NOT NULL,
  "budget" integer NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "plans"
  ADD COLUMN IF NOT EXISTS "share_token" text,
  ADD COLUMN IF NOT EXISTS "share_goal" text,
  ADD COLUMN IF NOT EXISTS "share_modalities" jsonb;

CREATE TABLE IF NOT EXISTS "plan_items" (
  "id" text PRIMARY KEY NOT NULL,
  "plan_id" text NOT NULL,
  "modality_id" text NOT NULL,
  "score" integer NOT NULL,
  "frequency" text NOT NULL,
  "estimated_monthly_cost" integer NOT NULL,
  "rationale" text NOT NULL,
  "is_deprioritized" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL
);

ALTER TABLE "plan_items"
  ADD COLUMN IF NOT EXISTS "nearby_provider_count" integer;

CREATE TABLE IF NOT EXISTS "plan_progress_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL,
  "plan_id" text,
  "modality_id" text,
  "note" text,
  "rating" integer,
  "mood" integer,
  "pain" integer,
  "energy" integer,
  "session_date" timestamp,
  "session_cost_cents" integer,
  "employer_covered_cents" integer,
  "out_of_pocket_cents" integer,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "favorites" (
  "profile_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "insights_cache" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL,
  "insights" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "attention_items" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "wellness_score" integer,
  "journal_count" integer DEFAULT 0 NOT NULL,
  "session_count" integer DEFAULT 0 NOT NULL,
  "refreshed_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "lmn_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL,
  "plan_id" text,
  "status" text DEFAULT 'draft' NOT NULL,
  "draft_message" text NOT NULL,
  "eligible_modalities" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "estimated_annual_savings" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "notification_log" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL,
  "channel" "public"."notification_channel" NOT NULL,
  "type" "public"."notification_type" NOT NULL,
  "status" "public"."notification_status" NOT NULL DEFAULT 'queued',
  "scheduled_for" timestamp,
  "sent_at" timestamp,
  "metadata" jsonb,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "magic_links" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "profile_id" text NOT NULL,
  "action" "public"."magic_link_action" NOT NULL,
  "payload" jsonb DEFAULT '{}',
  "expires_at" timestamp NOT NULL,
  "used_at" timestamp,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS "member_credits" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL,
  "source" "credit_source" NOT NULL,
  "amount_cents" integer DEFAULT 300 NOT NULL,
  "used" boolean DEFAULT false NOT NULL,
  "referral_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "used_at" timestamp
);

CREATE TABLE IF NOT EXISTS "referrals" (
  "id" text PRIMARY KEY NOT NULL,
  "referrer_id" text NOT NULL,
  "referred_member_id" text,
  "code" text NOT NULL,
  "status" "referral_status" DEFAULT 'pending' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "rewarded_at" timestamp
);

CREATE TABLE IF NOT EXISTS "employers" (
  "id" text PRIMARY KEY NOT NULL,
  "company_name" text NOT NULL,
  "admin_contact_name" text NOT NULL,
  "admin_contact_email" text NOT NULL,
  "billing_contact_email" text,
  "admin_profile_id" text,
  "number_of_employees" integer NOT NULL,
  "stipend_per_employee" integer NOT NULL,
  "platform_fee_percent" integer DEFAULT 8 NOT NULL,
  "invite_code" text NOT NULL,
  "stripe_customer_id" text,
  "stripe_subscription_id" text,
  "status" text DEFAULT 'active' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "employer_members" (
  "id" text PRIMARY KEY NOT NULL,
  "employer_id" text NOT NULL,
  "profile_id" text NOT NULL,
  "monthly_budget" integer NOT NULL,
  "spent_this_month" integer DEFAULT 0 NOT NULL,
  "budget_month" text,
  "linked_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "employer_modality_rules" (
  "id" text PRIMARY KEY NOT NULL,
  "employer_id" text NOT NULL,
  "modality_id" text NOT NULL,
  "covered" boolean DEFAULT true NOT NULL
);

CREATE TABLE IF NOT EXISTS "sessions" (
  "sid" varchar PRIMARY KEY NOT NULL,
  "sess" jsonb NOT NULL,
  "expire" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "demo_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "company" text NOT NULL,
  "company_size" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "message" text,
  "status" text DEFAULT 'new' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "demo_requests" ADD COLUMN IF NOT EXISTS "message" text;

CREATE TABLE IF NOT EXISTS "provider_reviews" (
  "id" text PRIMARY KEY NOT NULL,
  "provider_id" text NOT NULL,
  "member_id" text NOT NULL,
  "rating" integer NOT NULL,
  "review_text" text,
  "is_hidden" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "testimonials" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "location" text,
  "goal" text,
  "quote" text NOT NULL,
  "stars" integer DEFAULT 5 NOT NULL,
  "is_visible" boolean DEFAULT true NOT NULL,
  "display_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_unlocks" (
  "id" text PRIMARY KEY NOT NULL,
  "member_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "credit_id" text,
  "stripe_session_id" text,
  "amount_charged" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "health_sync_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL,
  "date" text NOT NULL,
  "source" text NOT NULL,
  "steps" integer,
  "sleep_minutes" integer,
  "active_minutes" integer,
  "mindfulness_minutes" integer,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "provider_subscriptions" (
  "id" text PRIMARY KEY NOT NULL,
  "provider_id" text NOT NULL,
  "profile_id" text NOT NULL,
  "stripe_session_id" text,
  "stripe_subscription_id" text,
  "stripe_customer_id" text,
  "amount_cents" integer DEFAULT 2900 NOT NULL,
  "status" text DEFAULT 'active' NOT NULL,
  "current_period_end" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "coach_sessions" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "profile_id" text NOT NULL,
  "messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "archived" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "coach_memories" (
  "id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  "profile_id" text NOT NULL,
  "summary" text DEFAULT '' NOT NULL,
  "facts" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "session_count" integer DEFAULT 0 NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "referral_milestones" (
  "id" text PRIMARY KEY NOT NULL,
  "profile_id" text NOT NULL,
  "milestone" text NOT NULL,
  "rewarded_at" timestamp DEFAULT now() NOT NULL,
  "bonus_credit_cents" integer DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "booking_requests" (
  "id" text PRIMARY KEY NOT NULL,
  "member_id" text NOT NULL,
  "provider_id" text NOT NULL,
  "member_email" text NOT NULL,
  "contact_email" text,
  "requested_modality" text,
  "message" text NOT NULL,
  "note" text,
  "status" text NOT NULL DEFAULT 'pending',
  "created_at" timestamp NOT NULL DEFAULT now()
);

-- ── Foreign key constraints (idempotent) ─────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "employer_members" ADD CONSTRAINT "employer_members_employer_id_employers_id_fk"
    FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employer_members" ADD CONSTRAINT "employer_members_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employer_modality_rules" ADD CONSTRAINT "employer_modality_rules_employer_id_employers_id_fk"
    FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employer_modality_rules" ADD CONSTRAINT "employer_modality_rules_modality_id_modalities_id_fk"
    FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "employers" ADD CONSTRAINT "employers_admin_profile_id_profiles_id_fk"
    FOREIGN KEY ("admin_profile_id") REFERENCES "public"."profiles"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "favorites" ADD CONSTRAINT "favorites_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "favorites" ADD CONSTRAINT "favorites_provider_id_providers_id_fk"
    FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "insights_cache" ADD CONSTRAINT "insights_cache_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lmn_requests" ADD CONSTRAINT "lmn_requests_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "lmn_requests" ADD CONSTRAINT "lmn_requests_plan_id_plans_id_fk"
    FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "member_credits" ADD CONSTRAINT "member_credits_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "member_credits" ADD CONSTRAINT "member_credits_referral_id_referrals_id_fk"
    FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "member_intakes" ADD CONSTRAINT "member_intakes_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_plan_id_plans_id_fk"
    FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_modality_id_modalities_id_fk"
    FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "plan_progress_logs" ADD CONSTRAINT "plan_progress_logs_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "plan_progress_logs" ADD CONSTRAINT "plan_progress_logs_plan_id_plans_id_fk"
    FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "plan_progress_logs" ADD CONSTRAINT "plan_progress_logs_modality_id_modalities_id_fk"
    FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "plans" ADD CONSTRAINT "plans_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "plans" ADD CONSTRAINT "plans_intake_id_member_intakes_id_fk"
    FOREIGN KEY ("intake_id") REFERENCES "public"."member_intakes"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_provider_id_providers_id_fk"
    FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "provider_modalities" ADD CONSTRAINT "provider_modalities_provider_id_providers_id_fk"
    FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "provider_modalities" ADD CONSTRAINT "provider_modalities_modality_id_modalities_id_fk"
    FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "providers" ADD CONSTRAINT "providers_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id");
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_profiles_id_fk"
    FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_member_id_profiles_id_fk"
    FOREIGN KEY ("referred_member_id") REFERENCES "public"."profiles"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "provider_reviews" ADD CONSTRAINT "provider_reviews_provider_id_providers_id_fk"
    FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "provider_reviews" ADD CONSTRAINT "provider_reviews_member_id_profiles_id_fk"
    FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "provider_unlocks" ADD CONSTRAINT "provider_unlocks_member_id_profiles_id_fk"
    FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "provider_unlocks" ADD CONSTRAINT "provider_unlocks_credit_id_member_credits_id_fk"
    FOREIGN KEY ("credit_id") REFERENCES "public"."member_credits"("id") ON DELETE set null;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "health_sync_logs" ADD CONSTRAINT "health_sync_logs_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "provider_subscriptions" ADD CONSTRAINT "provider_subscriptions_provider_id_providers_id_fk"
    FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "provider_subscriptions" ADD CONSTRAINT "provider_subscriptions_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "coach_sessions" ADD CONSTRAINT "coach_sessions_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "coach_memories" ADD CONSTRAINT "coach_memories_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "referral_milestones" ADD CONSTRAINT "referral_milestones_profile_id_profiles_id_fk"
    FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_member_id_profiles_id_fk"
    FOREIGN KEY ("member_id") REFERENCES "public"."profiles"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "booking_requests" ADD CONSTRAINT "booking_requests_provider_id_providers_id_fk"
    FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "employer_members_pk" ON "employer_members" USING btree ("employer_id","profile_id");
CREATE INDEX IF NOT EXISTS "employer_members_employer_idx" ON "employer_members" USING btree ("employer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "employer_members_profile_idx" ON "employer_members" USING btree ("profile_id");
CREATE UNIQUE INDEX IF NOT EXISTS "employer_modality_rules_pk" ON "employer_modality_rules" USING btree ("employer_id","modality_id");
CREATE INDEX IF NOT EXISTS "employer_modality_rules_employer_idx" ON "employer_modality_rules" USING btree ("employer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "employers_invite_code_idx" ON "employers" USING btree ("invite_code");
CREATE UNIQUE INDEX IF NOT EXISTS "favorites_pk" ON "favorites" USING btree ("profile_id","provider_id");
CREATE UNIQUE INDEX IF NOT EXISTS "insights_cache_profile_idx" ON "insights_cache" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "lmn_requests_profile_idx" ON "lmn_requests" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "magic_links_profile_idx" ON "magic_links" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "magic_links_expires_idx" ON "magic_links" USING btree ("expires_at");
CREATE INDEX IF NOT EXISTS "member_credits_profile_idx" ON "member_credits" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "member_intakes_profile_idx" ON "member_intakes" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "notification_log_profile_idx" ON "notification_log" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "notification_log_type_idx" ON "notification_log" USING btree ("type");
CREATE INDEX IF NOT EXISTS "notification_log_status_idx" ON "notification_log" USING btree ("status");
CREATE INDEX IF NOT EXISTS "plan_items_plan_idx" ON "plan_items" USING btree ("plan_id");
CREATE INDEX IF NOT EXISTS "plan_items_modality_idx" ON "plan_items" USING btree ("modality_id");
CREATE INDEX IF NOT EXISTS "progress_logs_profile_idx" ON "plan_progress_logs" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "plans_profile_idx" ON "plans" USING btree ("profile_id");
CREATE UNIQUE INDEX IF NOT EXISTS "plans_share_token_idx" ON "plans" USING btree ("share_token") WHERE "share_token" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_email_idx" ON "profiles" USING btree ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "profiles_referral_code_idx" ON "profiles" USING btree ("referral_code");
CREATE INDEX IF NOT EXISTS "provider_credentials_provider_idx" ON "provider_credentials" USING btree ("provider_id");
CREATE UNIQUE INDEX IF NOT EXISTS "provider_modalities_pk" ON "provider_modalities" USING btree ("provider_id","modality_id");
CREATE INDEX IF NOT EXISTS "provider_modalities_modality_idx" ON "provider_modalities" USING btree ("modality_id");
CREATE INDEX IF NOT EXISTS "providers_zip_idx" ON "providers" USING btree ("zip_code");
CREATE INDEX IF NOT EXISTS "providers_status_idx" ON "providers" USING btree ("status");
CREATE INDEX IF NOT EXISTS "referrals_referrer_idx" ON "referrals" USING btree ("referrer_id");
CREATE UNIQUE INDEX IF NOT EXISTS "referrals_referred_member_unique_idx" ON "referrals" USING btree ("referred_member_id");
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "sessions" USING btree ("expire");
CREATE INDEX IF NOT EXISTS "demo_requests_email_idx" ON "demo_requests" USING btree ("email");
CREATE INDEX IF NOT EXISTS "provider_reviews_provider_idx" ON "provider_reviews" USING btree ("provider_id");
CREATE INDEX IF NOT EXISTS "provider_reviews_member_idx" ON "provider_reviews" USING btree ("member_id");
CREATE UNIQUE INDEX IF NOT EXISTS "provider_reviews_member_provider_unique_idx" ON "provider_reviews" USING btree ("member_id","provider_id");
CREATE INDEX IF NOT EXISTS "provider_unlocks_member_idx" ON "provider_unlocks" USING btree ("member_id");
CREATE UNIQUE INDEX IF NOT EXISTS "provider_unlocks_member_provider_unique_idx" ON "provider_unlocks" USING btree ("member_id","provider_id");
CREATE INDEX IF NOT EXISTS "health_sync_logs_profile_idx" ON "health_sync_logs" USING btree ("profile_id");
CREATE UNIQUE INDEX IF NOT EXISTS "health_sync_logs_profile_date_idx" ON "health_sync_logs" USING btree ("profile_id","date");
CREATE INDEX IF NOT EXISTS "provider_subscriptions_provider_idx" ON "provider_subscriptions" USING btree ("provider_id");
CREATE INDEX IF NOT EXISTS "provider_subscriptions_profile_idx" ON "provider_subscriptions" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "coach_sessions_profile_id_idx" ON "coach_sessions" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "coach_sessions_updated_at_idx" ON "coach_sessions" USING btree ("updated_at");
CREATE UNIQUE INDEX IF NOT EXISTS "coach_memories_profile_id_idx" ON "coach_memories" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "referral_milestones_profile_idx" ON "referral_milestones" USING btree ("profile_id");
CREATE UNIQUE INDEX IF NOT EXISTS "referral_milestones_profile_milestone_idx" ON "referral_milestones" USING btree ("profile_id","milestone");
CREATE INDEX IF NOT EXISTS "booking_requests_member_idx" ON "booking_requests" USING btree ("member_id");
CREATE INDEX IF NOT EXISTS "booking_requests_provider_idx" ON "booking_requests" USING btree ("provider_id");
CREATE INDEX IF NOT EXISTS "booking_requests_created_at_idx" ON "booking_requests" USING btree ("created_at");

-- ── Verification query ────────────────────────────────────────────────────────
-- Run this after applying the schema to confirm all tables were created:
--
-- SELECT table_name
-- FROM information_schema.tables
-- WHERE table_schema = 'public'
--   AND table_name IN (
--     'admin_settings',
--     'booking_requests',
--     'coach_memories',
--     'coach_sessions',
--     'demo_requests',
--     'employer_members',
--     'employer_modality_rules',
--     'employers',
--     'favorites',
--     'health_sync_logs',
--     'insights_cache',
--     'lmn_requests',
--     'magic_links',
--     'member_credits',
--     'member_intakes',
--     'modalities',
--     'notification_log',
--     'plan_items',
--     'plan_progress_logs',
--     'plans',
--     'profiles',
--     'provider_credentials',
--     'provider_modalities',
--     'provider_reviews',
--     'provider_subscriptions',
--     'provider_unlocks',
--     'providers',
--     'referral_milestones',
--     'referrals',
--     'sessions',
--     'testimonials',
--     'users'
--   )
-- ORDER BY table_name;
-- Expected: 32 rows
