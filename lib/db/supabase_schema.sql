CREATE TYPE "public"."credit_source" AS ENUM('referral', 'promo');;
CREATE TYPE "public"."evidence_level" AS ENUM('Strong', 'Moderate', 'Emerging');;
CREATE TYPE "public"."magic_link_action" AS ENUM('login', 'payment', 'appointment', 'accountability');;
CREATE TYPE "public"."member_role" AS ENUM('member', 'provider', 'admin', 'employer');;
CREATE TYPE "public"."modality_category" AS ENUM('manual', 'movement', 'mind-body', 'nutrition', 'medical', 'telehealth');;
CREATE TYPE "public"."notification_channel" AS ENUM('email', 'sms');;
CREATE TYPE "public"."notification_status" AS ENUM('queued', 'sent', 'failed');;
CREATE TYPE "public"."notification_type" AS ENUM('welcome', 'plan-ready', 'session-reminder', 'session-confirmed', 'payment-due', 'payment-confirmed', 'accountability-nudge', 'referral-invite', 'referral-reward', 'magic-link', 'weekly-summary', 'streak-at-risk');;
CREATE TYPE "public"."plan_status" AS ENUM('generated', 'saved', 'active');;
CREATE TYPE "public"."provider_status" AS ENUM('pending', 'approved', 'rejected');;
CREATE TYPE "public"."referral_status" AS ENUM('pending', 'rewarded');;
CREATE TABLE "admin_settings" (
        "key" text PRIMARY KEY NOT NULL,
        "value" jsonb,
        "updated_at" timestamp DEFAULT now() NOT NULL
);
;
CREATE TABLE "employer_members" (
        "id" text PRIMARY KEY NOT NULL,
        "employer_id" text NOT NULL,
        "profile_id" text NOT NULL,
        "monthly_budget" integer NOT NULL,
        "spent_this_month" integer DEFAULT 0 NOT NULL,
        "budget_month" text,
        "linked_at" timestamp DEFAULT now() NOT NULL
);
;
CREATE TABLE "employer_modality_rules" (
        "id" text PRIMARY KEY NOT NULL,
        "employer_id" text NOT NULL,
        "modality_id" text NOT NULL,
        "covered" boolean DEFAULT true NOT NULL
);
;
CREATE TABLE "employers" (
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
;
CREATE TABLE "favorites" (
        "profile_id" text NOT NULL,
        "provider_id" text NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL
);
;
CREATE TABLE "insights_cache" (
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
;
CREATE TABLE "lmn_requests" (
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
;
CREATE TABLE "magic_links" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "profile_id" text NOT NULL,
        "action" "magic_link_action" NOT NULL,
        "payload" jsonb,
        "expires_at" timestamp NOT NULL,
        "used_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
);
;
CREATE TABLE "member_credits" (
        "id" text PRIMARY KEY NOT NULL,
        "profile_id" text NOT NULL,
        "source" "credit_source" NOT NULL,
        "amount_cents" integer DEFAULT 200 NOT NULL,
        "used" boolean DEFAULT false NOT NULL,
        "referral_id" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "used_at" timestamp
);
;
CREATE TABLE "member_intakes" (
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
;
CREATE TABLE "modalities" (
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
;
CREATE TABLE "notification_log" (
        "id" text PRIMARY KEY NOT NULL,
        "profile_id" text NOT NULL,
        "channel" "notification_channel" NOT NULL,
        "type" "notification_type" NOT NULL,
        "status" "notification_status" DEFAULT 'queued' NOT NULL,
        "scheduled_for" timestamp,
        "sent_at" timestamp,
        "metadata" jsonb,
        "created_at" timestamp DEFAULT now() NOT NULL
);
;
CREATE TABLE "plan_items" (
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
;
CREATE TABLE "plan_progress_logs" (
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
;
CREATE TABLE "plans" (
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
;
CREATE TABLE "profiles" (
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
;
CREATE TABLE "provider_credentials" (
        "id" text PRIMARY KEY NOT NULL,
        "provider_id" text NOT NULL,
        "credential_name" text NOT NULL,
        "issuing_body" text,
        "license_number" text,
        "expires_at" timestamp,
        "verified_at" timestamp,
        "created_at" timestamp DEFAULT now() NOT NULL
);
;
CREATE TABLE "provider_modalities" (
        "provider_id" text NOT NULL,
        "modality_id" text NOT NULL,
        "is_primary" boolean DEFAULT false NOT NULL,
        "cost_min" integer,
        "cost_max" integer
);
;
CREATE TABLE "providers" (
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
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
);
;
CREATE TABLE "referrals" (
        "id" text PRIMARY KEY NOT NULL,
        "referrer_id" text NOT NULL,
        "referred_member_id" text,
        "code" text NOT NULL,
        "status" "referral_status" DEFAULT 'pending' NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "rewarded_at" timestamp
);
;
CREATE TABLE "sessions" (
        "sid" varchar PRIMARY KEY NOT NULL,
        "sess" jsonb NOT NULL,
        "expire" timestamp NOT NULL
);
;
CREATE TABLE "users" (
        "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "email" varchar,
        "first_name" varchar,
        "last_name" varchar,
        "profile_image_url" varchar,
        "created_at" timestamp with time zone DEFAULT now() NOT NULL,
        "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
        CONSTRAINT "users_email_unique" UNIQUE("email")
);
;
ALTER TABLE "employer_members" ADD CONSTRAINT "employer_members_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "employer_members" ADD CONSTRAINT "employer_members_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "employer_modality_rules" ADD CONSTRAINT "employer_modality_rules_employer_id_employers_id_fk" FOREIGN KEY ("employer_id") REFERENCES "public"."employers"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "employer_modality_rules" ADD CONSTRAINT "employer_modality_rules_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "employers" ADD CONSTRAINT "employers_admin_profile_id_profiles_id_fk" FOREIGN KEY ("admin_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "insights_cache" ADD CONSTRAINT "insights_cache_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "lmn_requests" ADD CONSTRAINT "lmn_requests_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "lmn_requests" ADD CONSTRAINT "lmn_requests_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE set null ON UPDATE no action;;
ALTER TABLE "magic_links" ADD CONSTRAINT "magic_links_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "member_credits" ADD CONSTRAINT "member_credits_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "member_credits" ADD CONSTRAINT "member_credits_referral_id_referrals_id_fk" FOREIGN KEY ("referral_id") REFERENCES "public"."referrals"("id") ON DELETE set null ON UPDATE no action;;
ALTER TABLE "member_intakes" ADD CONSTRAINT "member_intakes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;;
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "plan_items" ADD CONSTRAINT "plan_items_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE no action ON UPDATE no action;;
ALTER TABLE "plan_progress_logs" ADD CONSTRAINT "plan_progress_logs_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "plan_progress_logs" ADD CONSTRAINT "plan_progress_logs_plan_id_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plans"("id") ON DELETE no action ON UPDATE no action;;
ALTER TABLE "plan_progress_logs" ADD CONSTRAINT "plan_progress_logs_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE no action ON UPDATE no action;;
ALTER TABLE "plans" ADD CONSTRAINT "plans_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;;
ALTER TABLE "plans" ADD CONSTRAINT "plans_intake_id_member_intakes_id_fk" FOREIGN KEY ("intake_id") REFERENCES "public"."member_intakes"("id") ON DELETE no action ON UPDATE no action;;
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "provider_modalities" ADD CONSTRAINT "provider_modalities_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "provider_modalities" ADD CONSTRAINT "provider_modalities_modality_id_modalities_id_fk" FOREIGN KEY ("modality_id") REFERENCES "public"."modalities"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "providers" ADD CONSTRAINT "providers_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referrer_id_profiles_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;;
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_referred_member_id_profiles_id_fk" FOREIGN KEY ("referred_member_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;;
CREATE UNIQUE INDEX "employer_members_pk" ON "employer_members" USING btree ("employer_id","profile_id");;
CREATE INDEX "employer_members_employer_idx" ON "employer_members" USING btree ("employer_id");;
CREATE UNIQUE INDEX "employer_members_profile_idx" ON "employer_members" USING btree ("profile_id");;
CREATE UNIQUE INDEX "employer_modality_rules_pk" ON "employer_modality_rules" USING btree ("employer_id","modality_id");;
CREATE INDEX "employer_modality_rules_employer_idx" ON "employer_modality_rules" USING btree ("employer_id");;
CREATE UNIQUE INDEX "employers_invite_code_idx" ON "employers" USING btree ("invite_code");;
CREATE UNIQUE INDEX "favorites_pk" ON "favorites" USING btree ("profile_id","provider_id");;
CREATE UNIQUE INDEX "insights_cache_profile_idx" ON "insights_cache" USING btree ("profile_id");;
CREATE INDEX "lmn_requests_profile_idx" ON "lmn_requests" USING btree ("profile_id");;
CREATE INDEX "magic_links_profile_idx" ON "magic_links" USING btree ("profile_id");;
CREATE INDEX "magic_links_expires_idx" ON "magic_links" USING btree ("expires_at");;
CREATE INDEX "member_credits_profile_idx" ON "member_credits" USING btree ("profile_id");;
CREATE INDEX "member_intakes_profile_idx" ON "member_intakes" USING btree ("profile_id");;
CREATE INDEX "notification_log_profile_idx" ON "notification_log" USING btree ("profile_id");;
CREATE INDEX "notification_log_type_idx" ON "notification_log" USING btree ("type");;
CREATE INDEX "notification_log_status_idx" ON "notification_log" USING btree ("status");;
CREATE INDEX "plan_items_plan_idx" ON "plan_items" USING btree ("plan_id");;
CREATE INDEX "plan_items_modality_idx" ON "plan_items" USING btree ("modality_id");;
CREATE INDEX "progress_logs_profile_idx" ON "plan_progress_logs" USING btree ("profile_id");;
CREATE INDEX "plans_profile_idx" ON "plans" USING btree ("profile_id");;
CREATE UNIQUE INDEX "profiles_email_idx" ON "profiles" USING btree ("email");;
CREATE UNIQUE INDEX "profiles_referral_code_idx" ON "profiles" USING btree ("referral_code");;
CREATE INDEX "provider_credentials_provider_idx" ON "provider_credentials" USING btree ("provider_id");;
CREATE UNIQUE INDEX "provider_modalities_pk" ON "provider_modalities" USING btree ("provider_id","modality_id");;
CREATE INDEX "provider_modalities_modality_idx" ON "provider_modalities" USING btree ("modality_id");;
CREATE INDEX "providers_zip_idx" ON "providers" USING btree ("zip_code");;
CREATE INDEX "providers_status_idx" ON "providers" USING btree ("status");;
CREATE INDEX "referrals_referrer_idx" ON "referrals" USING btree ("referrer_id");;
CREATE INDEX "referrals_referred_member_idx" ON "referrals" USING btree ("referred_member_id");;
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");-- Messaging infrastructure delta (Task #17)
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
