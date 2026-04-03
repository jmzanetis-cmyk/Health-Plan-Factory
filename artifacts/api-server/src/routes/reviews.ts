import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import {
  providerReviews,
  providers,
  profiles,
  providerUnlocks,
} from "@workspace/db";
import { eq, and, desc, avg, count, notExists, sql } from "drizzle-orm";

const router: IRouter = Router();

/**
 * GET /api/providers/:providerId/reviews
 * Returns all visible reviews for a provider.
 * All logged-in members can see reviews (not gated).
 */
router.get("/providers/:providerId/reviews", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const { providerId } = req.params;
  try {
    const reviews = await db
      .select({
        id: providerReviews.id,
        rating: providerReviews.rating,
        reviewText: providerReviews.reviewText,
        createdAt: providerReviews.createdAt,
        memberName: profiles.displayName,
      })
      .from(providerReviews)
      .leftJoin(profiles, eq(providerReviews.memberId, profiles.id))
      .where(
        and(
          eq(providerReviews.providerId, providerId),
          eq(providerReviews.isHidden, false),
        ),
      )
      .orderBy(desc(providerReviews.createdAt));

    const stats = await db
      .select({
        averageRating: avg(providerReviews.rating),
        reviewCount: count(providerReviews.id),
      })
      .from(providerReviews)
      .where(
        and(
          eq(providerReviews.providerId, providerId),
          eq(providerReviews.isHidden, false),
        ),
      );

    res.json({
      reviews,
      averageRating: stats[0]?.averageRating ? Number(Number(stats[0].averageRating).toFixed(1)) : null,
      reviewCount: Number(stats[0]?.reviewCount ?? 0),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/providers/:providerId/reviews
 * Submit a review. The member must have unlocked this provider.
 * One review per member per provider.
 */
router.post("/providers/:providerId/reviews", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const profileId = req.user!.id;
  const { providerId } = req.params;
  const { rating, reviewText } = req.body as { rating?: unknown; reviewText?: unknown };

  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    res.status(400).json({ error: "rating must be an integer between 1 and 5" });
    return;
  }

  try {
    // Verify the provider exists
    const [provider] = await db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.id, providerId))
      .limit(1);

    if (!provider) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }

    // Check access: Plus/Employer subscribers can review any provider.
    // Free members need a legacy providerUnlock row (backward compatibility).
    const [profile] = await db
      .select({ subscriptionStatus: profiles.subscriptionStatus })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    const isSubscribed =
      profile?.subscriptionStatus === "plus" ||
      profile?.subscriptionStatus === "employer";

    if (!isSubscribed) {
      const [unlock] = await db
        .select({ id: providerUnlocks.id })
        .from(providerUnlocks)
        .where(
          and(
            eq(providerUnlocks.memberId, profileId),
            eq(providerUnlocks.providerId, providerId),
          ),
        )
        .limit(1);

      if (!unlock) {
        res.status(403).json({ error: "A Plus subscription is required to leave a provider review" });
        return;
      }
    }

    const now = new Date();
    const [created] = await db
      .insert(providerReviews)
      .values({
        id: randomUUID(),
        providerId,
        memberId: profileId,
        rating: Math.round(rating),
        reviewText: typeof reviewText === "string" && reviewText.trim() ? reviewText.trim() : null,
        isHidden: false,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [providerReviews.memberId, providerReviews.providerId],
        set: {
          rating: Math.round(rating),
          reviewText: typeof reviewText === "string" && reviewText.trim() ? reviewText.trim() : null,
          updatedAt: now,
        },
      })
      .returning();

    res.status(201).json({ review: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/providers/me/reviews
 * Provider views their own reviews (all, including hidden ones).
 */
router.get("/providers/me/reviews", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const [provider] = await db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.profileId, req.user!.id))
      .limit(1);

    if (!provider) {
      res.status(404).json({ error: "No provider profile found" });
      return;
    }

    const reviews = await db
      .select({
        id: providerReviews.id,
        rating: providerReviews.rating,
        reviewText: providerReviews.reviewText,
        isHidden: providerReviews.isHidden,
        createdAt: providerReviews.createdAt,
        memberName: profiles.displayName,
      })
      .from(providerReviews)
      .leftJoin(profiles, eq(providerReviews.memberId, profiles.id))
      .where(eq(providerReviews.providerId, provider.id))
      .orderBy(desc(providerReviews.createdAt));

    const stats = await db
      .select({
        averageRating: avg(providerReviews.rating),
        reviewCount: count(providerReviews.id),
      })
      .from(providerReviews)
      .where(
        and(
          eq(providerReviews.providerId, provider.id),
          eq(providerReviews.isHidden, false),
        ),
      );

    res.json({
      reviews,
      averageRating: stats[0]?.averageRating ? Number(Number(stats[0].averageRating).toFixed(1)) : null,
      reviewCount: Number(stats[0]?.reviewCount ?? 0),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/providers/me/unreviewed
 * Returns unlocked providers that the current member has NOT yet reviewed.
 * Used to drive the in-app review nudge.
 */
router.get("/providers/me/unreviewed", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const memberId = req.user!.id;
  try {
    const rows = await db
      .select({
        providerId: providerUnlocks.providerId,
        providerName: providers.name,
      })
      .from(providerUnlocks)
      .leftJoin(providers, eq(providerUnlocks.providerId, providers.id))
      .where(
        and(
          eq(providerUnlocks.memberId, memberId),
          notExists(
            db
              .select({ one: sql`1` })
              .from(providerReviews)
              .where(
                and(
                  eq(providerReviews.memberId, memberId),
                  eq(providerReviews.providerId, providerUnlocks.providerId),
                ),
              ),
          ),
        ),
      )
      .limit(5);

    res.json({ providers: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/admin/reviews
 * Admin: list all reviews with moderation controls.
 */
router.get("/admin/reviews", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  try {
    const showHidden = req.query.showHidden === "true";

    const rows = await db
      .select({
        id: providerReviews.id,
        rating: providerReviews.rating,
        reviewText: providerReviews.reviewText,
        isHidden: providerReviews.isHidden,
        createdAt: providerReviews.createdAt,
        providerId: providerReviews.providerId,
        providerName: providers.name,
        memberId: providerReviews.memberId,
        memberName: profiles.displayName,
        memberEmail: profiles.email,
      })
      .from(providerReviews)
      .leftJoin(providers, eq(providerReviews.providerId, providers.id))
      .leftJoin(profiles, eq(providerReviews.memberId, profiles.id))
      .where(showHidden ? undefined : eq(providerReviews.isHidden, false))
      .orderBy(desc(providerReviews.createdAt))
      .limit(200);

    res.json({ reviews: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * PATCH /api/admin/reviews/:id
 * Admin: hide or unhide a review.
 */
router.patch("/admin/reviews/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  const { id } = req.params;
  const { isHidden } = req.body as { isHidden?: unknown };

  if (typeof isHidden !== "boolean") {
    res.status(400).json({ error: "isHidden (boolean) is required" });
    return;
  }

  try {
    const [updated] = await db
      .update(providerReviews)
      .set({ isHidden, updatedAt: new Date() })
      .where(eq(providerReviews.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    res.json({ review: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/providers/:providerId/my-review
 * Check if the current member already has a review for this provider.
 */
router.get("/providers/:providerId/my-review", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ review: null });
    return;
  }
  const { providerId } = req.params;
  try {
    const [review] = await db
      .select()
      .from(providerReviews)
      .where(
        and(
          eq(providerReviews.memberId, req.user!.id),
          eq(providerReviews.providerId, providerId),
        ),
      )
      .limit(1);

    res.json({ review: review ?? null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
