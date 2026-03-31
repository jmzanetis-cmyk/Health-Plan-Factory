import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import {
  planProgressLogs,
  planItems,
  plans,
  modalities,
  insightsCache,
  type InsightCard,
  type AttentionItem,
  type PlanProgressLog,
  type Modality,
  type PlanItem,
} from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

function avg(values: number[]): number | null {
  const valid = values.filter((v) => typeof v === "number" && !isNaN(v));
  if (valid.length === 0) return null;
  return valid.reduce((s, v) => s + v, 0) / valid.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

const WHY_IT_MATTERS: Record<string, Record<string, string>> = {
  pain: {
    default:
      "Reduced pain scores indicate your nervous system is responding well to this modality. Consistent sessions help sustain this effect.",
    massage:
      "Massage therapy reduces pain by increasing circulation, releasing muscle tension, and activating the parasympathetic nervous system.",
    acupuncture:
      "Acupuncture modulates pain pathways through endorphin release and improved blood flow to targeted areas.",
    chiropractic:
      "Chiropractic adjustments reduce musculoskeletal pain by restoring joint mobility and reducing nerve irritation.",
    "physical-therapy":
      "Physical therapy addresses the root cause of pain through targeted strengthening and mobility exercises.",
    yoga: "Yoga reduces chronic pain by improving flexibility, body awareness, and stress hormones that amplify pain signals.",
  },
  energy: {
    default:
      "Higher energy scores reflect improved mitochondrial efficiency and reduced inflammation — hallmarks of effective wellness routines.",
    yoga: "Yoga's breathwork and movement sequencing directly improve oxygen delivery and reduce the stress response that drains energy.",
    meditation:
      "Regular meditation reduces cortisol, restoring the adrenal rhythm that governs your daily energy cycles.",
    "personal-training":
      "Progressive exercise increases mitochondrial density, producing more cellular energy over time.",
    nutrition:
      "Optimal nutrition stabilizes blood sugar, preventing the energy crashes linked to poor dietary patterns.",
  },
  mood: {
    default:
      "Mood improvements reflect positive shifts in neurotransmitter balance — your wellness routine is working at a neurochemical level.",
    meditation:
      "Meditation increases gray matter density in areas governing emotional regulation, producing lasting mood improvements.",
    yoga: "Yoga elevates GABA levels, the brain's primary calming neurotransmitter, explaining its well-documented mood benefits.",
    massage:
      "Massage therapy decreases cortisol and increases serotonin and dopamine — directly improving emotional state.",
  },
  rating: {
    default:
      "Your overall wellness rating captures how all systems — physical, mental, and emotional — are integrating. Positive trends here matter most.",
  },
};

function getWhyItMatters(metric: string, modalityId: string): string {
  const metricMap = WHY_IT_MATTERS[metric] ?? WHY_IT_MATTERS.rating;
  return metricMap[modalityId] ?? metricMap.default;
}

function metricLabel(metric: string): string {
  const map: Record<string, string> = {
    pain: "pain score",
    energy: "energy score",
    mood: "mood score",
    rating: "wellness rating",
  };
  return map[metric] ?? metric;
}

function buildHeadline(
  modalityName: string,
  metric: string,
  withAvg: number,
  withoutAvg: number
): string {
  const label = metricLabel(metric);
  const improvement =
    metric === "pain"
      ? withAvg < withoutAvg
        ? "lower"
        : "higher"
      : withAvg > withoutAvg
        ? "higher"
        : "lower";
  return `On days after a ${modalityName} session, your ${label} averaged ${round1(withAvg)} vs ${round1(withoutAvg)} on other days — ${improvement} by ${Math.abs(Math.round(((withAvg - withoutAvg) / (withoutAvg || 1)) * 100))}%.`;
}

/**
 * Build a 90-day sparkline for a given metric.
 * Each point is a journal entry; hasSession indicates whether a session of
 * the given modality occurred within the preceding 2 days.
 */
function buildSparkline(
  journalEntries: PlanProgressLog[],
  sessionRecords: PlanProgressLog[],
  metric: keyof Pick<PlanProgressLog, "pain" | "energy" | "mood" | "rating">,
  modalityId: string
): Array<{ date: string; value: number; hasSession: boolean }> {
  const ninetyDaysAgo = Date.now() - 90 * 24 * 3600 * 1000;
  const TWO_DAYS_MS = 2 * 24 * 3600 * 1000;

  // Index session records by modality for fast lookup
  const sessionDates = sessionRecords
    .filter((s) => s.modalityId === modalityId && s.sessionDate != null)
    .map((s) => new Date(s.sessionDate!).getTime());

  return journalEntries
    .filter((j) => j[metric] != null && new Date(j.createdAt).getTime() > ninetyDaysAgo)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((j) => {
      const jTime = new Date(j.createdAt).getTime();
      const hasSession = sessionDates.some(
        (sTime) => sTime <= jTime && sTime >= jTime - TWO_DAYS_MS
      );
      return {
        date: new Date(j.createdAt).toISOString().slice(0, 10),
        value: j[metric] as number,
        hasSession,
      };
    });
}

function computeWellnessScore(
  journalEntries: PlanProgressLog[],
  sessionRecords: PlanProgressLog[],
  activePlanItems: PlanItem[]
): number {
  if (journalEntries.length === 0) return 0;

  // Base score from average journal rating (0–70 pts), last 30 entries
  const ratingEntries = journalEntries
    .filter((l) => l.rating != null)
    .slice(0, 30);
  const avgRating =
    ratingEntries.length > 0
      ? ratingEntries.reduce((s, l) => s + (l.rating ?? 0), 0) / ratingEntries.length
      : 5;
  const baseScore = (avgRating / 10) * 70;

  // Session completion rate (0–20 pts): distinct modalities with a session in last 30 days
  const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;
  const recentSessionModalities = new Set(
    sessionRecords
      .filter(
        (s) =>
          s.modalityId != null &&
          s.sessionDate != null &&
          new Date(s.sessionDate).getTime() > thirtyDaysAgo
      )
      .map((s) => s.modalityId as string)
  );
  const completionRate =
    activePlanItems.length > 0
      ? recentSessionModalities.size / activePlanItems.length
      : 0;
  const completionScore = Math.min(20, completionRate * 20);

  // Journal trend (0–10 pts): recent 7 vs previous 7 journal entries
  const last7 = journalEntries.slice(0, 7).filter((l) => l.rating != null);
  const prev7 = journalEntries.slice(7, 14).filter((l) => l.rating != null);
  const last7Avg = avg(last7.map((l) => l.rating as number));
  const prev7Avg = avg(prev7.map((l) => l.rating as number));
  let trendScore = 5;
  if (last7Avg !== null && prev7Avg !== null) {
    if (last7Avg > prev7Avg + 0.5) trendScore = 10;
    else if (last7Avg < prev7Avg - 0.5) trendScore = 0;
  }

  return Math.round(Math.min(100, baseScore + completionScore + trendScore));
}

export async function computeAndCacheInsights(profileId: string): Promise<void> {
  // Fetch ALL planProgressLogs for this member, most recent first
  const allLogs = await db
    .select()
    .from(planProgressLogs)
    .where(eq(planProgressLogs.profileId, profileId))
    .orderBy(desc(planProgressLogs.createdAt));

  // Separate into journal entries (has at least one metric) and session records (has sessionDate + modalityId)
  const journalEntries = allLogs.filter(
    (l) => l.rating != null || l.mood != null || l.pain != null || l.energy != null
  );
  const sessionRecords = allLogs.filter(
    (l) => l.sessionDate != null && l.modalityId != null
  );

  // Fetch the latest active plan's items
  const latestPlan = await db
    .select()
    .from(plans)
    .where(eq(plans.profileId, profileId))
    .orderBy(desc(plans.createdAt))
    .limit(1);

  let activePlanItems: PlanItem[] = [];
  if (latestPlan.length > 0) {
    activePlanItems = await db
      .select()
      .from(planItems)
      .where(eq(planItems.planId, latestPlan[0].id));
  }

  // Fetch all modalities for name/emoji lookup
  const allModalities = await db.select().from(modalities);
  const modalityMap = new Map<string, Modality>(allModalities.map((m) => [m.id, m]));

  const journalCount = journalEntries.length;
  const sessionCount = sessionRecords.length;

  const wellnessScore = computeWellnessScore(journalEntries, sessionRecords, activePlanItems);

  const insights: InsightCard[] = [];
  const attentionItems: AttentionItem[] = [];

  // Only compute correlations if member has enough journal data
  if (journalCount >= 14) {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 3600 * 1000;
    const TWO_DAYS_MS = 2 * 24 * 3600 * 1000;

    // Restrict to last 90 days for correlations
    const recentJournals = journalEntries.filter(
      (j) => new Date(j.createdAt).getTime() > ninetyDaysAgo
    );

    const planModalityIds = activePlanItems.map((pi) => pi.modalityId);
    const usedModalityIds = [
      ...new Set(
        sessionRecords
          .filter((s) => new Date(s.sessionDate!).getTime() > ninetyDaysAgo)
          .map((s) => s.modalityId as string)
      ),
    ];
    const allModalityIds = [...new Set([...planModalityIds, ...usedModalityIds])];

    const metrics = ["pain", "energy", "mood", "rating"] as const;

    for (const modalityId of allModalityIds) {
      const mod = modalityMap.get(modalityId);
      if (!mod) continue;

      // Build per-journal-entry cohorts using 2-day lookback join
      const modalitySessions = sessionRecords.filter(
        (s) =>
          s.modalityId === modalityId &&
          s.sessionDate != null &&
          new Date(s.sessionDate).getTime() > ninetyDaysAgo
      );

      if (modalitySessions.length < 2) continue;

      const sessionTimestamps = modalitySessions.map((s) =>
        new Date(s.sessionDate!).getTime()
      );

      // For each journal entry, determine if a session occurred in the prior 2 days
      const withSession: PlanProgressLog[] = [];
      const withoutSession: PlanProgressLog[] = [];

      for (const journal of recentJournals) {
        const jTime = new Date(journal.createdAt).getTime();
        const hadRecentSession = sessionTimestamps.some(
          (sTime) => sTime <= jTime && sTime >= jTime - TWO_DAYS_MS
        );
        if (hadRecentSession) {
          withSession.push(journal);
        } else {
          withoutSession.push(journal);
        }
      }

      if (withSession.length < 2 || withoutSession.length < 2) continue;

      let bestInsight: InsightCard | null = null;
      let bestPctDiff = 0;

      for (const metric of metrics) {
        const withVals = withSession
          .map((l) => l[metric])
          .filter((v): v is number => v != null);
        const withoutVals = withoutSession
          .map((l) => l[metric])
          .filter((v): v is number => v != null);

        const withAvgVal = avg(withVals);
        const withoutAvgVal = avg(withoutVals);

        if (withAvgVal === null || withoutAvgVal === null || withoutAvgVal === 0) continue;

        // For pain: improvement = withAvg < withoutAvg (lower is better)
        // For others: improvement = withAvg > withoutAvg (higher is better)
        const diff =
          metric === "pain"
            ? withoutAvgVal - withAvgVal
            : withAvgVal - withoutAvgVal;

        const pctDiff = Math.round((diff / withoutAvgVal) * 100);

        if (pctDiff >= 10 && pctDiff > bestPctDiff) {
          bestPctDiff = pctDiff;
          bestInsight = {
            modalityId,
            modalityName: mod.name,
            emoji: mod.emoji,
            metric,
            headline: buildHeadline(mod.name, metric, withAvgVal, withoutAvgVal),
            withSessionAvg: round1(withAvgVal),
            withoutSessionAvg: round1(withoutAvgVal),
            percentDiff: pctDiff,
            sessionCount: modalitySessions.length,
            sparklineData: buildSparkline(recentJournals, sessionRecords, metric, modalityId),
            whyItMatters: getWhyItMatters(metric, modalityId),
          };
        }
      }

      if (bestInsight) insights.push(bestInsight);
    }

    // Sort by impact (highest percentDiff first)
    insights.sort((a, b) => b.percentDiff - a.percentDiff);
  }

  // "What might need attention" — plan items with 0 sessions in the last 30 days
  if (activePlanItems.length > 0) {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 3600 * 1000;

    for (const item of activePlanItems) {
      const mod = modalityMap.get(item.modalityId);
      if (!mod) continue;

      const recentSessions = sessionRecords.filter(
        (s) =>
          s.modalityId === item.modalityId &&
          s.sessionDate != null &&
          new Date(s.sessionDate).getTime() > thirtyDaysAgo
      );

      if (recentSessions.length === 0) {
        const lastSession = sessionRecords.find(
          (s) => s.modalityId === item.modalityId && s.sessionDate != null
        );
        const daysSince = lastSession?.sessionDate
          ? Math.floor(
              (Date.now() - new Date(lastSession.sessionDate).getTime()) / 86400000
            )
          : null;

        attentionItems.push({
          modalityId: item.modalityId,
          modalityName: mod.name,
          emoji: mod.emoji,
          message:
            daysSince !== null
              ? `You haven't logged a ${mod.name} session in ${daysSince} days — your plan recommends it for ongoing benefit.`
              : `You haven't tried ${mod.name} yet — your plan includes it for your goals.`,
          daysSinceLastSession: daysSince,
        });
      }
    }
  }

  // Upsert the cache
  const existing = await db
    .select({ id: insightsCache.id })
    .from(insightsCache)
    .where(eq(insightsCache.profileId, profileId))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(insightsCache)
      .set({
        insights,
        attentionItems,
        wellnessScore,
        journalCount,
        sessionCount,
        refreshedAt: new Date(),
      })
      .where(eq(insightsCache.profileId, profileId));
  } else {
    await db.insert(insightsCache).values({
      id: randomUUID(),
      profileId,
      insights,
      attentionItems,
      wellnessScore,
      journalCount,
      sessionCount,
      refreshedAt: new Date(),
    });
  }
}

