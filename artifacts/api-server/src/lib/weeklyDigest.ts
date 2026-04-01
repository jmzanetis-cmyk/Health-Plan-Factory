/**
 * Weekly Wellness Digest generation logic.
 * Aggregates member stats (wellness score delta, habit completions, upcoming sessions)
 * and calls the AI to produce a personalized motivational tip.
 */
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import {
  memberIntakes,
  modalities,
  planItems,
  planProgressLogs,
  plans,
  profiles,
} from "@workspace/db";
import { eq, and, gte, lt, gt, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";

const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// Estimate number of planned sessions per week from a plan_items frequency string
// e.g. "2x/week" → 2, "Monthly" → 0.25, "Weekly" → 1, "Daily" → 7
function frequencyToWeeklyCount(freq: string): number {
  const lower = freq.toLowerCase().trim();
  const match = lower.match(/(\d+(?:\.\d+)?)\s*x?\s*\/\s*week/);
  if (match) return parseFloat(match[1]);
  if (/daily|every day/i.test(lower)) return 7;
  if (/weekly|once\s*\/?\s*week|1\s*x\s*\/\s*week/i.test(lower)) return 1;
  if (/bi-?weekly|twice\s*\/?\s*week|every other|2\s*x\s*\/\s*week/i.test(lower)) return 2;
  if (/monthly|once\s*\/?\s*month/i.test(lower)) return 0.25;
  if (/bi-?monthly|twice\s*\/?\s*month/i.test(lower)) return 0.5;
  return 1; // fallback
}

export interface DigestStats {
  wellnessScoreThisWeek: number | null;
  wellnessScoreLastWeek: number | null;
  habitsCompleted: number;
  habitsPlanned: number;
  upcomingSessions: Array<{ modalityName: string; sessionDate: Date }>;
  topGoal: string | null;
  aiMotivationalTip: string;
}

async function generateAiTip(
  displayName: string | null,
  topGoal: string | null,
  wellnessScoreThisWeek: number | null,
  habitsCompleted: number,
  habitsPlanned: number,
): Promise<string> {
  if (!anthropic) {
    return "Keep showing up for yourself — every small step toward your wellness goal counts. Consistency is the foundation of lasting health.";
  }

  const habitRate =
    habitsPlanned > 0 ? Math.round((habitsCompleted / habitsPlanned) * 100) : 0;

  const prompt = `You are a warm, evidence-based wellness coach. Write a single short motivational tip (2-3 sentences max) personalized to this member's week. Be specific, encouraging, and actionable.

Member context:
- Name: ${displayName ?? "Member"}
- Top health goal: ${topGoal ?? "general wellness"}
- Wellness score this week: ${wellnessScoreThisWeek != null ? `${wellnessScoreThisWeek}/10` : "not recorded"}
- Habit completion rate: ${habitRate}% (${habitsCompleted} of ${habitsPlanned} planned sessions)

Write only the tip text (no quotes, no intro like "Sure!" or "Here is your tip:").`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 150,
      messages: [{ role: "user", content: prompt }],
    });
    const content = response.content[0];
    if (content?.type === "text") return content.text.trim();
  } catch (err) {
    console.error("[weeklyDigest] AI tip generation failed:", err);
  }

  return "You're building something meaningful — one session at a time. Keep honoring your commitment to yourself this week.";
}

export async function buildDigestForMember(profileId: string): Promise<DigestStats | null> {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Load profile
  const [profile] = await db
    .select({ displayName: profiles.displayName })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);

  if (!profile) return null;

  // Wellness score: average rating from plan_progress_logs this week vs last week
  const thisWeekLogs = await db
    .select({ rating: planProgressLogs.rating, id: planProgressLogs.id })
    .from(planProgressLogs)
    .where(
      and(
        eq(planProgressLogs.profileId, profileId),
        gte(planProgressLogs.createdAt, sevenDaysAgo),
      ),
    );

  const lastWeekLogs = await db
    .select({ rating: planProgressLogs.rating })
    .from(planProgressLogs)
    .where(
      and(
        eq(planProgressLogs.profileId, profileId),
        gte(planProgressLogs.createdAt, fourteenDaysAgo),
        lt(planProgressLogs.createdAt, sevenDaysAgo),
        sql`${planProgressLogs.rating} IS NOT NULL`,
      ),
    );

  const thisWeekRated = thisWeekLogs.filter((l) => l.rating != null);
  const wellnessScoreThisWeek =
    thisWeekRated.length > 0
      ? Math.round(
          (thisWeekRated.reduce((sum, l) => sum + (l.rating ?? 0), 0) / thisWeekRated.length) * 10,
        ) / 10
      : null;

  const wellnessScoreLastWeek =
    lastWeekLogs.length > 0
      ? Math.round(
          (lastWeekLogs.reduce((sum, l) => sum + (l.rating ?? 0), 0) / lastWeekLogs.length) * 10,
        ) / 10
      : null;

  // Habits completed = number of log entries this week
  const habitsCompleted = thisWeekLogs.length;

  // Habits planned = sum of weekly session targets from the member's active plan items
  // Fall back to last-week session count if no active plan is found
  let habitsPlanned = habitsCompleted; // sensible default

  const [activePlan] = await db
    .select({ id: plans.id })
    .from(plans)
    .where(eq(plans.profileId, profileId))
    .orderBy(desc(plans.updatedAt))
    .limit(1);

  if (activePlan) {
    const items = await db
      .select({ frequency: planItems.frequency })
      .from(planItems)
      .where(eq(planItems.planId, activePlan.id));

    const weeklyTarget = items.reduce(
      (sum, item) => sum + frequencyToWeeklyCount(item.frequency),
      0,
    );

    if (weeklyTarget > 0) {
      habitsPlanned = Math.round(weeklyTarget);
    }
  }

  // Ensure planned >= 1 so we avoid division by zero elsewhere
  habitsPlanned = Math.max(habitsPlanned, 1);

  // Upcoming sessions: future sessionDate entries, joined with modalities for display name
  const upcomingRaw = await db
    .select({
      modalityId: planProgressLogs.modalityId,
      sessionDate: planProgressLogs.sessionDate,
      modalityName: modalities.name,
    })
    .from(planProgressLogs)
    .leftJoin(modalities, eq(planProgressLogs.modalityId, modalities.id))
    .where(
      and(
        eq(planProgressLogs.profileId, profileId),
        gt(planProgressLogs.sessionDate, now),
      ),
    )
    .orderBy(planProgressLogs.sessionDate)
    .limit(5);

  const upcomingSessions = upcomingRaw
    .filter((r) => r.sessionDate != null)
    .map((r) => ({
      modalityName: r.modalityName ?? r.modalityId ?? "Wellness Session",
      sessionDate: new Date(r.sessionDate!),
    }));

  // Top goal from most recent member intake
  const [intake] = await db
    .select({ goals: memberIntakes.goals })
    .from(memberIntakes)
    .where(eq(memberIntakes.profileId, profileId))
    .orderBy(sql`${memberIntakes.createdAt} DESC`)
    .limit(1);

  const topGoal = intake?.goals?.[0] ?? null;

  // AI tip
  const aiMotivationalTip = await generateAiTip(
    profile.displayName,
    topGoal,
    wellnessScoreThisWeek,
    habitsCompleted,
    habitsPlanned,
  );

  return {
    wellnessScoreThisWeek,
    wellnessScoreLastWeek,
    habitsCompleted,
    habitsPlanned,
    upcomingSessions,
    topGoal,
    aiMotivationalTip,
  };
}
