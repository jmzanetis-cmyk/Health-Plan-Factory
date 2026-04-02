/**
 * Communications helpers — thin wrappers around Resend (email) and Twilio (SMS).
 * All send functions are fire-and-forget: failures are logged but never thrown.
 * Call sites must check communicationPrefs before invoking these helpers.
 */
import { Resend } from "resend";
import twilio from "twilio";
import { db } from "@workspace/db";
import { notificationLog, profiles } from "@workspace/db";
import { eq, and, lte } from "drizzle-orm";
import { randomUUID } from "crypto";
import type { NotificationType } from "./commsTypes";

// ── Client initialisation (lazy — missing keys disable the channel) ──────────

const resendKey = process.env.RESEND_API_KEY;
const twilioSid = process.env.TWILIO_ACCOUNT_SID;
const twilioToken = process.env.TWILIO_AUTH_TOKEN;
const twilioFrom = process.env.TWILIO_FROM_NUMBER;

const resendClient = resendKey ? new Resend(resendKey) : null;
const twilioClient =
  twilioSid && twilioToken ? twilio(twilioSid, twilioToken) : null;

// ── Logging helper ───────────────────────────────────────────────────────────

async function logNotification(
  profileId: string,
  channel: "email" | "sms",
  type: NotificationType,
  status: "queued" | "sent" | "failed",
  metadata?: Record<string, unknown>,
  scheduledFor?: Date,
): Promise<string> {
  const id = randomUUID();
  try {
    await db.insert(notificationLog).values({
      id,
      profileId,
      channel,
      type,
      status,
      sentAt: status === "sent" ? new Date() : undefined,
      scheduledFor,
      metadata,
    });
  } catch (err) {
    console.error("[comms] Failed to write notification_log:", err);
  }
  return id;
}

/**
 * Queue a notification for later delivery by the cron dispatcher.
 * Writes a 'queued' entry to notification_log with scheduledFor timestamp.
 * The daily cron picks up queued entries and transitions them to sent/failed.
 */
export async function queueNotification(opts: {
  profileId: string;
  email: string;
  type: NotificationType;
  subject: string;
  html: string;
  smsBody: string;
  scheduledFor: Date;
}): Promise<void> {
  const prefs = await getCommsPrefs(opts.profileId);

  if (prefs.email) {
    await logNotification(opts.profileId, "email", opts.type, "queued", {
      to: opts.email,
      subject: opts.subject,
      bodyHtml: opts.html,
    }, opts.scheduledFor);
  }
  if (prefs.sms && prefs.phone) {
    await logNotification(opts.profileId, "sms", opts.type, "queued", {
      to: prefs.phone,
      bodySms: opts.smsBody,
    }, opts.scheduledFor);
  }
}

/**
 * Process a batch of queued notifications from notification_log.
 * Transitions queued -> sent/failed. Returns counts.
 */
export async function processQueuedNotifications(
  nowDate: Date = new Date(),
): Promise<{ processed: number; sent: number; failed: number }> {
  let processed = 0;
  let sent = 0;
  let failed = 0;

  // Fetch entries that are queued and scheduled for now or earlier
  const queued = await db
    .select()
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.status, "queued"),
        lte(notificationLog.scheduledFor, nowDate),
      ),
    )
    .limit(200);

  for (const entry of queued) {
    processed++;
    try {
      const meta = (entry.metadata ?? {}) as Record<string, unknown>;
      let failureReason: string | null = null;

      if (entry.channel === "email") {
        const to = typeof meta.to === "string" ? meta.to : null;
        const subject = typeof meta.subject === "string" ? meta.subject : "(no subject)";
        const html = typeof meta.bodyHtml === "string" ? meta.bodyHtml : "";
        if (!to) {
          failureReason = "Missing recipient email address in metadata";
        } else if (!resendClient) {
          failureReason = "Resend client not configured (RESEND_API_KEY missing)";
        } else {
          await resendClient.emails.send({
            from: "Health Plan Factory <noreply@healthplanfactory.com>",
            to,
            subject,
            html,
          });
        }
      } else if (entry.channel === "sms") {
        const to = typeof meta.to === "string" ? meta.to : null;
        const body = typeof meta.bodySms === "string" ? meta.bodySms : "";
        if (!to) {
          failureReason = "Missing recipient phone number in metadata";
        } else if (!twilioClient || !twilioFrom) {
          failureReason = "Twilio client not configured (TWILIO_* env vars missing)";
        } else {
          await twilioClient.messages.create({ from: twilioFrom, to, body });
        }
      }

      if (failureReason) {
        await db
          .update(notificationLog)
          .set({ status: "failed", metadata: { ...(meta), error: failureReason } })
          .where(eq(notificationLog.id, entry.id));
        failed++;
      } else {
        await db
          .update(notificationLog)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(notificationLog.id, entry.id));
        sent++;
      }
    } catch (err) {
      console.error("[comms] processQueuedNotifications failed for entry:", entry.id, err);
      await db
        .update(notificationLog)
        .set({ status: "failed", metadata: { ...(entry.metadata as Record<string, unknown> ?? {}), error: String(err) } })
        .where(eq(notificationLog.id, entry.id));
      failed++;
    }
  }

  return { processed, sent, failed };
}

