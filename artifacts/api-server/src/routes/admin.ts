import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { profiles, providers, plans, adminSettings, modalities } from "@workspace/db";
import { eq, gte, count, desc, asc } from "drizzle-orm";
import {
  UpsertAdminSettingBody,
  GetAdminStatsResponse,
  ListAdminSettingsResponse,
  UpsertAdminSettingResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Require admin role for all /admin/* routes
router.use("/admin", (req, res, next) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  next();
});

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
    const [activeModalities] = await db
      .select({ count: count() })
      .from(modalities)
      .where(eq(modalities.isActive, true));

    res.json(
      GetAdminStatsResponse.parse({
        totalMembers: totalMembers.count,
        totalProviders: totalProviders.count,
        totalPlans: totalPlans.count,
        pendingProviders: pendingProviders.count,
        recentSignups: recentSignups.count,
        activeModalities: activeModalities.count,
      }),
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// GET /admin/weekly-signups — 5 most recent weeks of member signups
router.get("/admin/weekly-signups", async (req, res) => {
  try {
    const allProfiles = await db
      .select({ createdAt: profiles.createdAt })
      .from(profiles)
      .orderBy(asc(profiles.createdAt));

    const weeks: Record<string, number> = {};
    const now = new Date();
    for (let w = 4; w >= 0; w--) {
      const start = new Date(now);
      start.setDate(start.getDate() - w * 7 - start.getDay());
      start.setHours(0, 0, 0, 0);
      const label = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      weeks[label] = 0;
    }

    allProfiles.forEach(({ createdAt }) => {
      const d = new Date(createdAt);
      const weekStart = new Date(d);
      weekStart.setDate(d.getDate() - d.getDay());
      weekStart.setHours(0, 0, 0, 0);
      const label = weekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (label in weeks) weeks[label]++;
    });

    const data = Object.entries(weeks).map(([week, signups]) => ({ week, signups }));
    res.json({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// GET /admin/users — paginated list of all users
router.get("/admin/users", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);
    const rows = await db
      .select()
      .from(profiles)
      .orderBy(desc(profiles.createdAt))
      .limit(limit)
      .offset(offset);
    res.json({ users: rows, limit, offset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// GET /admin/providers — all providers regardless of status
router.get("/admin/providers", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);
    const status = req.query.status as string | undefined;
    let rows = await db
      .select()
      .from(providers)
      .orderBy(desc(providers.createdAt));
    if (status) rows = rows.filter((p) => p.status === status);
    const sliced = rows.slice(offset, offset + limit);
    res.json({ providers: sliced, total: rows.length, limit, offset });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// PATCH /admin/providers/:id — approve / reject / update provider
router.patch("/admin/providers/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, verificationStatus } = req.body as {
      status?: string;
      verificationStatus?: string;
    };

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (status) updates.status = status;
    if (verificationStatus) updates.verificationStatus = verificationStatus;

    const [updated] = await db
      .update(providers)
      .set(updates)
      .where(eq(providers.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }
    res.json({ provider: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// GET /admin/modalities — all modalities
router.get("/admin/modalities", async (req, res) => {
  try {
    const rows = await db.select().from(modalities).orderBy(asc(modalities.name));
    res.json({ modalities: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// PATCH /admin/modalities/:id — inline edit modality
router.patch("/admin/modalities/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { evidenceLevel, costLow, costHigh, isActive } = req.body as {
      evidenceLevel?: "Strong" | "Moderate" | "Emerging";
      costLow?: number;
      costHigh?: number;
      isActive?: boolean;
    };

    const updatePayload: {
      updatedAt: Date;
      evidenceLevel?: "Strong" | "Moderate" | "Emerging";
      costLow?: number;
      costHigh?: number;
      isActive?: boolean;
    } = { updatedAt: new Date() };

    if (evidenceLevel !== undefined) updatePayload.evidenceLevel = evidenceLevel;
    if (costLow !== undefined) updatePayload.costLow = costLow;
    if (costHigh !== undefined) updatePayload.costHigh = costHigh;
    if (isActive !== undefined) updatePayload.isActive = isActive;

    const [updated] = await db
      .update(modalities)
      .set(updatePayload)
      .where(eq(modalities.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Modality not found" });
      return;
    }
    res.json({ modality: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/settings", async (req, res) => {
  try {
    const rows = await db.select().from(adminSettings);
    res.json(ListAdminSettingsResponse.parse(rows));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.patch("/admin/settings", async (req, res) => {
  try {
    const body = UpsertAdminSettingBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const { key, value } = body.data;
    const [upserted] = await db
      .insert(adminSettings)
      .values({ key, value: value ?? null, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: adminSettings.key,
        set: { value: value ?? null, updatedAt: new Date() },
      })
      .returning();

    res.json(UpsertAdminSettingResponse.parse(upserted));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
