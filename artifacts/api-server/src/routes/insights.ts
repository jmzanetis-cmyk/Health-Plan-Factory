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
  return `On days with ${modalityName} sessions, your ${label} averaged ${round1(withAvg)} vs ${round1(withoutAvg)} on other days — ${improvement} by ${Math.abs(Math.round(((withAvg - withoutAvg) / (withoutAvg || 1)) * 100))}%.`;
}

function buildSparkline(
  logs: PlanProgressLog[],
  metric: keyof Pick<PlanProgressLog, "pain" | "energy" | "mood" | "rating">,
  modalityId: string
): Array<{ date: string; value: number; hasSession: boolean }> {
  const sorted = [...logs]
    .filter((l) => l[metric] != null)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-30);

  return sorted.map((l) => ({
    date: new Date(l.createdAt).toISOString().slice(0, 10),
    value: l[metric] as number,
    hasSession: l.modalityId === modalityId,
  }));
}

function computeWellnessScore(
  logs: PlanProgressLog[],
  activePlanItems: PlanItem[]
): number {
  if (logs.length === 0) return 0;

  // Base score from average journal rating (0–70 pts)
  const ratingLogs = logs.filter((l) => l.rating != null).slice(0, 30);
  const avgRating =
    ratingLogs.length > 0
      ? ratingLogs.reduce((s, l) => s + (l.rating ?? 0), 0) / ratingLogs.length
      : 5;
  const baseScore = (avgRating / 10) * 70;

  // Session completion rate (0–20 pts)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const recentSessions = new Set(
    logs
      .filter((l) => l.modalityId && new Date(l.createdAt) > thirtyDaysAgo)
      .map((l) => l.modalityId)
  );
  const completionRate =
    activePlanItems.length > 0 ? recentSessions.size / activePlanItems.length : 0;
  const completionScore = Math.min(20, completionRate * 20);

  // Journal trend (0–10 pts): recent 7 vs previous 7
  const last7 = logs.slice(0, 7).filter((l) => l.rating != null);
  const prev7 = logs.slice(7, 14).filter((l) => l.rating != null);
  const last7Avg = avg(last7.map((l) => l.rating as number));
  const prev7Avg = avg(prev7.map((l) => l.rating as number));
  let trendScore = 5; // neutral
  if (last7Avg !== null && prev7Avg !== null) {
    if (last7Avg > prev7Avg + 0.5) trendScore = 10;
    else if (last7Avg < prev7Avg - 0.5) trendScore = 0;
  }

  return Math.round(Math.min(100, baseScore + completionScore + trendScore));
}

export async function computeAndCacheInsights(profileId: string): Promise<void> {
  // Fetch all journal/session logs for the member (most recent first)
  const logs = await db
    .select()
    .from(planProgressLogs)
    .where(eq(planProgressLogs.profileId, profileId))
    .orderBy(desc(planProgressLogs.createdAt));

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

  const journalCount = logs.length;
  const sessionCount = logs.filter((l) => l.modalityId != null).length;

  const wellnessScore = computeWellnessScore(logs, activePlanItems);

  const insights: InsightCard[] = [];
  const attentionItems: AttentionItem[] = [];

  // Only compute correlations if member has enough data
  if (journalCount >= 14) {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const recentLogs = logs.filter((l) => new Date(l.createdAt) > ninetyDaysAgo);

    const metrics = ["pain", "energy", "mood", "rating"] as const;
    const planModalityIds = activePlanItems.map((pi) => pi.modalityId);
    // Also include modalities the member has actually used
    const usedModalityIds = [...new Set(recentLogs.filter((l) => l.modalityId).map((l) => l.modalityId as string))];
    const allModalityIds = [...new Set([...planModalityIds, ...usedModalityIds])];

    for (const modalityId of allModalityIds) {
      const mod = modalityMap.get(modalityId);
      if (!mod) continue;

      const withSession = recentLogs.filter((l) => l.modalityId === modalityId);
      const withoutSession = recentLogs.filter((l) => l.modalityId !== modalityId);

      if (withSession.length < 2) continue;

      let bestInsight: InsightCard | null = null;
      let bestPctDiff = 0;

      for (const metric of metrics) {
        const withVals = withSession.map((l) => l[metric]).filter((v): v is number => v != null);
        const withoutVals = withoutSession.map((l) => l[metric]).filter((v): v is number => v != null);

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
            sessionCount: withSession.length,
            sparklineData: buildSparkline(recentLogs, metric, modalityId),
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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const item of activePlanItems) {
      const mod = modalityMap.get(item.modalityId);
      if (!mod) continue;

      const recentSessions = logs.filter(
        (l) =>
          l.modalityId === item.modalityId &&
          l.sessionDate != null &&
          new Date(l.sessionDate) > thirtyDaysAgo
      );

      if (recentSessions.length === 0) {
        // Find how many days since last session (if any)
        const lastSession = logs.find((l) => l.modalityId === item.modalityId && l.sessionDate != null);
        const daysSince = lastSession?.sessionDate
          ? Math.floor((Date.now() - new Date(lastSession.sessionDate).getTime()) / 86400000)
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
      res.json(refreshed[0] ?? { insights: [], attentionItems: [], journalCount: 0, sessionCount: 0, wellnessScore: null });
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
    res.json(refreshed[0] ?? { insights: [], attentionItems: [], journalCount: 0, sessionCount: 0, wellnessScore: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