// ── Communication preference check ──────────────────────────────────────────

export async function getCommsPrefs(
  profileId: string,
): Promise<{ email: boolean; sms: boolean; phone: string | null }> {
  try {
    const [profile] = await db
      .select({ communicationPrefs: profiles.communicationPrefs, phone: profiles.phone })
      .from(profiles)
      .where(eq(profiles.id, profileId))
      .limit(1);
    const prefs = profile?.communicationPrefs ?? { email: true, sms: false };
    return { email: prefs.email, sms: prefs.sms, phone: profile?.phone ?? null };
  } catch {
    return { email: true, sms: false, phone: null };
  }
}

// ── Email ────────────────────────────────────────────────────────────────────

export async function sendEmail(
  profileId: string,
  to: string,
  subject: string,
  html: string,
  type: NotificationType = "magic-link",
): Promise<void> {
  if (!resendClient) {
    console.error("[comms] sendEmail: RESEND_API_KEY not configured — logging failure");
    await logNotification(profileId, "email", type, "failed", {
      to,
      subject,
      error: "RESEND_API_KEY not configured",
    });
    return;
  }
  try {
    await resendClient.emails.send({
      from: "Health Plan Factory <noreply@healthplanfactory.com>",
      to,
      subject,
      html,
    });
    await logNotification(profileId, "email", type, "sent", { to, subject });
  } catch (err) {
    console.error("[comms] sendEmail failed:", err);
    await logNotification(profileId, "email", type, "failed", {
      to,
      subject,
      error: String(err),
    });
  }
}

// ── SMS ──────────────────────────────────────────────────────────────────────

export async function sendSms(
  profileId: string,
  to: string,
  body: string,
  type: NotificationType = "magic-link",
): Promise<void> {
  if (!twilioClient || !twilioFrom) {
    console.warn("[comms] Twilio not configured — missing TWILIO_* env vars");
    return;
  }
  try {
    await twilioClient.messages.create({ from: twilioFrom, to, body });
    await logNotification(profileId, "sms", type, "sent", { to });
  } catch (err) {
    console.error("[comms] sendSms failed:", err);
    await logNotification(profileId, "sms", type, "failed", {
      to,
      error: String(err),
    });
  }
}

/**
 * Convenience helper: sends email and/or SMS according to the member's stored
 * communication preferences. Fire-and-forget.
 */
export async function sendNotification(opts: {
  profileId: string;
  email: string;
  type: NotificationType;
  subject: string;
  html: string;
  smsBody: string;
}): Promise<void> {
  const prefs = await getCommsPrefs(opts.profileId);

  if (prefs.email) {
    sendEmail(opts.profileId, opts.email, opts.subject, opts.html, opts.type).catch(() => {});
  }
  if (prefs.sms && prefs.phone) {
    sendSms(opts.profileId, prefs.phone, opts.smsBody, opts.type).catch(() => {});
  }
}
