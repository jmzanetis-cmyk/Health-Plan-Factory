import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";

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

export default router;
