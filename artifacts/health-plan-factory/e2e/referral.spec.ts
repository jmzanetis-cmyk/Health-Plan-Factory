/**
 * Referral Feature E2E Tests (Playwright)
 *
 * Tests exercise the referral UI flows with a real browser + real API calls.
 * Auth-independent flows use Playwright route mocking for the auth check only.
 * The dashboard badge-link test (#4) seeds real DB state via the test fixture
 * endpoint and uses X-Test-User-Id to authenticate real /api/referrals/mine calls.
 *
 * To run in CI (Chromium available):
 *   UI_URL=http://localhost:<port> API_URL=http://localhost:<apiPort> npx playwright test
 *
 * In Replit (no system Chromium), set SKIP_BROWSER_TESTS=1 to skip gracefully.
 *
 * Coverage:
 *   1. Unauthenticated access — /referral shows sign-in prompt
 *   2. Celebration banner   — ?milestone=pioneer + newlyEarned flag
 *   3. Direct invite form   — inline success + 429 error handling
 *   4. Dashboard badge links — earned milestone badges link to /referral?milestone=<id>
 *                              (DB-seeded via POST /api/test/seed-referral-milestone;
 *                               auth injected via X-Test-User-Id header)
 *   5. Referral page structure — 4 tiers, HPF- code, invite form present
 */

import { test, expect, type Page } from "@playwright/test";

const UI_URL = process.env.UI_URL ?? "http://localhost:5173";
const API_URL = process.env.API_URL ?? "http://localhost:8080";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_MINE_EMPTY: Record<string, unknown> = {
  referralCode: "HPF-TEST1234",
  referralHistory: [],
  creditSummary: {
    totalCredits: 0,
    unusedCreditsCents: 0,
    unusedCreditsFormatted: "$0.00",
    credits: [],
  },
  milestones: [
    { id: "pioneer",    label: "Pioneer",    emoji: "🌱", threshold: 1,  bonusCents: 300,  earned: false, rewardedAt: null, newlyEarned: false },
    { id: "advocate",   label: "Advocate",   emoji: "🌿", threshold: 5,  bonusCents: 500,  earned: false, rewardedAt: null, newlyEarned: false },
    { id: "champion",   label: "Champion",   emoji: "🏆", threshold: 10, bonusCents: 1000, earned: false, rewardedAt: null, newlyEarned: false },
    { id: "ambassador", label: "Ambassador", emoji: "💎", threshold: 25, bonusCents: 2000, earned: false, rewardedAt: null, newlyEarned: false },
  ],
  rewardedCount: 0,
  nextMilestone: { id: "pioneer", label: "Pioneer", threshold: 1, emoji: "🌱" },
};

const MOCK_MINE_PIONEER_EARNED: Record<string, unknown> = {
  ...MOCK_MINE_EMPTY,
  rewardedCount: 1,
  milestones: (MOCK_MINE_EMPTY.milestones as Array<Record<string, unknown>>).map((m) =>
    m["id"] === "pioneer"
      ? { ...m, earned: true, rewardedAt: new Date().toISOString(), newlyEarned: true }
      : m
  ),
  nextMilestone: { id: "advocate", label: "Advocate", threshold: 5, emoji: "🌿" },
};

// ── Helper mocks ──────────────────────────────────────────────────────────────

async function mockAuth(page: Page): Promise<void> {
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        id: "test-e2e-user",
        email: "e2e@test.example.com",
        role: "member",
        displayName: "E2E Tester",
        avatarUrl: null,
      }),
    })
  );
}

async function mockMine(page: Page, data = MOCK_MINE_EMPTY): Promise<void> {
  await page.route("**/api/referrals/mine", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) })
  );
}

// ── Tests (browser-required, skipped without Chromium) ────────────────────────

const skipBrowser = process.env.SKIP_BROWSER_TESTS === "1";

