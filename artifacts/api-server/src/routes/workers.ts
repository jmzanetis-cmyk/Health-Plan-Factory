import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { planProgressLogs, plans, planItems, profiles, coachMemories, modalities, memberIntakes } from "@workspace/db";
import { eq, desc, and } from "drizzle-orm";
import { aiLimiter } from "../middlewares/rateLimit";

const router = Router();
router.use("/workers", aiLimiter);

const TONE_RULES = `
Rules (non-negotiable):
- Respond in exactly ONE sentence.
- Reference the member's actual data when available.
- Never use exclamation marks.
- Never use emojis.
- Never say: amazing, awesome, fantastic, great job, you've got this, superstar.
- Treat the member as a capable adult.
- Quiet confidence — no hype.`;

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

function getClient(): Anthropic | null {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

async function callWorker(systemPrompt: string, trigger: string): Promise<string> {
  const client = getClient();
  if (!client) throw new Error("AI not configured");

  const res = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 120,
    system: systemPrompt + TONE_RULES,
    messages: [{ role: "user", content: `trigger: ${trigger || "default"}` }],
  });

  const text = res.content[0]?.type === "text" ? res.content[0].text.trim() : "";
  return text || "Ready when you are.";
}

async function getMemoryFacts(profileId: string): Promise<string> {
  try {
    const [mem] = await db
      .select({ facts: coachMemories.facts, summary: coachMemories.summary })
      .from(coachMemories)
      .where(eq(coachMemories.profileId, profileId))
      .limit(1);
    if (!mem) return "";
    const facts = Array.isArray(mem.facts) ? (mem.facts as string[]).slice(0, 6) : [];
    const lines: string[] = [];
    if (mem.summary) lines.push(mem.summary);
    if (facts.length) lines.push(facts.join("; "));
    return lines.join(" | ");
  } catch {
    return "";
  }
}

// ── POST /api/workers/sydney ─────────────────────────────────────────────

router.post("/workers/sydney", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { trigger = "default" } = req.body as { trigger?: string; context?: string };
  const userId = req.user!.id;

  try {
    const [profile] = await db
      .select({
        displayName: profiles.displayName,
        subscriptionStatus: profiles.subscriptionStatus,
      })
      .from(profiles)
      .where(eq(profiles.id, userId))
      .limit(1);

    const logs = await db
      .select({ createdAt: planProgressLogs.createdAt, rating: planProgressLogs.rating })
      .from(planProgressLogs)
      .where(eq(planProgressLogs.profileId, userId))
      .orderBy(desc(planProgressLogs.createdAt))
      .limit(5);

    const planCount = await db
      .select({ id: plans.id })
      .from(plans)
      .where(eq(plans.profileId, userId))
      .limit(1);

    const memory = await getMemoryFacts(userId);

    const system = `You are Sydney, the welcome host at Health Plan Factory. You greet members warmly and help them understand what to focus on today.

Member context:
Name: ${profile?.displayName ?? "there"}
Subscription: ${profile?.subscriptionStatus ?? "free"}
Total check-ins: ${logs.length > 0 ? logs.length : "none yet"}
Last check-in: ${logs[0] ? new Date(logs[0].createdAt).toLocaleDateString() : "never"}
Has a wellness plan: ${planCount.length > 0 ? "yes" : "no"}
Last mood score: ${logs[0]?.rating != null ? `${logs[0].rating}/10` : "not recorded"}
Trigger: ${trigger}
${memory ? `What we know about them: ${memory}` : ""}

Sydney's voice: warm, welcoming, concise.
- If no plan: guide them toward building one.
- If no check-ins: encourage their first.
- If returning with data: reference streak or recent scores.`;

    const message = await callWorker(system, trigger);
    res.json({ message, characterName: "sydney" });
  } catch (err) {
    req.log?.error({ err }, "workers/sydney error");
    res.json({ message: "Welcome back.", characterName: "sydney" });
  }
});

// ── POST /api/workers/fabio ──────────────────────────────────────────────

