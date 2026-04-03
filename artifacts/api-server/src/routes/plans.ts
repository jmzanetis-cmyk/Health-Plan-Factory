import { Router, type IRouter } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { plans, planItems, memberIntakes, modalities, profiles, planModalityFeedback } from "@workspace/db";
import { eq, desc, inArray, and } from "drizzle-orm";
import { maybeRewardReferrer } from "./referrals";
import {
  GeneratePlanBody,
  GetPlanParams,
  GetPlanResponse,
  UpdatePlanBody,
  UpdatePlanParams,
  UpdatePlanResponse,
} from "@workspace/api-zod";
import { runPlanEngine } from "../lib/serverPlanEngine";
import { queryProviderAvailability } from "../lib/providerAvailability";
import { sendNotification } from "../lib/comms";
import { planReadyEmail } from "../emails/plan-ready";
import { randomBytes } from "crypto";
import PDFDocument from "pdfkit";

const BASE_URL = process.env.BASE_URL || "https://healthplanfactory.com";

const router: IRouter = Router();

const ConditionWeightSchema = z.object({
  id: z.string(),
  severity: z.enum(["mild", "moderate", "severe"]),
  priority: z.enum(["low", "medium", "high"]),
});

const SpeculateBody = z.object({
  budget: z.number().min(50).max(1000),
  conditions: z.array(z.string()).default([]),
  conditionWeights: z.array(ConditionWeightSchema).default([]),
  goals: z.array(z.string()).default([]),
  zipCode: z.string().optional(),
  radius: z.number().optional(),
  preferences: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  telehealth: z.boolean().default(false),
});

