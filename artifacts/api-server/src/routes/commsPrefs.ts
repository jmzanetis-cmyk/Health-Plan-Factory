/**
 * Communication preferences API
 *
 * GET  /profile/comms-prefs  — returns current email/SMS preferences
 * PATCH /profile/comms-prefs — updates preferences and optional phone
 */
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

const PatchCommsPrefsBody = z.object({
  email: z.boolean().optional(),
  sms: z.boolean().optional(),
  phone: z.string().optional().nullable(),
});

router.get("/profile/comms-prefs", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;

  try {
    const [profile] = await db
      .select({ communicationPrefs: profiles.communicationPrefs, phone: profiles.phone })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    const prefs = profile?.communicationPrefs ?? { email: true, sms: false };
    res.json({ prefs, phone: profile?.phone ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.patch("/profile/comms-prefs", async (req: Request, res: Response) => {
  if (!requireAuth(req, res)) return;
  const profileId = req.user!.id;

  const body = PatchCommsPrefsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: "Validation error", details: body.error.flatten() });
    return;
  }

  try {
    const [current] = await db
      .select({ communicationPrefs: profiles.communicationPrefs, phone: profiles.phone })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);

    const currentPrefs = current?.communicationPrefs ?? { email: true, sms: false };
    const newPrefs = {
      email: body.data.email ?? currentPrefs.email,
      sms: body.data.sms ?? currentPrefs.sms,
    };

    const [updated] = await db
      .update(profiles)
      .set({
        communicationPrefs: newPrefs,
        ...(body.data.phone !== undefined ? { phone: body.data.phone } : {}),
        updatedAt: new Date(),
      })
      .where(eq(profiles.id, profileId))
      .returning({ communicationPrefs: profiles.communicationPrefs, phone: profiles.phone });

    res.json({ prefs: updated?.communicationPrefs ?? newPrefs, phone: updated?.phone ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
