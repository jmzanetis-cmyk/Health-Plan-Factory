/**
 * Email flow integration tests — route-level verification
 *
 * These tests prove each transactional email flow wires through comms.ts to
 * notification_log. Every test uses mocked Resend (no real emails sent) and
 * verifies the correct notification_log row is created after the route call
 * or function invocation.
 *
 * Flows covered:
 *  1. magic-link        — POST /magic-links/generate (sendEmail: true)
 *  2. referral-invite   — POST /referrals/invite
 *  3. payment-confirmed — GET  /magic-links/redeem/:token (action=payment)
 *  4. referral-reward   — maybeRewardReferrer() (exported helper)
 *  5. welcome           — sendNotification with type=welcome (fire-and-forget path)
 *  6. plan-ready        — sendNotification with type=plan-ready (fire-and-forget path)
 */

import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  profiles,
  magicLinks,
  memberIntakes,
  plans,
  referrals,
  memberCredits,
  notificationLog,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import magicLinksRouter from "../routes/magicLinks";
import referralsRouter, { maybeRewardReferrer } from "../routes/referrals";

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
    await db.delete(memberCredits).where(eq(memberCredits.profileId, id));
    await db.delete(plans).where(eq(plans.profileId, id));
    await db.delete(memberIntakes).where(eq(memberIntakes.profileId, id));
    await db.delete(referrals).where(eq(referrals.referrerId, id));
    await db.delete(referrals).where(eq(referrals.referredMemberId, id));
    await db.delete(profiles).where(eq(profiles.id, id));
  }
}

const wait = (ms = 400) => new Promise(r => setTimeout(r, ms));

// ── 1. magic-link email flow ──────────────────────────────────────────────────

describe("Email flow: magic-link (POST /magic-links/generate)", () => {
  let profileId: string;
  let app: Express;

  beforeAll(async () => {
    const profile = await createProfile("member");
    profileId = profile.id;
    app = buildApp(profileId, "member", profile.email);
  });

  afterAll(async () => { await cleanup([profileId]); });

  beforeEach(() => {
    mockResendSend.mockReset();
    mockResendSend.mockResolvedValue({ data: { id: "msg_ml" }, error: null });
  });

  it("creates a sent notification_log row (type=magic-link) when sendEmail=true", async () => {
    const res = await request(app)
      .post("/magic-links/generate")
      .send({ action: "login", sendEmail: true });

    expect(res.status).toBe(201);
    await wait();

    const logs = await db.select().from(notificationLog).where(and(
      eq(notificationLog.profileId, profileId),
      eq(notificationLog.type, "magic-link"),
      eq(notificationLog.status, "sent"),
    ));
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(mockResendSend).toHaveBeenCalledOnce();

    const callArgs = mockResendSend.mock.calls[0][0];
    expect(callArgs.from).toContain("healthplanfactory.com");
  });

  it("creates no notification_log row when sendEmail=false", async () => {
    await db.delete(notificationLog).where(eq(notificationLog.profileId, profileId));

    const res = await request(app)
      .post("/magic-links/generate")
      .send({ action: "login", sendEmail: false });

    expect(res.status).toBe(201);
    await wait(200);

    const logs = await db.select().from(notificationLog).where(eq(notificationLog.profileId, profileId));
    expect(logs.length).toBe(0);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("creates a failed notification_log row when Resend throws", async () => {
    await db.delete(notificationLog).where(and(
      eq(notificationLog.profileId, profileId),
      eq(notificationLog.type, "magic-link"),
    ));
    mockResendSend.mockRejectedValueOnce(new Error("Resend delivery error"));

    const res = await request(app)
      .post("/magic-links/generate")
      .send({ action: "login", sendEmail: true });

    expect(res.status).toBe(201);
    await wait();

    const logs = await db.select().from(notificationLog).where(and(
      eq(notificationLog.profileId, profileId),
      eq(notificationLog.type, "magic-link"),
    ));
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].status).toBe("failed");
    expect((logs[0].metadata as Record<string, unknown>).error).toMatch(/Resend delivery error/);
  });
});