router.post("/workers/fabio", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { trigger = "default" } = req.body as { trigger?: string; context?: string };
  const userId = req.user!.id;

  try {
    const userPlans = await db
      .select({ id: plans.id, budget: plans.budget, status: plans.status })
      .from(plans)
      .where(eq(plans.profileId, userId))
      .orderBy(desc(plans.createdAt as Parameters<typeof desc>[0]))
      .limit(1);

    let modalityLines = "No plan yet.";
    if (userPlans.length > 0) {
      const items = await db
        .select({
          estimatedMonthlyCost: planItems.estimatedMonthlyCost,
          frequency: planItems.frequency,
        })
        .from(planItems)
        .where(eq(planItems.planId, userPlans[0].id))
        .limit(8);

      const allMods = await db.select({ id: modalities.id, name: modalities.name }).from(modalities);
      const modMap = Object.fromEntries(allMods.map((m) => [m.id, m.name]));

      const itemsWithNames = await db
        .select({ modalityId: planItems.modalityId, estimatedMonthlyCost: planItems.estimatedMonthlyCost, frequency: planItems.frequency })
        .from(planItems)
        .where(eq(planItems.planId, userPlans[0].id))
        .limit(8);

      modalityLines = itemsWithNames
        .map((it) => `${modMap[it.modalityId ?? ""] ?? "Service"}: $${it.estimatedMonthlyCost}/mo, ${it.frequency}`)
        .join("\n") || "Items pending.";

      void items; // suppress unused
    }

    const system = `You are Fabio, the plan architect at Health Plan Factory. You built this member's wellness plan.

Member's plan:
Budget: $${userPlans[0]?.budget ?? 0}/month
Status: ${userPlans[0]?.status ?? "no plan"}
Modalities:
${modalityLines}
Trigger: ${trigger}

Fabio's voice: confident, knowledgeable, explains the "why" behind plan decisions.
- If no plan: say you're ready to build one when they are.
- Reference specific modalities by name when possible.`;

    const message = await callWorker(system, trigger);
    res.json({ message, characterName: "fabio" });
  } catch (err) {
    req.log?.error({ err }, "workers/fabio error");
    res.json({ message: "Your plan is ready.", characterName: "fabio" });
  }
});

// ── POST /api/workers/sonia ──────────────────────────────────────────────

router.post("/workers/sonia", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { trigger = "default" } = req.body as { trigger?: string; context?: string };
  const userId = req.user!.id;

  try {
    type LogRow = { rating: number | null; createdAt: string };
    const logs = (await db
      .select({ rating: planProgressLogs.rating, createdAt: planProgressLogs.createdAt })
      .from(planProgressLogs)
      .where(eq(planProgressLogs.profileId, userId))
      .orderBy(desc(planProgressLogs.createdAt))
      .limit(14)) as unknown as LogRow[];

    // calculate streak
    const dates = [...new Set(logs.map((l) => new Date(l.createdAt).toDateString()))];
    let streak = 0;
    for (let i = 0; i < dates.length; i++) {
      const exp = new Date(Date.now() - i * 86400000).toDateString();
      if (dates[i] === exp) streak++;
      else break;
    }

    const history = logs
      .slice(0, 7)
      .map((l) => `${new Date(l.createdAt).toLocaleDateString()}: sleep/rating ${l.rating ?? "-"}`)
      .join("\n");

    const memory = await getMemoryFacts(userId);

    const system = `You are Sonia, the wellness coach at Health Plan Factory. You track how members feel and keep them accountable.

Member's recent check-ins (last 14 days):
${history || "No check-ins yet."}
Current streak: ${streak} days
Trigger: ${trigger}
${memory ? `What we know about them: ${memory}` : ""}

Sonia's voice: direct, caring, never preachy.
- Reference specific patterns in the data.
- Notice trends: improving, declining, consistent.
- If no check-ins: gently encourage the first one.
- If scores declining: acknowledge it directly.
- If improving: note it precisely.`;

    const message = await callWorker(system, trigger);
    res.json({ message, characterName: "sonia" });
  } catch (err) {
    req.log?.error({ err }, "workers/sonia error");
    res.json({ message: "How are you feeling today?", characterName: "sonia" });
  }
});

