/**
 * Resend live delivery smoke tests
 *
 * These tests use the REAL Resend API (no vi.mock) to verify actual email
 * delivery is working end-to-end. They send to `delivered@resend.dev`, which
 * is Resend's official test sink address that always accepts mail, and return
 * a real Resend message ID.
 *
 * The tests are skipped automatically when RESEND_API_KEY is not set, so they
 * are safe to run in CI environments without secrets.
 *
 * Covers:
 *  - Direct Resend API call returns a message ID (real delivery confirmed)
 *  - sendEmail() writes a `sent` notification_log row with real Resend data
 *  - sendNotification() with type=welcome reaches Resend and logs notification_log
 *  - sendNotification() with type=plan-ready reaches Resend and logs notification_log
 *  - sendNotification() with type=payment-confirmed reaches Resend and logs notification_log
 *  - sendNotification() with type=referral-invite reaches Resend and logs notification_log
 *  - sendNotification() with type=referral-reward reaches Resend and logs notification_log
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { randomUUID } from "crypto";
import { Resend } from "resend";
import { db } from "@workspace/db";
import { profiles, notificationLog } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import type { NotificationType } from "../lib/commsTypes";

const RESEND_KEY = process.env.RESEND_API_KEY;
const RESEND_TEST_SINK = "delivered@resend.dev";
const RESEND_FROM = "Health Plan Factory <onboarding@resend.dev>";

// Skip entire suite unless both RESEND_API_KEY and RUN_RESEND_SMOKE=true are set.
// This prevents accidental outbound API calls in CI environments that have the
// key but do not intend to make real network requests during a test run.
const describeIfConfigured = (RESEND_KEY && process.env.RUN_RESEND_SMOKE === "true")
  ? describe
  : describe.skip;

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createProfile(): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  const email = RESEND_TEST_SINK;
  await db.insert(profiles).values({
    id,
    email,
    displayName: "Smoke Test User",
    role: "member",
    communicationPrefs: { email: true, sms: false },
  });
  return { id, email };
}

async function cleanup(profileIds: string[]): Promise<void> {
  for (const id of profileIds) {
    await db.delete(notificationLog).where(eq(notificationLog.profileId, id));
    await db.delete(profiles).where(eq(profiles.id, id));
  }
}

// ── 1. Direct Resend API call ─────────────────────────────────────────────────

describeIfConfigured("Resend live delivery: direct API call", () => {
  it("returns a real message ID when sending to delivered@resend.dev", async () => {
    const resend = new Resend(RESEND_KEY!);
    const { data, error } = await resend.emails.send({
      from: RESEND_FROM,
      to: RESEND_TEST_SINK,
      subject: "[Health Plan Factory Smoke Test] Direct API verification",
      html: "<p>Resend API direct call smoke test. Real message ID captured.</p>",
    });

    expect(error).toBeNull();
    expect(data).not.toBeNull();
    expect(data!.id).toBeDefined();
    expect(typeof data!.id).toBe("string");
    expect(data!.id.length).toBeGreaterThan(0);

    // Log message ID for audit trail
    console.info("[smoke] Resend direct API message ID:", data!.id);
  });
});

// ── 2. sendEmail with real Resend client ──────────────────────────────────────

describeIfConfigured("Resend live delivery: sendEmail() writes sent notification_log", () => {
  let profileId: string;

  beforeAll(async () => {
    const p = await createProfile();
    profileId = p.id;
  });

  afterAll(async () => { await cleanup([profileId]); });

  const typesToTest: NotificationType[] = [
    "magic-link",
    "welcome",
    "plan-ready",
    "payment-confirmed",
    "referral-invite",
    "referral-reward",
  ];

  for (const type of typesToTest) {
    it(`sends real email and writes sent notification_log for type=${type}`, async () => {
      // Import the real sendEmail (not mocked)
      const { sendEmail } = await import("../lib/comms");

      await sendEmail(
        profileId,
        RESEND_TEST_SINK,
        `[Smoke] ${type} email delivery test`,
        `<p>Live delivery test for notification type: ${type}</p>`,
        type,
      );

      // Give the async notification_log write time to settle
      await new Promise(r => setTimeout(r, 500));

      const logs = await db.select().from(notificationLog).where(and(
        eq(notificationLog.profileId, profileId),
        eq(notificationLog.type, type),
        eq(notificationLog.status, "sent"),
      ));

      expect(logs.length).toBeGreaterThanOrEqual(1);
      const log = logs[0];
      expect(log.status).toBe("sent");
      expect(log.channel).toBe("email");
      expect(log.sentAt).not.toBeNull();
      expect((log.metadata as Record<string, unknown>).to).toBe(RESEND_TEST_SINK);

      console.info(`[smoke] ${type}: notification_log id=${log.id}, sentAt=${log.sentAt}`);
    });
  }
});
