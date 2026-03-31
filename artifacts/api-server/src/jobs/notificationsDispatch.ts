/**
 * Daily notifications dispatch job — runs at 08:00 UTC.
 *
 * Queries:
 *  1. Sessions within 24 h — sends "24-hour reminder" email/SMS
 *  2. Sessions within 1 h  — sends "1-hour reminder" email/SMS
 *  3. Members with no session in 7+ days — sends accountability nudge
 *  4. Skips if a notification of the same type was already sent for the same
 *     profile within the past 23 hours (deduplication).
 */
import { schedule } from "node-cron";
import { db } from "@workspace/db";
import { planProgressLogs, profiles, notificationLog } from "@workspace/db";
import { eq, lt, gt, and, gte, isNull, or, ne } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { queueNotification, processQueuedNotifications } from "../lib/comms";
import { sessionReminderEmail } from "../emails/session-reminder";
import { accountabilityNudgeEmail } from "../emails/accountability-nudge";
import { paymentDueEmail } from "../emails/payment-due";
import { logger } from "../lib/logger";

const BASE_URL = process.env.BASE_URL || "https://healthplanfactory.com";
const DASHBOARD_URL = `${BASE_URL}/dashboard`;
const PROGRESS_URL = `${BASE_URL}/progress`;

async function wasRecentlySent(
  profileId: string,
  type: string,
  withinMs: number,
): Promise<boolean> {
  const since = new Date(Date.now() - withinMs);
  const rows = await db
    .select({ id: notificationLog.id })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.profileId, profileId),
        eq(notificationLog.type, type as "session-reminder" | "accountability-nudge" | "weekly-summary" | "streak-at-risk"),
        gte(notificationLog.sentAt, since),
        eq(notificationLog.status, "sent"),
      ),
    )
    .limit(1);
  return rows.length > 0;
}

async function dispatchSessionReminders(): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);
  const in1h = new Date(now.getTime() + 1 * 60 * 60 * 1000);
  const in2h = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const upcomingSessions = await db
    .select({
      profileId: planProgressLogs.profileId,
      sessionDate: planProgressLogs.sessionDate,
      modalityId: planProgressLogs.modalityId,
    })
    .from(planProgressLogs)
    .where(
      and(
        gt(planProgressLogs.sessionDate, now),
        lt(planProgressLogs.sessionDate, in25h),
      ),
    );

  const profileIds = [...new Set(upcomingSessions.map((s) => s.profileId).filter(Boolean))] as string[];
  if (profileIds.length === 0) return { sent, skipped };

  const memberProfiles = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      displayName: profiles.displayName,
      communicationPrefs: profiles.communicationPrefs,
    })
    .from(profiles)
    .where(sql`${profiles.id} = ANY(${profileIds})`);

  const profileMap = new Map(memberProfiles.map((p) => [p.id, p]));

  for (const session of upcomingSessions) {
    if (!session.profileId || !session.sessionDate) continue;
    const profile = profileMap.get(session.profileId);
    if (!profile) continue;

    const sessionDate = new Date(session.sessionDate);
    const msUntil = sessionDate.getTime() - now.getTime();

    const is24h = msUntil >= 23 * 60 * 60 * 1000 && msUntil < 25 * 60 * 60 * 1000;
    const is1h = msUntil >= 0 && msUntil < 2 * 60 * 60 * 1000;

    if (!is24h && !is1h) { skipped++; continue; }

    const timeframeLabel = is24h ? "24 hours" : "1 hour";
    const dedupeWindow = is24h ? 23 * 60 * 60 * 1000 : 50 * 60 * 1000;

    const alreadySent = await wasRecentlySent(
      session.profileId,
      "session-reminder",
      dedupeWindow,
    );
    if (alreadySent) { skipped++; continue; }

    const modalityName = session.modalityId ?? "Wellness";
    const { subject, html } = sessionReminderEmail({
      displayName: profile.displayName,
      modalityName,
      sessionDate,
      timeframeLabel,
      dashboardUrl: DASHBOARD_URL,
    });

    await queueNotification({
      profileId: session.profileId,
      email: profile.email,
      type: "session-reminder",
      subject,
      html,
      smsBody: `Health Plan Factory: Your ${modalityName} session is in ${timeframeLabel}. Good luck!`,
      scheduledFor: new Date(), // dispatch immediately during cron run
    });
    sent++;
  }

  return { sent, skipped };
}

