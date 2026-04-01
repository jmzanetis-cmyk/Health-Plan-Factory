/**
 * Communication preferences API
 *
 * GET  /profile/comms-prefs  — returns current email/SMS preferences + digest settings
 * PATCH /profile/comms-prefs — updates preferences, phone, and weekly digest settings
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
  weeklyDigest: z.boolean().optional(),
  digestDay: z.number().int().min(0).max(6).optional(),
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

    const currentPrefs = (current?.communicationPrefs ?? { email: true, sms: false }) as {
      email: boolean;
      sms: boolean;
      weeklyDigest?: boolean;
      digestDay?: number;
    };

    const newPrefs = {
      email: body.data.email ?? currentPrefs.email,
      sms: body.data.sms ?? currentPrefs.sms,
      weeklyDigest: body.data.weeklyDigest ?? currentPrefs.weeklyDigest ?? true,
      digestDay: body.data.digestDay ?? currentPrefs.digestDay ?? 1,
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
