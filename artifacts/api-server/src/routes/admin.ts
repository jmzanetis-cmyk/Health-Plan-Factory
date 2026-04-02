import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { profiles, providers, plans, planItems, adminSettings, modalities, referrals, memberCredits, testimonials, notificationLog } from "@workspace/db";
import { eq, gte, lte, count, desc, asc, sql, and, notExists } from "drizzle-orm";
import {
  UpsertAdminSettingBody,
  GetAdminStatsResponse,
  ListAdminSettingsResponse,
  UpsertAdminSettingResponse,
} from "@workspace/api-zod";
import { buildDigestForMember } from "../lib/weeklyDigest";
import { weeklyDigestEmail } from "../emails/weekly-digest";
import { sendEmail, getCommsPrefs } from "../lib/comms";
import { providerApprovedEmail } from "../emails/provider-approved";
import { providerRejectedEmail } from "../emails/provider-rejected";
import { planSummaryEmail } from "../emails/plan-summary";
import { planNudgeEmail } from "../emails/plan-nudge";

const BASE_URL = process.env.BASE_URL || "https://healthplanfactory.com";

const router: IRouter = Router();

// Public endpoint — returns only the disclaimer text (no auth required)
router.get("/settings/disclaimer", async (req, res) => {
  try {
    const [row] = await db
      .select()
      .from(adminSettings)
      .where(eq(adminSettings.key, "disclaimer"));
    res.json({ disclaimer: row?.value ?? null });
  } catch {
    res.json({ disclaimer: null });
  }
});

// Require admin role for all /admin/* routes
router.use("/admin", (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
});