// ── 2. referral-invite email flow ─────────────────────────────────────────────

describe("Email flow: referral-invite (POST /referrals/invite)", () => {
  let profileId: string;
  let app: Express;

  beforeAll(async () => {
    const profile = await createProfile("member");
    profileId = profile.id;
    await db.update(profiles)
      .set({ referralCode: `INVTEST-${profileId.slice(0, 6).toUpperCase()}` })
      .where(eq(profiles.id, profileId));
    app = buildApp(profileId, "member", profile.email);
  });

  afterAll(async () => { await cleanup([profileId]); });

  beforeEach(() => {
    mockResendSend.mockReset();
    mockResendSend.mockResolvedValue({ data: { id: "msg_inv" }, error: null });
  });

  it("creates a sent notification_log row (type=referral-invite) with correct recipient", async () => {
    const targetEmail = `invite-${randomUUID().slice(0, 8)}@external.example.com`;

    const res = await request(app)
      .post("/referrals/invite")
      .send({ email: targetEmail, note: "Join Health Plan Factory!" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Invite sent");

    const logs = await db.select().from(notificationLog).where(and(
      eq(notificationLog.profileId, profileId),
      eq(notificationLog.type, "referral-invite"),
    ));
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].status).toBe("sent");
    expect((logs[0].metadata as Record<string, unknown>).to).toBe(targetEmail);
    expect(mockResendSend).toHaveBeenCalledOnce();
  });

  it("returns 400 and does not call Resend for invalid email", async () => {
    const res = await request(app).post("/referrals/invite").send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(mockResendSend).not.toHaveBeenCalled();
  });

  it("returns 401 and does not call Resend for unauthenticated requests", async () => {
    const unauthApp = buildApp(null);
    const res = await request(unauthApp).post("/referrals/invite").send({ email: "valid@example.com" });
    expect(res.status).toBe(401);
    expect(mockResendSend).not.toHaveBeenCalled();
  });
});

// ── 3. payment-confirmed email flow ──────────────────────────────────────────

describe("Email flow: payment-confirmed (GET /magic-links/redeem/:token)", () => {
  let profileId: string;
  let linkId: string;
  let app: Express;

  beforeAll(async () => {
    const profile = await createProfile("member");
    profileId = profile.id;
    linkId = randomUUID();

    await db.insert(magicLinks).values({
      id: linkId,
      profileId,
      action: "payment",
      payload: { amountFormatted: "$9.99/month", description: "Health Plan Factory Plus" },
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });

    // App without authenticated user (redeem is public)
    app = buildApp(null);
  });

  afterAll(async () => { await cleanup([profileId]); });

  beforeEach(() => {
    mockResendSend.mockReset();
    mockResendSend.mockResolvedValue({ data: { id: "msg_pay" }, error: null });
  });

  it("creates a sent notification_log row (type=payment-confirmed) on magic link redemption", async () => {
    const res = await request(app).get(`/magic-links/redeem/${linkId}`);

    // Route redirects (302) after successful redemption
    expect([200, 302]).toContain(res.status);

    // payment-confirmed sendNotification is fire-and-forget
    await wait(600);

    const logs = await db.select().from(notificationLog).where(and(
      eq(notificationLog.profileId, profileId),
      eq(notificationLog.type, "payment-confirmed"),
    ));
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].status).toBe("sent");
    expect(mockResendSend).toHaveBeenCalled();
  });
});

// ── 4. referral-reward email flow ─────────────────────────────────────────────

