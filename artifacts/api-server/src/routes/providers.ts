import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { providers, providerModalities } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import { ListProvidersQueryParams, CreateProviderBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/providers", async (req, res) => {
  try {
    const query = ListProvidersQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }

    const { modalityId, zipCode, telehealth } = query.data;

    // Start with approved providers only
    let rows = await db.select().from(providers).where(eq(providers.status, "approved"));

    // Filter by telehealth
    if (telehealth) {
      rows = rows.filter((p) => p.offersTelehealth);
    }

    // Filter by zip code (basic string match; real implementation uses geo distance)
    if (zipCode) {
      rows = rows.filter((p) => p.zipCode === zipCode || !p.zipCode);
    }

    // Filter by modality
    if (modalityId) {
      const providerIds = rows.map((p) => p.id);
      if (providerIds.length > 0) {
        const links = await db
          .select()
          .from(providerModalities)
          .where(
            and(
              eq(providerModalities.modalityId, modalityId),
              inArray(providerModalities.providerId, providerIds),
            ),
          );
        const matchingIds = new Set(links.map((l) => l.providerId));
        rows = rows.filter((p) => matchingIds.has(p.id));
      }
    }

    // Pagination
    const limit = query.data.limit ?? 20;
    const offset = query.data.offset ?? 0;
    rows = rows.slice(Number(offset), Number(offset) + Number(limit));

    res.json(rows);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/providers", async (req, res) => {
  try {
    const body = CreateProviderBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const { modalityIds, ...providerData } = body.data as typeof body.data & { modalityIds?: string[] };

    const now = new Date();
    const providerId = crypto.randomUUID();

    const [created] = await db
      .insert(providers)
      .values({
        id: providerId,
        profileId: null,
        name: providerData.name,
        bio: providerData.bio ?? null,
        city: providerData.city ?? null,
        state: providerData.state ?? null,
        zipCode: providerData.zipCode ?? null,
        phone: providerData.phone ?? null,
        website: providerData.website ?? null,
        avatarUrl: null,
        status: "pending",
        acceptsInsurance: providerData.acceptsInsurance ?? false,
        offersTelehealth: providerData.offersTelehealth ?? false,
        costPerSession: providerData.costPerSession ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Link modalities if provided
    if (Array.isArray(modalityIds) && modalityIds.length > 0) {
      await db.insert(providerModalities).values(
        modalityIds.map((mId, idx) => ({
          providerId,
          modalityId: mId,
          isPrimary: idx === 0,
        })),
      );
    }

    res.status(201).json(created);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// Admin routes
router.get("/admin/providers/:id", async (req, res) => {
  try {
    const [row] = await db.select().from(providers).where(eq(providers.id, req.params.id));
    if (!row) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }
    res.json(row);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch("/admin/providers/:id", async (req, res) => {
  try {
    const body = req.body as { status?: string };
    if (!body.status || !["pending", "approved", "rejected"].includes(body.status)) {
      res.status(400).json({ error: "status must be one of: pending, approved, rejected" });
      return;
    }

    const [updated] = await db
      .update(providers)
      .set({ status: body.status as "pending" | "approved" | "rejected", updatedAt: new Date() })
      .where(eq(providers.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }
    res.json(updated);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
