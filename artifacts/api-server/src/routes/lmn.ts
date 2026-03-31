import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profiles, modalities, plans, planItems, lmnRequests } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import type { Request, Response } from "express";

const router: IRouter = Router();

function requireMemberAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  if (req.user!.role !== "member" && req.user!.role !== "admin") {
    res.status(403).json({ error: "Member account required" });
    return false;
  }
  return true;
}

// ── GET /lmn/status ───────────────────────────────────────────────────────────
// Returns the member's LMN status, eligible modalities from their active plan,
// and estimated annual HSA/FSA savings.
router.get("/lmn/status", async (req, res) => {
  if (!requireMemberAuth(req, res)) return;
  try {
    const profileId = req.user!.id;

    const [profile] = await db
      .select({ lmnStatus: profiles.lmnStatus })
      .from(profiles)
      .where(eq(profiles.id, profileId));

    // Get the member's most recent plan (regardless of status — plans default to "generated")
    const [activePlan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.profileId, profileId))
      .orderBy(desc(plans.createdAt))
      .limit(1);

    let eligibleItems: { modalityId: string; name: string; emoji: string; estimatedMonthlyCost: number }[] = [];
    let estimatedAnnualSavings = 0;

    if (activePlan) {
      const items = await db
        .select({
          modalityId: planItems.modalityId,
          estimatedMonthlyCost: planItems.estimatedMonthlyCost,
          name: modalities.name,
          emoji: modalities.emoji,
          lmnEligible: modalities.lmnEligible,
        })
        .from(planItems)
        .innerJoin(modalities, eq(planItems.modalityId, modalities.id))
        .where(eq(planItems.planId, activePlan.id));

      eligibleItems = items
        .filter((i) => i.lmnEligible)
        .map((i) => ({
          modalityId: i.modalityId,
          name: i.name,
          emoji: i.emoji,
          // Convert dollars → cents so UI can safely divide by 100
          estimatedMonthlyCost: (i.estimatedMonthlyCost ?? 0) * 100,
        }));

      // Estimated annual savings in cents: eligible item costs × 12 months × 100 (dollars→cents)
      estimatedAnnualSavings = items
        .filter((i) => i.lmnEligible)
        .reduce((sum, i) => sum + (i.estimatedMonthlyCost ?? 0) * 12 * 100, 0);
    }

    // Get latest LMN request if exists
    const [latestRequest] = await db
      .select()
      .from(lmnRequests)
      .where(eq(lmnRequests.profileId, profileId))
      .orderBy(desc(lmnRequests.createdAt))
      .limit(1);

    res.json({
      lmnStatus: profile?.lmnStatus ?? "none",
      eligibleItems,
      estimatedAnnualSavings,
      hasActivePlan: !!activePlan,
      latestRequest: latestRequest ?? null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// ── POST /lmn/request ─────────────────────────────────────────────────────────
// Creates (or refreshes) a draft LMN request for the member.
// Called after a member adds a DPC/medical provider or explicitly from the HSA flow.
router.post("/lmn/request", async (req, res) => {
  if (!requireMemberAuth(req, res)) return;
  try {
    const profileId = req.user!.id;

    const [profile] = await db
      .select({ displayName: profiles.displayName, lmnStatus: profiles.lmnStatus })
      .from(profiles)
      .where(eq(profiles.id, profileId));

    // Get most recent plan (regardless of status — plans default to "generated")
    const [activePlan] = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.profileId, profileId))
      .orderBy(desc(plans.createdAt))
      .limit(1);

    // Gather LMN-eligible modalities from plan
    let eligibleNames: string[] = [];
    let eligibleIds: string[] = [];
    let estimatedAnnualSavings = 0;

    if (activePlan) {
      const items = await db
        .select({
          modalityId: planItems.modalityId,
          name: modalities.name,
          estimatedMonthlyCost: planItems.estimatedMonthlyCost,
          lmnEligible: modalities.lmnEligible,
        })
        .from(planItems)
        .innerJoin(modalities, eq(planItems.modalityId, modalities.id))
        .where(eq(planItems.planId, activePlan.id));

      const eligible = items.filter((i) => i.lmnEligible);
      eligibleNames = eligible.map((i) => i.name);
      eligibleIds = eligible.map((i) => i.modalityId);
      // Convert dollars → cents (× 100) so stored value is consistent with /lmn/status
      estimatedAnnualSavings = eligible.reduce((sum, i) => sum + (i.estimatedMonthlyCost ?? 0) * 12 * 100, 0);
    }

    const memberName = profile?.displayName ?? "Your patient";
    const modalityList =
      eligibleNames.length > 0
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

    const [request] = await db
      .insert(lmnRequests)
      .values({
        id: crypto.randomUUID(),
        profileId,
        planId: activePlan?.id ?? null,
        status: "draft",
        draftMessage,
        eligibleModalities: eligibleIds,
        estimatedAnnualSavings: estimatedAnnualSavings > 0 ? estimatedAnnualSavings : null,
        updatedAt: new Date(),
      })
      .returning();

    // Update profile LMN status to "requested" if currently "none"
    if (profile?.lmnStatus === "none") {
      await db
        .update(profiles)
        .set({ lmnStatus: "requested", updatedAt: new Date() })
        .where(eq(profiles.id, profileId));
    }

    res.status(201).json({ request, lmnStatus: profile?.lmnStatus === "none" ? "requested" : profile?.lmnStatus });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// ── POST /lmn/mark-received ───────────────────────────────────────────────────
// Member self-reports that their physician has delivered the LMN.
// Activates "LMN on file" badge on all eligible progress log entries.
router.post("/lmn/mark-received", async (req, res) => {
  if (!requireMemberAuth(req, res)) return;
  try {
    const profileId = req.user!.id;

    await db
      .update(profiles)
      .set({ lmnStatus: "received", updatedAt: new Date() })
      .where(eq(profiles.id, profileId));

    // Update latest LMN request status
    const [latest] = await db
      .select({ id: lmnRequests.id })
      .from(lmnRequests)
      .where(eq(lmnRequests.profileId, profileId))
      .orderBy(desc(lmnRequests.createdAt))
      .limit(1);

    if (latest) {
      await db
        .update(lmnRequests)
        .set({ status: "received", updatedAt: new Date() })
        .where(eq(lmnRequests.id, latest.id));
    }

    res.json({ lmnStatus: "received" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// ── GET /lmn/eligible-modalities ─────────────────────────────────────────────
// Public endpoint — returns all modalities flagged as LMN-eligible.
router.get("/lmn/eligible-modalities", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: modalities.id,
        name: modalities.name,
        emoji: modalities.emoji,
        category: modalities.category,
        costLow: modalities.costLow,
        costHigh: modalities.costHigh,
        description: modalities.description,
      })
      .from(modalities)
      .where(and(eq(modalities.lmnEligible, true), eq(modalities.isActive, true)));

    res.json({ modalities: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
