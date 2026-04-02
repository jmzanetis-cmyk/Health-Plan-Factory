import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { surveyResponses } from "@workspace/db";
import { randomUUID } from "crypto";
import { z } from "zod";

const router: IRouter = Router();

const SurveyResponseBody = z.object({
  healthcareSituation: z.string().max(200).optional(),
  healthcareGaps: z.array(z.string().max(100)).optional(),
  desiredImprovements: z.array(z.string().max(100)).optional(),
  likelihoodRating: z.number().int().min(1).max(5).optional(),
  likelihoodComment: z.string().max(2000).optional(),
  goals: z.array(z.string().max(100)).optional(),
  budgetRange: z.string().max(50).optional(),
  budgetMidpoint: z.number().int().optional(),
  referralSource: z.string().max(100).optional(),
});

router.post("/survey-response", async (req, res) => {
  const parsed = SurveyResponseBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    return;
  }

  const profileId = req.isAuthenticated() ? req.user!.id : null;

  try {
    const id = randomUUID();
    await db.insert(surveyResponses).values({
      id,
      profileId,
      ...parsed.data,
    });
    res.status(201).json({ success: true, id });
  } catch (err) {
    console.error("[surveyResponses] Failed to store survey response:", err);
    res.status(500).json({ error: "Failed to save survey response" });
  }
});

export default router;
