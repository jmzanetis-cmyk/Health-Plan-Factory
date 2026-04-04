import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { insightsCache, coachMemories, coachSessions, profiles } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";
import { z } from "zod";

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

  const { messages, context, sessionId } = req.body as {
    messages: Array<{ id?: string; role: "user" | "assistant"; content: string }>;
    context?: {
      planId?: string;
      streakDays?: number;
      recentMood?: number;
    };
    sessionId?: number;
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

  // Load user language preference
  let userLanguage = "en";
  try {
    const [prof] = await db
      .select({ language: profiles.language })
      .from(profiles)
      .where(eq(profiles.id, req.user!.id))
      .limit(1);
    userLanguage = prof?.language ?? "en";
  } catch {
    // Non-blocking — default to English
  }

  if (userLanguage === "es") {
    systemWithContext += "\n\nIMPORTANT: The member has selected Spanish as their preferred language. You MUST reply entirely in Spanish. Do not switch to English under any circumstances.";
  }

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

  // Load long-term coach memory for this member
  try {
    const [mem] = await db
      .select({ summary: coachMemories.summary, facts: coachMemories.facts })
      .from(coachMemories)
      .where(eq(coachMemories.profileId, req.user!.id))
      .limit(1);

    if (mem && (mem.summary || (Array.isArray(mem.facts) && mem.facts.length > 0))) {
      const memLines: string[] = [];
      if (mem.summary) memLines.push(`Member history: ${mem.summary}`);
      if (Array.isArray(mem.facts) && mem.facts.length > 0) {
        memLines.push(`Known facts about this member:\n${mem.facts.map((f) => `- ${f}`).join("\n")}`);
      }
      contextParts.push(memLines.join("\n"));
    }
  } catch {
    // Non-blocking — coach still works without memory
  }

  if (contextParts.length > 0) {
    systemWithContext += `\n\nCurrent member context:\n${contextParts.join("\n")}`;
  }

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  let accumulated = "";

  try {
    const stream = client.messages.stream({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 512,
      system: systemWithContext,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        accumulated += event.delta.text;
        res.write(`data: ${JSON.stringify({ type: "text", text: event.delta.text })}\n\n`);
      }
    }

    // Persist session BEFORE sending done so we can include sessionId in the done frame
    let resolvedSessionId: number | null = sessionId ?? null;
    if (accumulated) {
      const profileId = req.user!.id;
      // Ensure every message has a stable id before persisting
      const ts = Date.now();
      const messagesWithIds = messages.map((m, i) => ({
        id: m.id ?? `${ts}-${i}`,
        role: m.role,
        content: m.content,
      }));
      const updatedMessages = [
        ...messagesWithIds,
        { id: `${ts}-assistant`, role: "assistant" as const, content: accumulated },
      ];

      try {
        if (resolvedSessionId) {
          // Try to update existing session — must belong to this profile
          const updated = await db
            .update(coachSessions)
            .set({ messages: updatedMessages, updatedAt: new Date() })
            .where(and(eq(coachSessions.id, resolvedSessionId), eq(coachSessions.profileId, profileId)))
            .returning({ id: coachSessions.id });

          if (!updated.length) {
            // Session was stale/invalid (cross-device drift) — insert a new one
            const [newSession] = await db
              .insert(coachSessions)
              .values({ profileId, messages: updatedMessages, updatedAt: new Date() })
              .returning({ id: coachSessions.id });
            resolvedSessionId = newSession?.id ?? null;
          }
        } else {
          // Create a new session row and capture the ID
          const [newSession] = await db
            .insert(coachSessions)
            .values({ profileId, messages: updatedMessages, updatedAt: new Date() })
            .returning({ id: coachSessions.id });
          resolvedSessionId = newSession?.id ?? null;
        }
      } catch {
        // Non-fatal — session persistence failure
      }
    }

    res.write(`data: ${JSON.stringify({ type: "done", sessionId: resolvedSessionId })}\n\n`);
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

// ── GET /api/coach/session ─────────────────────────────────────────────────────
// Returns the authenticated user's latest non-archived coach session.
// Accepts optional ?sessionId=<n> to load a specific session by ID.

router.get("/coach/session", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const profileId = req.user!.id;
  const reqSessionId = req.query.sessionId ? Number(req.query.sessionId) : null;

  try {
    let session;
    if (reqSessionId) {
      // Load a specific session — must belong to this profile
      [session] = await db
        .select()
        .from(coachSessions)
        .where(and(eq(coachSessions.id, reqSessionId), eq(coachSessions.profileId, profileId)))
        .limit(1);
    } else {
      // Load the most recently updated non-archived session
      [session] = await db
        .select()
        .from(coachSessions)
        .where(and(eq(coachSessions.profileId, profileId), eq(coachSessions.archived, false)))
        .orderBy(desc(coachSessions.updatedAt))
        .limit(1);
    }

    if (!session) {
      res.json({ sessionId: null, messages: [], sessionStartedAt: null });
      return;
    }

    res.json({
      sessionId: session.id,
      messages: session.messages ?? [],
      sessionStartedAt: session.createdAt,
    });
  } catch (err) {
    req.log?.error({ err }, "coach/session GET error");
    res.status(500).json({ error: "Failed to load coach session" });
  }
});

// ── DELETE /api/coach/session ──────────────────────────────────────────────────
// Archives the current active session (preserves history) and starts a new one.
// Accepts optional ?sessionId=<n> to archive a specific session.

router.delete("/coach/session", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const profileId = req.user!.id;
  const reqSessionId = req.query.sessionId ? Number(req.query.sessionId) : null;

  try {
    if (reqSessionId) {
      // Archive specific session
      await db
        .update(coachSessions)
        .set({ archived: true, updatedAt: new Date() })
        .where(and(eq(coachSessions.id, reqSessionId), eq(coachSessions.profileId, profileId)));
    } else {
      // Archive all non-archived sessions for this user
      await db
        .update(coachSessions)
        .set({ archived: true, updatedAt: new Date() })
        .where(and(eq(coachSessions.profileId, profileId), eq(coachSessions.archived, false)));
    }

    res.json({ ok: true });
  } catch (err) {
    req.log?.error({ err }, "coach/session DELETE error");
    res.status(500).json({ error: "Failed to archive session" });
  }
});

