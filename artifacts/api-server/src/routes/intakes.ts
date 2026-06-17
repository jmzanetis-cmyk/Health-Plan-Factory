import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { memberIntakes } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  CreateIntakeBody,
  ListIntakesResponse,
  ListIntakesResponseItem,
} from "@workspace/api-zod";
import { randomUUID } from "crypto";
import { moderateLimiter } from "../middlewares/rateLimit";

const router: IRouter = Router();

router.use(moderateLimiter);

router.get("/intakes", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    // Admins may query any profile's intakes via ?profileId=.
    // All other callers are scoped to their own id — never trust the query param.
    const profileId =
      req.user!.role === "admin" && typeof req.query.profileId === "string"
        ? req.query.profileId
        : req.user!.id;

    const rows = await db
      .select()
      .from(memberIntakes)
      .where(eq(memberIntakes.profileId, profileId));

    res.json(ListIntakesResponse.parse(rows));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/intakes", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const body = CreateIntakeBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    // profileId is always the authenticated caller's id — ignore any value in the body.
    const [created] = await db
      .insert(memberIntakes)
      .values({
        id: randomUUID(),
        profileId: req.user!.id,
        budget: body.data.budget,
        goals: body.data.goals ?? [],
        conditions: body.data.conditions ?? [],
        preferences: body.data.preferences ?? [],
        exclusions: body.data.exclusions ?? [],
        zipCode: body.data.zipCode ?? null,
        radius: body.data.radius ?? 25,
        telehealth: body.data.telehealth ?? false,
        createdAt: new Date(),
      })
      .returning();

    res.status(201).json(ListIntakesResponseItem.parse(created));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