async function dispatchAccountabilityNudges(): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Members who have never logged a session, or haven't logged one in 7+ days
  const allMembers = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      displayName: profiles.displayName,
      communicationPrefs: profiles.communicationPrefs,
    })
    .from(profiles)
    .where(eq(profiles.role, "member"));

  for (const profile of allMembers) {
    const recentLogs = await db
      .select({ id: planProgressLogs.id, createdAt: planProgressLogs.createdAt })
      .from(planProgressLogs)
      .where(
        and(
          eq(planProgressLogs.profileId, profile.id),
          gte(planProgressLogs.createdAt, sevenDaysAgo),
        ),
      )
      .limit(1);

    if (recentLogs.length > 0) continue; // active — no nudge needed

    const alreadySent = await wasRecentlySent(
      profile.id,
      "accountability-nudge",
      23 * 60 * 60 * 1000,
    );
    if (alreadySent) { skipped++; continue; }

    // Calculate streak and days since last session
    const lastLog = await db
      .select({ createdAt: planProgressLogs.createdAt })
      .from(planProgressLogs)
      .where(eq(planProgressLogs.profileId, profile.id))
      .orderBy(sql`${planProgressLogs.createdAt} DESC`)
      .limit(1);

    const daysSinceLast = lastLog[0]
      ? Math.floor((Date.now() - new Date(lastLog[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const { subject, html } = accountabilityNudgeEmail({
      displayName: profile.displayName,
      weeklySessionCount: 0,
      currentStreak: 0,
      daysSinceLastSession: daysSinceLast,
      dashboardUrl: PROGRESS_URL,
      type: "streak-at-risk",
    });

    await queueNotification({
      profileId: profile.id,
      email: profile.email,
      type: "accountability-nudge",
      subject,
      html,
      smsBody: `Health Plan Factory: It's been ${daysSinceLast ?? "a few"} day(s) since your last session. Stay on track with your wellness plan!`,
      scheduledFor: new Date(),
    });
    sent++;
  }

  return { sent, skipped };
}

async function dispatchWeeklySummaries(): Promise<{ sent: number; skipped: number }> {
  const today = new Date();
  if (today.getUTCDay() !== 1) return { sent: 0, skipped: 0 }; // only on Mondays

  let sent = 0;
  let skipped = 0;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const allMembers = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      displayName: profiles.displayName,
      communicationPrefs: profiles.communicationPrefs,
    })
    .from(profiles)
    .where(eq(profiles.role, "member"));

  for (const profile of allMembers) {
    const alreadySent = await wasRecentlySent(
      profile.id,
      "weekly-summary",
      6 * 24 * 60 * 60 * 1000, // 6-day dedup window
    );
    if (alreadySent) { skipped++; continue; }

    const recentLogs = await db
      .select({ createdAt: planProgressLogs.createdAt })
      .from(planProgressLogs)
      .where(
        and(
          eq(planProgressLogs.profileId, profile.id),
          gte(planProgressLogs.createdAt, sevenDaysAgo),
        ),
      );

    const weeklySessionCount = recentLogs.length;

    const lastLog = await db
      .select({ createdAt: planProgressLogs.createdAt })
      .from(planProgressLogs)
      .where(eq(planProgressLogs.profileId, profile.id))
      .orderBy(sql`${planProgressLogs.createdAt} DESC`)
      .limit(1);

    const daysSinceLast = lastLog[0]
      ? Math.floor((Date.now() - new Date(lastLog[0].createdAt).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const { subject, html } = accountabilityNudgeEmail({
      displayName: profile.displayName,
      weeklySessionCount,
      currentStreak: 0,
      daysSinceLastSession: daysSinceLast,
      dashboardUrl: PROGRESS_URL,
      type: "weekly-summary",
    });

    await queueNotification({
      profileId: profile.id,
      email: profile.email,
      type: "weekly-summary",
      subject,
      html,
      smsBody: `Health Plan Factory: Weekly check-in — you logged ${weeklySessionCount} session(s) this week. Keep up the great work!`,
      scheduledFor: new Date(),
    });
    sent++;
  }

  return { sent, skipped };
}

async function dispatchPaymentDueReminders(): Promise<{ sent: number; skipped: number }> {
  let sent = 0;
  let skipped = 0;

  const canceledMembers = await db
    .select({
      id: profiles.id,
      email: profiles.email,
      displayName: profiles.displayName,
      communicationPrefs: profiles.communicationPrefs,
    })
    .from(profiles)
    .where(and(eq(profiles.role, "member"), eq(profiles.subscriptionStatus, "canceled")));

  for (const profile of canceledMembers) {
    const alreadySent = await wasRecentlySent(
      profile.id,
      "payment-due",
      7 * 24 * 60 * 60 * 1000, // max one reminder per week
    );
    if (alreadySent) { skipped++; continue; }

    const { subject, html } = paymentDueEmail({
      displayName: profile.displayName,
      amountFormatted: "$9.99/month",
      dashboardUrl: DASHBOARD_URL,
    });

    await queueNotification({
      profileId: profile.id,
      email: profile.email,
      type: "payment-due",
      subject,
      html,
      smsBody: `Health Plan Factory: Your subscription has lapsed. Renew at ${DASHBOARD_URL} to continue your wellness journey.`,
      scheduledFor: new Date(),
    });
    sent++;
  }

  return { sent, skipped };
}

/**
 * Daily batch job (08:00 UTC):
 *  - Session reminders: catch-all for upcoming sessions (24h/1h windows).
 *    Primary path is queueNotification() at session creation in progress.ts, but this
 *    daily sweep catches sessions that existed before the queue was introduced.
 *  - Accountability nudges, weekly summaries, payment-due reminders.
 * Queue processor (every 15 min) flushes all queued entries to the provider.
 */
async function runDailyBatchJob(): Promise<void> {
  logger.info("Daily batch notification job started");

  try {
    const [reminders, nudges, weeklySummaries, paymentDue] = await Promise.all([
      dispatchSessionReminders(),
      dispatchAccountabilityNudges(),
      dispatchWeeklySummaries(),
      dispatchPaymentDueReminders(),
    ]);

    logger.info(
      { reminders, nudges, weeklySummaries, paymentDue },
      "Daily batch notification job complete",
    );
  } catch (err) {
    logger.error({ err }, "Daily batch notification job fatal error");
  }
}

/**
 * Queue processor: runs every 15 minutes to flush queued notifications.
 * Processes all notification_log entries with status='queued' and scheduledFor <= now,
 * transitioning them to sent or failed. This enables reliable delivery of pre-scheduled
 * notifications (session reminders at 24h before, 1h before, etc.).
 */
async function runQueueProcessor(): Promise<void> {
  try {
    const result = await processQueuedNotifications();
    if (result.processed > 0) {
      logger.info(result, "Notification queue processor: batch complete");
    }
  } catch (err) {
    logger.error({ err }, "Notification queue processor error");
  }
}

export function startNotificationsDispatchJob(): void {
  // Daily batch: accountability nudges, weekly summaries, payment-due at 08:00 UTC
  schedule("0 8 * * *", runDailyBatchJob, { timezone: "UTC" });

  // Queue processor: every 15 minutes to deliver pre-queued session reminders on time
  schedule("*/15 * * * *", runQueueProcessor);

  logger.info(
    "Notification jobs scheduled: daily batch (08:00 UTC) + queue processor (every 15 min)",
  );
}
