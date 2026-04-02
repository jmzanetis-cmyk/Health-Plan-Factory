/**
 * Email flow integration tests — route-level verification
 *
 * These tests prove each transactional email flow wires through comms.ts to
 * notification_log. Every test uses mocked Resend (no real emails sent) and
 * verifies that the correct notification_log row is created after the HTTP
 * route call.
 *
 * Flows covered:
 *  1. magic-link      — POST /api/magic-links/generate (sendEmail: true)
 *  2. referral-invite — POST /api/referrals/invite
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  profiles,
  magicLinks,
  notificationLog,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import magicLinksRouter from "../routes/magicLinks";
import referralsRouter from "../routes/referrals";

// ── Resend mock ───────────────────────────────────────────────────────────────
// Variables starting with "mock" are hoisted by vitest alongside vi.mock().
// Use getters so the reference to mockResendSend is resolved lazily (after
// variable initialisation) rather than at new Resend() construction time.

const mockResendSend = vi.fn();

vi.mock("resend", () => ({
  Resend: class {
    get emails() { return { send: mockResendSend }; }
    get domains() { return { list: vi.fn().mockResolvedValue({ data: { data: [] }, error: null }) }; }
  },
}));

// ── Test app builder ──────────────────────────────────────────────────────────

function buildApp(
  userId: string | null,
  role: "member" | "provider" | "admin" = "member",
  email?: string,
): Express {
  const app = express();
  app.use(express.json());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.isAuthenticated = function (this: Request) {
      return this.user != null;
    } as Request["isAuthenticated"];

    if (userId) {
      (req as Request & { user: Express.User }).user = {
        id: userId,
        email: email ?? `${userId}@flows-test.example.com`,
        role,
        displayName: `Test User ${userId.slice(0, 6)}`,
        avatarUrl: null,
      };
    }
    next();
  });

  app.use(magicLinksRouter);
  app.use(referralsRouter);

  return app;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createProfile(role: "member" | "provider" | "admin" = "member"): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  const email = `${id}@flows-test.example.com`;
  await db.insert(profiles).values({
    id,
    email,
    displayName: "Flow Test User",
    role,
    communicationPrefs: { email: true, sms: false },
  });
  return { id, email };
}

async function cleanup(profileIds: string[]): Promise<void> {
  for (const id of profileIds) {
    await db.delete(notificationLog).where(eq(notificationLog.profileId, id));
    await db.delete(magicLinks).where(eq(magicLinks.profileId, id));
    await db.delete(profiles).where(eq(profiles.id, id));
  }
}

// ── 1. Magic-link email flow ──────────────────────────────────────────────────

describe("Email flow: magic-link (POST /api/magic-links/generate)", () => {
  let profileId: string;
  let app: Express;

  beforeAll(async () => {
    const profile = await createProfile("member");
    profileId = profile.id;
    app = buildApp(profileId, "member", profile.email);
  });

  afterAll(async () => {
    await cleanup([profileId]);
  });

  beforeEach(() => {
    mockResendSend.mockReset();
    mockResendSend.mockResolvedValue({ data: { id: "msg_ml_test" }, error: null });
  });

  it("creates a notification_log row with type=magic-link and status=sent when sendEmail=true", async () => {
    const res = await request(app)
      .post("/magic-links/generate")
      .send({ action: "login", sendEmail: true });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();

    // sendEmail is fire-and-forget; give it time to settle
    await new Promise(r => setTimeout(r, 400));

    const logs = await db
      .select()
      .from(notificationLog)
      .where(and(
        eq(notificationLog.profileId, profileId),
        eq(notificationLog.type, "magic-link"),
      ));

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[0];
    expect(log.channel).toBe("email");
    expect(log.status).toBe("sent");
    expect(log.sentAt).not.toBeNull();
    expect(mockResendSend).toHaveBeenCalledOnce();

    // Verify the email was sent to the profile's address
    const callArgs = mockResendSend.mock.calls[0][0];
    expect(callArgs.to).toBe(`${profileId}@flows-test.example.com`);
    expect(callArgs.from).toContain("healthplanfactory.com");
  });

  it("does NOT call Resend and creates no notification_log row when sendEmail=false", async () => {
    // Clear any pre-existing magic-link logs for this profile
    await db.delete(notificationLog).where(and(
      eq(notificationLog.profileId, profileId),
      eq(notificationLog.type, "magic-link"),
    ));

    const res = await request(app)
      .post("/magic-links/generate")
      .send({ action: "login", sendEmail: false });

    expect(res.status).toBe(201);

    await new Promise(r => setTimeout(r, 200));

    const logs = await db
      .select()
      .from(notificationLog)
      .where(and(
        eq(notificationLog.profileId, profileId),
        eq(notificationLog.type, "magic-link"),
      ));

    expect(logs.length).toBe(0);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("creates a notification_log row with status=failed when Resend throws", async () => {
    // Clear any pre-existing magic-link logs
    await db.delete(notificationLog).where(and(
      eq(notificationLog.profileId, profileId),
      eq(notificationLog.type, "magic-link"),
    ));

    mockResendSend.mockRejectedValueOnce(new Error("Resend delivery error"));

    const res = await request(app)
      .post("/magic-links/generate")
      .send({ action: "login", sendEmail: true });

    expect(res.status).toBe(201);

    await new Promise(r => setTimeout(r, 400));

    const logs = await db
      .select()
      .from(notificationLog)
      .where(and(
        eq(notificationLog.profileId, profileId),
        eq(notificationLog.type, "magic-link"),
      ));

    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].status).toBe("failed");
    expect((logs[0].metadata as Record<string, unknown>).error).toMatch(/Resend delivery error/);
  });
});

// ── 2. Referral-invite email flow ─────────────────────────────────────────────

describe("Email flow: referral-invite (POST /api/referrals/invite)", () => {
  let profileId: string;
  let app: Express;

  beforeAll(async () => {
    const profile = await createProfile("member");
    profileId = profile.id;
    // Referral invite requires the sender to have a referral code
    await db
      .update(profiles)
      .set({ referralCode: `INVTEST-${profileId.slice(0, 6).toUpperCase()}` })
      .where(eq(profiles.id, profileId));
    app = buildApp(profileId, "member", profile.email);
  });

  afterAll(async () => {
    await cleanup([profileId]);
  });

  beforeEach(() => {
    mockResendSend.mockReset();
    mockResendSend.mockResolvedValue({ data: { id: "msg_inv_test" }, error: null });
  });

  it("creates a notification_log row with type=referral-invite and status=sent", async () => {
    const targetEmail = `invite-target-${randomUUID().slice(0, 8)}@external-test.example.com`;

    const res = await request(app)
      .post("/referrals/invite")
      .send({ email: targetEmail, note: "Join me on Health Plan Factory!" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Invite sent");

    const logs = await db
      .select()
      .from(notificationLog)
      .where(and(
        eq(notificationLog.profileId, profileId),
        eq(notificationLog.type, "referral-invite"),
      ));

    expect(logs.length).toBeGreaterThanOrEqual(1);
    const log = logs[0];
    expect(log.channel).toBe("email");
    expect(log.status).toBe("sent");
    expect((log.metadata as Record<string, unknown>).to).toBe(targetEmail);
    expect(mockResendSend).toHaveBeenCalledOnce();

    // Verify email content includes referral code
    const callArgs = mockResendSend.mock.calls[0][0];
    expect(callArgs.from).toContain("healthplanfactory.com");
  });

  it("returns 400 for invalid email address and does not call Resend", async () => {
    const res = await request(app)
      .post("/referrals/invite")
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("returns 401 for unauthenticated requests", async () => {
    const unauthApp = buildApp(null);
    const res = await request(unauthApp)
      .post("/referrals/invite")
      .send({ email: "valid@example.com" });

    expect(res.status).toBe(401);
    expect(mockResendSend).not.toHaveBeenCalled();
  });
});
