import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { favorites } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  AddFavoriteBody,
  ListFavoritesQueryParams,
  ListFavoritesResponse,
  ListFavoritesResponseItem,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/favorites", async (req, res) => {
  try {
    const query = ListFavoritesQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }
    const { profileId } = query.data;
    const rows = await db.select().from(favorites).where(eq(favorites.profileId, profileId));
    res.json(ListFavoritesResponse.parse(rows));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
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

    const [inserted] = await db
      .insert(favorites)
      .values({
        profileId,
        providerId: body.data.providerId,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    // If no row returned (already existed), fetch the existing record
    const record =
      inserted ??
      (
        await db
          .select()
          .from(favorites)
          .where(
            and(eq(favorites.profileId, profileId), eq(favorites.providerId, body.data.providerId)),
          )
      )[0];

    if (!record) {
      res.status(500).json({ error: "Failed to create or retrieve favorite" });
      return;
    }

    res.status(inserted ? 201 : 200).json(ListFavoritesResponseItem.parse(record));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.delete("/favorites/:providerId", async (req, res) => {
  try {
    const query = ListFavoritesQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }
    const { profileId } = query.data;

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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