// GET /api/insights/mine
// Returns cached insights, refreshing automatically if stale (> 24 hrs) or missing.
router.get("/insights/mine", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;

  try {
    const cached = await db
      .select()
      .from(insightsCache)
      .where(eq(insightsCache.profileId, profileId))
      .limit(1);

    const STALE_HOURS = 24;
    const isStale =
      cached.length === 0 ||
      Date.now() - new Date(cached[0].refreshedAt).getTime() > STALE_HOURS * 3600 * 1000;

    if (isStale) {
      await computeAndCacheInsights(profileId);
      const refreshed = await db
        .select()
        .from(insightsCache)
        .where(eq(insightsCache.profileId, profileId))
        .limit(1);
      res.json(
        refreshed[0] ?? {
          insights: [],
          attentionItems: [],
          journalCount: 0,
          sessionCount: 0,
          wellnessScore: null,
        }
      );
      return;
    }

    res.json(cached[0]);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// POST /api/insights/refresh — force a refresh (member triggers manually)
router.post("/insights/refresh", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;

  try {
    await computeAndCacheInsights(profileId);
    const refreshed = await db
      .select()
      .from(insightsCache)
      .where(eq(insightsCache.profileId, profileId))
      .limit(1);
    res.json(
      refreshed[0] ?? {
        insights: [],
        attentionItems: [],
        journalCount: 0,
        sessionCount: 0,
        wellnessScore: null,
      }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
