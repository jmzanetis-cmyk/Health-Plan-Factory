import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { planProgressLogs, employerMembers, employerModalityRules, profiles, modalities } from "@workspace/db";
import { and, eq, desc } from "drizzle-orm";
import {
  CreateProgressLogBody,
  ListProgressQueryParams,
  ListProgressResponse,
  ListProgressResponseItem,
} from "@workspace/api-zod";
import { sendNotification, queueNotification } from "../lib/comms";
import { randomUUID } from "crypto";
import { sessionConfirmedEmail } from "../emails/session-confirmed";
import { sessionReminderEmail } from "../emails/session-reminder";

const router = Router();

function requireAuth(req: Request, res: Response): boolean {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return false;
  }
  return true;
}

function canAccessProfile(req: Request, res: Response, profileId: string): boolean {
  if (req.user!.role === "admin") return true;
  if (req.user!.id === profileId) return true;
  res.status(403).json({ error: "Forbidden" });
  return false;
}

router.get("/progress", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const query = ListProgressQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }

    const { profileId, planId, limit = 50 } = query.data;

    if (!canAccessProfile(req, res, profileId)) return;

    let rows = planId
      ? await db
          .select()
          .from(planProgressLogs)
          .where(and(eq(planProgressLogs.profileId, profileId), eq(planProgressLogs.planId, planId)))
          .orderBy(desc(planProgressLogs.createdAt))
      : await db
          .select()
          .from(planProgressLogs)
          .where(eq(planProgressLogs.profileId, profileId))
          .orderBy(desc(planProgressLogs.createdAt));

    rows = rows.slice(0, limit);
    res.json(ListProgressResponse.parse(rows));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/progress", async (req, res) => {
  if (!requireAuth(req, res)) return;
  try {
    const body = CreateProgressLogBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    if (!canAccessProfile(req, res, body.data.profileId)) return;

    const sessionCostCents = body.data.sessionCostCents ?? 0;
    const currentMonth = new Date().toISOString().slice(0, 7);

    // All writes (progress log + employer balance) run in one transaction so
    // financial state is always consistent; any failure rolls everything back.
    const [created] = await db.transaction(async (tx) => {
      let employerCovered = 0;
      let outOfPocket = sessionCostCents;

      // Deduct from employer stipend only when an explicit session cost is provided
      // alongside a covered modality. We never fabricate or estimate session costs.
      if (body.data.modalityId && sessionCostCents > 0) {
        const [link] = await tx
          .select({
            id: employerMembers.id,
            employerId: employerMembers.employerId,
            monthlyBudget: employerMembers.monthlyBudget,
            spentThisMonth: employerMembers.spentThisMonth,
            budgetMonth: employerMembers.budgetMonth,
          })
          .from(employerMembers)
          .where(eq(employerMembers.profileId, body.data.profileId))
          .limit(1);

        if (link) {
          const [rule] = await tx
            .select({ covered: employerModalityRules.covered })
            .from(employerModalityRules)
            .where(
              and(
                eq(employerModalityRules.employerId, link.employerId),
                eq(employerModalityRules.modalityId, body.data.modalityId!)
              )
            )
            .limit(1);

          const isCovered = rule ? rule.covered : true; // default: covered

          if (isCovered) {
            const effectiveSpent =
              link.budgetMonth === currentMonth ? link.spentThisMonth : 0;
            const remaining = Math.max(0, link.monthlyBudget - effectiveSpent);
            employerCovered = Math.min(sessionCostCents, remaining);
            outOfPocket = sessionCostCents - employerCovered;

            if (employerCovered > 0) {
              await tx
                .update(employerMembers)
                .set({
                  spentThisMonth: effectiveSpent + employerCovered,
                  budgetMonth: currentMonth,
                })
                .where(eq(employerMembers.id, link.id));
            }
          }
        }
      }

      return tx
        .insert(planProgressLogs)
        .values({
          id: randomUUID(),
          profileId: body.data.profileId,
          planId: body.data.planId ?? null,
          modalityId: body.data.modalityId ?? null,
          note: body.data.note ?? null,
          rating: body.data.rating ?? null,
          mood: body.data.mood ?? null,
          pain: body.data.pain ?? null,
          energy: body.data.energy ?? null,
          sessionDate: body.data.sessionDate ? new Date(body.data.sessionDate) : null,
          sessionCostCents: sessionCostCents > 0 ? sessionCostCents : null,
          employerCoveredCents: employerCovered > 0 ? employerCovered : null,
          outOfPocketCents: outOfPocket > 0 ? outOfPocket : null,
          createdAt: new Date(),
        })
        .returning();
    });

    res.status(201).json(ListProgressResponseItem.parse(created));

    // Fire-and-forget: send session-logged confirmation notification
    ;(async () => {
      try {
        const [profile] = await db
          .select({ email: profiles.email, displayName: profiles.displayName })
          .from(profiles)
          .where(eq(profiles.id, created.profileId))
          .limit(1);

        if (!profile?.email) return;

        let modalityName = created.modalityId ?? "Wellness";
        if (created.modalityId) {
          const [mod] = await db
            .select({ name: modalities.name })
            .from(modalities)
            .where(eq(modalities.id, created.modalityId))
            .limit(1);
          if (mod?.name) modalityName = mod.name;
        }

        const progressUrl = process.env.BASE_URL
          ? `${process.env.BASE_URL}/progress`
          : "/progress";

        const { subject, html } = sessionConfirmedEmail({
          displayName: profile.displayName,
          modalityName,
          sessionDate: created.sessionDate ? created.sessionDate.toISOString() : null,
          note: created.note,
          progressUrl,
        });

        await sendNotification({
          profileId: created.profileId,
          email: profile.email,
          type: "session-confirmed",
          subject,
          html,
          smsBody: `Health Plan Factory: Your ${modalityName} session has been logged. Keep up the great work!`,
        });

        // If a future session date was set, queue exact-time reminders
        if (created.sessionDate && created.sessionDate > new Date()) {
          const sessionDate = new Date(created.sessionDate);
          const remind24h = new Date(sessionDate.getTime() - 24 * 60 * 60 * 1000);
          const remind1h  = new Date(sessionDate.getTime() - 60 * 60 * 1000);
          const now2 = new Date();

          const { subject: s24, html: h24 } = sessionReminderEmail({
            displayName: profile.displayName,
            modalityName,
            sessionDate,
            timeframeLabel: "24 hours",
            dashboardUrl: progressUrl,
          });
          const { subject: s1h, html: h1h } = sessionReminderEmail({
            displayName: profile.displayName,
            modalityName,
            sessionDate,
            timeframeLabel: "1 hour",
            dashboardUrl: progressUrl,
          });

          if (remind24h > now2) {
            await queueNotification({
              profileId: created.profileId,
              email: profile.email,
              type: "session-reminder",
              subject: s24,
              html: h24,
              smsBody: `Health Plan Factory: Your ${modalityName} session is in 24 hours. Good luck!`,
              scheduledFor: remind24h,
            });
          }
          if (remind1h > now2) {
            await queueNotification({
              profileId: created.profileId,
              email: profile.email,
              type: "session-reminder",
              subject: s1h,
              html: h1h,
              smsBody: `Health Plan Factory: Your ${modalityName} session is in 1 hour. Good luck!`,
              scheduledFor: remind1h,
            });
          }
        }
      } catch (notifErr) {
        console.error("[comms] post-session notification error:", notifErr);
      }
    })();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
