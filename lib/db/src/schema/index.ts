export * from "./auth";

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  pgEnum,
  decimal,
  index,
  uniqueIndex,
  jsonb,
  uuid,
} from "drizzle-orm/pg-core";
import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

// ── Enums ────────────────────────────────────────────────────────────────────

export const modalityCategoryEnum = pgEnum("modality_category", [
  "manual",
  "movement",
  "mind-body",
  "nutrition",
  "medical",
  "telehealth",
]);

export const evidenceLevelEnum = pgEnum("evidence_level", [
  "Strong",
  "Moderate",
  "Emerging",
]);

export const memberRoleEnum = pgEnum("member_role", [
  "member",
  "provider",
  "admin",
  "employer",
]);

export const providerStatusEnum = pgEnum("provider_status", [
  "pending",
  "approved",
  "rejected",
]);

export const planStatusEnum = pgEnum("plan_status", [
  "generated",
  "saved",
  "active",
]);

// ── profiles ─────────────────────────────────────────────────────────────────
// One row per authenticated user; role drives access control

export const profiles = pgTable(
  "profiles",
  {
    id: text("id").primaryKey(), // matches auth provider user id
    email: text("email").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    role: memberRoleEnum("role").notNull().default("member"),
    stripeCustomerId: text("stripe_customer_id"),
    subscriptionStatus: text("subscription_status").default("free"), // free | plus | canceled
    lmnStatus: text("lmn_status").notNull().default("none"), // none | requested | received
    referralCode: text("referral_code"),               // unique shareable code, e.g. "HPF-ABCD1234"
    referralCount: integer("referral_count").notNull().default(0), // number of successful referrals made
    phone: text("phone"),                               // for SMS notifications
    communicationPrefs: jsonb("communication_prefs")
      .$type<{ email: boolean; sms: boolean }>()
      .default({ email: true, sms: false }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("profiles_email_idx").on(t.email),
    uniqueIndex("profiles_referral_code_idx").on(t.referralCode),
  ],
);

export const insertProfileSchema = createInsertSchema(profiles).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProfile = InferInsertModel<typeof profiles>;
export type Profile = InferSelectModel<typeof profiles>;

// ── modalities ───────────────────────────────────────────────────────────────

export const modalities = pgTable("modalities", {
  id: text("id").primaryKey(), // slug, e.g. "massage"
  name: text("name").notNull(),
  emoji: text("emoji").notNull().default("✨"),
  category: modalityCategoryEnum("category").notNull(),
  evidenceLevel: evidenceLevelEnum("evidence_level").notNull(),
  costLow: integer("cost_low").notNull(), // monthly USD
  costHigh: integer("cost_high").notNull(),
  typicalFrequency: text("typical_frequency").notNull(),
  hsaEligible: boolean("hsa_eligible").notNull().default(false),
  lmnEligible: boolean("lmn_eligible").notNull().default(false),
  description: text("description").notNull(),
  goals: jsonb("goals").notNull().default([]).$type<string[]>(),
  conditions: jsonb("conditions").notNull().default([]).$type<string[]>(),
  preferenceMatch: jsonb("preference_match").notNull().default([]).$type<string[]>(),
  exclusionIds: jsonb("exclusion_ids").notNull().default([]).$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
  evidenceSummary: text("evidence_summary"),
  metaDescription: text("meta_description"),
  relatedModalities: jsonb("related_modalities").notNull().default([]).$type<string[]>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertModalitySchema = createInsertSchema(modalities).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertModality = InferInsertModel<typeof modalities>;
export type Modality = InferSelectModel<typeof modalities>;

// ── providers ─────────────────────────────────────────────────────────────────

export const providers = pgTable(
  "providers",
  {
    id: text("id").primaryKey(), // uuid
    profileId: text("profile_id").references(() => profiles.id),
    name: text("name").notNull(),
    bio: text("bio"),
    city: text("city"),
    state: text("state"),
    zipCode: text("zip_code"),
    lat: decimal("lat", { precision: 9, scale: 6 }),
    lng: decimal("lng", { precision: 9, scale: 6 }),
    phone: text("phone"),
    website: text("website"),
    avatarUrl: text("avatar_url"),
    status: providerStatusEnum("status").notNull().default("pending"),
    verificationStatus: text("verification_status").notNull().default("draft"),
    acceptsInsurance: boolean("accepts_insurance").notNull().default(false),
    offersTelehealth: boolean("offers_telehealth").notNull().default(false),
    offersInPerson: boolean("offers_in_person").notNull().default(true),
    serviceRadiusMiles: integer("service_radius_miles"),
    costPerSession: integer("cost_per_session"),
    rejectionReason: text("rejection_reason"),
    credentialDocPath: text("credential_doc_path"),
    availabilityNotes: text("availability_notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("providers_zip_idx").on(t.zipCode),
    index("providers_status_idx").on(t.status),
  ],
);

export const insertProviderSchema = createInsertSchema(providers).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProvider = InferInsertModel<typeof providers>;
export type Provider = InferSelectModel<typeof providers>;

// ── provider_modalities ───────────────────────────────────────────────────────

export const providerModalities = pgTable(
  "provider_modalities",
  {
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    modalityId: text("modality_id")
      .notNull()
      .references(() => modalities.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").notNull().default(false),
    costMin: integer("cost_min"),
    costMax: integer("cost_max"),
  },
  (t) => [
    uniqueIndex("provider_modalities_pk").on(t.providerId, t.modalityId),
    index("provider_modalities_modality_idx").on(t.modalityId),
  ],
);

export const insertProviderModalitySchema = createInsertSchema(providerModalities);
export type InsertProviderModality = InferInsertModel<typeof providerModalities>;
export type ProviderModality = InferSelectModel<typeof providerModalities>;

// ── provider_credentials ──────────────────────────────────────────────────────

export const providerCredentials = pgTable(
  "provider_credentials",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    credentialName: text("credential_name").notNull(), // e.g. "Licensed Massage Therapist"
    issuingBody: text("issuing_body"),
    licenseNumber: text("license_number"),
    expiresAt: timestamp("expires_at"),
    verifiedAt: timestamp("verified_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("provider_credentials_provider_idx").on(t.providerId)],
);

export const insertProviderCredentialSchema = createInsertSchema(providerCredentials).omit({
  createdAt: true,
});
export type InsertProviderCredential = InferInsertModel<typeof providerCredentials>;
export type ProviderCredential = InferSelectModel<typeof providerCredentials>;

// ── member_intakes ─────────────────────────────────────────────────────────────

export const memberIntakes = pgTable(
  "member_intakes",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").references(() => profiles.id),
    budget: integer("budget").notNull(),
    goals: jsonb("goals").notNull().default([]).$type<string[]>(),
    conditions: jsonb("conditions").notNull().default([]).$type<string[]>(),
    preferences: jsonb("preferences").notNull().default([]).$type<string[]>(),
    exclusions: jsonb("exclusions").notNull().default([]).$type<string[]>(),
    zipCode: text("zip_code"),
    radius: integer("radius").notNull().default(25),
    telehealth: boolean("telehealth").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("member_intakes_profile_idx").on(t.profileId)],
);

export const insertMemberIntakeSchema = createInsertSchema(memberIntakes).omit({
  createdAt: true,
});
export type InsertMemberIntake = InferInsertModel<typeof memberIntakes>;
export type MemberIntake = InferSelectModel<typeof memberIntakes>;

// ── plans ────────────────────────────────────────────────────────────────────

export const plans = pgTable(
  "plans",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id").references(() => profiles.id),
    intakeId: text("intake_id").references(() => memberIntakes.id),
    status: planStatusEnum("status").notNull().default("generated"),
    totalMonthlyCost: integer("total_monthly_cost").notNull(),
    budgetUtilization: integer("budget_utilization").notNull(), // 0–100
    budget: integer("budget").notNull(),
    shareToken: text("share_token"),          // unique token for public share link
    shareGoal: text("share_goal"),            // anonymized primary goal for share card
    shareModalities: jsonb("share_modalities").$type<Array<{ name: string; emoji: string }>>(), // top 3 modalities for share card
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("plans_profile_idx").on(t.profileId),
    uniqueIndex("plans_share_token_idx").on(t.shareToken),
  ],
);

export const insertPlanSchema = createInsertSchema(plans).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertPlan = InferInsertModel<typeof plans>;
export type Plan = InferSelectModel<typeof plans>;

// ── plan_items ────────────────────────────────────────────────────────────────

export const planItems = pgTable(
  "plan_items",
  {
    id: text("id").primaryKey(),
    planId: text("plan_id")
      .notNull()
      .references(() => plans.id, { onDelete: "cascade" }),
    modalityId: text("modality_id")
      .notNull()
      .references(() => modalities.id),
    score: integer("score").notNull(),
    frequency: text("frequency").notNull(),
    estimatedMonthlyCost: integer("estimated_monthly_cost").notNull(),
    rationale: text("rationale").notNull(),
    isDeprioritized: boolean("is_deprioritized").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    nearbyProviderCount: integer("nearby_provider_count"),
  },
  (t) => [
    index("plan_items_plan_idx").on(t.planId),
    index("plan_items_modality_idx").on(t.modalityId),
  ],
);

export const insertPlanItemSchema = createInsertSchema(planItems);
export type InsertPlanItem = InferInsertModel<typeof planItems>;
export type PlanItem = InferSelectModel<typeof planItems>;

// ── favorites ─────────────────────────────────────────────────────────────────

export const favorites = pgTable(
  "favorites",
  {
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("favorites_pk").on(t.profileId, t.providerId)],
);

export const insertFavoriteSchema = createInsertSchema(favorites).omit({
  createdAt: true,
});
export type InsertFavorite = InferInsertModel<typeof favorites>;
export type Favorite = InferSelectModel<typeof favorites>;

// ── plan_progress_logs ────────────────────────────────────────────────────────

export const planProgressLogs = pgTable(
  "plan_progress_logs",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    planId: text("plan_id").references(() => plans.id),
    modalityId: text("modality_id").references(() => modalities.id),
    note: text("note"),
    rating: integer("rating"), // 1–10 overall wellness
    mood: integer("mood"),     // 1–10
    pain: integer("pain"),     // 1–10 (higher = more pain)
    energy: integer("energy"), // 1–10
    sessionDate: timestamp("session_date"),
    sessionCostCents: integer("session_cost_cents"),     // actual cost paid by member (cents)
    employerCoveredCents: integer("employer_covered_cents"), // portion covered by employer stipend
    outOfPocketCents: integer("out_of_pocket_cents"),    // overflow: member's personal expense
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("progress_logs_profile_idx").on(t.profileId)],
);

export const insertPlanProgressLogSchema = createInsertSchema(planProgressLogs).omit({
  createdAt: true,
});
export type InsertPlanProgressLog = InferInsertModel<typeof planProgressLogs>;
export type PlanProgressLog = InferSelectModel<typeof planProgressLogs>;

// ── admin_settings ────────────────────────────────────────────────────────────

export const adminSettings = pgTable("admin_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAdminSettingSchema = createInsertSchema(adminSettings).omit({
  updatedAt: true,
});
export type InsertAdminSetting = InferInsertModel<typeof adminSettings>;
export type AdminSetting = InferSelectModel<typeof adminSettings>;

// ── employers ─────────────────────────────────────────────────────────────────
// B2B employer accounts that fund employee wellness stipends

export const employers = pgTable(
  "employers",
  {
    id: text("id").primaryKey(),
    companyName: text("company_name").notNull(),
    adminContactName: text("admin_contact_name").notNull(),
    adminContactEmail: text("admin_contact_email").notNull(),
    billingContactEmail: text("billing_contact_email"),
    adminProfileId: text("admin_profile_id").references(() => profiles.id),
    numberOfEmployees: integer("number_of_employees").notNull(),
    stipendPerEmployee: integer("stipend_per_employee").notNull(), // cents/month
    platformFeePercent: integer("platform_fee_percent").notNull().default(8),
    inviteCode: text("invite_code").notNull(),
    stripeCustomerId: text("stripe_customer_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: text("status").notNull().default("active"), // pending | active | canceled
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("employers_invite_code_idx").on(t.inviteCode)],
);

export const insertEmployerSchema = createInsertSchema(employers).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertEmployer = InferInsertModel<typeof employers>;
export type Employer = InferSelectModel<typeof employers>;

// ── employer_members ──────────────────────────────────────────────────────────
// Links member profiles to employer accounts and tracks stipend usage

export const employerMembers = pgTable(
  "employer_members",
  {
    id: text("id").primaryKey(),
    employerId: text("employer_id")
      .notNull()
      .references(() => employers.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    monthlyBudget: integer("monthly_budget").notNull(), // cents
    spentThisMonth: integer("spent_this_month").notNull().default(0), // cents
    budgetMonth: text("budget_month"), // YYYY-MM
    linkedAt: timestamp("linked_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("employer_members_pk").on(t.employerId, t.profileId),
    index("employer_members_employer_idx").on(t.employerId),
    // One active employer per member — enforced at DB level
    uniqueIndex("employer_members_profile_idx").on(t.profileId),
  ],
);

export const insertEmployerMemberSchema = createInsertSchema(employerMembers).omit({
  linkedAt: true,
});
export type InsertEmployerMember = InferInsertModel<typeof employerMembers>;
export type EmployerMember = InferSelectModel<typeof employerMembers>;

// ── employer_modality_rules ────────────────────────────────────────────────────
// Per-employer coverage rules for which modalities are stipend-eligible

export const employerModalityRules = pgTable(
  "employer_modality_rules",
  {
    id: text("id").primaryKey(),
    employerId: text("employer_id")
      .notNull()
      .references(() => employers.id, { onDelete: "cascade" }),
    modalityId: text("modality_id")
      .notNull()
      .references(() => modalities.id, { onDelete: "cascade" }),
    covered: boolean("covered").notNull().default(true),
  },
  (t) => [
    uniqueIndex("employer_modality_rules_pk").on(t.employerId, t.modalityId),
    index("employer_modality_rules_employer_idx").on(t.employerId),
  ],
);

export const insertEmployerModalityRuleSchema = createInsertSchema(employerModalityRules);
export type InsertEmployerModalityRule = InferInsertModel<typeof employerModalityRules>;
export type EmployerModalityRule = InferSelectModel<typeof employerModalityRules>;

// ── lmn_requests ──────────────────────────────────────────────────────────────
// Draft LMN request messages auto-created after a member adds a DPC/medical provider.
// Status: "draft" → "sent" → "received" (driven by member self-reporting)

export const lmnRequests = pgTable(
  "lmn_requests",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    planId: text("plan_id").references(() => plans.id, { onDelete: "set null" }),
    status: text("status").notNull().default("draft"), // draft | sent | received
    draftMessage: text("draft_message").notNull(),
    eligibleModalities: jsonb("eligible_modalities").notNull().default([]).$type<string[]>(),
    estimatedAnnualSavings: integer("estimated_annual_savings"), // cents
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("lmn_requests_profile_idx").on(t.profileId),
  ],
);

export const insertLmnRequestSchema = createInsertSchema(lmnRequests).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertLmnRequest = InferInsertModel<typeof lmnRequests>;
export type LmnRequest = InferSelectModel<typeof lmnRequests>;

// ── insights_cache ────────────────────────────────────────────────────────────
// Pre-computed longitudinal outcome insights per member.
// Refreshed on demand (stale if > 24 hours) or by a weekly job.

export type InsightCard = {
  modalityId: string;
  modalityName: string;
  emoji: string;
  metric: "pain" | "energy" | "mood" | "rating";
  headline: string;
  withSessionAvg: number;
  withoutSessionAvg: number;
  percentDiff: number; // positive = improvement
  sessionCount: number;
  sparklineData: Array<{ date: string; value: number; hasSession: boolean }>;
  whyItMatters: string;
};

export type AttentionItem = {
  modalityId: string;
  modalityName: string;
  emoji: string;
  message: string;
  daysSinceLastSession: number | null;
};

export const insightsCache = pgTable(
  "insights_cache",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    insights: jsonb("insights").notNull().default([]).$type<InsightCard[]>(),
    attentionItems: jsonb("attention_items").notNull().default([]).$type<AttentionItem[]>(),
    wellnessScore: integer("wellness_score"),
    journalCount: integer("journal_count").notNull().default(0),
    sessionCount: integer("session_count").notNull().default(0),
    refreshedAt: timestamp("refreshed_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("insights_cache_profile_idx").on(t.profileId)],
);

export const insertInsightsCacheSchema = createInsertSchema(insightsCache).omit({
  createdAt: true,
});
export type InsertInsightsCache = InferInsertModel<typeof insightsCache>;
export type InsightsCache = InferSelectModel<typeof insightsCache>;

// ── referrals ─────────────────────────────────────────────────────────────────
// Tracks referral relationships between members. A row is created when a
// referred user registers with a valid referral code. Status advances from
// pending → rewarded when the referred member generates their first plan.

export const referralStatusEnum = pgEnum("referral_status", [
  "pending",    // referred member signed up but hasn't generated a plan yet
  "rewarded",   // referred member generated a plan; referrer received credit
]);

export const referrals = pgTable(
  "referrals",
  {
    id: text("id").primaryKey(),
    referrerId: text("referrer_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    referredMemberId: text("referred_member_id")
      .references(() => profiles.id, { onDelete: "set null" }),
    code: text("code").notNull(),               // the referral code used
    status: referralStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    rewardedAt: timestamp("rewarded_at"),
  },
  (t) => [
    index("referrals_referrer_idx").on(t.referrerId),
    // One referral row per referred member — prevents double-registration
    uniqueIndex("referrals_referred_member_unique_idx").on(t.referredMemberId),
  ],
);

export const insertReferralSchema = createInsertSchema(referrals).omit({
  createdAt: true,
});
export type InsertReferral = InferInsertModel<typeof referrals>;
export type Referral = InferSelectModel<typeof referrals>;

// ── notification_log ──────────────────────────────────────────────────────────
// Every sent (or attempted) transactional message: email or SMS.
// Used for auditing, deduplication, and the admin message history view.

export const notificationChannelEnum = pgEnum("notification_channel", [
  "email",
  "sms",
]);

export const notificationTypeEnum = pgEnum("notification_type", [
  "welcome",
  "plan-ready",
  "session-reminder",
  "session-confirmed",
  "payment-due",
  "payment-confirmed",
  "accountability-nudge",
  "referral-invite",
  "referral-reward",
  "magic-link",
  "weekly-summary",
  "streak-at-risk",
  "demo-request",
  "review-nudge",
  "re-engagement-day3",
  "re-engagement-day7",
  "booking-request",
]);

export const notificationStatusEnum = pgEnum("notification_status", [
  "queued",
  "sent",
  "failed",
]);

export const notificationLog = pgTable(
  "notification_log",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    channel: notificationChannelEnum("channel").notNull(),
    type: notificationTypeEnum("type").notNull(),
    status: notificationStatusEnum("status").notNull().default("queued"),
    scheduledFor: timestamp("scheduled_for"),
    sentAt: timestamp("sent_at"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("notification_log_profile_idx").on(t.profileId),
    index("notification_log_type_idx").on(t.type),
    index("notification_log_status_idx").on(t.status),
  ],
);

export const insertNotificationLogSchema = createInsertSchema(notificationLog).omit({
  createdAt: true,
});
export type InsertNotificationLog = InferInsertModel<typeof notificationLog>;
export type NotificationLog = InferSelectModel<typeof notificationLog>;

// ── magic_links ───────────────────────────────────────────────────────────────
// Signed one-time-use tokens for passwordless actions (login, payment confirm,
// appointment accept, accountability check-in). Each link has a TTL and is
// consumed (usedAt set) on first redemption.

export const magicLinkActionEnum = pgEnum("magic_link_action", [
  "login",
  "payment",
  "appointment",
  "accountability",
]);

export const magicLinks = pgTable(
  "magic_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    action: magicLinkActionEnum("action").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>(),
    expiresAt: timestamp("expires_at").notNull(),
    usedAt: timestamp("used_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("magic_links_profile_idx").on(t.profileId),
    index("magic_links_expires_idx").on(t.expiresAt),
  ],
);

export const insertMagicLinkSchema = createInsertSchema(magicLinks).omit({
  createdAt: true,
  usedAt: true,
});
export type InsertMagicLink = InferInsertModel<typeof magicLinks>;
export type MagicLink = InferSelectModel<typeof magicLinks>;

// ── member_credits ────────────────────────────────────────────────────────────
// Redeemable credits earned by members. Each credit represents a fixed
// monetary discount (amountCents) applied at the next modality unlock or
// subscription upgrade. source tracks how the credit was earned.

export const creditSourceEnum = pgEnum("credit_source", [
  "referral",     // earned by successfully referring a new member
  "promo",        // awarded by admin as a promotional credit
  "milestone",    // bonus credit for crossing a referral milestone tier
  "invite-sent",  // zero-amount audit row used for invite rate-limiting
]);

export const memberCredits = pgTable(
  "member_credits",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    source: creditSourceEnum("source").notNull(),
    amountCents: integer("amount_cents").notNull().default(300), // default: $3 unlock credit
    used: boolean("used").notNull().default(false),
    referralId: text("referral_id")               // FK back to referrals row (nullable for promos)
      .references(() => referrals.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    usedAt: timestamp("used_at"),
  },
  (t) => [index("member_credits_profile_idx").on(t.profileId)],
);

export const insertMemberCreditSchema = createInsertSchema(memberCredits).omit({
  createdAt: true,
});
export type InsertMemberCredit = InferInsertModel<typeof memberCredits>;
export type MemberCredit = InferSelectModel<typeof memberCredits>;

// ── demo_requests ─────────────────────────────────────────────────────────────
// B2B sales pipeline — inbound demo requests from the employer landing page.

export const demoRequests = pgTable(
  "demo_requests",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    company: text("company").notNull(),
    companySize: text("company_size").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    message: text("message"),
    status: text("status").notNull().default("new"), // new | contacted | qualified | closed
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("demo_requests_email_idx").on(t.email)],
);

export const insertDemoRequestSchema = createInsertSchema(demoRequests).omit({
  createdAt: true,
});
export type InsertDemoRequest = InferInsertModel<typeof demoRequests>;
export type DemoRequest = InferSelectModel<typeof demoRequests>;

// ── provider_unlocks ──────────────────────────────────────────────────────────
// Persistent record of which providers a member has unlocked (paid to view).
// Populated immediately for full-credit unlocks, or after Stripe confirms payment.

export const providerUnlocks = pgTable(
  "provider_unlocks",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    providerId: text("provider_id").notNull(),
    creditId: text("credit_id").references(() => memberCredits.id, { onDelete: "set null" }),
    stripeSessionId: text("stripe_session_id"),
    amountCharged: integer("amount_charged").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("provider_unlocks_member_idx").on(t.memberId),
    uniqueIndex("provider_unlocks_member_provider_unique_idx").on(t.memberId, t.providerId),
  ],
);

export const insertProviderUnlockSchema = createInsertSchema(providerUnlocks).omit({
  createdAt: true,
});
export type InsertProviderUnlock = InferInsertModel<typeof providerUnlocks>;
export type ProviderUnlock = InferSelectModel<typeof providerUnlocks>;

// ── health_sync_logs ──────────────────────────────────────────────────────────
// Stores daily health metrics synced from Apple Health or Google Fit.

export const healthSyncLogs = pgTable(
  "health_sync_logs",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    source: text("source").notNull(),
    steps: integer("steps"),
    sleepMinutes: integer("sleep_minutes"),
    activeMinutes: integer("active_minutes"),
    mindfulnessMinutes: integer("mindfulness_minutes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("health_sync_logs_profile_idx").on(t.profileId),
    uniqueIndex("health_sync_logs_profile_date_idx").on(t.profileId, t.date),
  ],
);

export const insertHealthSyncLogSchema = createInsertSchema(healthSyncLogs).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertHealthSyncLog = InferInsertModel<typeof healthSyncLogs>;
export type HealthSyncLog = InferSelectModel<typeof healthSyncLogs>;

// ── provider_subscriptions ─────────────────────────────────────────────────────
// Monthly listing fee paid by providers to be listed on the platform.
// Created after a successful Stripe Checkout Session for the listing fee.

export const providerSubscriptions = pgTable(
  "provider_subscriptions",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    stripeSessionId: text("stripe_session_id"),
    stripeSubscriptionId: text("stripe_subscription_id"),
    stripeCustomerId: text("stripe_customer_id"),
    amountCents: integer("amount_cents").notNull().default(2900), // $29/mo
    status: text("status").notNull().default("active"), // active | canceled | past_due
    currentPeriodEnd: timestamp("current_period_end"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("provider_subscriptions_provider_idx").on(t.providerId),
    index("provider_subscriptions_profile_idx").on(t.profileId),
  ],
);

export const insertProviderSubscriptionSchema = createInsertSchema(providerSubscriptions).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProviderSubscription = InferInsertModel<typeof providerSubscriptions>;
export type ProviderSubscription = InferSelectModel<typeof providerSubscriptions>;

// ── testimonials ──────────────────────────────────────────────────────────────
// Member success stories shown on the landing page and How It Works page.
// Admin can add/edit/hide testimonials from the admin dashboard.

export const testimonials = pgTable("testimonials", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location"),
  goal: text("goal"),
  quote: text("quote").notNull(),
  stars: integer("stars").notNull().default(5),
  isVisible: boolean("is_visible").notNull().default(true),
  displayOrder: integer("display_order").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertTestimonial = InferInsertModel<typeof testimonials>;
export type Testimonial = InferSelectModel<typeof testimonials>;

// ── provider_reviews ──────────────────────────────────────────────────────────
// Members submit 1–5 star ratings + optional written reviews after sessions.
// Admins can hide (moderate) reviews by setting isHidden = true.

export const providerReviews = pgTable(
  "provider_reviews",
  {
    id: text("id").primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),              // 1–5
    reviewText: text("review_text"),                  // optional written review
    isHidden: boolean("is_hidden").notNull().default(false), // admin moderation flag
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("provider_reviews_provider_idx").on(t.providerId),
    index("provider_reviews_member_idx").on(t.memberId),
    uniqueIndex("provider_reviews_member_provider_unique_idx").on(t.memberId, t.providerId),
  ],
);

export const insertProviderReviewSchema = createInsertSchema(providerReviews).omit({
  createdAt: true,
  updatedAt: true,
});
export type InsertProviderReview = InferInsertModel<typeof providerReviews>;
export type ProviderReview = InferSelectModel<typeof providerReviews>;

// ── coach_sessions ────────────────────────────────────────────────────────────
// Stores the full message history for a member's current coach session.
// Only the most recent session is kept (upserted on profileId).
// Used to persist chat across app restarts and device changes.

export type CoachMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export const coachSessions = pgTable(
  "coach_sessions",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    messages: jsonb("messages").$type<CoachMessage[]>().notNull().default([]),
    archived: boolean("archived").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("coach_sessions_profile_id_idx").on(t.profileId),
    index("coach_sessions_updated_at_idx").on(t.updatedAt),
  ],
);

export type CoachSession = InferSelectModel<typeof coachSessions>;
export type InsertCoachSession = InferInsertModel<typeof coachSessions>;

// ── coachMemories ──────────────────────────────────────────────────────────────
// Stores a compressed text summary of each member's coach conversations.
// The summary is injected into the system prompt as long-term memory context.

export const coachMemories = pgTable(
  "coach_memories",
  {
    id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    summary: text("summary").notNull().default(""),
    facts: jsonb("facts").$type<string[]>().notNull().default([]),
    sessionCount: integer("session_count").notNull().default(0),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("coach_memories_profile_id_idx").on(t.profileId),
  ],
);

export type CoachMemory = InferSelectModel<typeof coachMemories>;

// ── referral_milestones ────────────────────────────────────────────────────────
// Tracks which milestone tiers a member has earned in the referral program.
// Milestones: pioneer (1), advocate (5), champion (10), ambassador (25)

export const referralMilestones = pgTable(
  "referral_milestones",
  {
    id: text("id").primaryKey(),
    profileId: text("profile_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    milestone: text("milestone").notNull(), // "pioneer" | "advocate" | "champion" | "ambassador"
    rewardedAt: timestamp("rewarded_at").notNull().defaultNow(),
    bonusCreditCents: integer("bonus_credit_cents").notNull().default(0),
  },
  (t) => [
    index("referral_milestones_profile_idx").on(t.profileId),
    uniqueIndex("referral_milestones_profile_milestone_idx").on(t.profileId, t.milestone),
  ],
);

export type ReferralMilestone = InferSelectModel<typeof referralMilestones>;
export type InsertReferralMilestone = InferInsertModel<typeof referralMilestones>;

// ── booking_requests ──────────────────────────────────────────────────────────
// In-app booking requests sent from Plus members to providers.
// The provider receives a branded email; the member gets a confirmation email.
// Status: "pending" | "contacted" | "declined"

export const bookingRequests = pgTable(
  "booking_requests",
  {
    id: text("id").primaryKey(),
    memberId: text("member_id")
      .notNull()
      .references(() => profiles.id, { onDelete: "cascade" }),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    memberEmail: text("member_email").notNull(),
    contactEmail: text("contact_email"),
    requestedModality: text("requested_modality"),
    message: text("message").notNull(),
    note: text("note"),
    status: text("status").notNull().default("pending"), // pending | contacted | declined
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("booking_requests_member_idx").on(t.memberId),
    index("booking_requests_provider_idx").on(t.providerId),
    index("booking_requests_created_at_idx").on(t.createdAt),
  ],
);

export const insertBookingRequestSchema = createInsertSchema(bookingRequests).omit({
  createdAt: true,
});
export type InsertBookingRequest = InferInsertModel<typeof bookingRequests>;
export type BookingRequest = InferSelectModel<typeof bookingRequests>;
