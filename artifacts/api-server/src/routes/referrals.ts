/**
 * Member Referral Program API
 *
 * GET  /api/referrals/mine  — returns the member's referral code, history, and credit summary
 * POST /api/referrals/register — register a pending referral (called after signup with a ?ref= code)
 * GET  /api/credits/mine    — returns unused credit balance
 */
import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  profiles,
  referrals,
  memberCredits,
  plans,
} from "@workspace/db";
import { eq, and, desc, not, isNull } from "drizzle-orm";
import { randomUUID } from "crypto";

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

/**
 * GET /api/referrals/mine
 * Returns: referralCode, referralLink, referralHistory[], creditSummary
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

    res.json({
      referralCode,
      referralHistory: enriched,
      creditSummary: {
        totalCredits: credits.length,
        unusedCreditsCents,
        unusedCreditsFormatted: `$${(unusedCreditsCents / 100).toFixed(2)}`,
        credits,
      },
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
      .select({ id: profiles.id })
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
      res.json({ message: "Referral already registered", alreadyRegistered: true });
      return;
    }

    // Create the pending referral
    const [referral] = await db
      .insert(referrals)
      .values({
        id: randomUUID(),
        referrerId: referrer.id,
        referredMemberId: profileId,
        code: referralCode.trim().toUpperCase(),
        status: "pending",
        createdAt: new Date(),
      })
      .returning();

    res.json({ message: "Referral registered", referral });
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
 * If the member was referred and has a pending referral, rewards the referrer.
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

  // Check if the referred member already had a plan before this one
  // (reward only triggers on their FIRST plan)
  const existingPlans = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.profileId, referredMemberId));

  // If more than one plan exists (the plan being created is already in DB), skip
  if (existingPlans.length > 1) return;

  // Mark referral as rewarded
  await db
    .update(referrals)
    .set({ status: "rewarded", rewardedAt: new Date() })
    .where(eq(referrals.id, pendingReferral.id));

  // Award $2 (200 cents) unlock credit to the referrer
  await db.insert(memberCredits).values({
    id: randomUUID(),
    profileId: pendingReferral.referrerId,
    source: "referral",
    amountCents: 200,
    used: false,
    referralId: pendingReferral.id,
    createdAt: new Date(),
  });

  // Award $2 welcome credit to the referred member (one free unlock for them)
  await db.insert(memberCredits).values({
    id: randomUUID(),
    profileId: referredMemberId,
    source: "referral",
    amountCents: 200,
    used: false,
    referralId: pendingReferral.id,
    createdAt: new Date(),
  });
}

export default router;
