import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { planProgressLogs } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import {
  CreateProgressLogBody,
  ListProgressQueryParams,
  ListProgressResponse,
  ListProgressResponseItem,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/progress", async (req, res) => {
  try {
    const query = ListProgressQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }

    const { profileId, planId, limit = 50 } = query.data;

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
  try {
    const body = CreateProgressLogBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

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
