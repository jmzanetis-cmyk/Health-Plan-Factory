import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { favorites } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import {
  AddFavoriteBody,
  ListFavoritesQueryParams,
  ListFavoritesResponse,
  ListFavoritesResponseItem,
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

router.get("/favorites", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const query = ListFavoritesQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }
    const { profileId } = query.data;
    if (!canAccessProfile(req, res, profileId)) return;
    const rows = await db.select().from(favorites).where(eq(favorites.profileId, profileId));
    res.json(ListFavoritesResponse.parse(rows));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/favorites", async (req, res) => {
  if (!requireAuth(req, res)) return;
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

    if (!canAccessProfile(req, res, profileId)) return;

    const [inserted] = await db
      .insert(favorites)
      .values({
        profileId,
        providerId: body.data.providerId,
        createdAt: new Date(),
      })
      .onConflictDoNothing()
      .returning();

    const record =
      inserted ??
      (
        await db
          .select()
          .from(favorites)
          .where(and(eq(favorites.profileId, profileId), eq(favorites.providerId, body.data.providerId)))
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
  if (!requireAuth(req, res)) return;
  try {
    const query = ListFavoritesQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }
    const { profileId } = query.data;

    if (!canAccessProfile(req, res, profileId)) return;

    const deleted = await db
      .delete(favorites)
      .where(and(eq(favorites.profileId, profileId), eq(favorites.providerId, req.params.providerId)))
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
