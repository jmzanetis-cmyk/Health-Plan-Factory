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

export default router;
