/**
 * Referral Feature Test Suite
 *
 * Tests:
 *  1. Email HTML escaping (unit)
 *  2. POST /api/referrals/invite — auth enforcement, validation, success, rate-limit
 *  3. Rate-limit pressure test (15 concurrent → exactly 10 success + 5 429)
 *  4. GET /api/referrals/mine — shape, milestones, newlyEarned
 *  5. Milestone logic — all 4 tiers, idempotency under concurrency
 *  6. POST /api/referrals/track — concurrency idempotency (reward exactly once)
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import { randomUUID } from "crypto";
import { db } from "@workspace/db";
import {
  profiles,
  referrals,
  memberCredits,
  memberIntakes,
  plans,
  referralMilestones,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import referralsRouter, { maybeAwardMilestone } from "../routes/referrals";
import { escapeHtml as escapeHtmlInvite, referralInviteEmail } from "../emails/referral-invite";
import { escapeHtml as escapeHtmlMilestone, referralMilestoneEmail } from "../emails/referral-milestone";

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildTestApp(userId: string | null): Express {
  const app = express();
  app.use(express.json());

  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.isAuthenticated = function (this: Request) {
      return this.user != null;
    } as Request["isAuthenticated"];

    if (userId) {
      (req as Request & { user: Express.User }).user = {
        id: userId,
        email: `${userId}@test.example.com`,
        role: "member",
        firstName: null,
        lastName: null,
        profileImageUrl: null,
      };
    }
    next();
  });

  app.use("/api", referralsRouter);
  return app;
}

async function createTestProfile(id: string): Promise<void> {
  await db.insert(profiles).values({
    id,
    email: `${id}@test.example.com`,
    displayName: `Test User ${id.slice(0, 8)}`,
    role: "member",
  }).onConflictDoNothing();
}

async function cleanupProfile(id: string): Promise<void> {
  await db.delete(referralMilestones).where(eq(referralMilestones.profileId, id));
  await db.delete(memberCredits).where(eq(memberCredits.profileId, id));
  await db.delete(referrals).where(eq(referrals.referrerId, id));
  await db.delete(referrals).where(eq(referrals.referredMemberId, id));
  await db.delete(memberIntakes).where(eq(memberIntakes.profileId, id));
  await db.delete(plans).where(eq(plans.profileId, id));
  await db.delete(profiles).where(eq(profiles.id, id));
}

// ── 1. HTML Escaping Unit Tests ───────────────────────────────────────────────

describe("escapeHtml (referral-invite)", () => {
  it("escapes ampersand", () => {
    expect(escapeHtmlInvite("a & b")).toBe("a &amp; b");
  });

  it("escapes < and > tags (XSS script injection)", () => {
    expect(escapeHtmlInvite("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;"
    );
  });

  it("escapes double quotes", () => {
    expect(escapeHtmlInvite('say "hello"')).toBe("say &quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(escapeHtmlInvite("it's")).toBe("it&#39;s");
  });

  it("escapes all special chars in one string", () => {
    expect(escapeHtmlInvite(`<img src="x" onerror='alert(1)' & />`)).toBe(
      "&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39; &amp; /&gt;"
    );
  });

  it("leaves safe strings unchanged", () => {
    expect(escapeHtmlInvite("Hello World 123")).toBe("Hello World 123");
  });
});

describe("escapeHtml (referral-milestone)", () => {
  it("escapes <script> tags", () => {
    expect(escapeHtmlMilestone("<script>alert('xss')</script>")).toBe(
      "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    );
  });

  it("escapes both quote styles", () => {
    expect(escapeHtmlMilestone(`"double" & 'single'`)).toBe(
      "&quot;double&quot; &amp; &#39;single&#39;"
    );
  });

  it("escapes img onerror XSS vector", () => {
    expect(escapeHtmlMilestone(`<img onerror="alert(1)">`)).toBe(
      `&lt;img onerror=&quot;alert(1)&quot;&gt;`
    );
  });
});

// ── 1b. referralInviteEmail — real production output ────────────────────────

describe("referralInviteEmail (production template)", () => {
  it("subject includes referrer name", () => {
    const { subject } = referralInviteEmail({
      referrerName: "Alice",
      referralCode: "HPF-ABCD1234",
      signupUrl: "https://healthplanfactory.com/signup?ref=HPF-ABCD1234",
    });
    expect(subject).toBe("Alice invited you to Health Plan Factory");
  });

  it("subject uses 'A friend' when referrerName is null", () => {
    const { subject } = referralInviteEmail({
      referrerName: null,
      referralCode: "HPF-ABCD1234",
      signupUrl: "https://healthplanfactory.com/signup?ref=HPF-ABCD1234",
    });
    expect(subject).toBe("A friend invited you to Health Plan Factory");
  });

  it("subject escapes XSS in referrerName", () => {
    const { subject } = referralInviteEmail({
      referrerName: "<script>alert('xss')</script>",
      referralCode: "HPF-ABCD1234",
      signupUrl: "https://healthplanfactory.com/signup?ref=HPF-ABCD1234",
    });
    expect(subject).not.toContain("<script>");
    expect(subject).toContain("&lt;script&gt;");
  });

  it("HTML body contains the referral code", () => {
    const { html } = referralInviteEmail({
      referrerName: "Bob",
      referralCode: "HPF-ABCD1234",
      signupUrl: "https://healthplanfactory.com/signup?ref=HPF-ABCD1234",
    });
    expect(html).toContain("HPF-ABCD1234");
  });

  it("HTML body contains the signup URL", () => {
    const signupUrl = "https://healthplanfactory.com/signup?ref=HPF-ABCD1234";
    const { html } = referralInviteEmail({
      referrerName: "Carol",
      referralCode: "HPF-ABCD1234",
      signupUrl,
    });
    expect(html).toContain(signupUrl);
  });

  it("HTML body includes personalNote when provided", () => {
    const { html } = referralInviteEmail({
      referrerName: "Dave",
      referralCode: "HPF-ABCD1234",
      signupUrl: "https://healthplanfactory.com/signup",
      personalNote: "Hey, join me!",
    });
    expect(html).toContain("Hey, join me!");
  });

  it("HTML body escapes XSS in personalNote", () => {
    const { html } = referralInviteEmail({
      referrerName: "Eve",
      referralCode: "HPF-ABCD1234",
      signupUrl: "https://healthplanfactory.com/signup",
      personalNote: '<img onerror="alert(1)">',
    });
    expect(html).not.toContain('<img onerror="alert(1)">');
    expect(html).toContain("&lt;img");
  });

  it("HTML body omits personal note block when personalNote is absent", () => {
    const { html } = referralInviteEmail({
      referrerName: "Frank",
      referralCode: "HPF-ABCD1234",
      signupUrl: "https://healthplanfactory.com/signup",
    });
    // The note wrapper div with background:#fdf4f9 should not appear
    expect(html).not.toContain("fdf4f9");
  });
});

// ── 1c. referralMilestoneEmail — real production output ─────────────────────

describe("referralMilestoneEmail (production template)", () => {
  it("subject includes milestone name, emoji, and bonus credit", () => {
    const { subject } = referralMilestoneEmail({
      referrerName: "Alice",
      milestoneName: "Pioneer",
      milestoneEmoji: "🌱",
      bonusCredit: "$3.00",
      totalRewardedCount: 1,
      dashboardUrl: "https://healthplanfactory.com/dashboard",
    });
    expect(subject).toBe("🌱 You've reached Pioneer — $3.00 bonus credit!");
  });

  it("subject is correct for Ambassador tier", () => {
    const { subject } = referralMilestoneEmail({
      referrerName: "Bob",
      milestoneName: "Ambassador",
      milestoneEmoji: "💎",
      bonusCredit: "$20.00",
      totalRewardedCount: 25,
      dashboardUrl: "https://healthplanfactory.com/dashboard",
    });
    expect(subject).toBe("💎 You've reached Ambassador — $20.00 bonus credit!");
  });

  it("HTML body contains the bonus credit amount", () => {
    const { html } = referralMilestoneEmail({
      referrerName: "Carol",
      milestoneName: "Advocate",
      milestoneEmoji: "🌿",
      bonusCredit: "$5.00",
      totalRewardedCount: 5,
      dashboardUrl: "https://healthplanfactory.com/dashboard",
    });
    expect(html).toContain("$5.00");
  });

  it("HTML body contains the dashboard URL", () => {
    const dashboardUrl = "https://healthplanfactory.com/dashboard";
    const { html } = referralMilestoneEmail({
      referrerName: "Dave",
      milestoneName: "Champion",
      milestoneEmoji: "🏆",
      bonusCredit: "$10.00",
      totalRewardedCount: 10,
      dashboardUrl,
    });
    expect(html).toContain(dashboardUrl);
  });

  it("HTML body escapes XSS in referrerName", () => {
    const { html } = referralMilestoneEmail({
      referrerName: '<script>alert("xss")</script>',
      milestoneName: "Pioneer",
      milestoneEmoji: "🌱",
      bonusCredit: "$3.00",
      totalRewardedCount: 1,
      dashboardUrl: "https://healthplanfactory.com/dashboard",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("HTML body uses 'there' when referrerName is null", () => {
    const { html } = referralMilestoneEmail({
      referrerName: null,
      milestoneName: "Pioneer",
      milestoneEmoji: "🌱",
      bonusCredit: "$3.00",
      totalRewardedCount: 1,
      dashboardUrl: "https://healthplanfactory.com/dashboard",
    });
    expect(html).toContain("Hi there,");
  });

  it("HTML body uses plural 'referrals' when totalRewardedCount > 1", () => {
    const { html } = referralMilestoneEmail({
      referrerName: "Eve",
      milestoneName: "Advocate",
      milestoneEmoji: "🌿",
      bonusCredit: "$5.00",
      totalRewardedCount: 5,
      dashboardUrl: "https://healthplanfactory.com/dashboard",
    });
    expect(html).toContain("5 rewarded referrals");
  });

  it("HTML body uses singular 'referral' when totalRewardedCount is 1", () => {
    const { html } = referralMilestoneEmail({
      referrerName: "Frank",
      milestoneName: "Pioneer",
      milestoneEmoji: "🌱",
      bonusCredit: "$3.00",
      totalRewardedCount: 1,
      dashboardUrl: "https://healthplanfactory.com/dashboard",
    });
    expect(html).toContain("1 rewarded referral");
    expect(html).not.toContain("1 rewarded referrals");
  });
});

// ── 2. POST /api/referrals/invite — auth & validation ────────────────────────

describe("POST /api/referrals/invite", () => {
  const profileId = `test-invite-basic-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    await createTestProfile(profileId);
  });

  afterAll(async () => {
    await cleanupProfile(profileId);
  });

  it("returns 401 when not authenticated", async () => {
    const app = buildTestApp(null);
    const res = await request(app)
      .post("/api/referrals/invite")
      .send({ email: "test@example.com" });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for missing email", async () => {
    const app = buildTestApp(profileId);
    const res = await request(app)
      .post("/api/referrals/invite")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid email format", async () => {
    const app = buildTestApp(profileId);
    const res = await request(app)
      .post("/api/referrals/invite")
      .send({ email: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for note exceeding 300 characters", async () => {
    const app = buildTestApp(profileId);
    const res = await request(app)
      .post("/api/referrals/invite")
      .send({ email: "valid@example.com", note: "x".repeat(301) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("succeeds and writes an audit row (invite-sent credit) on valid input", async () => {
    const app = buildTestApp(profileId);

    const before = await db
      .select()
      .from(memberCredits)
      .where(
        and(
          eq(memberCredits.profileId, profileId),
          eq(memberCredits.source, "invite-sent")
        )
      );

    const res = await request(app)
      .post("/api/referrals/invite")
      .send({ email: "friend@example.com", note: "Hey join me!" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Invite sent");
    expect(res.body).toHaveProperty("referralCode");
    expect(res.body).toHaveProperty("signupUrl");

    const after = await db
      .select()
      .from(memberCredits)
      .where(
        and(
          eq(memberCredits.profileId, profileId),
          eq(memberCredits.source, "invite-sent")
        )
      );

    expect(after.length).toBe(before.length + 1);
    const newest = after[after.length - 1];
    expect(newest.amountCents).toBe(0);
    expect(newest.used).toBe(true);
  });
});

// ── 2b. POST /api/referrals/send-invite — backward-compat alias ──────────────

describe("POST /api/referrals/send-invite (alias)", () => {
  const profileId = `test-sinvite-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    await createTestProfile(profileId);
  });

  afterAll(async () => {
    await cleanupProfile(profileId);
  });

  it("returns 401 when not authenticated", async () => {
    const app = buildTestApp(null);
    const res = await request(app)
      .post("/api/referrals/send-invite")
      .send({ inviteeEmail: "test@example.com" });
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for missing inviteeEmail", async () => {
    const app = buildTestApp(profileId);
    const res = await request(app)
      .post("/api/referrals/send-invite")
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for invalid inviteeEmail format", async () => {
    const app = buildTestApp(profileId);
    const res = await request(app)
      .post("/api/referrals/send-invite")
      .send({ inviteeEmail: "not-an-email" });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("returns 400 for personalNote exceeding 300 characters", async () => {
    const app = buildTestApp(profileId);
    const res = await request(app)
      .post("/api/referrals/send-invite")
      .send({ inviteeEmail: "valid@example.com", personalNote: "x".repeat(301) });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("succeeds and writes an audit row on valid input via alias endpoint", async () => {
    const app = buildTestApp(profileId);

    const before = await db
      .select()
      .from(memberCredits)
      .where(
        and(
          eq(memberCredits.profileId, profileId),
          eq(memberCredits.source, "invite-sent")
        )
      );

    const res = await request(app)
      .post("/api/referrals/send-invite")
      .send({ inviteeEmail: "aliased@example.com", personalNote: "Hey!" });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message", "Invite sent");
    expect(res.body).toHaveProperty("referralCode");
    expect(res.body.referralCode).toMatch(/^HPF-/);
    expect(res.body).toHaveProperty("signupUrl");

    const after = await db
      .select()
      .from(memberCredits)
      .where(
        and(
          eq(memberCredits.profileId, profileId),
          eq(memberCredits.source, "invite-sent")
        )
      );

    expect(after.length).toBe(before.length + 1);
    const newest = after[after.length - 1];
    expect(newest.amountCents).toBe(0);
    expect(newest.used).toBe(true);
  });
});

// ── 3. Rate-limit pressure test: 15 concurrent → 10 success + 5 429 ──────────

describe("POST /api/referrals/invite — rate-limit pressure (15 concurrent)", () => {
  const profileId = `test-invite-rl-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    await createTestProfile(profileId);
  });

  afterAll(async () => {
    await cleanupProfile(profileId);
  });

  it("allows exactly 10 invites, blocks 5 with 429, and writes exactly 10 invite-sent audit rows", async () => {
    const app = buildTestApp(profileId);

    const results = await Promise.all(
      Array.from({ length: 15 }, (_, i) =>
        request(app)
          .post("/api/referrals/invite")
          .send({ email: `pressure${i}@example.com` })
          .then((r) => r.status)
      )
    );

    const successes = results.filter((s) => s === 200);
    const tooMany = results.filter((s) => s === 429);

    expect(successes.length).toBe(10);
    expect(tooMany.length).toBe(5);

    // Verify exactly 10 invite-sent audit rows in DB (rate-limit enforced atomically)
    const auditRows = await db
      .select()
      .from(memberCredits)
      .where(
        and(
          eq(memberCredits.profileId, profileId),
          eq(memberCredits.source, "invite-sent")
        )
      );
    expect(auditRows.length).toBe(10);
  }, 40000);
});

// ── 4. GET /api/referrals/mine ────────────────────────────────────────────────

describe("GET /api/referrals/mine", () => {
  const profileId = `test-mine-${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    await createTestProfile(profileId);
  });

  afterAll(async () => {
    await cleanupProfile(profileId);
  });

  it("returns 401 when not authenticated", async () => {
    const app = buildTestApp(null);
    const res = await request(app).get("/api/referrals/mine");
    expect(res.status).toBe(401);
  });

  it("returns the expected response shape", async () => {
    const app = buildTestApp(profileId);
    const res = await request(app).get("/api/referrals/mine");

    expect(res.status).toBe(200);

    const body = res.body as {
      referralCode: string;
      referralHistory: unknown[];
      creditSummary: {
        totalCredits: number;
        unusedCreditsCents: number;
        unusedCreditsFormatted: string;
        credits: unknown[];
      };
      milestones: Array<{
        id: string;
        label: string;
        emoji: string;
        threshold: number;
        bonusCents: number;
        earned: boolean;
        rewardedAt: null | string;
        newlyEarned: boolean;
      }>;
      rewardedCount: number;
      nextMilestone: null | { id: string; label: string; threshold: number; emoji: string };
    };

    expect(typeof body.referralCode).toBe("string");
    expect(body.referralCode).toMatch(/^HPF-/);
    expect(Array.isArray(body.referralHistory)).toBe(true);
    expect(typeof body.creditSummary).toBe("object");
    expect(typeof body.creditSummary.unusedCreditsCents).toBe("number");
    expect(typeof body.creditSummary.unusedCreditsFormatted).toBe("string");
    expect(Array.isArray(body.milestones)).toBe(true);
    expect(body.milestones).toHaveLength(4);
    expect(typeof body.rewardedCount).toBe("number");

    for (const m of body.milestones) {
      expect(m).toHaveProperty("id");
      expect(m).toHaveProperty("label");
      expect(m).toHaveProperty("emoji");
      expect(m).toHaveProperty("threshold");
      expect(m).toHaveProperty("bonusCents");
      expect(m).toHaveProperty("earned");
      expect(m).toHaveProperty("newlyEarned");
      expect(typeof m.earned).toBe("boolean");
      expect(typeof m.newlyEarned).toBe("boolean");
    }
  });

  it("returns milestone IDs matching the 4 expected tiers", async () => {
    const app = buildTestApp(profileId);
    const res = await request(app).get("/api/referrals/mine");
    const ids = (res.body.milestones as Array<{ id: string }>).map((m) => m.id);
    expect(ids).toContain("pioneer");
    expect(ids).toContain("advocate");
    expect(ids).toContain("champion");
    expect(ids).toContain("ambassador");
  });

  it("returns nextMilestone as pioneer (first unearned tier) for a fresh user", async () => {
    const app = buildTestApp(profileId);
    const res = await request(app).get("/api/referrals/mine");
    const body = res.body as { nextMilestone: { id: string } | null };
    expect(body.nextMilestone).not.toBeNull();
    expect(body.nextMilestone!.id).toBe("pioneer");
  });

  it("marks newlyEarned=false for all milestones for a fresh user", async () => {
    const app = buildTestApp(profileId);
    const res = await request(app).get("/api/referrals/mine");
    const milestones = res.body.milestones as Array<{ newlyEarned: boolean }>;
    expect(milestones.every((m) => m.newlyEarned === false)).toBe(true);
  });

  it("marks milestone newlyEarned=true when earned within last hour", async () => {
    const app = buildTestApp(profileId);

    const referredId = `test-mine-ref-${randomUUID().slice(0, 6)}`;
    await db.insert(profiles).values({
      id: referredId,
      email: `${referredId}@test.example.com`,
      displayName: "Referred",
      role: "member",
    }).onConflictDoNothing();

    await db.insert(referrals).values({
      id: randomUUID(),
      referrerId: profileId,
      referredMemberId: referredId,
      code: `HPF-NEWMINE`,
      status: "rewarded",
      createdAt: new Date(),
      rewardedAt: new Date(),
    }).onConflictDoNothing();

    await db.insert(referralMilestones).values({
      id: randomUUID(),
      profileId,
      milestone: "pioneer",
      rewardedAt: new Date(),
      bonusCreditCents: 300,
    }).onConflictDoNothing();

    try {
      const res = await request(app).get("/api/referrals/mine");
      expect(res.status).toBe(200);
      const pioneerMilestone = (res.body.milestones as Array<{ id: string; newlyEarned: boolean }>)
        .find((m) => m.id === "pioneer");
      expect(pioneerMilestone).toBeDefined();
      expect(pioneerMilestone!.newlyEarned).toBe(true);
    } finally {
      await db.delete(referralMilestones).where(eq(referralMilestones.profileId, profileId));
      await db.delete(referrals).where(eq(referrals.referrerId, profileId));
      await db.delete(profiles).where(eq(profiles.id, referredId));
    }
  });
});

// ── 5a. Milestone Logic: all 4 tiers award correctly ─────────────────────────

describe("Milestone logic: 4 tiers awarded correctly", () => {
  async function injectRewardedReferrals(referrerId: string, count: number): Promise<string[]> {
    const referredIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const referredId = `test-ref-${randomUUID().slice(0, 8)}`;
      referredIds.push(referredId);
      await db.insert(profiles).values({
        id: referredId,
        email: `${referredId}@test.example.com`,
        displayName: `Referred ${i}`,
        role: "member",
      }).onConflictDoNothing();

      await db.insert(referrals).values({
        id: randomUUID(),
        referrerId,
        referredMemberId: referredId,
        code: `HPF-FAKE${i.toString().padStart(4, "0")}-${referrerId.slice(-4)}`,
        status: "rewarded",
        createdAt: new Date(),
        rewardedAt: new Date(),
      }).onConflictDoNothing();
    }
    return referredIds;
  }

  const TIERS = [
    { id: "pioneer",    threshold: 1,  bonusCents: 300  },
    { id: "advocate",   threshold: 5,  bonusCents: 500  },
    { id: "champion",   threshold: 10, bonusCents: 1000 },
    { id: "ambassador", threshold: 25, bonusCents: 2000 },
  ] as const;

  for (const tier of TIERS) {
    it(`awards "${tier.id}" milestone and ${tier.bonusCents}¢ bonus after ${tier.threshold} rewarded referral(s)`, async () => {
      const tid = `test-ms-${tier.id}-${randomUUID().slice(0, 6)}`;

      await createTestProfile(tid);

      let referredIds: string[] = [];
      try {
        referredIds = await injectRewardedReferrals(tid, tier.threshold);

        const result = await maybeAwardMilestone(tid);
        expect(result).toBe(tier.id);

        const milestoneRows = await db
          .select()
          .from(referralMilestones)
          .where(eq(referralMilestones.profileId, tid));
        expect(milestoneRows.some((r) => r.milestone === tier.id)).toBe(true);

        const creditRows = await db
          .select()
          .from(memberCredits)
          .where(
            and(
              eq(memberCredits.profileId, tid),
              eq(memberCredits.source, "milestone")
            )
          );
        const totalBonus = creditRows.reduce((s, c) => s + c.amountCents, 0);
        expect(totalBonus).toBe(tier.bonusCents);
      } finally {
        await db.delete(referralMilestones).where(eq(referralMilestones.profileId, tid));
        await db.delete(memberCredits).where(eq(memberCredits.profileId, tid));
        await db.delete(referrals).where(eq(referrals.referrerId, tid));
        for (const rid of referredIds) {
          await db.delete(profiles).where(eq(profiles.id, rid));
        }
        await db.delete(profiles).where(eq(profiles.id, tid));
      }
    });
  }

  it("returns null when milestone already earned (no double-award)", async () => {
    const tid = `test-ms-idem-${randomUUID().slice(0, 8)}`;
    await createTestProfile(tid);

    const referredId = `test-ms-idem-r-${randomUUID().slice(0, 6)}`;
    await db.insert(profiles).values({
      id: referredId,
      email: `${referredId}@test.example.com`,
      displayName: "Referred",
      role: "member",
    }).onConflictDoNothing();

    await db.insert(referrals).values({
      id: randomUUID(),
      referrerId: tid,
      referredMemberId: referredId,
      code: "HPF-DOUBLECHK",
      status: "rewarded",
      createdAt: new Date(),
      rewardedAt: new Date(),
    }).onConflictDoNothing();

    await db.insert(referralMilestones).values({
      id: randomUUID(),
      profileId: tid,
      milestone: "pioneer",
      rewardedAt: new Date(),
      bonusCreditCents: 300,
    }).onConflictDoNothing();

    try {
      const result = await maybeAwardMilestone(tid);
      expect(result).toBeNull();
    } finally {
      await db.delete(referralMilestones).where(eq(referralMilestones.profileId, tid));
      await db.delete(memberCredits).where(eq(memberCredits.profileId, tid));
      await db.delete(referrals).where(eq(referrals.referrerId, tid));
      await db.delete(profiles).where(eq(profiles.id, referredId));
      await db.delete(profiles).where(eq(profiles.id, tid));
    }
  });
});

// ── 5b. Milestone idempotency: 5 concurrent calls award exactly once ──────────

describe("Milestone idempotency: concurrent maybeAwardMilestone calls", () => {
  it("awards exactly one milestone and one bonus credit under 5 concurrent calls", async () => {
    const pid = `test-ms-conc-${randomUUID().slice(0, 8)}`;
    const referredId = `test-ms-conc-r-${randomUUID().slice(0, 6)}`;

    await createTestProfile(pid);
    await db.insert(profiles).values({
      id: referredId,
      email: `${referredId}@test.example.com`,
      displayName: "Referred",
      role: "member",
    }).onConflictDoNothing();

    await db.insert(referrals).values({
      id: randomUUID(),
      referrerId: pid,
      referredMemberId: referredId,
      code: `HPF-CONCTEST`,
      status: "rewarded",
      createdAt: new Date(),
      rewardedAt: new Date(),
    }).onConflictDoNothing();

    try {
      const results = await Promise.all(
        Array.from({ length: 5 }, () => maybeAwardMilestone(pid))
      );

      const awarded = results.filter((r) => r === "pioneer");
      expect(awarded.length).toBe(1);

      const nulls = results.filter((r) => r === null);
      expect(nulls.length).toBe(4);

      const milestoneRows = await db
        .select()
        .from(referralMilestones)
        .where(
          and(
            eq(referralMilestones.profileId, pid),
            eq(referralMilestones.milestone, "pioneer")
          )
        );
      expect(milestoneRows.length).toBe(1);

      const creditRows = await db
        .select()
        .from(memberCredits)
        .where(
          and(
            eq(memberCredits.profileId, pid),
            eq(memberCredits.source, "milestone")
          )
        );
      expect(creditRows.length).toBe(1);
      expect(creditRows[0].amountCents).toBe(300);
    } finally {
      await db.delete(referralMilestones).where(eq(referralMilestones.profileId, pid));
      await db.delete(memberCredits).where(eq(memberCredits.profileId, pid));
      await db.delete(referrals).where(eq(referrals.referrerId, pid));
      await db.delete(profiles).where(eq(profiles.id, referredId));
      await db.delete(profiles).where(eq(profiles.id, pid));
    }
  });
});

// ── 6a. POST /api/referrals/track — milestone award via endpoint ──────────────

describe("POST /api/referrals/track — milestone award triggered via endpoint", () => {
  it("triggers pioneer milestone award when referrer reaches threshold via /track", async () => {
    const referrerId = `test-trk-ms-r-${randomUUID().slice(0, 6)}`;
    const referredId = `test-trk-ms-d-${randomUUID().slice(0, 6)}`;

    await createTestProfile(referrerId);
    await createTestProfile(referredId);

    const refCode = `HPF-TRKMS${randomUUID().slice(0, 4).toUpperCase()}`;

    await db.update(profiles)
      .set({ referralCode: refCode })
      .where(eq(profiles.id, referrerId));

    await db.insert(referrals).values({
      id: randomUUID(),
      referrerId,
      referredMemberId: referredId,
      code: refCode,
      status: "pending",
      createdAt: new Date(),
    }).onConflictDoNothing();

    await db.insert(memberIntakes).values({
      id: randomUUID(),
      profileId: referredId,
      budget: 200,
      goals: [],
      conditions: [],
      preferences: [],
      exclusions: [],
      radius: 25,
      telehealth: false,
    }).onConflictDoNothing();

    await db.insert(plans).values({
      id: randomUUID(),
      profileId: referredId,
      totalMonthlyCost: 100,
      budgetUtilization: 50,
      budget: 200,
      status: "generated",
    }).onConflictDoNothing();

    const app = buildTestApp(referredId);

    try {
      const res = await request(app).post("/api/referrals/track").send({});
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("message", "ok");

      // Wait briefly for the async milestone award (called with .catch in the router)
      await new Promise<void>((resolve) => setTimeout(resolve, 500));

      // Verify pioneer milestone was awarded to the referrer
      const milestoneRows = await db
        .select()
        .from(referralMilestones)
        .where(
          and(
            eq(referralMilestones.profileId, referrerId),
            eq(referralMilestones.milestone, "pioneer")
          )
        );
      expect(milestoneRows.length).toBe(1);
      expect(milestoneRows[0].bonusCreditCents).toBe(300);

      // Verify milestone bonus credit was written
      const milestoneCredits = await db
        .select()
        .from(memberCredits)
        .where(
          and(
            eq(memberCredits.profileId, referrerId),
            eq(memberCredits.source, "milestone")
          )
        );
      expect(milestoneCredits.length).toBe(1);
      expect(milestoneCredits[0].amountCents).toBe(300);
    } finally {
      await db.delete(referralMilestones).where(eq(referralMilestones.profileId, referrerId));
      await db.delete(memberCredits).where(eq(memberCredits.profileId, referrerId));
      await db.delete(memberCredits).where(eq(memberCredits.profileId, referredId));
      await db.delete(referrals).where(eq(referrals.referrerId, referrerId));
      await db.delete(plans).where(eq(plans.profileId, referredId));
      await db.delete(memberIntakes).where(eq(memberIntakes.profileId, referredId));
      await db.delete(profiles).where(eq(profiles.id, referrerId));
      await db.delete(profiles).where(eq(profiles.id, referredId));
    }
  }, 20000);
});

// ── 6b. POST /api/referrals/track — concurrency idempotency ──────────────────

describe("POST /api/referrals/track — concurrency idempotency (reward exactly once)", () => {
  it("grants exactly one referral reward under 5 concurrent /track calls", async () => {
    const referrerId = `test-track-r-${randomUUID().slice(0, 6)}`;
    const referredId = `test-track-d-${randomUUID().slice(0, 6)}`;

    await createTestProfile(referrerId);
    await createTestProfile(referredId);

    const refCode = `HPF-TRK${randomUUID().slice(0, 6).toUpperCase()}`;

    await db.update(profiles)
      .set({ referralCode: refCode })
      .where(eq(profiles.id, referrerId));

    await db.insert(referrals).values({
      id: randomUUID(),
      referrerId,
      referredMemberId: referredId,
      code: refCode,
      status: "pending",
      createdAt: new Date(),
    }).onConflictDoNothing();

    await db.insert(memberIntakes).values({
      id: randomUUID(),
      profileId: referredId,
      budget: 200,
      goals: [],
      conditions: [],
      preferences: [],
      exclusions: [],
      radius: 25,
      telehealth: false,
    }).onConflictDoNothing();

    await db.insert(plans).values({
      id: randomUUID(),
      profileId: referredId,
      totalMonthlyCost: 100,
      budgetUtilization: 50,
      budget: 200,
      status: "generated",
    }).onConflictDoNothing();

    const app = buildTestApp(referredId);

    try {
      const results = await Promise.all(
        Array.from({ length: 5 }, () =>
          request(app)
            .post("/api/referrals/track")
            .send({})
            .then((r) => r.status)
        )
      );

      expect(results.every((s) => s === 200)).toBe(true);

      const referrerCredits = await db
        .select()
        .from(memberCredits)
        .where(
          and(
            eq(memberCredits.profileId, referrerId),
            eq(memberCredits.source, "referral")
          )
        );
      expect(referrerCredits.length).toBe(1);
      expect(referrerCredits[0].amountCents).toBe(300);

      const referredCredits = await db
        .select()
        .from(memberCredits)
        .where(
          and(
            eq(memberCredits.profileId, referredId),
            eq(memberCredits.source, "referral")
          )
        );
      expect(referredCredits.length).toBe(1);
      expect(referredCredits[0].amountCents).toBe(300);

      const referralRows = await db
        .select({ status: referrals.status })
        .from(referrals)
        .where(eq(referrals.referrerId, referrerId));
      expect(referralRows.every((r) => r.status === "rewarded")).toBe(true);
    } finally {
      await db.delete(referralMilestones).where(eq(referralMilestones.profileId, referrerId));
      await db.delete(memberCredits).where(eq(memberCredits.profileId, referrerId));
      await db.delete(memberCredits).where(eq(memberCredits.profileId, referredId));
      await db.delete(referrals).where(eq(referrals.referrerId, referrerId));
      await db.delete(plans).where(eq(plans.profileId, referredId));
      await db.delete(memberIntakes).where(eq(memberIntakes.profileId, referredId));
      await db.delete(profiles).where(eq(profiles.id, referrerId));
      await db.delete(profiles).where(eq(profiles.id, referredId));
    }
  }, 40000);
});
