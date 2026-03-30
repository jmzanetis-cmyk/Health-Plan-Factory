import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { planProgressLogs } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import {
  CreateProgressLogBody,
  ListProgressQueryParams,
  ListProgressResponse,
  ListProgressResponseItem,
} from "@workspace/api-zod";

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

router.get("/progress", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const query = ListProgressQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }

    const { profileId, planId, limit = 50 } = query.data;

    if (!canAccessProfile(req, res, profileId)) return;

    let rows = planId
      ? await db
          .select()
          .from(planProgressLogs)
          .where(and(eq(planProgressLogs.profileId, profileId), eq(planProgressLogs.planId, planId)))
          .orderBy(desc(planProgressLogs.createdAt))
      : await db
          .select()
          .from(planProgressLogs)
          .where(eq(planProgressLogs.profileId, profileId))
          .orderBy(desc(planProgressLogs.createdAt));

    rows = rows.slice(0, limit);
    res.json(ListProgressResponse.parse(rows));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/progress", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const body = CreateProgressLogBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    if (!canAccessProfile(req, res, body.data.profileId)) return;

    const [created] = await db
      .insert(planProgressLogs)
      .values({
        id: crypto.randomUUID(),
        profileId: body.data.profileId,
        planId: body.data.planId ?? null,
        modalityId: body.data.modalityId ?? null,
        note: body.data.note ?? null,
        rating: body.data.rating ?? null,
        mood: body.data.mood ?? null,
        pain: body.data.pain ?? null,
        energy: body.data.energy ?? null,
        sessionDate: body.data.sessionDate ? new Date(body.data.sessionDate) : null,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json(ListProgressResponseItem.parse(created));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