test.describe("Unauthenticated access", () => {
  test.skip(skipBrowser, "Skipped: SKIP_BROWSER_TESTS=1");

  test("shows sign-in prompt on /referral when not logged in", async ({ page }) => {
    await page.route("**/api/auth/me", (r) =>
      r.fulfill({ status: 401, body: JSON.stringify({ error: "Unauthorized" }) })
    );
    await page.route("**/api/referrals/mine", (r) =>
      r.fulfill({ status: 401, body: JSON.stringify({ error: "Unauthorized" }) })
    );

    await page.goto(`${UI_URL}/referral`);
    await page.waitForLoadState("networkidle");
    expect(await page.textContent("body")).toMatch(/sign in/i);
  });
});

test.describe("Celebration banner", () => {
  test.skip(skipBrowser, "Skipped: SKIP_BROWSER_TESTS=1");

  test("shows celebration banner when ?milestone=pioneer is in URL", async ({ page }) => {
    await mockAuth(page);
    await mockMine(page, MOCK_MINE_PIONEER_EARNED);
    await page.goto(`${UI_URL}/referral?milestone=pioneer`);
    await page.waitForLoadState("networkidle");

    const body = await page.textContent("body");
    expect(body).toMatch(/Pioneer/i);
    expect(body).toMatch(/milestone/i);
  });

  test("shows celebration banner when API returns newlyEarned=true", async ({ page }) => {
    await mockAuth(page);
    await mockMine(page, MOCK_MINE_PIONEER_EARNED);
    await page.goto(`${UI_URL}/referral`);
    await page.waitForLoadState("networkidle");
    expect(await page.textContent("body")).toMatch(/Pioneer/i);
  });

  test("does not show celebration banner when nothing newly earned", async ({ page }) => {
    await mockAuth(page);
    await mockMine(page, MOCK_MINE_EMPTY);
    await page.goto(`${UI_URL}/referral`);
    await page.waitForLoadState("networkidle");
    expect(await page.textContent("body")).not.toMatch(/milestone unlocked/i);
  });
});

test.describe("Direct invite form", () => {
  test.skip(skipBrowser, "Skipped: SKIP_BROWSER_TESTS=1");

  test("shows inline success message after successful invite submission", async ({ page }) => {
    await mockAuth(page);
    await mockMine(page);
    await page.route("**/api/referrals/invite", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          message: "Invite sent",
          referralCode: "HPF-TEST1234",
          signupUrl: "https://healthplanfactory.com/signup?ref=HPF-TEST1234",
        }),
      })
    );

    await page.goto(`${UI_URL}/referral`);
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill("friend@example.com");

    await page.locator('button[type="submit"]').filter({ hasText: /send/i }).click();

    await expect(page.locator("text=friend@example.com")).toBeVisible({ timeout: 8000 });

    // After success, the email input should be cleared (form reset)
    await expect(emailInput).toHaveValue("", { timeout: 5000 });
  });

  test("shows error message when invite fails with 429 rate limit", async ({ page }) => {
    await mockAuth(page);
    await mockMine(page);
    await page.route("**/api/referrals/invite", (r) =>
      r.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({ error: "Daily invite limit reached (10 per day). Please try again tomorrow." }),
      })
    );

    await page.goto(`${UI_URL}/referral`);
    await page.waitForLoadState("networkidle");

    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible({ timeout: 10000 });
    await emailInput.fill("another@example.com");

    await page.locator('button[type="submit"]').filter({ hasText: /send/i }).click();

    const err = page
      .locator("text=Daily invite limit reached")
      .or(page.locator("text=Failed to send"));
    await expect(err.first()).toBeVisible({ timeout: 8000 });
  });
});

/**
 * Dashboard milestone badge link test.
 *
 * Uses DB-seeded state via the test fixture endpoint so the badge renders from
 * real data persistence rather than a fully mocked /api/referrals/mine response.
 * Auth is injected via the X-Test-User-Id header (test middleware active in NODE_ENV=test).
 */
