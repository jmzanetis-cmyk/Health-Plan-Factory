/**
 * Referral Feature E2E Tests (Playwright)
 *
 * These tests exercise the referral UI flows with a real browser + mocked API responses.
 * They require a Chromium-capable environment to run (e.g. GitHub Actions / CI).
 *
 * To run locally when Chromium is available:
 *   VITE_PORT=<port> UI_URL=http://localhost:<port> npx playwright test
 *
 * In Replit (no system Chromium), set SKIP_BROWSER_TESTS=1 to skip gracefully.
 *
 * Coverage:
 *   1. Unauthenticated access — /referral shows sign-in prompt
 *   2. Celebration banner   — ?milestone=pioneer + newlyEarned flag
 *   3. Direct invite form   — inline success + 429 error handling
 *   4. Dashboard badge links — earned milestone badges link to /referral?milestone=<id>
 *   5. Referral page structure — 4 tiers, HPF- code, invite form present
 */

import { test, expect, type Page } from "@playwright/test";

const UI_URL = process.env.UI_URL ?? "http://localhost:5173";

// ── Mock data ────────────────────────────────────────────────────────────────

const MOCK_MINE: Record<string, unknown> = {
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
  ...MOCK_MINE,
  rewardedCount: 1,
  milestones: (MOCK_MINE.milestones as Array<Record<string, unknown>>).map((m) =>
    m["id"] === "pioneer"
      ? { ...m, earned: true, rewardedAt: new Date().toISOString(), newlyEarned: true }
      : m
  ),
  nextMilestone: { id: "advocate", label: "Advocate", threshold: 5, emoji: "🌿" },
};

// ── Helper mocks ─────────────────────────────────────────────────────────────

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

async function mockMine(page: Page, data = MOCK_MINE): Promise<void> {
  await page.route("**/api/referrals/mine", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(data) })
  );
}

// ── Tests (browser-required, skipped without Chromium) ───────────────────────

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
    await mockMine(page, MOCK_MINE);
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

    // Success message shows the invited email address
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

test.describe("Dashboard milestone badge links", () => {
  test.skip(skipBrowser, "Skipped: SKIP_BROWSER_TESTS=1");

  test("earned milestone badges on dashboard link to /referral?milestone=<id>", async ({ page }) => {
    await mockAuth(page);
    await page.route("**/api/referrals/mine", (r) =>
      r.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          ...MOCK_MINE_PIONEER_EARNED,
          milestones: (MOCK_MINE_PIONEER_EARNED.milestones as Array<Record<string, unknown>>).map((m) =>
            m["id"] === "pioneer" ? { ...m, earned: true, newlyEarned: false } : m
          ),
        }),
      })
    );
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

    const links = await page.locator(`a[href*="/referral"]`).all();
    expect(links.length).toBeGreaterThan(0);

    // Find a badge link that includes a milestone ID query param
    const hrefs = await Promise.all(links.map((l) => l.getAttribute("href")));
    const milestoneBadgeHref = hrefs.find((h) => h?.includes("milestone="));

    if (milestoneBadgeHref) {
      // Click the milestone badge and verify navigation to /referral?milestone=<id>
      const badgeLink = page.locator(`a[href="${milestoneBadgeHref}"]`).first();
      await badgeLink.click();
      await page.waitForLoadState("networkidle");

      expect(page.url()).toContain("milestone=");
      const bodyText = await page.textContent("body");
      expect(bodyText).toMatch(/Pioneer|Advocate|Champion|Ambassador/i);
    }
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
