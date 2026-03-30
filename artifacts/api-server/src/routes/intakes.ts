import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { memberIntakes } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateIntakeBody } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/intakes", async (req, res) => {
  try {
    const profileId = req.query.profileId as string | undefined;
    const rows = profileId
      ? await db.select().from(memberIntakes).where(eq(memberIntakes.profileId, profileId))
      : await db.select().from(memberIntakes);
    res.json(rows);
  } catch {
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/intakes", async (req, res) => {
  try {
    const body = CreateIntakeBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const [created] = await db
      .insert(memberIntakes)
      .values({
        id: crypto.randomUUID(),
        profileId: body.data.profileId ?? null,
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

    res.status(201).json(created);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
