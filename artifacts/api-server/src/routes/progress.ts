import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { planProgressLogs, employerMembers, modalities, employerModalityRules } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import {
  CreateProgressLogBody,
  ListProgressQueryParams,
  ListProgressResponse,
  ListProgressResponseItem,
} from "@workspace/api-zod";

const router = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

function canAccessProfile(req: Request, res: Response, profileId: string): boolean {
  if (req.user!.role === "admin") return true;
  if (req.user!.id === profileId) return true;
  res.status(403).json({ error: "Forbidden" });
  return false;
}

router.get("/progress", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const query = ListProgressQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }

    const { profileId, planId, limit = 50 } = query.data;

    if (!canAccessProfile(req, res, profileId)) return;

    let rows = planId
      ? await db
          .select()
          .from(planProgressLogs)
          .where(and(eq(planProgressLogs.profileId, profileId), eq(planProgressLogs.planId, planId)))
          .orderBy(desc(planProgressLogs.createdAt))
      : await db
          .select()
          .from(planProgressLogs)
          .where(eq(planProgressLogs.profileId, profileId))
          .orderBy(desc(planProgressLogs.createdAt));

    rows = rows.slice(0, limit);
    res.json(ListProgressResponse.parse(rows));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/progress", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const body = CreateProgressLogBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    if (!canAccessProfile(req, res, body.data.profileId)) return;

    const [created] = await db
      .insert(planProgressLogs)
      .values({
        id: crypto.randomUUID(),
        profileId: body.data.profileId,
        planId: body.data.planId ?? null,
        modalityId: body.data.modalityId ?? null,
        note: body.data.note ?? null,
        rating: body.data.rating ?? null,
        mood: body.data.mood ?? null,
        pain: body.data.pain ?? null,
        energy: body.data.energy ?? null,
        sessionDate: body.data.sessionDate ? new Date(body.data.sessionDate) : null,
        createdAt: new Date(),
      })
      .returning();

    // ── Employer stipend deduction ───────────────────────────────────────────
    // If the member is enrolled in an employer wellness stipend, deduct the
    // session cost (modality average cost) from their monthly employer budget.
    // Employer-funded balance is consumed first; any overrun is the member's own.
    if (body.data.modalityId) {
      try {
        const [mod] = await db
          .select({ costLow: modalities.costLow, costHigh: modalities.costHigh })
          .from(modalities)
          .where(eq(modalities.id, body.data.modalityId))
          .limit(1);

        if (mod) {
          const sessionCostCents = Math.round(((mod.costLow + mod.costHigh) / 2) * 100);
          const currentMonth = new Date().toISOString().slice(0, 7);

          const [link] = await db
            .select({
              id: employerMembers.id,
              employerId: employerMembers.employerId,
              monthlyBudget: employerMembers.monthlyBudget,
              spentThisMonth: employerMembers.spentThisMonth,
              budgetMonth: employerMembers.budgetMonth,
            })
            .from(employerMembers)
            .where(eq(employerMembers.profileId, body.data.profileId))
            .limit(1);

          if (link) {
            // ── Check employer coverage rules for this modality ───────────────
            // If the employer has explicitly set covered=false for this modality,
            // skip the deduction — the session cost is the member's own expense.
            const [rule] = await db
              .select({ covered: employerModalityRules.covered })
              .from(employerModalityRules)
              .where(
                and(
                  eq(employerModalityRules.employerId, link.employerId),
                  eq(employerModalityRules.modalityId, body.data.modalityId!)
                )
              )
              .limit(1);

            const isCovered = rule ? rule.covered : true; // default: covered

            if (isCovered) {
              // Reset spent counter if it's a new budget month
              const effectiveSpent =
                link.budgetMonth === currentMonth ? link.spentThisMonth : 0;
              const remaining = Math.max(0, link.monthlyBudget - effectiveSpent);
              const deduction = Math.min(sessionCostCents, remaining);

              if (deduction > 0) {
                await db
                  .update(employerMembers)
                  .set({
                    spentThisMonth: effectiveSpent + deduction,
                    budgetMonth: currentMonth,
                  })
                  .where(eq(employerMembers.id, link.id));
              }
            }
            // If !isCovered: modality explicitly excluded — no employer stipend deducted
          }
        }
      } catch (deductErr) {
        // Non-fatal — log but don't fail the progress log creation
        console.error("Employer stipend deduction error:", deductErr);
      }
    }

    res.status(201).json(ListProgressResponseItem.parse(created));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
