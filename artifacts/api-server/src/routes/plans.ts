import { Router, type IRouter } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { plans, planItems, memberIntakes, modalities, profiles } from "@workspace/db";
import { eq, desc, inArray } from "drizzle-orm";
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

    // Persist the plan
    const [plan] = await db
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

    // Persist plan items
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

    const savedItems = itemValues.length > 0
      ? await db.insert(planItems).values(itemValues).returning()
      : [];

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

    const items = await db.select().from(planItems).where(eq(planItems.planId, params.data.id));

    res.json(GetPlanResponse.parse({ plan, items }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.patch("/plans/:id", async (req, res) => {
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

export default router;
