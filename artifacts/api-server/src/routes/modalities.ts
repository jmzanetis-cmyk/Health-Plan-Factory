import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { modalities, employerMembers, employerModalityRules, planProgressLogs, lmnRequests, profiles, plans, planItems } from "@workspace/db";
import type { Modality } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import crypto from "crypto";
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
  profileId: z.string().uuid().optional(), // ignored for non-admin callers; admin may specify
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
// Dedicated endpoint for recording a modality session with employer deduction.
// Progress log and balance update run in one transaction.
router.post("/modalities/:id/sessions", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const body = RecordSessionBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const modalityId = String(req.params.id);
    const { sessionCostCents, note, sessionDate } = body.data;

    // Derive profileId from the authenticated user for non-admin callers to
    // prevent cross-user financial mutations (IDOR).
    const profileId = req.user!.role === "admin"
      ? (body.data.profileId ?? req.user!.id)
      : req.user!.id;
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

    // Send response immediately — don't await the LMN auto-draft trigger
    res.status(201).json({
      id: log.id,
      modalityId: log.modalityId,
      sessionCostCents: log.sessionCostCents,
      employerCoveredCents: log.employerCoveredCents,
      outOfPocketCents: log.outOfPocketCents,
      createdAt: log.createdAt,
    });

    // ── Auto-create LMN draft after booking an LMN-eligible (DPC/medical) session ──
    // Fire-and-forget: runs after response is sent to avoid latency impact.
    setImmediate(async () => {
      try {
        const [modalityRow] = await db
          .select({ lmnEligible: modalities.lmnEligible })
          .from(modalities)
          .where(eq(modalities.id, modalityId));

        if (!modalityRow?.lmnEligible) return;

        // Only auto-create if the member has no existing LMN request
        const [existing] = await db
          .select({ id: lmnRequests.id })
          .from(lmnRequests)
          .where(eq(lmnRequests.profileId, profileId))
          .limit(1);

        if (existing) return; // already has a draft

        // Gather member name and most recent plan's LMN-eligible items
        const [profile] = await db
          .select({ displayName: profiles.displayName })
          .from(profiles)
          .where(eq(profiles.id, profileId));

        const [latestPlan] = await db
          .select({ id: plans.id })
          .from(plans)
          .where(eq(plans.profileId, profileId))
          .orderBy(desc(plans.createdAt))
          .limit(1);

        let eligibleNames: string[] = [];
        let eligibleIds: string[] = [];
        let estimatedAnnualSavings = 0;

        if (latestPlan) {
          const items = await db
            .select({
              modalityId: planItems.modalityId,
              name: modalities.name,
              estimatedMonthlyCost: planItems.estimatedMonthlyCost,
              lmnEligible: modalities.lmnEligible,
            })
            .from(planItems)
            .innerJoin(modalities, eq(planItems.modalityId, modalities.id))
            .where(eq(planItems.planId, latestPlan.id));

          const eligible = items.filter((i) => i.lmnEligible);
          eligibleNames = eligible.map((i) => i.name);
          eligibleIds = eligible.map((i) => i.modalityId);
          // Convert dollars → cents (× 100) to match /lmn/status and /lmn/request conventions
          estimatedAnnualSavings = eligible.reduce((s, i) => s + (i.estimatedMonthlyCost ?? 0) * 12 * 100, 0);
        }

        const memberName = profile?.displayName ?? "Your patient";
        const modalityList = eligibleNames.length > 0
          ? eligibleNames.join(", ")
          : "wellness services (massage, physical therapy, yoga, acupuncture)";

        const draftMessage = `Dear Doctor,

I am writing to request a Letter of Medical Necessity (LMN) for my HSA/FSA reimbursement.

My name is ${memberName}. Based on my personalized wellness plan, I have been advised to pursue the following services that may qualify for HSA/FSA reimbursement when supported by an LMN:

${eligibleNames.length > 0 ? eligibleNames.map((n) => `  • ${n}`).join("\n") : `  • ${modalityList}`}

These services are part of my ongoing wellness plan. An LMN documenting medical necessity for these services would allow me to use my HSA/FSA funds to cover these costs, potentially saving ${estimatedAnnualSavings > 0 ? `$${(estimatedAnnualSavings / 100).toFixed(0)}/year` : "significant costs"}.

Please let me know if you need any additional information to complete this letter.

Thank you,
${memberName}`;

        await db.insert(lmnRequests).values({
          id: crypto.randomUUID(),
          profileId,
          planId: latestPlan?.id ?? null,
          status: "draft",
          draftMessage,
          eligibleModalities: eligibleIds,
          estimatedAnnualSavings: estimatedAnnualSavings > 0 ? estimatedAnnualSavings : null,
          updatedAt: new Date(),
        });

        // Advance lmnStatus from "none" → "requested" so the HsaUnlock flow routes correctly
        await db
          .update(profiles)
          .set({ lmnStatus: "requested", updatedAt: new Date() })
          .where(and(eq(profiles.id, profileId), eq(profiles.lmnStatus, "none")));
      } catch {
        // Silent — LMN auto-draft is supplementary; do not surface errors to the session log caller
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
