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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [uniqueIndex("profiles_email_idx").on(t.email)],
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
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("plans_profile_idx").on(t.profileId)],
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
