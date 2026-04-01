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
import { sendNotification } from "../lib/comms";
import { planReadyEmail } from "../emails/plan-ready";

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
});

router.post("/plans/speculate", async (req, res) => {
  try {
    const body = SpeculateBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const { budget, conditions, conditionWeights, goals } = body.data;

    const allModalities = await db.select().from(modalities).where(eq(modalities.isActive, true));

    const generated = runPlanEngine(allModalities, {
      budget,
      goals,
      conditions,
      conditionWeights,
      preferences: [],
      exclusions: [],
      telehealth: false,
      zipCode: null,
      radius: 25,
    });

    const preview = generated.items.filter((item) => !item.isDeprioritized).slice(0, 5).map((item) => ({
      name: item.modality.name,
      emoji: item.modality.emoji,
      estimatedMonthlyCost: item.estimatedMonthlyCost,
      frequency: item.frequency,
      rationale: item.rationale,
      hsaEligible: item.modality.hsaEligible,
    }));

    res.json({
      items: preview,
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

    // Run the plan engine
    const generated = runPlanEngine(allModalities, {
      budget,
      goals: goals ?? [],
      conditions: conditions ?? [],
      preferences: preferences ?? [],
      exclusions: exclusions ?? [],
      telehealth: telehealth ?? false,
      zipCode: zipCode ?? null,
      radius: radius ?? 25,
    });

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
      ? await db.select({ id: modalities.id, name: modalities.name, emoji: modalities.emoji }).from(modalities).where(inArray(modalities.id, modalityIds))
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

export default router;
