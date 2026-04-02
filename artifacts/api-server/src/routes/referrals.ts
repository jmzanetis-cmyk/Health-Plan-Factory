/**
 * Member Referral Program API
 *
 * GET  /api/referrals/mine  — returns the member's referral code, history, and credit summary
 * POST /api/referrals/register — register a pending referral (called after signup with a ?ref= code)
 * GET  /api/credits/mine    — returns unused credit balance
 * POST /api/referrals/send-invite — send a direct email invite with rate limiting (10/day)
 * GET  /api/referrals/new-credit-since/:timestamp — poll for new referral credits
 */
import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  profiles,
  referrals,
  memberCredits,
  plans,
  memberIntakes,
  referralMilestones,
} from "@workspace/db";
import { eq, and, desc, count, sql, gte } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { sendEmail, sendNotification } from "../lib/comms";
import { referralRewardEmail } from "../emails/referral-reward";
import { referralInviteEmail } from "../emails/referral-invite";
import { referralMilestoneEmail } from "../emails/referral-milestone";

const BASE_URL = process.env.BASE_URL || "https://healthplanfactory.com";

const router = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

/** Generate a human-friendly referral code like "HPF-AB12CD34" */
function generateReferralCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/I/1 to avoid confusion
  let code = "HPF-";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

/** Ensure the member has a referral code; creates one if missing. */
async function ensureReferralCode(profileId: string): Promise<string> {
  const [profile] = await db
    .select({ referralCode: profiles.referralCode })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  if (profile?.referralCode) return profile.referralCode;

  // Generate a unique code (retry up to 5 times on collision)
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateReferralCode();
    try {
      await db
        .update(profiles)
        .set({ referralCode: code, updatedAt: new Date() })
        .where(eq(profiles.id, profileId));
      return code;
    } catch {
      // Unique constraint violation — try another code
    }
  }
  throw new Error("Failed to generate a unique referral code after 5 attempts");
}

// ── Milestone definitions ───────────────────────────────────────────────────
// Each milestone: id, label, threshold (rewarded referrals), emoji, bonus cents
const MILESTONE_TIERS = [
  { id: "pioneer",    label: "Pioneer",    threshold: 1,  emoji: "🌱", bonusCents: 0   },
  { id: "advocate",   label: "Advocate",   threshold: 5,  emoji: "🌿", bonusCents: 200 }, // $2 bonus
  { id: "champion",   label: "Champion",   threshold: 10, emoji: "🏆", bonusCents: 700 }, // $7 bonus
  { id: "ambassador", label: "Ambassador", threshold: 25, emoji: "💎", bonusCents: 1700 }, // $17 bonus
] as const;

type MilestoneId = typeof MILESTONE_TIERS[number]["id"];

/**
 * Check if the referrer just crossed a milestone threshold and award the bonus.
 * Called after each successful referral reward.
 * Returns the milestone ID if one was just awarded, or null.
 */
