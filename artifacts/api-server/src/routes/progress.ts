import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { planProgressLogs } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import {
  CreateProgressLogBody,
  ListProgressResponse,
  ListProgressResponseItem,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/progress", async (req, res) => {
  try {
    const profileId = req.query.profileId as string | undefined;
    if (!profileId) {
      res.status(400).json({ error: "profileId query param is required" });
      return;
    }

    const planId = req.query.planId as string | undefined;
    const limitParam = req.query.limit;
    const limit = limitParam ? parseInt(String(limitParam)) : 50;

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