router.get("/admin/stats", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalMembers] = await db.select({ count: count() }).from(profiles);
    const [totalProviders] = await db.select({ count: count() }).from(providers);
    const [totalPlans] = await db.select({ count: count() }).from(plans);
    const [pendingProviders] = await db
      .select({ count: count() })
      .from(providers)
      .where(eq(providers.status, "pending"));
    const [recentSignups] = await db
      .select({ count: count() })
      .from(profiles)
      .where(gte(profiles.createdAt, thirtyDaysAgo));
    const [activeModalities] = await db
      .select({ count: count() })
      .from(modalities)
      .where(eq(modalities.isActive, true));

    res.json(
      GetAdminStatsResponse.parse({
        totalMembers: totalMembers.count,
        totalProviders: totalProviders.count,
        totalPlans: totalPlans.count,
        pendingProviders: pendingProviders.count,
        recentSignups: recentSignups.count,
        activeModalities: activeModalities.count,
      }),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// GET /admin/weekly-signups — 5 most recent weeks of member signups
router.get("/admin/weekly-signups", async (req, res) => {
  try {
    const allProfiles = await db
      .select({ createdAt: profiles.createdAt })
      .from(profiles)
      .orderBy(asc(profiles.createdAt));

    const weeks: Record<string, number> = {};
    const now = new Date();
    for (let w = 4; w >= 0; w--) {
      const start = new Date(now);
      start.setDate(start.getDate() - w * 7 - start.getDay());
      start.setHours(0, 0, 0, 0);
      const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weeks[label] = 0;
    }

    allProfiles.forEach(({ createdAt }) => {
      const d = new Date(createdAt);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (label in weeks) weeks[label]++;
    });

    const data = Object.entries(weeks).map(([week, signups]) => ({ week, signups }));
    res.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// GET /admin/users — paginated list of all users
router.get("/admin/users", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);
    const rows = await db
      .select()
      .from(profiles)
      .orderBy(desc(profiles.createdAt))
      .limit(limit)
      .offset(offset);
    res.json({ users: rows, limit, offset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// GET /admin/providers — all providers regardless of status
router.get("/admin/providers", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);
    const status = req.query.status as string | undefined;
    let rows = await db
      .select()
      .from(providers)
      .orderBy(desc(providers.createdAt));
    if (status) rows = rows.filter((p) => p.status === status);
    const sliced = rows.slice(offset, offset + limit);
    res.json({ providers: sliced, total: rows.length, limit, offset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// PATCH /admin/providers/:id — approve / reject / update provider
router.patch("/admin/providers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verificationStatus, rejectionReason } = req.body as {
      status?: string;
      verificationStatus?: string;
      rejectionReason?: string;
    };

    // Fetch the current provider to detect status transitions
    const [existing] = await db.select().from(providers).where(eq(providers.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (verificationStatus) updates.verificationStatus = verificationStatus;
    if (rejectionReason !== undefined) updates.rejectionReason = rejectionReason || null;

    const [updated] = await db
      .update(providers)
      .set(updates)
      .where(eq(providers.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }

    // Send approval / rejection email on status transitions
    const previousStatus = existing.status;
    const newStatus = status ?? existing.status;

    if (previousStatus !== "approved" && newStatus === "approved" && existing.profileId) {
      // Grant provider role so the user can access the provider dashboard
      await db
        .update(profiles)
        .set({ role: "provider", updatedAt: new Date() })
        .where(eq(profiles.id, existing.profileId));

      // Look up the provider owner's profile for their email
      try {
        const [profile] = await db
          .select({ email: profiles.email, displayName: profiles.displayName })
          .from(profiles)
          .where(eq(profiles.id, existing.profileId))
          .limit(1);

        if (profile?.email) {
          const origin = process.env.APP_URL ?? "https://healthplanfactory.com";
          const { subject, html } = providerApprovedEmail({
            displayName: profile.displayName,
            providerName: existing.name,
            dashboardUrl: `${origin}/provider/dashboard`,
          });
          sendEmail(existing.profileId, profile.email, subject, html, "welcome").catch((e) =>
            console.error("[admin] Failed to send provider approval email:", e),
          );
        }
      } catch (emailErr) {
        console.error("[admin] Error fetching profile for approval email:", emailErr);
      }
    } else if (previousStatus !== "rejected" && newStatus === "rejected" && existing.profileId) {
      try {
        const [profile] = await db
          .select({ email: profiles.email, displayName: profiles.displayName })
          .from(profiles)
          .where(eq(profiles.id, existing.profileId))
          .limit(1);

        if (profile?.email) {
          const origin = process.env.APP_URL ?? "https://healthplanfactory.com";
          const { subject, html } = providerRejectedEmail({
            displayName: profile.displayName,
            providerName: existing.name,
            rejectionReason: (rejectionReason ?? existing.rejectionReason) || null,
            reapplyUrl: `${origin}/contact`,
          });
          sendEmail(existing.profileId, profile.email, subject, html, "welcome").catch((e) =>
            console.error("[admin] Failed to send provider rejection email:", e),
          );
        }
      } catch (emailErr) {
        console.error("[admin] Error fetching profile for rejection email:", emailErr);
      }
    }

    res.json({ provider: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// GET /admin/modalities — all modalities
router.get("/admin/modalities", async (req, res) => {
  try {
    const rows = await db.select().from(modalities).orderBy(asc(modalities.name));
    res.json({ modalities: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// PATCH /admin/modalities/:id — inline edit modality
router.patch("/admin/modalities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { evidenceLevel, costLow, costHigh, isActive, lmnEligible, evidenceSummary, metaDescription } = req.body as {
      evidenceLevel?: "Strong" | "Moderate" | "Emerging";
      costLow?: number;
      costHigh?: number;
      isActive?: boolean;
      lmnEligible?: boolean;
      evidenceSummary?: string;
      metaDescription?: string;
    };

    const updatePayload: {
      updatedAt: Date;
      evidenceLevel?: "Strong" | "Moderate" | "Emerging";
      costLow?: number;
      costHigh?: number;
      isActive?: boolean;
      lmnEligible?: boolean;
      evidenceSummary?: string;
      metaDescription?: string;
    } = { updatedAt: new Date() };

    if (evidenceLevel !== undefined) updatePayload.evidenceLevel = evidenceLevel;
    if (costLow !== undefined) updatePayload.costLow = costLow;
    if (costHigh !== undefined) updatePayload.costHigh = costHigh;
    if (isActive !== undefined) updatePayload.isActive = isActive;
    if (lmnEligible !== undefined) updatePayload.lmnEligible = lmnEligible;
    if (evidenceSummary !== undefined) updatePayload.evidenceSummary = evidenceSummary;
    if (metaDescription !== undefined) updatePayload.metaDescription = metaDescription;

    const [updated] = await db
      .update(modalities)
      .set(updatePayload)
      .where(eq(modalities.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Modality not found" });
      return;
    }
    res.json({ modality: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/settings", async (req, res) => {
  try {
    const rows = await db.select().from(adminSettings);
    res.json(ListAdminSettingsResponse.parse(rows));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.patch("/admin/settings", async (req, res) => {
  try {
    const body = UpsertAdminSettingBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const { key, value } = body.data;
    const [upserted] = await db
      .insert(adminSettings)
      .values({ key, value: value ?? null, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value: value ?? null, updatedAt: new Date() },
      })
      .returning();

    res.json(UpsertAdminSettingResponse.parse(upserted));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /admin/referral-stats
 * Returns referral program statistics for the admin dashboard.
 */
router.get("/admin/referral-stats", async (req, res) => {
  try {
    const [totalReferrals] = await db.select({ count: count() }).from(referrals);
    const [rewardedReferrals] = await db
      .select({ count: count() })
      .from(referrals)
      .where(eq(referrals.status, "rewarded"));
    const [pendingReferrals] = await db
      .select({ count: count() })
      .from(referrals)
      .where(eq(referrals.status, "pending"));
    const [totalCredits] = await db.select({ count: count() }).from(memberCredits);
    const [usedCredits] = await db
      .select({ count: count() })
      .from(memberCredits)
      .where(eq(memberCredits.used, true));
    const [totalCreditsCents] = await db
      .select({ total: sql<number>`coalesce(sum(amount_cents), 0)` })
      .from(memberCredits);
    const [usedCreditsCents] = await db
      .select({ total: sql<number>`coalesce(sum(amount_cents), 0)` })
      .from(memberCredits)
      .where(eq(memberCredits.used, true));

    const conversionRate =
      totalReferrals.count > 0
        ? Math.round((rewardedReferrals.count / totalReferrals.count) * 100)
        : 0;

    res.json({
      totalReferrals: totalReferrals.count,
      rewardedReferrals: rewardedReferrals.count,
      pendingReferrals: pendingReferrals.count,
      conversionRate,
      totalCreditsIssued: totalCredits.count,
      creditsUsed: usedCredits.count,
      totalCreditsCentsIssued: Number(totalCreditsCents.total),
      totalCreditsCentsUsed: Number(usedCreditsCents.total),
      totalCreditsIssuedFormatted: `$${(Number(totalCreditsCents.total) / 100).toFixed(2)}`,
      totalCreditsUsedFormatted: `$${(Number(usedCreditsCents.total) / 100).toFixed(2)}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /admin/preview-digest?memberId=<id>
 * Returns a rendered HTML preview of the weekly digest for a member.
 * Does NOT send any email. Admin-only.
 */
router.get("/admin/preview-digest", async (req, res) => {
  const targetId: string = typeof req.query.memberId === "string" && req.query.memberId.trim()
    ? req.query.memberId.trim()
    : req.user!.id;

  try {
    const [profile] = await db
      .select({ id: profiles.id, email: profiles.email, displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, targetId))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const stats = await buildDigestForMember(profile.id);
    if (!stats) {
      res.status(500).json({ error: "Could not build digest for member" });
      return;
    }

    const { subject, html } = weeklyDigestEmail({
      displayName: profile.displayName,
      wellnessScoreThisWeek: stats.wellnessScoreThisWeek,
      wellnessScoreLastWeek: stats.wellnessScoreLastWeek,
      habitsCompleted: stats.habitsCompleted,
      habitsPlanned: stats.habitsPlanned,
      upcomingSessions: stats.upcomingSessions,
      aiMotivationalTip: stats.aiMotivationalTip,
      topGoal: stats.topGoal,
      dashboardUrl: `${BASE_URL}/dashboard`,
    });

    res.json({
      subject,
      html,
      memberId: profile.id,
      memberEmail: profile.email,
      stats: {
        wellnessScoreThisWeek: stats.wellnessScoreThisWeek,
        wellnessScoreLastWeek: stats.wellnessScoreLastWeek,
        habitsCompleted: stats.habitsCompleted,
        habitsPlanned: stats.habitsPlanned,
        upcomingSessionCount: stats.upcomingSessions.length,
        topGoal: stats.topGoal,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// ── Testimonials ──────────────────────────────────────────────────────────────

// Public endpoint — returns visible testimonials for landing & How It Works pages
router.get("/testimonials", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(testimonials)
      .where(eq(testimonials.isVisible, true))
      .orderBy(asc(testimonials.displayOrder), asc(testimonials.createdAt));
    res.json({ testimonials: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /admin/send-test-digest
 * Triggers a test weekly digest email for a specific member (or the requesting admin).
 * Body: { memberId?: string } — omit to send to the requesting admin's own email.
 */
router.post("/admin/send-test-digest", async (req, res) => {
  const targetId: string = (req.body as { memberId?: string }).memberId ?? req.user!.id;

  try {
    const [profile] = await db
      .select({ id: profiles.id, email: profiles.email, displayName: profiles.displayName })
      .from(profiles)
      .where(eq(profiles.id, targetId))
      .limit(1);

    if (!profile) {
      res.status(404).json({ error: "Member not found" });
      return;
    }

    const stats = await buildDigestForMember(profile.id);
    if (!stats) {
      res.status(500).json({ error: "Could not build digest for member" });
      return;
    }

    const { subject, html } = weeklyDigestEmail({
      displayName: profile.displayName,
      wellnessScoreThisWeek: stats.wellnessScoreThisWeek,
      wellnessScoreLastWeek: stats.wellnessScoreLastWeek,
      habitsCompleted: stats.habitsCompleted,
      habitsPlanned: stats.habitsPlanned,
      upcomingSessions: stats.upcomingSessions,
      aiMotivationalTip: stats.aiMotivationalTip,
      topGoal: stats.topGoal,
      dashboardUrl: `${BASE_URL}/dashboard`,
    });

    await sendEmail(profile.id, profile.email, `[TEST] ${subject}`, html, "weekly-summary");

    res.json({
      ok: true,
      sentTo: profile.email,
      subject: `[TEST] ${subject}`,
      stats: {
        wellnessScoreThisWeek: stats.wellnessScoreThisWeek,
        wellnessScoreLastWeek: stats.wellnessScoreLastWeek,
        habitsCompleted: stats.habitsCompleted,
        habitsPlanned: stats.habitsPlanned,
        upcomingSessionCount: stats.upcomingSessions.length,
        topGoal: stats.topGoal,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// Admin: list all testimonials (including hidden)
router.get("/admin/testimonials", async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(testimonials)
      .orderBy(asc(testimonials.displayOrder), asc(testimonials.createdAt));
    res.json({ testimonials: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// Admin: create testimonial
router.post("/admin/testimonials", async (req, res) => {
  try {
    const { name, location, goal, quote, stars, isVisible, displayOrder } = req.body as {
      name: string;
      location?: string;
      goal?: string;
      quote: string;
      stars?: number;
      isVisible?: boolean;
      displayOrder?: number;
    };
    if (!name || !quote) {
      res.status(400).json({ error: "name and quote are required" });
      return;
    }
    const [row] = await db
      .insert(testimonials)
      .values({
        id: randomUUID(),
        name,
        location: location ?? null,
        goal: goal ?? null,
        quote,
        stars: stars ?? 5,
        isVisible: isVisible ?? true,
        displayOrder: displayOrder ?? 0,
      })
      .returning();
    res.json({ testimonial: row });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// Admin: update testimonial
router.patch("/admin/testimonials/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, location, goal, quote, stars, isVisible, displayOrder } = req.body as {
      name?: string;
      location?: string;
      goal?: string;
      quote?: string;
      stars?: number;
      isVisible?: boolean;
      displayOrder?: number;
    };
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (location !== undefined) updates.location = location;
    if (goal !== undefined) updates.goal = goal;
    if (quote !== undefined) updates.quote = quote;
    if (stars !== undefined) updates.stars = stars;
    if (isVisible !== undefined) updates.isVisible = isVisible;
    if (displayOrder !== undefined) updates.displayOrder = displayOrder;

    const [row] = await db
      .update(testimonials)
      .set(updates)
      .where(eq(testimonials.id, id))
      .returning();

    if (!row) {
      res.status(404).json({ error: "Testimonial not found" });
      return;
    }
    res.json({ testimonial: row });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// Admin: delete testimonial
router.delete("/admin/testimonials/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await db.delete(testimonials).where(eq(testimonials.id, id));
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// ── Re-engagement helpers ────────────────────────────────────────────────────

/**
 * Fetch the top plan items for a member's latest plan.
 * Returns up to 3 items sorted by score descending.
 */
async function getTopPlanItems(profileId: string) {
  const [latestPlan] = await db
    .select({ id: plans.id, budget: plans.budget, totalMonthlyCost: plans.totalMonthlyCost })
    .from(plans)
    .where(eq(plans.profileId, profileId))
    .orderBy(desc(plans.createdAt))
    .limit(1);

  if (!latestPlan) return { plan: null, items: [] };

  const items = await db
    .select({
      emoji: modalities.emoji,
      name: modalities.name,
      estimatedMonthlyCost: planItems.estimatedMonthlyCost,
      frequency: planItems.frequency,
      nearbyProviderCount: planItems.nearbyProviderCount,
    })
    .from(planItems)
    .innerJoin(modalities, eq(planItems.modalityId, modalities.id))
    .where(eq(planItems.planId, latestPlan.id))
    .orderBy(desc(planItems.score))
    .limit(3);

  const totalNearby = items.reduce((s, i) => s + (i.nearbyProviderCount ?? 0), 0);

  return { plan: { ...latestPlan, nearbyProviderCount: totalNearby }, items };
}

/**
 * Core re-engagement send logic for a single member.
 * Returns 'sent' | 'skipped' | 'no-plan' | 'no-email'.
 *
 * NOTE: 'sent' reflects a successful Resend API call attempt. `sendEmail()` is
 * fire-and-forget (void) and handles provider errors internally by logging a
 * 'failed' row in notification_log. To check actual delivery status post-send,
 * query notification_log for the member's most recent re-engagement-dayN row.
 *
 * NOTE: This helper does NOT check Plus/Employer subscription status.
 * The admin single-send endpoint intentionally uses it as an override to allow
 * admins to test any member. The bulk endpoint applies the subscription filter
 * before calling this function.
 */
async function sendReEngagementEmail(
  memberId: string,
  day: 3 | 7,
): Promise<"sent" | "skipped" | "no-plan" | "no-email"> {
  const notifType = day === 3 ? ("re-engagement-day3" as const) : ("re-engagement-day7" as const);
  const appUrl = process.env.APP_URL ?? BASE_URL;

  // Fetch profile
  const [profile] = await db
    .select({ id: profiles.id, email: profiles.email, displayName: profiles.displayName, communicationPrefs: profiles.communicationPrefs })
    .from(profiles)
    .where(eq(profiles.id, memberId))
    .limit(1);

  if (!profile?.email) return "no-email";

  // Respect email opt-out
  const prefs = await getCommsPrefs(memberId);
  if (!prefs.email) return "skipped";

  // Deduplication: don't re-send if we already sent this type for this member
  const [existingLog] = await db
    .select({ id: notificationLog.id })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.profileId, memberId),
        eq(notificationLog.type, notifType),
        eq(notificationLog.status, "sent"),
      ),
    )
    .limit(1);

  if (existingLog) return "skipped";

  // Fetch plan items
  const { plan, items } = await getTopPlanItems(memberId);
  if (!plan) return "no-plan";

  const planUrl = `${appUrl}/plan`;
  const upgradeUrl = `${appUrl}/pricing?utm_source=email&utm_campaign=re-engagement-day${day}`;
  const unsubscribeUrl = `${appUrl}/profile`;

  let subject: string;
  let html: string;

  if (day === 3) {
    ({ subject, html } = planSummaryEmail({
      displayName: profile.displayName,
      topModalities: items,
      monthlyBudget: plan.budget,
      planUrl,
      upgradeUrl,
      unsubscribeUrl,
    }));
  } else {
    ({ subject, html } = planNudgeEmail({
      displayName: profile.displayName,
      topModalities: items,
      monthlyBudget: plan.budget,
      nearbyProviderCount: plan.nearbyProviderCount,
      planUrl,
      upgradeUrl,
      unsubscribeUrl,
    }));
  }

  await sendEmail(profile.id, profile.email, subject, html, notifType);
  return "sent";
}

/**
 * POST /api/admin/re-engagement/send
 * Send a re-engagement email to a specific member.
 * Body: { memberId: string; day: 3 | 7 }
 */
router.post("/admin/re-engagement/send", async (req, res) => {
  try {
    const { memberId, day } = req.body as { memberId?: string; day?: number };
    if (!memberId) {
      res.status(400).json({ error: "memberId is required" });
      return;
    }
    if (day !== 3 && day !== 7) {
      res.status(400).json({ error: "day must be 3 or 7" });
      return;
    }

    const result = await sendReEngagementEmail(memberId, day);
    res.json({ result, memberId, day });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/admin/re-engagement/bulk
 * Bulk-trigger re-engagement emails for all eligible members.
 * Eligibility: has plan, no active Plus subscription, created plan >= N days ago,
 * no prior re-engagement email of that type (day).
 * Body: { day: 3 | 7 }
 * Returns: { dispatched, skipped, errors, total }
 */
router.post("/admin/re-engagement/bulk", async (req, res) => {
  try {
    const { day } = req.body as { day?: number };
    if (day !== 3 && day !== 7) {
      res.status(400).json({ error: "day must be 3 or 7" });
      return;
    }

    const notifType = day === 3 ? ("re-engagement-day3" as const) : ("re-engagement-day7" as const);
    const cutoff = new Date(Date.now() - day * 24 * 60 * 60 * 1000);

    // Build a subquery that finds each member's LATEST plan creation timestamp.
    // Only members whose *latest* plan was created >= `day` days ago are eligible.
    // This prevents targeting a member who recently rebuilt their plan.
    const latestPlanPerMember = db
      .select({
        profileId: plans.profileId,
        latestAt: sql<Date>`max(${plans.createdAt})`.as("latest_at"),
      })
      .from(plans)
      .groupBy(plans.profileId)
      .as("latest_plan_per_member");

    // Find all eligible profileIds:
    // 1. Latest plan was created >= `day` days ago
    // 2. No prior re-engagement notification of this type (deduplication)
    // 3. Subscription filter applied in-memory below
    const eligibleRows = await db
      .select({ profileId: latestPlanPerMember.profileId })
      .from(latestPlanPerMember)
      .where(
        and(
          lte(latestPlanPerMember.latestAt, cutoff),
          notExists(
            db
              .select({ id: notificationLog.id })
              .from(notificationLog)
              .where(
                and(
                  eq(notificationLog.profileId, latestPlanPerMember.profileId),
                  eq(notificationLog.type, notifType),
                  eq(notificationLog.status, "sent"),
                ),
              ),
          ),
        ),
      );

    const candidateIds = eligibleRows.map((r) => r.profileId).filter(Boolean) as string[];

    // Filter out Plus/Employer subscribers — only fetch the candidate profile rows
    const allProfiles = candidateIds.length > 0
      ? await db
          .select({ id: profiles.id, subscriptionStatus: profiles.subscriptionStatus })
          .from(profiles)
          .where(sql`${profiles.id} = ANY(${candidateIds})`)
      : [];

    const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
    const nonPlusIds = candidateIds.filter((id) => {
      const p = profileMap.get(id);
      return p && p.subscriptionStatus !== "plus" && p.subscriptionStatus !== "employer";
    });

    let dispatched = 0;
    let skipped = 0;
    let errors = 0;

    for (const memberId of nonPlusIds) {
      try {
        const result = await sendReEngagementEmail(memberId, day);
        if (result === "sent") dispatched++;
        else skipped++;
      } catch (e) {
        console.error(`[re-engagement] Failed for member ${memberId}:`, e);
        errors++;
      }
    }

    res.json({ dispatched, skipped, errors, total: nonPlusIds.length, day });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