async function maybeAwardMilestone(referrerId: string): Promise<MilestoneId | null> {
  // Count total rewarded referrals for this member
  const [{ totalRewarded }] = await db
    .select({ totalRewarded: count(referrals.id) })
    .from(referrals)
    .where(and(eq(referrals.referrerId, referrerId), eq(referrals.status, "rewarded")));

  const rewardedCount = Number(totalRewarded ?? 0);

  // Find all milestones the user has already earned
  const earned = await db
    .select({ milestone: referralMilestones.milestone })
    .from(referralMilestones)
    .where(eq(referralMilestones.profileId, referrerId));

  const earnedSet = new Set(earned.map((e) => e.milestone));

  // Determine the highest newly-crossed milestone (process from highest to lowest)
  let newMilestone: typeof MILESTONE_TIERS[number] | null = null;
  for (const tier of [...MILESTONE_TIERS].reverse()) {
    if (rewardedCount >= tier.threshold && !earnedSet.has(tier.id)) {
      newMilestone = tier;
      break;
    }
  }

  if (!newMilestone) return null;

  // Insert the milestone record (unique constraint prevents duplicates)
  try {
    await db.insert(referralMilestones).values({
      id: randomUUID(),
      profileId: referrerId,
      milestone: newMilestone.id,
      rewardedAt: new Date(),
      bonusCreditCents: newMilestone.bonusCents,
    }).onConflictDoNothing();
  } catch {
    return null;
  }

  // Award bonus credit if threshold grants a bonus
  if (newMilestone.bonusCents > 0) {
    await db.insert(memberCredits).values({
      id: randomUUID(),
      profileId: referrerId,
      source: "milestone",
      amountCents: newMilestone.bonusCents,
      used: false,
      createdAt: new Date(),
    });
  }

  // Fire-and-forget: send milestone congratulations email
  ;(async () => {
    try {
      const [referrer] = await db
        .select({ email: profiles.email, displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, referrerId))
        .limit(1);

      if (referrer?.email && newMilestone) {
        const dashboardUrl = `${BASE_URL}/referral`;
        const bonusFormatted = newMilestone.bonusCents > 0
          ? `$${(newMilestone.bonusCents / 100).toFixed(2)}`
          : "$3.00"; // base reward already credited

        const { subject, html } = referralMilestoneEmail({
          referrerName: referrer.displayName,
          milestoneName: newMilestone.label,
          milestoneEmoji: newMilestone.emoji,
          bonusCredit: bonusFormatted,
          totalRewardedCount: rewardedCount,
          dashboardUrl,
        });

        await sendEmail(
          referrerId,
          referrer.email,
          subject,
          html,
          "referral-milestone",
        );
      }
    } catch (err) {
      console.error("[comms] milestone email error:", err);
    }
  })();

  return newMilestone.id as MilestoneId;
}

/**
 * GET /api/referrals/mine
 * Returns: referralCode, referralLink, referralHistory[], creditSummary, milestones
 */