// ── GET /api/coach/memory ──────────────────────────────────────────────────────
// Returns the authenticated user's persistent coach memory (summary + facts).

router.get("/coach/memory", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const [mem] = await db
      .select()
      .from(coachMemories)
      .where(eq(coachMemories.profileId, req.user!.id))
      .limit(1);

    if (!mem) {
      res.json({ summary: "", facts: [], sessionCount: 0 });
      return;
    }

    res.json({ summary: mem.summary, facts: mem.facts, sessionCount: mem.sessionCount });
  } catch (err) {
    req.log?.error({ err }, "coach/memory GET error");
    res.status(500).json({ error: "Failed to load coach memory" });
  }
});

// ── POST /api/coach/memory ─────────────────────────────────────────────────────
// Accepts a conversation and uses Claude to extract a concise memory summary.
// Upserts the result into coach_memories.

const MemoryBody = z.object({
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })),
  existingSummary: z.string().optional(),
});

router.post("/coach/memory", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = MemoryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

  const { messages, existingSummary } = parsed.data;
  if (messages.length < 2) {
    res.json({ ok: true, skipped: "too short" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "AI not configured" });
    return;
  }

  try {
    const client = new Anthropic({ apiKey });

    const conversationText = messages
      .filter((m) => m.role === "user")
      .slice(-10)
      .map((m) => `User: ${m.content}`)
      .join("\n");

    const memoryPrompt = `You are extracting structured memory from a wellness coaching conversation.

${existingSummary ? `Existing memory summary:\n${existingSummary}\n\n` : ""}Recent conversation (user messages only):\n${conversationText}

Extract and update the memory. Output ONLY valid JSON in this exact format:
{
  "summary": "2-3 sentence summary of this person's wellness journey, goals, and progress so far",
  "facts": ["key fact 1", "key fact 2", "key fact 3"]
}

Keep facts specific: health goals, conditions, preferred modalities, struggles, wins. Max 6 facts. No line breaks inside JSON strings.`;

    const response = await client.messages.create({
      model: "claude-3-5-haiku-20241022",
      max_tokens: 256,
      messages: [{ role: "user", content: memoryPrompt }],
    });

    const raw = response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
    let summary = "";
    let facts: string[] = [];

    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed2 = JSON.parse(jsonMatch[0]);
        summary = typeof parsed2.summary === "string" ? parsed2.summary.slice(0, 500) : "";
        facts = Array.isArray(parsed2.facts)
          ? parsed2.facts.filter((f: unknown) => typeof f === "string").slice(0, 6)
          : [];
      }
    } catch {
      summary = raw.slice(0, 300);
    }

    await db
      .insert(coachMemories)
      .values({
        profileId: req.user!.id,
        summary,
        facts,
        sessionCount: 1,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: coachMemories.profileId,
        set: {
          summary,
          facts,
          sessionCount: sql`${coachMemories.sessionCount} + 1`,
          updatedAt: new Date(),
        },
      });

    res.json({ ok: true, summary, facts });
  } catch (err) {
    req.log?.error({ err }, "coach/memory POST error");
    res.status(500).json({ error: "Failed to save coach memory" });
  }
});

export default router;
