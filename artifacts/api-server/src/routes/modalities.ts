import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { modalities } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { Modality } from "@workspace/db";
import {
  ListModalitiesQueryParams,
  ListModalitiesResponse,
  ListModalitiesResponseItem,
  CreateModalityBody,
  GetAdminModalityParams,
  GetAdminModalityResponse,
  UpdateAdminModalityBody,
  UpdateAdminModalityParams,
  UpdateAdminModalityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/modalities", async (req, res) => {
  try {
    const query = ListModalitiesQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }

    const rows = await db.select().from(modalities);

    const filtered = rows.filter((m) => {
      if (query.data.category && m.category !== query.data.category) return false;
      if (query.data.isActive !== undefined && m.isActive !== query.data.isActive) return false;
      return true;
    });

    res.json(ListModalitiesResponse.parse(filtered));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/modalities", async (req, res) => {
  try {
    const body = CreateModalityBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const now = new Date();
    const [created] = await db
      .insert(modalities)
      .values({
        ...body.data,
        emoji: body.data.emoji ?? "✨",
        hsaEligible: body.data.hsaEligible ?? false,
        goals: body.data.goals ?? [],
        conditions: body.data.conditions ?? [],
        preferenceMatch: body.data.preferenceMatch ?? [],
        exclusionIds: body.data.exclusionIds ?? [],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      } as Modality)
      .returning();

    res.status(201).json(ListModalitiesResponseItem.parse(created));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/modalities/:id", async (req, res) => {
  try {
    const params = GetAdminModalityParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
      return;
    }
    const [row] = await db
      .select()
      .from(modalities)
      .where(eq(modalities.id, params.data.id));
    if (!row) {
      res.status(404).json({ error: "Modality not found" });
      return;
    }
    res.json(GetAdminModalityResponse.parse(row));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.patch("/admin/modalities/:id", async (req, res) => {
  try {
    const params = UpdateAdminModalityParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
      return;
    }
    const body = UpdateAdminModalityBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const [updated] = await db
      .update(modalities)
      .set({ ...body.data, updatedAt: new Date() })
      .where(eq(modalities.id, params.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Modality not found" });
      return;
    }
    res.json(UpdateAdminModalityResponse.parse(updated));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