router.get("/referrals/mine", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;

  try {
    const referralCode = await ensureReferralCode(profileId);

    // Fetch referrals made by this member
    const history = await db
      .select({
        id: referrals.id,
        status: referrals.status,
        code: referrals.code,
        createdAt: referrals.createdAt,
        rewardedAt: referrals.rewardedAt,
        referredMemberId: referrals.referredMemberId,
      })
      .from(referrals)
      .where(eq(referrals.referrerId, profileId))
      .orderBy(desc(referrals.createdAt));

    // Enrich with referred member's display name / email
    const enriched = await Promise.all(
      history.map(async (row) => {
        if (!row.referredMemberId) {
          return { ...row, referredMemberName: null, referredMemberEmail: null };
        }
        const [referred] = await db
          .select({ displayName: profiles.displayName, email: profiles.email })
          .from(profiles)
          .where(eq(profiles.id, row.referredMemberId))
          .limit(1);
        return {
          ...row,
          referredMemberName: referred?.displayName ?? null,
          referredMemberEmail: referred?.email ?? null,
        };
      })
    );

    // Credit summary
    const credits = await db
      .select()
      .from(memberCredits)
      .where(eq(memberCredits.profileId, profileId))
      .orderBy(desc(memberCredits.createdAt));

    const unusedCreditsCents = credits
      .filter((c) => !c.used)
      .reduce((sum, c) => sum + c.amountCents, 0);

    // Milestone summary
    const earnedMilestones = await db
      .select({ milestone: referralMilestones.milestone, rewardedAt: referralMilestones.rewardedAt })
      .from(referralMilestones)
      .where(eq(referralMilestones.profileId, profileId))
      .orderBy(referralMilestones.rewardedAt);

    const earnedSet = new Set(earnedMilestones.map((m) => m.milestone));
    const rewardedCount = history.filter((r) => r.status === "rewarded").length;

    const milestonesWithStatus = MILESTONE_TIERS.map((tier) => ({
      id: tier.id,
      label: tier.label,
      emoji: tier.emoji,
      threshold: tier.threshold,
      bonusCents: tier.bonusCents,
      earned: earnedSet.has(tier.id),
      rewardedAt: earnedMilestones.find((m) => m.milestone === tier.id)?.rewardedAt ?? null,
    }));

    // Next milestone to unlock
    const nextMilestone = MILESTONE_TIERS.find((t) => !earnedSet.has(t.id) && rewardedCount < t.threshold) ?? null;

    res.json({
      referralCode,
      referralHistory: enriched,
      creditSummary: {
        totalCredits: credits.length,
        unusedCreditsCents,
        unusedCreditsFormatted: `$${(unusedCreditsCents / 100).toFixed(2)}`,
        credits,
      },
      milestones: milestonesWithStatus,
      rewardedCount,
      nextMilestone: nextMilestone
        ? { id: nextMilestone.id, label: nextMilestone.label, threshold: nextMilestone.threshold, emoji: nextMilestone.emoji }
        : null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/referrals/register
 * Called by the frontend after login when a ?ref= code was stored in localStorage.
 * Body: { referralCode: string }
 * Creates a pending referral row linking the referring member to the newly signed-up member.
 */
router.post("/referrals/register", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;
  const { referralCode } = req.body as { referralCode?: string };

  if (!referralCode || typeof referralCode !== "string") {
    res.status(400).json({ error: "referralCode is required" });
    return;
  }

  try {
    // Prevent self-referral
    const [selfProfile] = await db
      .select({ referralCode: profiles.referralCode })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    if (selfProfile?.referralCode === referralCode.trim().toUpperCase()) {
      res.status(400).json({ error: "You cannot refer yourself" });
      return;
    }

    // Find the referring member by code (case-insensitive)
    const [referrer] = await db
      .select({ id: profiles.id, displayName: profiles.displayName, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.referralCode, referralCode.trim().toUpperCase()))
      .limit(1);

    if (!referrer) {
      res.status(404).json({ error: "Referral code not found" });
      return;
    }

    // Check if this member already used a referral code (only one allowed)
    const existing = await db
      .select({ id: referrals.id })
      .from(referrals)
      .where(eq(referrals.referredMemberId, profileId))
      .limit(1);

    if (existing.length > 0) {
      // Still return referrer name for the welcome banner even if already registered
      const referrerFirstName = referrer.displayName?.split(" ")[0] ?? null;
      res.json({ message: "Referral already registered", alreadyRegistered: true, referrerFirstName });
      return;
    }

    // Create the pending referral and increment referrer's referralCount atomically.
    const [referral] = await db.transaction(async (tx) => {
      const [created] = await tx
        .insert(referrals)
        .values({
          id: randomUUID(),
          referrerId: referrer.id,
          referredMemberId: profileId,
          code: referralCode.trim().toUpperCase(),
          status: "pending",
          createdAt: new Date(),
        })
        .onConflictDoNothing()
        .returning();
      // Only increment referralCount if the row was actually inserted
      if (created) {
        await tx
          .update(profiles)
          .set({ referralCount: sql`referral_count + 1`, updatedAt: new Date() })
          .where(eq(profiles.id, referrer.id));
      }
      return [created];
    });

    // Return referrer's first name for the welcome banner
    const referrerFirstName = referrer.displayName?.split(" ")[0] ?? null;
    res.json({ message: "Referral registered", referral, referrerFirstName });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/credits/mine
 * Returns the member's unused credit balance and credit history.
 */
router.get("/credits/mine", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;

  try {
    const credits = await db
      .select()
      .from(memberCredits)
      .where(eq(memberCredits.profileId, profileId))
      .orderBy(desc(memberCredits.createdAt));

    const unusedCreditsCents = credits
      .filter((c) => !c.used)
      .reduce((sum, c) => sum + c.amountCents, 0);

    res.json({
      unusedCreditsCents,
      unusedCreditsFormatted: `$${(unusedCreditsCents / 100).toFixed(2)}`,
      hasCredits: unusedCreditsCents > 0,
      credits,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * Exported helper — called from plans route when a plan is first generated.
 * Triggers reward when:
 *  1. The referred member has a pending referral, AND
 *  2. They have completed an intake (memberIntakes row exists), AND
 *  3. This is their first generated plan.
 */
export async function maybeRewardReferrer(referredMemberId: string): Promise<void> {
  // Check if this member was referred and has a pending referral
  const [pendingReferral] = await db
    .select()
    .from(referrals)
    .where(
      and(
        eq(referrals.referredMemberId, referredMemberId),
        eq(referrals.status, "pending")
      )
    )
    .limit(1);

  if (!pendingReferral) return;

  // Check intake completion — member must have submitted their health intake
  const [intake] = await db
    .select({ id: memberIntakes.id })
    .from(memberIntakes)
    .where(eq(memberIntakes.profileId, referredMemberId))
    .limit(1);

  if (!intake) return; // intake not yet completed — reward deferred

  // Check if the referred member already had a plan before this one
  const [{ planCount }] = await db
    .select({ planCount: count(plans.id) })
    .from(plans)
    .where(eq(plans.profileId, referredMemberId));

  // Reward only when the member's FIRST plan has been generated (planCount === 1)
  if ((planCount ?? 0) < 1) return;
  if ((planCount ?? 0) > 1) return;

  // ── Single-winner guard: atomically transition pending → rewarded ──
  const [claimed] = await db
    .update(referrals)
    .set({ status: "rewarded", rewardedAt: new Date() })
    .where(
      and(
        eq(referrals.id, pendingReferral.id),
        eq(referrals.status, "pending"),
      )
    )
    .returning({ id: referrals.id });

  if (!claimed) {
    console.info(`[referral] Skipping duplicate reward for referred member ${referredMemberId}`);
    return;
  }

  const now = new Date();

  // Award $3 (300 cents) unlock credit to the referrer
  await db.insert(memberCredits).values({
    id: randomUUID(),
    profileId: pendingReferral.referrerId,
    source: "referral",
    amountCents: 300,
    used: false,
    referralId: pendingReferral.id,
    createdAt: now,
  });

  // Award $3 welcome credit to the referred member
  await db.insert(memberCredits).values({
    id: randomUUID(),
    profileId: referredMemberId,
    source: "referral",
    amountCents: 300,
    used: false,
    referralId: pendingReferral.id,
    createdAt: now,
  });

  console.info(
    `[referral] Rewarded referrer ${pendingReferral.referrerId} for referred member ${referredMemberId}`
  );

  // Check for milestone unlock (fire-and-forget — non-blocking to main reward flow)
  maybeAwardMilestone(pendingReferral.referrerId).catch((err) => {
    console.error("[referral] milestone check error:", err);
  });

  // Send a referral reward notification to the referrer (fire-and-forget)
  ;(async () => {
    try {
      const [referrer] = await db
        .select({ email: profiles.email, displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, pendingReferral.referrerId))
        .limit(1);

      const [referred] = await db
        .select({ displayName: profiles.displayName })
        .from(profiles)
        .where(eq(profiles.id, referredMemberId))
        .limit(1);

      if (referrer?.email) {
        const dashboardUrl = process.env.BASE_URL
          ? `${process.env.BASE_URL}/dashboard`
          : "/dashboard";
        const { subject, html } = referralRewardEmail({
          referrerName: referrer.displayName,
          referredName: referred?.displayName ?? null,
          creditAmountFormatted: "$3.00",
          dashboardUrl,
        });
        await sendNotification({
          profileId: pendingReferral.referrerId,
          email: referrer.email,
          type: "referral-reward",
          subject,
          html,
          smsBody: `Health Plan Factory: Your referral just earned you $3 in credits! Log in to use them.`,
        });
      }
    } catch (err) {
      console.error("[comms] referral reward notification error:", err);
    }
  })();
}

/**
 * POST /api/referrals/send-invite
 * Sends a referral invite email to a specified email address with a pre-filled signup link.
 * Rate limited to 10 invites per day per user.
 * Body: { inviteeEmail: string }
 */
router.post("/referrals/send-invite", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;

  const body = z.object({
    inviteeEmail: z.string().email(),
    personalNote: z.string().max(300).optional(),
  }).safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  try {
    // ── Rate limiting: max 10 invites per day per user ──────────────────
    // We count invite emails sent in the last 24 hours using memberCredits
    // source="invite-sent" rows (a lightweight audit trail already in the DB).
    // This avoids adding a separate table just for rate limiting.
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [{ inviteCount }] = await db
      .select({ inviteCount: count() })
      .from(memberCredits)
      .where(
        and(
          eq(memberCredits.profileId, profileId),
          eq(memberCredits.source, "invite-sent"),
          gte(memberCredits.createdAt, dayAgo),
        )
      );

    if (Number(inviteCount ?? 0) >= 10) {
      res.status(429).json({ error: "Daily invite limit reached (10 per day). Please try again tomorrow." });
      return;
    }

    const referralCode = await ensureReferralCode(profileId);

    const [profile] = await db
      .select({ displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    const signupUrl = `${BASE_URL}/signup?ref=${encodeURIComponent(referralCode)}`;
    const { subject, html } = referralInviteEmail({
      referrerName: profile?.displayName ?? null,
      referralCode,
      signupUrl,
      personalNote: body.data.personalNote ?? null,
    });

    await sendEmail(
      profileId,
      body.data.inviteeEmail,
      subject,
      html,
      "referral-invite",
    );

    // Record the invite attempt as a zero-amount "invite-sent" credit row
    // (serves as the rate-limit audit trail without adding a new table)
    await db.insert(memberCredits).values({
      id: randomUUID(),
      profileId,
      source: "invite-sent",
      amountCents: 0,
      used: true,
      createdAt: new Date(),
    }).catch(() => {}); // non-fatal

    res.json({ message: "Invite sent", referralCode, signupUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/referrals/track
 * Alias for the reward trigger — can also be called explicitly from the frontend
 * after the referred member generates their first plan. Idempotent.
 * Body: (none — uses the authenticated member's ID)
 */
router.post("/referrals/track", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;
  try {
    await maybeRewardReferrer(profileId);
    res.json({ message: "ok" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/referrals/new-credit-since/:timestamp
 * Returns whether the member has earned a new referral credit since the given ISO timestamp.
 * Used by the Dashboard to display a toast when the referrer earns a reward.
 */
router.get("/referrals/new-credit-since/:timestamp", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;
  const timestamp = Array.isArray(req.params.timestamp) ? req.params.timestamp[0] : req.params.timestamp;

  try {
    const since = new Date(timestamp);
    if (isNaN(since.getTime())) {
      res.status(400).json({ error: "Invalid timestamp" });
      return;
    }

    const credits = await db
      .select({ id: memberCredits.id, amountCents: memberCredits.amountCents, createdAt: memberCredits.createdAt })
      .from(memberCredits)
      .where(
        and(
          eq(memberCredits.profileId, profileId),
          eq(memberCredits.source, "referral"),
          eq(memberCredits.used, false)
        )
      );

    const newCredits = credits.filter((c) => new Date(c.createdAt) > since);
    const totalNewCents = newCredits.reduce((s, c) => s + c.amountCents, 0);

    res.json({
      hasNewCredit: newCredits.length > 0,
      newCreditsCents: totalNewCents,
      newCreditsFormatted: `$${(totalNewCents / 100).toFixed(2)}`,
      count: newCredits.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
