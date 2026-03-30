import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { plans, planItems, memberIntakes, modalities } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  GeneratePlanBody,
  GetPlanResponse,
  UpdatePlanBody,
  UpdatePlanResponse,
} from "@workspace/api-zod";
import { runPlanEngine } from "../lib/serverPlanEngine";

const router: IRouter = Router();

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

    res.status(201).json(GetPlanResponse.parse({ plan, items: savedItems }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/plans/:id", async (req, res) => {
  try {
    const [plan] = await db.select().from(plans).where(eq(plans.id, req.params.id));
    if (!plan) {
      res.status(404).json({ error: "Plan not found" });
      return;
    }

    const items = await db.select().from(planItems).where(eq(planItems.planId, req.params.id));

    res.json(GetPlanResponse.parse({ plan, items }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.patch("/plans/:id", async (req, res) => {
  try {
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
      .where(eq(plans.id, req.params.id))
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
