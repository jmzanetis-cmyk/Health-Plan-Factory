import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { modalities, employerMembers, employerModalityRules, planProgressLogs } from "@workspace/db";
import type { Modality } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
  ListModalitiesQueryParams,
  ListModalitiesResponse,
  ListModalitiesResponseItem,
  CreateModalityBody,
} from "@workspace/api-zod";

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

const RecordSessionBody = z.object({
  profileId: z.string().uuid(),
  sessionCostCents: z.number().int().min(1),
  note: z.string().optional(),
  sessionDate: z.string().optional(),
});

const router = Router();

router.get("/modalities", async (req, res) => {
  try {
    const query = ListModalitiesQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }

    const rows = await db.select().from(modalities);

    const filtered = rows.filter((m) => {
      if (query.data.category && m.category !== query.data.category) return false;
      if (query.data.isActive !== undefined && m.isActive !== query.data.isActive) return false;
      return true;
    });

    res.json(ListModalitiesResponse.parse(filtered));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/modalities", async (req, res) => {
  try {
    const body = CreateModalityBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const now = new Date();
    const [created] = await db
      .insert(modalities)
      .values({
        ...body.data,
        emoji: body.data.emoji ?? "✨",
        hsaEligible: body.data.hsaEligible ?? false,
        goals: body.data.goals ?? [],
        conditions: body.data.conditions ?? [],
        preferenceMatch: body.data.preferenceMatch ?? [],
        exclusionIds: body.data.exclusionIds ?? [],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as Modality)
      .returning();

    res.status(201).json(ListModalitiesResponseItem.parse(created));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// ── Record Modality Session (explicit spend trigger for employer stipend) ──────
// This is the dedicated endpoint for recording a modality session alongside
// an explicit session cost. Stipend deduction and progress log creation run in
// a single transaction — so financial state is always consistent.
router.post("/modalities/:id/sessions", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const body = RecordSessionBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const modalityId = String(req.params.id);
    const { profileId, sessionCostCents, note, sessionDate } = body.data;
    const currentMonth = new Date().toISOString().slice(0, 7);

    const [log] = await db.transaction(async (tx) => {
      let employerCovered = 0;
      let outOfPocket = sessionCostCents;

      // Look up employer membership and modality coverage rule
      const [link] = await tx
        .select({
          id: employerMembers.id,
          employerId: employerMembers.employerId,
          monthlyBudget: employerMembers.monthlyBudget,
          spentThisMonth: employerMembers.spentThisMonth,
          budgetMonth: employerMembers.budgetMonth,
        })
        .from(employerMembers)
        .where(eq(employerMembers.profileId, profileId))
        .limit(1);

      if (link) {
        const [rule] = await tx
          .select({ covered: employerModalityRules.covered })
          .from(employerModalityRules)
          .where(
            and(
              eq(employerModalityRules.employerId, link.employerId),
              eq(employerModalityRules.modalityId, modalityId)
            )
          )
          .limit(1);

        const isCovered = rule ? rule.covered : true;

        if (isCovered) {
          const effectiveSpent = link.budgetMonth === currentMonth ? link.spentThisMonth : 0;
          const remaining = Math.max(0, link.monthlyBudget - effectiveSpent);
          employerCovered = Math.min(sessionCostCents, remaining);
          outOfPocket = sessionCostCents - employerCovered;

          if (employerCovered > 0) {
            await tx
              .update(employerMembers)
              .set({ spentThisMonth: effectiveSpent + employerCovered, budgetMonth: currentMonth })
              .where(eq(employerMembers.id, link.id));
          }
        }
      }

      return tx
        .insert(planProgressLogs)
        .values({
          id: crypto.randomUUID(),
          profileId,
          modalityId,
          note: note ?? null,
          sessionDate: sessionDate ? new Date(sessionDate) : null,
          sessionCostCents,
          employerCoveredCents: employerCovered > 0 ? employerCovered : null,
          outOfPocketCents: outOfPocket > 0 ? outOfPocket : null,
          createdAt: new Date(),
        })
        .returning();
    });

    res.status(201).json({
      id: log.id,
      modalityId: log.modalityId,
      sessionCostCents: log.sessionCostCents,
      employerCoveredCents: log.employerCoveredCents,
      outOfPocketCents: log.outOfPocketCents,
      createdAt: log.createdAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
