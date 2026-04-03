/**
 * Test-only fixture endpoints — only mounted when NODE_ENV=test.
 *
 * These routes exist exclusively to seed deterministic DB state for
 * Playwright E2E tests. They must NEVER be mounted in production.
 */

import { Router } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  profiles,
  referrals,
  referralMilestones,
  memberCredits,
  plans,
  planProgressLogs,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

/**
 * POST /api/test/seed-referral-milestone
 *
 * Seeds a pioneer milestone reward for a given userId so Playwright badge-link
 * tests can assert real DB-backed badge rendering without network mocking.
 *
 * Body: { userId: string }
 * Response: { userId, referralCode, milestoneId }
 */
router.post("/test/seed-referral-milestone", async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const referralCode = `HPF-E2E${userId.slice(0, 4).toUpperCase()}`;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(profiles)
        .values({
          id: userId,
          email: `${userId}@e2e.test`,
          role: "member",
          displayName: "E2E Badge Tester",
          referralCode,
        })
        .onConflictDoNothing();

      const referredId = `${userId}-referred`;
      await tx
        .insert(profiles)
        .values({
          id: referredId,
          email: `${referredId}@e2e.test`,
          role: "member",
          displayName: "E2E Referred User",
          referralCode: `HPF-REF${randomUUID().slice(0, 4).toUpperCase()}`,
        })
        .onConflictDoNothing();

      await tx
        .insert(referrals)
        .values({
          id: `ref-${userId}-pioneer`,
          referrerId: userId,
          referredMemberId: referredId,
          code: referralCode,
          status: "rewarded",
          rewardedAt: new Date(),
        })
        .onConflictDoNothing();

      await tx
        .insert(referralMilestones)
        .values({
          id: `ms-${userId}-pioneer`,
          profileId: userId,
          milestone: "pioneer",
          bonusCreditCents: 300,
        })
        .onConflictDoNothing();

      await tx
        .insert(memberCredits)
        .values({
          id: `cred-${userId}-pioneer`,
          profileId: userId,
          amountCents: 300,
          source: "milestone",
        })
        .onConflictDoNothing();
    });

    res.json({ userId, referralCode, milestoneId: "pioneer" });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * DELETE /api/test/seed-referral-milestone/:userId
 * Cleanup fixture data after tests.
 */
router.delete("/test/seed-referral-milestone/:userId", async (req, res) => {
  const { userId } = req.params;
  const referredId = `${userId}-referred`;

  try {
    await db.delete(referralMilestones).where(eq(referralMilestones.profileId, userId));
    await db.delete(memberCredits).where(
      and(eq(memberCredits.profileId, userId), eq(memberCredits.source, "milestone"))
    );
    await db.delete(referrals).where(eq(referrals.referrerId, userId));
    await db.delete(profiles).where(eq(profiles.id, referredId));
    await db.delete(profiles).where(eq(profiles.id, userId));
    res.json({ deleted: userId });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/test/seed-outcome-member
 *
 * Creates a fresh Plus-tier profile so Playwright outcome-tracking E2E tests
 * can sign up (programmatically) and then exercise the real /plan and
 * /progress flows with X-Test-User-Id auth.
 *
 * Body: { userId: string }
 * Response: { userId, email, planId }
 */
router.post("/test/seed-outcome-member", async (req, res) => {
  const { userId } = req.body as { userId?: string };
  if (!userId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const email = `${userId}@outcome-e2e.test`;
  const referralCode = `HPF-OE2E${userId.slice(0, 4).toUpperCase()}`;
  const planId = `plan-${userId}`;

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(profiles)
        .values({
          id: userId,
          email,
          role: "member",
          displayName: "Outcome E2E Tester",
          referralCode,
          subscriptionStatus: "plus",
        })
        .onConflictDoNothing();

      // Seed a minimal plan so /plans/:userId/latest returns a valid plan row
      await tx
        .insert(plans)
        .values({
          id: planId,
          profileId: userId,
          status: "generated",
          totalMonthlyCost: 220,
          budgetUtilization: 73,
          budget: 300,
        })
        .onConflictDoNothing();
    });

    res.json({ userId, email, planId });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

/**
 * DELETE /api/test/seed-outcome-member/:userId
 * Cleans up fixture data after outcome-tracking tests.
 */
router.delete("/test/seed-outcome-member/:userId", async (req, res) => {
  const { userId } = req.params;
  const planId = `plan-${userId}`;

  try {
    await db.delete(planProgressLogs).where(eq(planProgressLogs.profileId, userId));
    await db.delete(plans).where(eq(plans.id, planId));
    await db.delete(profiles).where(eq(profiles.id, userId));
    res.json({ deleted: userId });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
});

export default router;
