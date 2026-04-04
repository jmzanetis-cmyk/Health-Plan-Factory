import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { profiles } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

const PatchLanguageBody = z.object({
  language: z.enum(["en", "es"]),
});

const PatchProfileBody = z.object({
  language: z.enum(["en", "es"]).optional(),
});

router.get("/profile", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;

  try {
    const [profile] = await db
      .select({ language: profiles.language })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    res.json({ language: profile?.language ?? "en" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.patch("/profile/language", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;

  const body = PatchLanguageBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  try {
    await db
      .update(profiles)
      .set({ language: body.data.language, updatedAt: new Date() })
      .where(eq(profiles.id, profileId));

    res.json({ language: body.data.language });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.patch("/profile", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;

  const body = PatchProfileBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  try {
    const updatePayload: { updatedAt: Date; language?: string } = { updatedAt: new Date() };
    if (body.data.language !== undefined) updatePayload.language = body.data.language;

    const [updated] = await db
      .update(profiles)
      .set(updatePayload)
      .where(eq(profiles.id, profileId))
      .returning({ language: profiles.language });

    res.json({ language: updated?.language ?? "en" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
