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
  description: text("description").notNull(),
  goals: jsonb("goals").notNull().default([]).$type<string[]>(),
  conditions: jsonb("conditions").notNull().default([]).$type<string[]>(),
  preferenceMatch: jsonb("preference_match").notNull().default([]).$type<string[]>(),
  exclusionIds: jsonb("exclusion_ids").notNull().default([]).$type<string[]>(),
  isActive: boolean("is_active").notNull().default(true),
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
    rating: integer("rating"), // 1–5 how it went
    sessionDate: timestamp("session_date"),
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
