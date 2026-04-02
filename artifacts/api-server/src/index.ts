import app from "./app";
import { logger } from "./lib/logger";
import { startInsightsRefreshJob } from "./jobs/insightsRefresh";
import { startNotificationsDispatchJob } from "./jobs/notificationsDispatch";
import Stripe from "stripe";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function validateStripeKey(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    logger.warn("Stripe: STRIPE_SECRET_KEY not set — payments in demo mode");
    return;
  }
  try {
    const stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
    const account = await stripe.accounts.retrieve();
    logger.info(
      { accountId: account.id, livemode: account.livemode, country: account.country },
      "Stripe: live key validated successfully"
    );
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      logger.warn("Stripe: STRIPE_WEBHOOK_SECRET not set — webhooks will not be verified");
    } else {
      logger.info("Stripe: webhook secret configured");
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    logger.error({ err: msg }, "Stripe: key validation failed — payments in demo mode");
  }
}

function logServiceStatus(): void {
  const resendConfigured = !!process.env.RESEND_API_KEY;
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
  const webhookConfigured = !!process.env.STRIPE_WEBHOOK_SECRET;
  logger.info(
    { stripe: stripeConfigured, stripeWebhook: webhookConfigured, resend: resendConfigured },
    "Service configuration status"
  );
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  logServiceStatus();
  await validateStripeKey();
  startInsightsRefreshJob();
  startNotificationsDispatchJob();
});
