/**
 * Weekly server-side job that precomputes and caches longitudinal outcome
 * insights for all members who have an existing insights_cache row OR have
 * at least one plan (ensuring new members get their first computation).
 *
 * Runs every Sunday at 02:00 UTC via node-cron.
 * Falls back to the on-demand path in GET /insights/mine for members who
 * haven't been reached by the weekly sweep yet.
 */
import { schedule } from "node-cron";
import { db } from "@workspace/db";
import { insightsCache, plans } from "@workspace/db";
import { sql } from "drizzle-orm";
import { computeAndCacheInsights } from "../routes/insights";
import { logger } from "../lib/logger";

async function refreshAllMemberInsights(): Promise<void> {
  logger.info("Weekly insights refresh job started");

  try {
    // Collect all distinct profile IDs that have a plan (active or historical)
    const profileRows = await db
      .selectDistinct({ profileId: plans.profileId })
      .from(plans);

    const profileIds = profileRows
      .map((r) => r.profileId)
      .filter((id): id is string => id != null);
    logger.info({ count: profileIds.length }, "Refreshing insights for members");

    let succeeded = 0;
    let failed = 0;

    for (const profileId of profileIds) {
      try {
        await computeAndCacheInsights(profileId);
        succeeded++;
      } catch (err) {
        failed++;
        logger.warn({ err, profileId }, "Failed to refresh insights for member");
      }
    }

    logger.info({ succeeded, failed }, "Weekly insights refresh job complete");
  } catch (err) {
    logger.error({ err }, "Weekly insights refresh job encountered a fatal error");
  }
}

/**
 * Registers the weekly cron job.
 * Call once from the server entry point (src/index.ts).
 */
export function startInsightsRefreshJob(): void {
  // Run every Sunday at 02:00 UTC
  schedule("0 2 * * 0", refreshAllMemberInsights, {
    timezone: "UTC",
  });
  logger.info("Weekly insights refresh job scheduled (Sundays 02:00 UTC)");
}