describe("Email flow: referral-reward (maybeRewardReferrer)", () => {
  let referrerId: string;
  let referredId: string;

  beforeAll(async () => {
    const referrer = await createProfile("member");
    referrerId = referrer.id;

    const referred = await createProfile("member");
    referredId = referred.id;

    // Create pending referral linking the two members
    await db.insert(referrals).values({
      id: randomUUID(),
      referrerId,
      referredMemberId: referredId,
      code: `RWDTEST-${referrerId.slice(0, 6).toUpperCase()}`,
      status: "pending",
      createdAt: new Date(),
    });

    // memberIntakes requires explicit text id and integer budget
    await db.insert(memberIntakes).values({
      id: randomUUID(),
      profileId: referredId,
      budget: 200,
    });

    // plans requires explicit text id and notNull integer columns
    await db.insert(plans).values({
      id: randomUUID(),
      profileId: referredId,
      status: "generated",
      totalMonthlyCost: 150,
      budgetUtilization: 75,
      budget: 200,
    });
  });

  afterAll(async () => { await cleanup([referrerId, referredId]); });

  beforeEach(() => {
    mockResendSend.mockReset();
    mockResendSend.mockResolvedValue({ data: { id: "msg_rwd" }, error: null });
  });

  it("creates a sent notification_log row (type=referral-reward) for the referrer", async () => {
    await maybeRewardReferrer(referredId);

    // maybeRewardReferrer sends email fire-and-forget
    await wait(600);

    const logs = await db.select().from(notificationLog).where(and(
      eq(notificationLog.profileId, referrerId),
      eq(notificationLog.type, "referral-reward"),
    ));
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].status).toBe("sent");
    expect(mockResendSend).toHaveBeenCalled();
  });
});

// ── 5 & 6. welcome + plan-ready via sendNotification ─────────────────────────
// These are fire-and-forget IIFE calls inside route handlers. The comms path is
// verified here by calling sendNotification directly with the same arguments the
// routes use, confirming the type-specific notification_log rows are created.

describe("Email flow: welcome (sendNotification type=welcome)", () => {
  let profileId: string;

  beforeAll(async () => {
    const p = await createProfile("member");
    profileId = p.id;
  });

  afterAll(async () => { await cleanup([profileId]); });

  beforeEach(() => {
    mockResendSend.mockReset();
    mockResendSend.mockResolvedValue({ data: { id: "msg_welcome" }, error: null });
  });

  it("creates a sent notification_log row (type=welcome) via the same path auth.ts uses", async () => {
    const { sendNotification } = await import("../lib/comms");
    await sendNotification({
      profileId,
      email: `${profileId}@flows-test.example.com`,
      type: "welcome",
      subject: "Welcome to Health Plan Factory!",
      html: "<p>Welcome</p>",
      smsBody: "Welcome to Health Plan Factory!",
    });

    await wait(300);

    const logs = await db.select().from(notificationLog).where(and(
      eq(notificationLog.profileId, profileId),
      eq(notificationLog.type, "welcome"),
    ));
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].status).toBe("sent");
    expect(logs[0].channel).toBe("email");
    expect(mockResendSend).toHaveBeenCalled();
  });
});

describe("Email flow: plan-ready (sendNotification type=plan-ready)", () => {
  let profileId: string;

  beforeAll(async () => {
    const p = await createProfile("member");
    profileId = p.id;
  });

  afterAll(async () => { await cleanup([profileId]); });

  beforeEach(() => {
    mockResendSend.mockReset();
    mockResendSend.mockResolvedValue({ data: { id: "msg_plan" }, error: null });
  });

  it("creates a sent notification_log row (type=plan-ready) via the same path plans.ts uses", async () => {
    const { sendNotification } = await import("../lib/comms");
    await sendNotification({
      profileId,
      email: `${profileId}@flows-test.example.com`,
      type: "plan-ready",
      subject: "Your personalized plan is ready!",
      html: "<p>Plan ready</p>",
      smsBody: "Your health plan is ready!",
    });

    await wait(300);

    const logs = await db.select().from(notificationLog).where(and(
      eq(notificationLog.profileId, profileId),
      eq(notificationLog.type, "plan-ready"),
    ));
    expect(logs.length).toBeGreaterThanOrEqual(1);
    expect(logs[0].status).toBe("sent");
    expect(logs[0].channel).toBe("email");
    expect(mockResendSend).toHaveBeenCalled();
  });
});
