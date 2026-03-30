import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { favorites } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { AddFavoriteBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/favorites", async (req, res) => {
  try {
    const profileId = req.query.profileId as string | undefined;
    if (!profileId) {
      res.status(400).json({ error: "profileId query param is required" });
      return;
    }
    const rows = await db.select().from(favorites).where(eq(favorites.profileId, profileId));
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/favorites", async (req, res) => {
  try {
    const body = AddFavoriteBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const profileId = body.data.profileId ?? (req.query.profileId as string);
    if (!profileId) {
      res.status(400).json({ error: "profileId is required" });
      return;
    }

    const [created] = await db
      .insert(favorites)
      .values({
        profileId,
        providerId: body.data.providerId,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    res.status(201).json(created ?? { profileId, providerId: body.data.providerId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.delete("/favorites/:providerId", async (req, res) => {
  try {
    const profileId = req.query.profileId as string | undefined;
    if (!profileId) {
      res.status(400).json({ error: "profileId query param is required" });
      return;
    }

    const deleted = await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.profileId, profileId),
          eq(favorites.providerId, req.params.providerId),
        ),
      )
      .returning();

    if (!deleted.length) {
      res.status(404).json({ error: "Favorite not found" });
      return;
    }

    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