// ── POST /api/workers/franco ─────────────────────────────────────────────

router.post("/workers/franco", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { trigger = "default" } = req.body as { trigger?: string; context?: string };
  const userId = req.user!.id;

  try {
    type FrancoRow = { rating: number | null; createdAt: string };
    const logs = (await db
      .select({ rating: planProgressLogs.rating, createdAt: planProgressLogs.createdAt })
      .from(planProgressLogs)
      .where(eq(planProgressLogs.profileId, userId))
      .orderBy(desc(planProgressLogs.createdAt))
      .limit(30)) as unknown as FrancoRow[];

    const ratings = logs.map((l) => l.rating).filter((v): v is number => v != null);
    const avg = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "n/a";

    const recentTrend =
      ratings.length >= 6
        ? ratings.slice(0, 3).reduce((a, b) => a + b, 0) / 3 >
          ratings.slice(3, 6).reduce((a, b) => a + b, 0) / 3
          ? "improving"
          : "declining"
        : "insufficient data";

    const system = `You are Franco, the data analyst at Health Plan Factory. You track metrics and surface insights.

Member's data (last 30 days):
Total check-ins: ${logs.length}
Average sleep/rating score: ${avg}/10
Trend (last 6 vs prior 6): ${recentTrend}
Trigger: ${trigger}

Franco's voice: precise, data-driven.
- Reference specific numbers and patterns.
- Surface non-obvious insights.
- Example good: "Your scores are consistently lower on Mondays — that pattern has held 3 weeks."
- Example bad: "Keep up the good work."`;

    const message = await callWorker(system, trigger);
    res.json({ message, characterName: "franco" });
  } catch (err) {
    req.log?.error({ err }, "workers/franco error");
    res.json({ message: "Check your numbers.", characterName: "franco" });
  }
});

// ── POST /api/workers/arnold ─────────────────────────────────────────────

router.post("/workers/arnold", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;

  const { trigger = "default" } = req.body as { trigger?: string; context?: string };
  const userId = req.user!.id;

  try {
    const userPlans = await db
      .select({ id: plans.id, budget: plans.budget })
      .from(plans)
      .where(eq(plans.profileId, userId))
      .orderBy(desc(plans.createdAt as Parameters<typeof desc>[0]))
      .limit(1);

    let modalityLines = "No plan yet.";
    if (userPlans.length > 0) {
      const items = await db
        .select({ modalityId: planItems.modalityId, estimatedMonthlyCost: planItems.estimatedMonthlyCost })
        .from(planItems)
        .where(and(eq(planItems.planId, userPlans[0].id)))
        .limit(5);

      const allMods = await db.select({ id: modalities.id, name: modalities.name }).from(modalities);
      const modMap = Object.fromEntries(allMods.map((m) => [m.id, m.name]));
      modalityLines = items
        .map((it) => `${modMap[it.modalityId ?? ""] ?? "Service"}: $${it.estimatedMonthlyCost}/mo`)
        .join(", ") || "Items pending.";
    }

    const [intake] = await db
      .select({ zipCode: memberIntakes.zipCode })
      .from(memberIntakes)
      .where(eq(memberIntakes.profileId, userId))
      .orderBy(desc(memberIntakes.createdAt as Parameters<typeof desc>[0]))
      .limit(1);

    const system = `You are Arnold, the provider concierge at Health Plan Factory. You help members find and book wellness providers.

Member's plan modalities: ${modalityLines}
Member's zip code: ${(intake as { zipCode?: string | null } | undefined)?.zipCode ?? "not set"}
Trigger: ${trigger}

Arnold's voice: practical, well-connected.
- Reference specific modalities from their plan.
- Help them take action: find, book, follow up.
- If no bookings: encourage booking the top modality.`;

    const message = await callWorker(system, trigger);
    res.json({ message, characterName: "arnold" });
  } catch (err) {
    req.log?.error({ err }, "workers/arnold error");
    res.json({ message: "Find a provider.", characterName: "arnold" });
  }
});

export default router;
