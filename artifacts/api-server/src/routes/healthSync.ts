import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { healthSyncLogs, planProgressLogs } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { computeAndCacheInsights } from "./insights.js";

const router = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

function canAccessProfile(req: Request, res: Response, profileId: string): boolean {
  if (req.user!.role === "admin") return true;
  if (req.user!.id === profileId) return true;
  res.status(403).json({ error: "Forbidden" });
  return false;
}

const UpsertHealthSyncBody = z.object({
  profileId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source: z.enum(["apple_health", "google_fit"]),
  steps: z.number().int().nonnegative().nullable().optional(),
  sleepMinutes: z.number().int().nonnegative().nullable().optional(),
  activeMinutes: z.number().int().nonnegative().nullable().optional(),
  mindfulnessMinutes: z.number().int().nonnegative().nullable().optional(),
});

function buildHealthNote(data: {
  steps?: number | null;
  sleepMinutes?: number | null;
  activeMinutes?: number | null;
  mindfulnessMinutes?: number | null;
  source: string;
}): string {
  const parts: string[] = [];
  if (data.steps != null) parts.push(`${data.steps.toLocaleString()} steps`);
  if (data.activeMinutes != null) parts.push(`${data.activeMinutes} active min`);
  if (data.sleepMinutes != null) {
    const h = Math.floor(data.sleepMinutes / 60);
    const m = data.sleepMinutes % 60;
    parts.push(`${h}h ${m}m sleep`);
  }
  if (data.mindfulnessMinutes != null && data.mindfulnessMinutes > 0) {
    parts.push(`${data.mindfulnessMinutes} min mindfulness`);
  }
  const sourceName = data.source === "apple_health" ? "Apple Health" : "Google Fit";
  return `[${sourceName}] ${parts.join(" · ")}`;
}

const HEALTH_SYNC_PREFIX = "[health_sync]";

async function upsertProgressLogEntry(
  profileId: string,
  date: string,
  data: {
    steps?: number | null;
    sleepMinutes?: number | null;
    activeMinutes?: number | null;
    mindfulnessMinutes?: number | null;
    source: string;
  }
): Promise<void> {
  const sessionDate = new Date(`${date}T12:00:00Z`);
  const humanNote = buildHealthNote(data);
  const syncNote = `${HEALTH_SYNC_PREFIX} ${date} | ${humanNote}`;

  const existing = await db
    .select({ id: planProgressLogs.id })
    .from(planProgressLogs)
    .where(
      and(
        eq(planProgressLogs.profileId, profileId),
        sql`${planProgressLogs.note} LIKE ${`${HEALTH_SYNC_PREFIX} ${date} |%`}`
      )
    )
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(planProgressLogs)
      .set({ note: syncNote, sessionDate })
      .where(eq(planProgressLogs.id, existing[0].id));
  } else {
    await db.insert(planProgressLogs).values({
      id: crypto.randomUUID(),
      profileId,
      note: syncNote,
      sessionDate,
    });
  }
}

router.post("/health-sync", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const body = UpsertHealthSyncBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }
    if (!canAccessProfile(req, res, body.data.profileId)) return;

    const { profileId, date, source, steps, sleepMinutes, activeMinutes, mindfulnessMinutes } = body.data;

    const existing = await db
      .select({ id: healthSyncLogs.id })
      .from(healthSyncLogs)
      .where(and(eq(healthSyncLogs.profileId, profileId), eq(healthSyncLogs.date, date)))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(healthSyncLogs)
        .set({
          source,
          steps: steps ?? null,
          sleepMinutes: sleepMinutes ?? null,
          activeMinutes: activeMinutes ?? null,
          mindfulnessMinutes: mindfulnessMinutes ?? null,
          updatedAt: new Date(),
        })
        .where(eq(healthSyncLogs.id, existing[0].id))
        .returning();
      res.json(updated);
    } else {
      const [created] = await db
        .insert(healthSyncLogs)
        .values({
          id: crypto.randomUUID(),
          profileId,
          date,
          source,
          steps: steps ?? null,
          sleepMinutes: sleepMinutes ?? null,
          activeMinutes: activeMinutes ?? null,
          mindfulnessMinutes: mindfulnessMinutes ?? null,
        })
        .returning();
      res.status(201).json(created);
    }

    setImmediate(async () => {
      try {
        await upsertProgressLogEntry(profileId, date, { steps, sleepMinutes, activeMinutes, mindfulnessMinutes, source });
        await computeAndCacheInsights(profileId);
      } catch {
      }
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/health-sync", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const profileId = req.query.profileId as string;
    if (!profileId) {
      res.status(400).json({ error: "profileId is required" });
      return;
    }
    if (!canAccessProfile(req, res, profileId)) return;

    const [latest] = await db
      .select()
      .from(healthSyncLogs)
      .where(eq(healthSyncLogs.profileId, profileId))
      .orderBy(desc(healthSyncLogs.date))
      .limit(1);

    if (!latest) {
      res.status(404).json({ error: "No health sync data found" });
      return;
    }
    res.json({
      date: latest.date,
      source: latest.source,
      steps: latest.steps,
      sleepMinutes: latest.sleepMinutes,
      activeMinutes: latest.activeMinutes,
      mindfulnessMinutes: latest.mindfulnessMinutes,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/health-sync/history", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const profileId = req.query.profileId as string;
    if (!profileId) {
      res.status(400).json({ error: "profileId is required" });
      return;
    }
    if (!canAccessProfile(req, res, profileId)) return;

    const rows = await db
      .select()
      .from(healthSyncLogs)
      .where(eq(healthSyncLogs.profileId, profileId))
      .orderBy(desc(healthSyncLogs.date))
      .limit(30);

    res.json(rows);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
