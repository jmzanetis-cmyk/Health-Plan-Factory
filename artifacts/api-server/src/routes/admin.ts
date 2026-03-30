import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profiles, providers, plans, adminSettings } from "@workspace/db";
import { eq, gte, count } from "drizzle-orm";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/admin/stats", async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [totalMembers] = await db.select({ count: count() }).from(profiles);
    const [totalProviders] = await db.select({ count: count() }).from(providers);
    const [totalPlans] = await db.select({ count: count() }).from(plans);
    const [pendingProviders] = await db
      .select({ count: count() })
      .from(providers)
      .where(eq(providers.status, "pending"));
    const [recentSignups] = await db
      .select({ count: count() })
      .from(profiles)
      .where(gte(profiles.createdAt, thirtyDaysAgo));

    res.json({
      totalMembers: totalMembers.count,
      totalProviders: totalProviders.count,
      totalPlans: totalPlans.count,
      pendingProviders: pendingProviders.count,
      recentSignups: recentSignups.count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/settings", async (req, res) => {
  try {
    const rows = await db.select().from(adminSettings);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/settings", async (req, res) => {
  try {
    const { key, value } = req.body as { key?: string; value?: unknown };
    if (!key) {
      res.status(400).json({ error: "key is required" });
      return;
    }

    const [upserted] = await db
      .insert(adminSettings)
      .values({ key, value: value ?? null, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value: value ?? null, updatedAt: new Date() },
      })
      .returning();

    res.json(upserted);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