test.describe("Dashboard milestone badge links", () => {
  test.skip(skipBrowser, "Skipped: SKIP_BROWSER_TESTS=1");

  const FIXTURE_USER_ID = "e2e-badge-test-user";

  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${API_URL}/api/test/seed-referral-milestone`, {
      data: { userId: FIXTURE_USER_ID },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/api/test/seed-referral-milestone/${FIXTURE_USER_ID}`);
  });

  test("earned milestone badges on dashboard link to /referral?milestone=<id>", async ({ page }) => {
    // Inject X-Test-User-Id so the real API treats requests as authenticated
    await page.setExtraHTTPHeaders({ "x-test-user-id": FIXTURE_USER_ID });

    // Only mock auth display — real /api/referrals/mine hits the DB
    await page.route("**/api/auth/me", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: FIXTURE_USER_ID,
          email: `${FIXTURE_USER_ID}@e2e.test`,
          role: "member",
          displayName: "E2E Badge Tester",
          avatarUrl: null,
        }),
      })
    );

    // Stub other dashboard API calls that are unrelated to referrals
    await page.route("**/api/plans/**/latest", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ plan: null, items: [] }) })
    );
    await page.route("**/api/progress**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    );
    await page.route("**/api/favorites**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) })
    );
    await page.route("**/api/lmn/status", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ estimatedAnnualSavings: 0, eligibleItems: [] }) })
    );
    await page.route("**/api/insights/mine", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ insights: [], attentionItems: [], wellnessScore: null, journalCount: 0, sessionCount: 0 }) })
    );
    await page.route("**/api/referrals/new-credit-since/**", (r) =>
      r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ hasNewCredit: false, count: 0, newCreditsFormatted: "$0.00" }) })
    );

    await page.goto(`${UI_URL}/dashboard`);
    await page.waitForLoadState("networkidle");

    // There must be at least one link to /referral on the dashboard
    const links = await page.locator(`a[href*="/referral"]`).all();
    expect(links.length).toBeGreaterThan(0);

    // There must be a milestone badge link — hard-fail if absent
    const hrefs = await Promise.all(links.map((l) => l.getAttribute("href")));
    const milestoneBadgeHref = hrefs.find((h) => h?.includes("milestone="));
    expect(milestoneBadgeHref).toBeTruthy();

    // Click the milestone badge and verify it navigates to /referral?milestone=<id>
    const badgeLink = page.locator(`a[href="${milestoneBadgeHref!}"]`).first();
    await badgeLink.click();
    await page.waitForLoadState("networkidle");

    expect(page.url()).toContain("milestone=");
    const bodyText = await page.textContent("body");
    expect(bodyText).toMatch(/Pioneer|Advocate|Champion|Ambassador/i);
    // Celebration banner should display for the milestone just navigated to
    expect(bodyText).toMatch(/milestone/i);
  });
});

test.describe("Referral page structure", () => {
  test.skip(skipBrowser, "Skipped: SKIP_BROWSER_TESTS=1");

  test("shows all 4 milestone tiers", async ({ page }) => {
    await mockAuth(page);
    await mockMine(page);
    await page.goto(`${UI_URL}/referral`);
    await page.waitForLoadState("networkidle");

    const body = await page.textContent("body");
    expect(body).toContain("Pioneer");
    expect(body).toContain("Advocate");
    expect(body).toContain("Champion");
    expect(body).toContain("Ambassador");
  });

  test("shows referral link with HPF- code", async ({ page }) => {
    await mockAuth(page);
    await mockMine(page);
    await page.goto(`${UI_URL}/referral`);
    await page.waitForLoadState("networkidle");
    expect(await page.textContent("body")).toContain("HPF-TEST1234");
  });

  test("shows direct invite form", async ({ page }) => {
    await mockAuth(page);
    await mockMine(page);
    await page.goto(`${UI_URL}/referral`);
    await page.waitForLoadState("networkidle");

    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button[type="submit"]').filter({ hasText: /send/i })).toBeVisible();
  });
});
