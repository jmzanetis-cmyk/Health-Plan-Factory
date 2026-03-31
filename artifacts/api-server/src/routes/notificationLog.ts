/**
 * Admin: notification log endpoint
 *
 * GET /admin/notification-log — returns paginated sent messages (admin only)
 */
import { Router, Request, Response } from "express";
import { db } from "@workspace/db";
import { notificationLog, profiles } from "@workspace/db";
import { eq, desc, count, and } from "drizzle-orm";
import { z } from "zod";

const router = Router();

const QueryParams = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  profileId: z.string().optional(),
  type: z.string().optional(),
  status: z.enum(["queued", "sent", "failed"]).optional(),
  channel: z.enum(["email", "sms"]).optional(),
});

router.get("/admin/notification-log", async (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  const params = QueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
    return;
  }

  const { page, limit, profileId, type, status, channel } = params.data;
  const offset = (page - 1) * limit;

  const whereClauses = [];
  if (profileId) whereClauses.push(eq(notificationLog.profileId, profileId));
  if (type) whereClauses.push(eq(notificationLog.type, type as "welcome" | "plan-ready" | "session-reminder" | "payment-due" | "payment-confirmed" | "accountability-nudge" | "referral-invite" | "magic-link" | "weekly-summary" | "streak-at-risk"));
  if (status) whereClauses.push(eq(notificationLog.status, status));
  if (channel) whereClauses.push(eq(notificationLog.channel, channel));

  const whereClause = whereClauses.length > 0 ? and(...whereClauses) : undefined;

  try {
    const [{ total }] = await db
      .select({ total: count() })
      .from(notificationLog)
      .where(whereClause);

    const rows = await db
      .select({
        id: notificationLog.id,
        profileId: notificationLog.profileId,
        channel: notificationLog.channel,
        type: notificationLog.type,
        status: notificationLog.status,
        scheduledFor: notificationLog.scheduledFor,
        sentAt: notificationLog.sentAt,
        createdAt: notificationLog.createdAt,
        email: profiles.email,
        displayName: profiles.displayName,
      })
      .from(notificationLog)
      .leftJoin(profiles, eq(notificationLog.profileId, profiles.id))
      .where(whereClause)
      .orderBy(desc(notificationLog.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({
      entries: rows,
      total,
      page,
      limit,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