router.post("/plans/speculate", async (req, res) => {
  try {
    const body = SpeculateBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const { budget, conditions, conditionWeights, goals, zipCode, radius, preferences, exclusions, telehealth } = body.data;

    const allModalities = await db.select().from(modalities).where(eq(modalities.isActive, true));

    const modalityIds = allModalities.map((m) => m.id);
    const providerAvailability = await queryProviderAvailability(zipCode ?? null, radius ?? 25, modalityIds);

    const generated = runPlanEngine(allModalities, {
      budget,
      goals,
      conditions,
      conditionWeights,
      preferences,
      exclusions,
      telehealth,
      zipCode: zipCode ?? null,
      radius: radius ?? 25,
    }, providerAvailability);

    const mapItem = (item: (typeof generated.items)[number]) => ({
      modalityId: item.modality.id,
      name: item.modality.name,
      emoji: item.modality.emoji,
      estimatedMonthlyCost: item.estimatedMonthlyCost,
      frequency: item.frequency,
      rationale: item.rationale,
      hsaEligible: item.modality.hsaEligible,
      nearbyProviderCount: item.nearbyProviderCount ?? null,
      isDeprioritized: item.isDeprioritized,
      score: item.score,
    });

    const includedItems = generated.items.filter((item) => !item.isDeprioritized);
    const deprioritizedItems = generated.items.filter((item) => item.isDeprioritized);

    // `items` = top 5 included items (backward-compatible preview for PlanSpeculator)
    // `allItems` = all items with deprioritization flag (used by onboarding preview)
    res.json({
      items: includedItems.slice(0, 5).map(mapItem),
      allItems: generated.items.map(mapItem),
      deprioritized: deprioritizedItems.map(mapItem),
      totalMonthlyCost: generated.totalMonthlyCost,
      budgetUtilization: generated.budgetUtilization,
      budget,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/plans/generate", async (req, res) => {
  try {
    const body = GeneratePlanBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const { intakeId, profileId, budget, goals, conditions, preferences, exclusions, telehealth, zipCode, radius } = body.data;

    // Load all active modalities from DB
    const allModalities = await db.select().from(modalities).where(eq(modalities.isActive, true));

    // Run provider availability check
    const modalityIds = allModalities.map((m) => m.id);
    const providerAvailability = await queryProviderAvailability(zipCode ?? null, radius ?? 25, modalityIds);

    // Run the plan engine with provider availability
    const generated = runPlanEngine(allModalities, {
      budget,
      goals: goals ?? [],
      conditions: conditions ?? [],
      preferences: preferences ?? [],
      exclusions: exclusions ?? [],
      telehealth: telehealth ?? false,
      zipCode: zipCode ?? null,
      radius: radius ?? 25,
    }, providerAvailability);

    const now = new Date();
    const planId = crypto.randomUUID();

    const itemValues = generated.items.map((item, idx) => ({
      id: crypto.randomUUID(),
      planId,
      modalityId: item.modality.id,
      score: item.score,
      frequency: item.frequency,
      estimatedMonthlyCost: item.estimatedMonthlyCost,
      rationale: item.rationale,
      isDeprioritized: item.isDeprioritized,
      sortOrder: idx,
      nearbyProviderCount: item.nearbyProviderCount ?? null,
    }));

    // Wrap plan + items in a transaction so a partial failure leaves no orphan plan rows
    const { plan, savedItems } = await db.transaction(async (tx) => {
      const [plan] = await tx
        .insert(plans)
        .values({
          id: planId,
          profileId: profileId ?? null,
          intakeId: intakeId ?? null,
          status: "generated",
          totalMonthlyCost: generated.totalMonthlyCost,
          budgetUtilization: generated.budgetUtilization,
          budget,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const savedItems = itemValues.length > 0
        ? await tx.insert(planItems).values(itemValues).returning()
        : [];

      return { plan, savedItems };
    });

    // Trigger referral reward if the member was referred and this is their first plan
    if (body.data.profileId) {
      maybeRewardReferrer(body.data.profileId).catch((err) => {
        console.error("[referral] maybeRewardReferrer error:", err);
      });

      // Send plan-ready notification (fire-and-forget)
      const profileId = body.data.profileId;
      const modalityCount = savedItems.length;
      const monthlyBudget = Math.round(generated.totalMonthlyCost);
      ;(async () => {
        try {
          const [profile] = await db
            .select({ email: profiles.email, displayName: profiles.displayName })
            .from(profiles)
            .where(eq(profiles.id, profileId))
            .limit(1);
          if (profile?.email) {
            const planUrl = process.env.BASE_URL
              ? `${process.env.BASE_URL}/plan`
              : "/plan";
            const { subject, html } = planReadyEmail({
              displayName: profile.displayName,
              planUrl,
              modalityCount,
              monthlyBudget,
            });
            await sendNotification({
              profileId,
              email: profile.email,
              type: "plan-ready",
              subject,
              html,
              smsBody: `Health Plan Factory: Your personalized wellness plan with ${modalityCount} modalities is ready! Visit the app to view it.`,
            });
          }
        } catch (err) {
          console.error("[comms] plan-ready notification error:", err);
        }
      })();
    }

    res.status(201).json(GetPlanResponse.parse({ plan, items: savedItems }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/plans/shared/:shareToken
 * Public route — returns anonymized plan data for share card rendering.
 * No auth required. Never returns personal information.
 * NOTE: registered before /:id to avoid capture by the generic route.
 */
router.get("/plans/shared/:shareToken", async (req, res) => {
  const { shareToken } = req.params;

  try {
    const [plan] = await db
      .select({
        id: plans.id,
        shareToken: plans.shareToken,
        shareGoal: plans.shareGoal,
        shareModalities: plans.shareModalities,
        budget: plans.budget,
        totalMonthlyCost: plans.totalMonthlyCost,
        budgetUtilization: plans.budgetUtilization,
        createdAt: plans.createdAt,
      })
      .from(plans)
      .where(eq(plans.shareToken, shareToken))
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "Shared plan not found" });
      return;
    }

    res.json({
      shareToken: plan.shareToken,
      shareGoal: plan.shareGoal,
      shareModalities: plan.shareModalities ?? [],
      budget: plan.budget,
      totalMonthlyCost: plan.totalMonthlyCost,
      budgetUtilization: plan.budgetUtilization,
      createdAt: plan.createdAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/plans/:profileId/latest", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const caller = req.user!;
  if (caller.role !== "admin" && caller.id !== req.params.profileId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { profileId } = req.params;
    const [latest] = await db
      .select()
      .from(plans)
      .where(eq(plans.profileId, profileId))
      .orderBy(desc(plans.createdAt))
      .limit(1);
    if (!latest) {
      res.status(404).json({ error: "No plan found" });
      return;
    }
    const rawItems = await db
      .select()
      .from(planItems)
      .where(eq(planItems.planId, latest.id));

    const modalityIds = rawItems.map((i) => i.modalityId).filter(Boolean) as string[];
    const modalityRows = modalityIds.length > 0
      ? await db.select({ id: modalities.id, name: modalities.name, emoji: modalities.emoji, category: modalities.category }).from(modalities).where(inArray(modalities.id, modalityIds))
      : [];
    const modalityMap = Object.fromEntries(modalityRows.map((m) => [m.id, m]));

    const items = rawItems.map((i) => ({
      ...i,
      modality: i.modalityId ? modalityMap[i.modalityId] ?? null : null,
    }));
    res.json({ plan: latest, items });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/plans/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const params = GetPlanParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
      return;
    }
    const [plan] = await db.select().from(plans).where(eq(plans.id, params.data.id));
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    // Ownership check — only the plan owner or an admin can read it
    if (plan.profileId && plan.profileId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const items = await db.select().from(planItems).where(eq(planItems.planId, params.data.id));

    res.json(GetPlanResponse.parse({ plan, items }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.patch("/plans/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const params = UpdatePlanParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
      return;
    }
    const body = UpdatePlanBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    // Fetch first to verify ownership
    const [existing] = await db.select({ profileId: plans.profileId }).from(plans).where(eq(plans.id, params.data.id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    if (existing.profileId && existing.profileId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (body.data.status) updates.status = body.data.status;

    const [updated] = await db
      .update(plans)
      .set(updates)
      .where(eq(plans.id, params.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    res.json(UpdatePlanResponse.parse(updated));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * PATCH /api/plans/:id/outcome
 * Records the member's self-reported outcome for this plan.
 * Requires Plus or Employer subscription.
 */
const OutcomeBody = z.object({
  outcomeStatus: z.enum(["achieved", "partially_achieved", "not_achieved"]),
  outcomeLabel: z.string().max(100).optional(),
  outcomeNote: z.string().max(500).optional(),
});

router.patch("/plans/:id/outcome", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const planId = req.params.id;
  const body = OutcomeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  try {
    const [plan] = await db.select({ profileId: plans.profileId }).from(plans).where(eq(plans.id, planId)).limit(1);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    if (!plan.profileId || (plan.profileId !== req.user!.id && req.user!.role !== "admin")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Require Plus or Employer subscription
    const [profile] = await db
      .select({ subscriptionStatus: profiles.subscriptionStatus })
      .from(profiles)
      .where(eq(profiles.id, req.user!.id))
      .limit(1);

    const isPlus =
      profile?.subscriptionStatus === "plus" ||
      profile?.subscriptionStatus === "employer";

    if (!isPlus) {
      res.status(403).json({ error: "A Plus subscription is required to record outcomes" });
      return;
    }

    const [updated] = await db
      .update(plans)
      .set({
        outcomeStatus: body.data.outcomeStatus,
        outcomeLabel: body.data.outcomeLabel ?? null,
        outcomeNote: body.data.outcomeNote ?? null,
        outcomeAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(plans.id, planId))
      .returning();

    res.json({ plan: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/plans/:id/modality-feedback
 * Returns all modality feedback rows for the given plan (auth + ownership required).
 * Response: { feedback: { modalityId: string; feedback: "helpful"|"not_helpful" }[] }
 */
router.get("/plans/:id/modality-feedback", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const planId = req.params.id;

  try {
    const [plan] = await db
      .select({ profileId: plans.profileId })
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    if (!plan.profileId || (plan.profileId !== req.user!.id && req.user!.role !== "admin")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const rows = await db
      .select({ modalityId: planModalityFeedback.modalityId, feedback: planModalityFeedback.feedback })
      .from(planModalityFeedback)
      .where(and(eq(planModalityFeedback.planId, planId), eq(planModalityFeedback.profileId, req.user!.id)));

    res.json({ feedback: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/plans/:id/modality-feedback
 * Upserts thumbs-up / thumbs-down feedback for a single modality in a plan.
 * Body: { modalityId: string; feedback: "helpful" | "not_helpful" }
 * Response: { modalityId, feedback }
 */
const ModalityFeedbackBody = z.object({
  modalityId: z.string().min(1),
  feedback: z.enum(["helpful", "not_helpful"]),
});

router.post("/plans/:id/modality-feedback", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const planId = req.params.id;
  const body = ModalityFeedbackBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  try {
    const [plan] = await db
      .select({ profileId: plans.profileId })
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    if (!plan.profileId || (plan.profileId !== req.user!.id && req.user!.role !== "admin")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    const { modalityId, feedback } = body.data;
    const profileId = req.user!.id;

    // Upsert: insert or update on unique (profileId, planId, modalityId)
    await db
      .insert(planModalityFeedback)
      .values({
        id: crypto.randomUUID(),
        profileId,
        planId,
        modalityId,
        feedback,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [planModalityFeedback.profileId, planModalityFeedback.planId, planModalityFeedback.modalityId],
        set: { feedback, updatedAt: new Date() },
      });

    res.json({ modalityId, feedback });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/plans/:id/reconfigure
 * Regenerates the current plan, adding all modalities marked "not_helpful" to the
 * exclusions list. The new plan replaces the current one in the DB.
 * Body: none (reads not_helpful feedback from DB automatically)
 * Response: { plan, items }
 */
router.post("/plans/:id/reconfigure", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const planId = req.params.id;

  try {
    // Load the existing plan + its intake parameters
    const [existingPlan] = await db
      .select()
      .from(plans)
      .where(eq(plans.id, planId))
      .limit(1);

    if (!existingPlan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    if (!existingPlan.profileId || (existingPlan.profileId !== req.user!.id && req.user!.role !== "admin")) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    // Collect not_helpful modality IDs for this plan
    const notHelpfulRows = await db
      .select({ modalityId: planModalityFeedback.modalityId })
      .from(planModalityFeedback)
      .where(
        and(
          eq(planModalityFeedback.planId, planId),
          eq(planModalityFeedback.profileId, req.user!.id),
          eq(planModalityFeedback.feedback, "not_helpful"),
        ),
      );

    if (notHelpfulRows.length === 0) {
      res.status(400).json({ error: "No modalities marked as not helpful" });
      return;
    }

    const notHelpfulIds = notHelpfulRows.map((r) => r.modalityId);

    // Load the intake that generated this plan
    let intakeData = {
      budget: existingPlan.budget,
      goals: [] as string[],
      conditions: [] as string[],
      preferences: [] as string[],
      exclusions: [] as string[],
      zipCode: null as string | null,
      radius: 25,
      telehealth: false,
    };

    if (existingPlan.intakeId) {
      const [intake] = await db
        .select()
        .from(memberIntakes)
        .where(eq(memberIntakes.id, existingPlan.intakeId))
        .limit(1);

      if (intake) {
        intakeData = {
          budget: intake.budget ?? existingPlan.budget,
          goals: (intake.goals as string[]) ?? [],
          conditions: (intake.conditions as string[]) ?? [],
          preferences: (intake.preferences as string[]) ?? [],
          exclusions: (intake.exclusions as string[]) ?? [],
          zipCode: intake.zipCode ?? null,
          radius: intake.radius ?? 25,
          telehealth: (intake.telehealth as boolean) ?? false,
        };
      }
    }

    // Add not_helpful modalities to exclusions (deduplicate)
    const mergedExclusions = Array.from(new Set([...intakeData.exclusions, ...notHelpfulIds]));

    // Run the plan engine with the merged exclusions
    const allModalities = await db.select().from(modalities).where(eq(modalities.isActive, true));
    const modalityIds = allModalities.map((m) => m.id);
    const providerAvailability = await queryProviderAvailability(intakeData.zipCode, intakeData.radius, modalityIds);

    const generated = runPlanEngine(allModalities, {
      budget: intakeData.budget,
      goals: intakeData.goals,
      conditions: intakeData.conditions,
      preferences: intakeData.preferences,
      exclusions: mergedExclusions,
      telehealth: intakeData.telehealth,
      zipCode: intakeData.zipCode,
      radius: intakeData.radius,
    }, providerAvailability);

    const now = new Date();
    const newPlanId = crypto.randomUUID();

    const itemValues = generated.items.map((item, idx) => ({
      id: crypto.randomUUID(),
      planId: newPlanId,
      modalityId: item.modality.id,
      score: item.score,
      frequency: item.frequency,
      estimatedMonthlyCost: item.estimatedMonthlyCost,
      rationale: item.rationale,
      isDeprioritized: item.isDeprioritized,
      sortOrder: idx,
      nearbyProviderCount: item.nearbyProviderCount ?? null,
    }));

    // Save new plan + items in a transaction
    const { plan: newPlan, savedItems } = await db.transaction(async (tx) => {
      const [newPlan] = await tx
        .insert(plans)
        .values({
          id: newPlanId,
          profileId: existingPlan.profileId,
          intakeId: existingPlan.intakeId,
          status: "generated",
          totalMonthlyCost: generated.totalMonthlyCost,
          budgetUtilization: generated.budgetUtilization,
          budget: intakeData.budget,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      const savedItems = itemValues.length > 0
        ? await tx.insert(planItems).values(itemValues).returning()
        : [];

      return { plan: newPlan, savedItems };
    });

    res.json({ plan: newPlan, items: savedItems });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/plans/:id/share
 * Generates (or returns existing) a share token for the plan.
 * Embeds the member's referral code in the returned share URL.
 * The plan must belong to the authenticated user.
 * Body: { goal?: string } — optional primary goal label (e.g. "reduce stress")
 */
router.post("/plans/:id/share", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const planId = req.params.id;

  try {
    const [plan] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    if (plan.profileId && plan.profileId !== req.user!.id && req.user!.role !== "admin") {
      res.status(403).json({ error: "Forbidden" });
      return;
    }

    let shareToken = plan.shareToken;

    if (!shareToken) {
      shareToken = randomBytes(12).toString("base64url");

      // Collect top-3 non-deprioritized modality names for the card
      const items = await db
        .select({ modalityId: planItems.modalityId, isDeprioritized: planItems.isDeprioritized, sortOrder: planItems.sortOrder })
        .from(planItems)
        .where(eq(planItems.planId, planId));

      const activeItems = items
        .filter((i) => !i.isDeprioritized)
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .slice(0, 3);

      const modalityIds = activeItems.map((i) => i.modalityId).filter(Boolean) as string[];
      const modalityRows = modalityIds.length > 0
        ? await db.select({ id: modalities.id, name: modalities.name, emoji: modalities.emoji })
            .from(modalities).where(inArray(modalities.id, modalityIds))
        : [];
      const modalityMap = Object.fromEntries(modalityRows.map((m) => [m.id, m]));
      const shareModalities = activeItems.map((i) => ({
        name: modalityMap[i.modalityId ?? ""]?.name ?? "",
        emoji: modalityMap[i.modalityId ?? ""]?.emoji ?? "✨",
      })).filter((m) => m.name);

      // Parse optional goal from request body
      const body = z.object({ goal: z.string().optional() }).safeParse(req.body);
      const shareGoal = body.success && body.data.goal ? body.data.goal : null;

      await db.update(plans).set({
        shareToken,
        shareGoal,
        shareModalities,
        updatedAt: new Date(),
      }).where(eq(plans.id, planId));
    }

    // Get referral code for attribution
    const [profile] = await db
      .select({ referralCode: profiles.referralCode })
      .from(profiles)
      .where(eq(profiles.id, req.user!.id))
      .limit(1);

    const ref = profile?.referralCode ?? null;
    const shareUrl = ref
      ? `${BASE_URL}/plan/shared/${shareToken}?ref=${encodeURIComponent(ref)}`
      : `${BASE_URL}/plan/shared/${shareToken}`;

    res.json({ shareToken, shareUrl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// ── PDF Export ─────────────────────────────────────────────────────────────────

const PlanItemPdfSchema = z.object({
  modalityId: z.string(),
  name: z.string(),
  emoji: z.string().default("✨"),
  description: z.string().optional().default(""),
  evidenceLevel: z.string().default("Emerging"),
  hsaEligible: z.boolean().optional().default(false),
  category: z.string().optional().default(""),
  frequency: z.string(),
  estimatedMonthlyCost: z.number(),
  rationale: z.string(),
  nearbyProviderCount: z.number().nullable().optional(),
});

const PlanPdfBody = z.object({
  planId: z.string().optional(), // if provided + authenticated, server loads plan from DB
  plan: z.object({
    included: z.array(PlanItemPdfSchema),
    totalMonthlyCost: z.number(),
    budgetUtilization: z.number(),
  }),
  intake: z.object({
    budget: z.number(),
    goals: z.array(z.string()).optional().default([]),
    zipCode: z.string().optional().default(""),
  }),
});

const NAVY  = "#1a2a3a";
const PINK  = "#D4227E";
const GRAY  = "#6b8499";
const RULE  = "#e2e8f0";
const WHITE = "#ffffff";
const LIGHT = "#f8f9fb";
const MID   = "#2a5070";

function evidenceColor(level: string): string {
  if (level === "Strong")   return "#4a7c3f";
  if (level === "Moderate") return "#b45309";
  return PINK;
}

/**
 * POST /api/plans/pdf
 * Accepts plan + intake data in the request body and returns a branded PDF.
 * When authenticated and planId is provided, loads authoritative plan data from DB.
 * Falls back to client-provided payload for anonymous users or missing planId.
 */
router.post("/plans/pdf", async (req, res) => {
  const parsed = PlanPdfBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid plan data", details: parsed.error.flatten() });
    return;
  }

  let { plan, intake } = parsed.data;
  const { planId } = parsed.data;

  // Server-side authoritative load when authenticated user provides a planId
  if (planId && req.isAuthenticated()) {
    const caller = req.user!;
    const [dbPlan] = await db.select().from(plans).where(eq(plans.id, planId)).limit(1);
    if (!dbPlan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }
    // Enforce ownership (admins may bypass)
    if (dbPlan.profileId && dbPlan.profileId !== caller.id && caller.role !== "admin") {
      res.status(403).json({ error: "Not authorised" });
      return;
    }

    // Load included plan items joined with modality data
    const dbItems = await db
      .select({
        modalityId: planItems.modalityId,
        frequency: planItems.frequency,
        estimatedMonthlyCost: planItems.estimatedMonthlyCost,
        rationale: planItems.rationale,
        nearbyProviderCount: planItems.nearbyProviderCount,
        sortOrder: planItems.sortOrder,
        name: modalities.name,
        emoji: modalities.emoji,
        description: modalities.description,
        evidenceLevel: modalities.evidenceLevel,
        hsaEligible: modalities.hsaEligible,
        category: modalities.category,
      })
      .from(planItems)
      .innerJoin(modalities, eq(planItems.modalityId, modalities.id))
      .where(eq(planItems.planId, planId))
      .orderBy(planItems.sortOrder);

    // Load intake for goals/zip
    let dbIntake: { budget: number; goals: string[]; zipCode: string } | null = null;
    if (dbPlan.intakeId) {
      const [raw] = await db
        .select({ budget: memberIntakes.budget, goals: memberIntakes.goals, zipCode: memberIntakes.zipCode })
        .from(memberIntakes)
        .where(eq(memberIntakes.id, dbPlan.intakeId))
        .limit(1);
      if (raw) {
        dbIntake = {
          budget: raw.budget,
          goals: Array.isArray(raw.goals) ? (raw.goals as string[]) : [],
          zipCode: raw.zipCode ?? "",
        };
      }
    }

    // Override with server data
    plan = {
      included: dbItems.map((it) => ({
        modalityId: it.modalityId,
        name: it.name,
        emoji: it.emoji,
        description: it.description ?? "",
        evidenceLevel: it.evidenceLevel,
        hsaEligible: it.hsaEligible,
        category: it.category,
        frequency: it.frequency,
        estimatedMonthlyCost: it.estimatedMonthlyCost,
        rationale: it.rationale,
        nearbyProviderCount: it.nearbyProviderCount ?? null,
      })),
      totalMonthlyCost: dbPlan.totalMonthlyCost,
      budgetUtilization: dbPlan.budgetUtilization,
    };
    if (dbIntake) intake = dbIntake;
  }
  const primaryGoal = intake.goals?.[0] ?? "Optimal Wellness";
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const fileName = `health-plan-${new Date().toISOString().slice(0, 10)}.pdf`;

  const PAGE_W = 612;
  const PAGE_H = 792;
  const M      = 54;
  const CW     = PAGE_W - M * 2;

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: M, bottom: M + 20, left: M, right: M },
    autoFirstPage: false,
    bufferPages: true,
  });

  doc.pipe(res);

  // ── COVER PAGE ────────────────────────────────────────────────────────────
  doc.addPage({ margins: { top: 0, bottom: 0, left: 0, right: 0 } });

  doc.rect(0, 0, PAGE_W, PAGE_H).fill(NAVY);
  doc.rect(0, 0, PAGE_W, 5).fill(PINK);
  doc.rect(0, PAGE_H - 5, PAGE_W, 5).fill(PINK);

  // "Health Plan Factory" wordmark pill
  const pillW = 200; const pillH = 26; const pillX = (PAGE_W - pillW) / 2; const pillY = 155;
  doc.roundedRect(pillX, pillY, pillW, pillH, 13).fill(PINK);
  doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8.5).text(
    "HEALTH PLAN FACTORY",
    pillX, pillY + 9, { width: pillW, align: "center" },
  );

  // Title
  doc.fillColor(WHITE).font("Times-Roman").fontSize(46)
     .text("Wellness", 0, 210, { width: PAGE_W, align: "center" });
  doc.fillColor(PINK).font("Times-Bold").fontSize(46)
     .text("Plan", 0, 262, { width: PAGE_W, align: "center" });

  // Subtitle
  doc.fillColor("#8fa3b8").font("Helvetica").fontSize(12)
     .text(`Goal: ${primaryGoal}`, 0, 330, { width: PAGE_W, align: "center" });

  // Divider
  const dX = (PAGE_W - 60) / 2;
  doc.moveTo(dX, 362).lineTo(dX + 60, 362).strokeColor(PINK).lineWidth(2.5).stroke();

  // Meta
  doc.fillColor("#5a7a9a").font("Helvetica").fontSize(10)
     .text(`Generated: ${today}`, 0, 378, { width: PAGE_W, align: "center" });
  doc.fillColor("#5a7a9a").font("Helvetica").fontSize(10)
     .text(`Target Budget: $${intake.budget}/month`, 0, 396, { width: PAGE_W, align: "center" });
  doc.fillColor("#5a7a9a").font("Helvetica").fontSize(10)
     .text(`${plan.included.length} Recommended Modalities`, 0, 414, { width: PAGE_W, align: "center" });

  // Disclaimer
  doc.fillColor("#3a5a7a").font("Helvetica").fontSize(7.5)
     .text(
       "This plan is for informational purposes only and does not constitute medical advice.\nConsult a qualified healthcare provider before starting any new wellness programme.",
       M, PAGE_H - 75, { width: CW, align: "center", lineGap: 2 },
     );

  // ── BODY PAGES ────────────────────────────────────────────────────────────
  doc.addPage();
  let y = M;

  function needsNewPage(needed: number) {
    if (y + needed > PAGE_H - M - 20) {
      doc.addPage();
      y = M;
    }
  }

  function sectionTitle(title: string) {
    needsNewPage(40);
    doc.fillColor(NAVY).font("Times-Bold").fontSize(16).text(title, M, y, { width: CW });
    y = doc.y + 4;
    doc.moveTo(M, y).lineTo(M + CW, y).strokeColor(PINK).lineWidth(1.5).stroke();
    y += 12;
  }

  function bodyText(text: string, opts: { indent?: number; color?: string; size?: number; font?: string } = {}) {
    const { indent = 0, color = NAVY, size = 10, font = "Times-Roman" } = opts;
    needsNewPage(30);
    doc.fillColor(color).font(font).fontSize(size).text(text, M + indent, y, { width: CW - indent, lineGap: 2 });
    y = doc.y + 5;
  }

  // ── Budget Overview ───────────────────────────────────────────────────────
  sectionTitle("Budget Overview");

  const utilPct = Math.min(plan.budgetUtilization, 100);
  const barH    = 14;
  const barMaxW = CW;

  doc.rect(M, y, barMaxW, barH).fill("#f1f5f9");
  doc.rect(M, y, Math.round(barMaxW * utilPct / 100), barH).fill(PINK);
  y += barH + 6;

  doc.fillColor(GRAY).font("Helvetica").fontSize(9)
     .text(`$${plan.totalMonthlyCost.toFixed(0)}/mo estimated  ·  $${intake.budget}/mo budget  ·  ${utilPct.toFixed(0)}% utilisation`, M, y, { width: CW });
  y = doc.y + 16;

  // ── Plan Summary Table ─────────────────────────────────────────────────────
  sectionTitle("Plan Summary");

  const cols = [200, 90, 80, 70, CW - 440];
  const headers = ["Modality", "Evidence", "Est. Cost", "Frequency", "HSA"];
  const rowH = 22;
  const headerH = 24;

  needsNewPage(headerH + plan.included.length * rowH + 20);

  // Header row
  doc.rect(M, y, CW, headerH).fill(NAVY);
  let cx = M;
  for (let i = 0; i < headers.length; i++) {
    doc.fillColor(WHITE).font("Helvetica-Bold").fontSize(8.5)
       .text(headers[i], cx + 6, y + 8, { width: cols[i] - 8, lineBreak: false });
    cx += cols[i];
  }
  y += headerH;

  // Data rows
  for (let r = 0; r < plan.included.length; r++) {
    const item = plan.included[r];
    const rowBg = r % 2 === 1 ? LIGHT : WHITE;
    doc.rect(M, y, CW, rowH).fill(rowBg);
    doc.moveTo(M, y).lineTo(M + CW, y).strokeColor(RULE).lineWidth(0.5).stroke();

    cx = M;
    const cells = [
      `${item.emoji}  ${item.name}`,
      item.evidenceLevel,
      `$${item.estimatedMonthlyCost}/mo`,
      item.frequency,
      item.hsaEligible ? "✓ Yes" : "—",
    ];

    for (let c = 0; c < cells.length; c++) {
      const isBold = c === 0;
      const cellColor = c === 4 && item.hsaEligible ? "#2a7a40" : c === 1 ? evidenceColor(item.evidenceLevel) : NAVY;
      doc.fillColor(cellColor).font(isBold ? "Helvetica-Bold" : "Helvetica").fontSize(9)
         .text(cells[c], cx + 6, y + 7, { width: cols[c] - 8, lineBreak: false });
      cx += cols[c];
    }
    y += rowH;
  }

  // Bottom border
  doc.moveTo(M, y).lineTo(M + CW, y).strokeColor(RULE).lineWidth(0.75).stroke();
  y += 20;

  // ── Per-Modality Detail Sections ──────────────────────────────────────────
  sectionTitle("Modality Detail");

  for (const item of plan.included) {
    needsNewPage(100);

    // Modality header row
    const mHeaderH = 32;
    doc.rect(M, y, CW, mHeaderH).fill(`${NAVY}11`);
    doc.fillColor(PINK).font("Helvetica-Bold").fontSize(11)
       .text(`${item.emoji}  ${item.name}`, M + 10, y + 8, { width: CW / 2, lineBreak: false });

    // Right side: evidence badge + cost
    const evColor = evidenceColor(item.evidenceLevel);
    doc.fillColor(evColor).font("Helvetica-Bold").fontSize(8.5)
       .text(`${item.evidenceLevel} Evidence`, M + CW / 2, y + 5, { width: CW / 2 - 10, align: "right", lineBreak: false });
    doc.fillColor(GRAY).font("Helvetica").fontSize(8)
       .text(`$${item.estimatedMonthlyCost}/mo  ·  ${item.frequency}`, M + CW / 2, y + 18, { width: CW / 2 - 10, align: "right", lineBreak: false });

    y += mHeaderH + 6;

    // Rationale
    doc.fillColor(GRAY).font("Helvetica-Bold").fontSize(7.5).text("WHY IT'S IN YOUR PLAN", M, y, { width: CW });
    y = doc.y + 3;
    doc.fillColor(MID).font("Times-Roman").fontSize(10).text(item.rationale, M, y, { width: CW, lineGap: 2 });
    y = doc.y + 6;

    // Description (if available)
    if (item.description) {
      doc.fillColor(GRAY).font("Times-Roman").fontSize(9.5).text(item.description, M, y, { width: CW, lineGap: 2 });
      y = doc.y + 6;
    }

    // HSA callout
    if (item.hsaEligible) {
      const callH = 26;
      needsNewPage(callH + 10);
      doc.rect(M, y, 3, callH).fill(PINK);
      doc.rect(M + 3, y, CW - 3, callH).fill(`${PINK}08`);
      doc.fillColor(PINK).font("Helvetica-Bold").fontSize(8.5)
         .text("HSA/FSA Eligible", M + 12, y + 5, { lineBreak: false });
      doc.fillColor(MID).font("Helvetica").fontSize(8.5)
         .text("A Letter of Medical Necessity from a DPC physician may unlock reimbursement for this service.", M + 12, y + 16, { width: CW - 20, lineBreak: false });
      y += callH + 10;
    }

    y += 10;
    doc.moveTo(M, y).lineTo(M + CW, y).strokeColor(RULE).lineWidth(0.5).stroke();
    y += 14;
  }

  // ── HSA/FSA Section ─────────────────────────────────────────────────────────
  const hsaItems = plan.included.filter((i) => i.hsaEligible);
  if (hsaItems.length > 0) {
    sectionTitle("HSA/FSA Optimisation");

    const annualSavings = hsaItems.reduce((s, i) => s + i.estimatedMonthlyCost * 12, 0);
    bodyText(
      `${hsaItems.length} modality${hsaItems.length !== 1 ? "ies" : "y"} in your plan may be reimbursable through an HSA or FSA account with a Letter of Medical Necessity (LMN). ` +
      `Estimated potential annual savings: $${annualSavings.toFixed(0)}.`,
      { color: MID, size: 10 }
    );
    bodyText(
      "Visit healthplanfactory.com/hsa-unlock to request an auto-drafted LMN from a Direct Primary Care physician.",
      { color: PINK, font: "Helvetica-Bold", size: 9 }
    );

    y += 6;
  }

  // ── Disclaimer ─────────────────────────────────────────────────────────────
  needsNewPage(80);
  doc.moveTo(M, y).lineTo(M + CW, y).strokeColor(RULE).lineWidth(0.75).stroke();
  y += 12;
  doc.fillColor(GRAY).font("Helvetica").fontSize(8)
     .text(
       "This document is generated by Health Plan Factory for informational purposes only. It does not constitute medical advice, a diagnosis, or a treatment recommendation. " +
       "Always consult a qualified healthcare provider before beginning any new wellness programme. " +
       "Cost estimates are averages and may vary by location and provider.",
       M, y, { width: CW, lineGap: 2 }
     );
  y = doc.y + 6;
  doc.fillColor(GRAY).font("Helvetica").fontSize(8)
     .text(`healthplanfactory.com  ·  Generated ${today}`, M, y, { width: CW, align: "right" });

  // ── Page numbers ──────────────────────────────────────────────────────────
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    if (i === 0) continue; // skip cover
    const pageNum = i;
    doc.moveTo(M, PAGE_H - M + 4).lineTo(M + CW, PAGE_H - M + 4).strokeColor(RULE).lineWidth(0.5).stroke();
    doc.fillColor(GRAY).font("Helvetica").fontSize(7.5)
       .text("Health Plan Factory — Confidential", M, PAGE_H - M + 9, { width: CW / 2 });
    doc.fillColor(GRAY).font("Helvetica").fontSize(7.5)
       .text(String(pageNum), M + CW / 2, PAGE_H - M + 9, { width: CW / 2, align: "right" });
  }

  doc.end();
});

export default router;
