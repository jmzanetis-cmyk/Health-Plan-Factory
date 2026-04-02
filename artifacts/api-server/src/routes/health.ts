import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { notificationLog } from "@workspace/db";
import { eq, desc, count, and, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

/**
 * GET /api/healthz/config
 * Returns the operational configuration status for key integrations.
 * Does NOT expose secret values — only boolean presence flags.
 * Useful for ops dashboards, deployment checks, and smoke tests.
 */
router.get("/healthz/config", (_req, res) => {
  const stripeMode = process.env.STRIPE_SECRET_KEY
    ? process.env.STRIPE_SECRET_KEY.startsWith("sk_live_") ? "live" : "test"
    : "unconfigured";

  res.json({
    stripe: {
      configured: !!process.env.STRIPE_SECRET_KEY,
      mode: stripeMode,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    },
    email: {
      configured: !!process.env.RESEND_API_KEY,
      provider: process.env.RESEND_API_KEY ? "resend" : "none",
    },
    ai: {
      anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
    },
    db: {
      configured: !!process.env.DATABASE_URL,
    },
  });
});

/**
 * GET /api/notifications/status
 * Admin-only. Returns counts from notification_log by status and type.
 * Used to verify email delivery is working after RESEND_API_KEY is configured.
 * Returns: { total, sent, failed, queued, recent[] }
 */
router.get("/notifications/status", async (req, res) => {
  if (!req.isAuthenticated() || req.user?.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }

  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [totalResult] = await db.select({ total: count() }).from(notificationLog);
    const [sentResult] = await db.select({ sent: count() }).from(notificationLog).where(eq(notificationLog.status, "sent"));
    const [failedResult] = await db.select({ failed: count() }).from(notificationLog).where(eq(notificationLog.status, "failed"));
    const [queuedResult] = await db.select({ queued: count() }).from(notificationLog).where(eq(notificationLog.status, "queued"));
    const [last24hResult] = await db.select({ last24h: count() }).from(notificationLog).where(
      and(eq(notificationLog.status, "sent"), gte(notificationLog.sentAt, oneDayAgo))
    );

    const recent = await db
      .select({
        id: notificationLog.id,
        type: notificationLog.type,
        channel: notificationLog.channel,
        status: notificationLog.status,
        sentAt: notificationLog.sentAt,
        createdAt: notificationLog.createdAt,
      })
      .from(notificationLog)
      .orderBy(desc(notificationLog.createdAt))
      .limit(20);

    res.json({
      emailConfigured: !!process.env.RESEND_API_KEY,
      totals: {
        total: totalResult.total,
        sent: sentResult.sent,
        failed: failedResult.failed,
        queued: queuedResult.queued,
        sentLast24h: last24hResult.last24h,
      },
      recent,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
