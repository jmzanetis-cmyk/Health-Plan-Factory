import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { insightsCache } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

const SYSTEM_PROMPT = `You are the HealthPlanFactory AI accountability coach — a warm, evidence-based wellness guide. 
You help members stay on track with their personalized health plans. 

Your role:
- Encourage consistent routine completion and celebrate streaks
- Answer questions about wellness modalities (acupuncture, massage, yoga, nutrition, etc.)
- Help members navigate their plan options and costs
- Provide motivation and accountability check-ins
- Support habit formation with practical, science-backed advice

Boundaries:
- You are NOT a medical provider or therapist
- Always recommend consulting a licensed healthcare provider for medical decisions
- Never diagnose conditions or prescribe treatments
- Keep responses concise and action-oriented (2-4 sentences max unless explaining a concept)

If the user mentions: suicide, self-harm, crisis, emergency, hurt myself, end my life — immediately respond with:
"I hear you, and I care about your safety. Please reach out to the 988 Suicide & Crisis Lifeline by calling or texting 988. You can also text HOME to 741741 for the Crisis Text Line. If you're in immediate danger, please call 911."

Tone: Warm, direct, encouraging — like a knowledgeable friend who genuinely wants you to succeed.`;

const EMERGENCY_KEYWORDS = ["suicide", "self-harm", "end my life", "kill myself", "hurt myself", "crisis"];

function containsEmergencyKeyword(text: string): boolean {
  const lower = text.toLowerCase();
  return EMERGENCY_KEYWORDS.some(kw => lower.includes(kw));
}

const EMERGENCY_RESPONSE = `I hear you, and I care about your safety. Please reach out to the **988 Suicide & Crisis Lifeline** by calling or texting **988**. You can also text HOME to **741741** for the Crisis Text Line. If you're in immediate danger, please call **911**.`;

router.post("/coach", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const { messages, context } = req.body as {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    context?: {
      planId?: string;
      streakDays?: number;
      recentMood?: number;
    };
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage?.role === "user" && containsEmergencyKeyword(lastMessage.content)) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.write(`data: ${JSON.stringify({ type: "text", text: EMERGENCY_RESPONSE })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "AI coach is not configured" });
    return;
  }

  const client = new Anthropic({ apiKey });

  let systemWithContext = SYSTEM_PROMPT;
  const contextParts: string[] = [];

  if (context) {
    if (context.streakDays !== undefined) contextParts.push(`Member's current streak: ${context.streakDays} days`);
    if (context.recentMood !== undefined) contextParts.push(`Recent mood score: ${context.recentMood}/5`);
  }

  // Enrich with top insights from the insights cache
  try {
    const profileId = req.user!.id;
    const cached = await db
      .select({ insights: insightsCache.insights, wellnessScore: insightsCache.wellnessScore })
      .from(insightsCache)
      .where(eq(insightsCache.profileId, profileId))
      .limit(1);

    if (cached.length > 0 && Array.isArray(cached[0].insights) && cached[0].insights.length > 0) {
      const topInsights = cached[0].insights.slice(0, 3);
      const insightLines = topInsights.map(
        (ins: { modalityName: string; percentDiff: number; metric: string }) =>
          `- ${ins.modalityName} correlates with ${ins.percentDiff}% improvement in ${ins.metric} scores`
      );
      contextParts.push(`Per member data (longitudinal correlations):\n${insightLines.join("\n")}`);
    }
    if (cached.length > 0 && cached[0].wellnessScore != null) {
      contextParts.push(`Current wellness score: ${cached[0].wellnessScore}/100`);
    }
  } catch {
    // Non-blocking — coach still works without insights context
  }

  if (contextParts.length > 0) {
    systemWithContext += `\n\nCurrent member context:\n${contextParts.join("\n")}`;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const stream = client.messages.stream({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 512,
      system: systemWithContext,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        res.write(`data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`);
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done" })}\n\n`);
    res.end();
  } catch (err) {
    req.log?.error({ err }, "Coach streaming error");
    if (!res.headersSent) {
      res.status(500).json({ error: "Coach error" });
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: "Coach error" })}\n\n`);
      res.end();
    }
  }
});

export default router;
