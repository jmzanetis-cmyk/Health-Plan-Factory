/**
 * Outcome Tracking E2E Tests (Playwright)
 *
 * Covers the full user journey from onboarding through plan viewing to marking
 * a health goal as achieved. Auth is mocked (Replit OIDC requires interactive
 * Google login which blocks headless tests), following the same pattern used
 * in referral.spec.ts.
 *
 * To run:
 *   UI_URL=http://localhost:<port> npx playwright test outcome-tracking.spec.ts
 *
 * Coverage:
 *   1. Onboarding wizard — all 7 steps complete and produce /plan redirect
 *   2. Plan page loads — mocked auth + session plan renders correctly
 *   3. Outcome button (Plus) — "Mark goal achieved" button visible for Plus members
 *   4. Outcome button (free) — "Upgrade to track outcomes" CTA visible for free members
 *   5. Outcome modal — opens, shows disclaimer, label chips, note field
 *   6. Outcome submit — confirms and shows green badge
 *   7. Badge persistence — badge remains visible after modal closes
 */

import { test, expect, type Page } from "@playwright/test";

const UI_URL = process.env.UI_URL ?? "http://localhost:5173";
const API_URL = process.env.API_URL ?? "http://localhost:8080";

// ── Mock data ─────────────────────────────────────────────────────────────────

const MOCK_USER = {
  id: "test-outcome-user-001",
  email: "outcome-test@healthplanfactory.com",
  name: "Outcome Tester",
  role: "member",
};

const MOCK_PLAN_ID = "test-plan-outcome-001";

/** Minimal plan shape returned by /api/plans/:userId/latest */
const MOCK_LATEST_PLAN = {
  plan: {
    id: MOCK_PLAN_ID,
    profileId: MOCK_USER.id,
    status: "generated",
    totalMonthlyCost: 220,
    budgetUtilization: 73,
    budget: 300,
    outcomeStatus: null,
    outcomeLabel: null,
    outcomeNote: null,
    outcomeAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  items: [
    {
      id: "item-1",
      planId: MOCK_PLAN_ID,
      modalityId: "yoga",
      score: 90,
      frequency: "2x / week",
      estimatedMonthlyCost: 80,
      rationale: "Supports stress reduction and flexibility.",
      isDeprioritized: false,
      sortOrder: 0,
      nearbyProviderCount: 12,
      modality: { id: "yoga", name: "Yoga", emoji: "🧘", category: "mind-body" },
    },
    {
      id: "item-2",
      planId: MOCK_PLAN_ID,
      modalityId: "meditation",
      score: 85,
      frequency: "Daily",
      estimatedMonthlyCost: 20,
      rationale: "Reduces cortisol and supports mental clarity.",
      isDeprioritized: false,
      sortOrder: 1,
      nearbyProviderCount: 8,
      modality: { id: "meditation", name: "Meditation", emoji: "🧠", category: "mind-body" },
    },
  ],
};

// Seeded session storage — mirrors what Onboarding.tsx writes after completing
const SESSION_PLAN = JSON.stringify({
  included: [
    {
      modalityId: "yoga",
      score: 90,
      frequency: "2x / week",
      estimatedMonthlyCost: 80,
      rationale: "Supports stress reduction and flexibility.",
      nearbyProviderCount: 12,
    },
  ],
  deprioritized: [],
  totalMonthlyCost: 80,
  budgetUtilization: 27,
});

const SESSION_INTAKE = JSON.stringify({
  budget: 300,
  goals: ["stress-reduction"],
  conditions: ["stress"],
  preferences: ["mind-body"],
  exclusions: [],
  zipCode: "90210",
  radius: 25,
  telehealth: false,
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Mock Replit auth to make the app think the user is signed in as MOCK_USER.
 * Also mocks /api/members/subscription and /api/plans/:userId/latest.
 */
async function mockAuth(page: Page, opts: { isPlus?: boolean } = {}) {
  const { isPlus = true } = opts;

  // Mock the auth session check used by useAuth()
  await page.route("**/auth/user", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USER),
    }),
  );

  // Mock /auth/me (alias)
  await page.route("**/auth/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USER),
    }),
  );

  // Mock subscription status
  await page.route("**/api/members/subscription", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ subscriptionStatus: isPlus ? "plus" : "free", isPlus }),
    }),
  );

  // Mock latest plan
  await page.route(`**/api/plans/${MOCK_USER.id}/latest`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_LATEST_PLAN),
    }),
  );
}

/** Inject sessionStorage so the plan page renders without completing onboarding */
async function seedPlanSession(page: Page) {
  await page.evaluate(
    ({ plan, intake, planSaved }) => {
      sessionStorage.setItem("hpf_plan", plan);
      sessionStorage.setItem("hpf_intake", intake);
      sessionStorage.setItem("hpf_plan_saved", planSaved);
    },
    { plan: SESSION_PLAN, intake: SESSION_INTAKE, planSaved: "1" },
  );
}

// ── Skip guard ────────────────────────────────────────────────────────────────

const SKIP = process.env.SKIP_BROWSER_TESTS === "1";

// ── Test suite ────────────────────────────────────────────────────────────────

test.describe("Outcome Tracking", () => {
  test.skip(SKIP, "SKIP_BROWSER_TESTS=1 — browser not available");

  // ── 1. Onboarding — all 7 steps ──────────────────────────────────────────
  test("1. Onboarding wizard completes all 7 steps", async ({ page }) => {
    await page.goto(`${UI_URL}/onboarding`);

    // Step 0 — welcome / intro (Next)
    await page.getByRole("button", { name: /next|get started|continue/i }).first().click();

    // Step 1 — Goals: pick at least one
    const goalBtn = page.locator("button").filter({ hasText: /stress|fitness|sleep|energy/i }).first();
    await goalBtn.click();
    await page.getByRole("button", { name: /next/i }).click();

    // Step 2 — Conditions (optional step, may auto-advance)
    const nextBtn = page.getByRole("button", { name: /next/i });
    if (await nextBtn.isVisible()) await nextBtn.click();

    // Step 3 — Preferences: pick at least one
    const prefBtn = page.locator("button").filter({ hasText: /mind-body|in-person|virtual|telehealth/i }).first();
    if (await prefBtn.isVisible()) {
      await prefBtn.click();
      await page.getByRole("button", { name: /next/i }).click();
    }

    // Step 4 — Budget (slider or pill, auto-advances or next)
    const budgetNext = page.getByRole("button", { name: /next/i });
    if (await budgetNext.isVisible()) await budgetNext.click();

    // Step 5 — ZIP code
    const zipInput = page.locator("input[inputmode='numeric']").first();
    if (await zipInput.isVisible()) {
      await zipInput.fill("90210");
      await page.getByRole("button", { name: /next/i }).click();
    }

    // Step 6 — Review step — submit
    const reviewNext = page.getByRole("button", { name: /build my plan|generate|next|finish/i }).first();
    if (await reviewNext.isVisible()) await reviewNext.click();

    // Building screen — wait for /plan redirect (up to 20 s)
    await page.waitForURL(`${UI_URL}/plan`, { timeout: 20000 });
    expect(page.url()).toContain("/plan");
  });

  // ── 2. Plan page loads ───────────────────────────────────────────────────
  test("2. Plan page renders modalities from session storage", async ({ page }) => {
    await mockAuth(page);
    await page.goto(`${UI_URL}/plan`);
    await seedPlanSession(page);
    await page.reload();

    // Heading should be present
    await expect(page.getByRole("heading", { name: /wellness roadmap/i })).toBeVisible({
      timeout: 10000,
    });
  });

  // ── 3. Outcome button — Plus member ─────────────────────────────────────
  test("3. Plus member sees 'Mark goal achieved' button", async ({ page }) => {
    await mockAuth(page, { isPlus: true });
    await page.goto(`${UI_URL}/plan`);
    await seedPlanSession(page);
    await page.reload();

    await expect(page.getByTestId("mark-goal-achieved-btn")).toBeVisible({ timeout: 10000 });
  });

  // ── 4. Outcome button — free member ─────────────────────────────────────
  test("4. Free member sees 'Upgrade to track outcomes' CTA", async ({ page }) => {
    await mockAuth(page, { isPlus: false });
    await page.goto(`${UI_URL}/plan`);
    await seedPlanSession(page);
    await page.reload();

    await expect(page.getByRole("button", { name: /upgrade to track outcomes/i })).toBeVisible({
      timeout: 10000,
    });
  });

  // ── 5. Outcome modal — opens with disclaimer ─────────────────────────────
  test("5. Outcome modal opens and shows medical disclaimer", async ({ page }) => {
    await mockAuth(page, { isPlus: true });
    await page.goto(`${UI_URL}/plan`);
    await seedPlanSession(page);
    await page.reload();

    await page.getByTestId("mark-goal-achieved-btn").click();

    await expect(page.getByTestId("outcome-modal")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/always follow your doctor/i)).toBeVisible();
    await expect(page.getByText(/pain reduced/i)).toBeVisible();
    await expect(page.getByTestId("outcome-note-input")).toBeVisible();
  });

  // ── 6. Outcome submit — badge appears ───────────────────────────────────
  test("6. Submitting outcome shows green 'Goal achieved' badge", async ({ page }) => {
    await mockAuth(page, { isPlus: true });

    // Mock the PATCH /plans/:id/outcome endpoint
    await page.route(`**/api/plans/${MOCK_PLAN_ID}/outcome`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          plan: {
            ...MOCK_LATEST_PLAN.plan,
            outcomeStatus: "achieved",
            outcomeLabel: "pain-reduced",
            outcomeNote: "Feeling much better after 8 weeks.",
            outcomeAt: new Date().toISOString(),
          },
        }),
      }),
    );

    await page.goto(`${UI_URL}/plan`);
    await seedPlanSession(page);
    await page.reload();

    // Open modal
    await page.getByTestId("mark-goal-achieved-btn").click();

    // Select "Pain reduced" label
    await page.getByTestId("outcome-label-pain-reduced").click();

    // Type a note
    await page.getByTestId("outcome-note-input").fill("Feeling much better after 8 weeks.");

    // Confirm
    await page.getByTestId("outcome-confirm-btn").click();

    // Badge should appear
    await expect(page.getByTestId("goal-achieved-badge")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/goal achieved/i)).toBeVisible();
  });

});

// Canonical full happy-path (DB-seeded, X-Test-User-Id)
// This describe block contains the definitive end-to-end outcome-tracking
// journey. It uses the same fixture-seeding pattern as referral.spec.ts:
//
//  1. beforeEach: POST /api/test/seed-outcome-member -> creates real Plus member + plan in DB
//                 (this is the sign-up step - programmatic equivalent of UI registration)
//  2. page.setExtraHTTPHeaders with x-test-user-id -> all API calls are authenticated
//  3. page.route for api/auth/me -> frontend auth display only
//  4. Real UI interactions for onboarding (7 steps), /progress log, and /plan outcome
//  5. afterEach: DELETE /api/test/seed-outcome-member/:userId -> cleanup
//
// Requires NODE_ENV=test API server (test-auth-middleware active) + Chromium.
// Skipped in Replit dev env where SKIP_BROWSER_TESTS=1.
test.describe("Outcome Tracking — canonical full happy-path", () => {
  test.skip(SKIP, "SKIP_BROWSER_TESTS=1 — browser not available");

  const FIXTURE_USER_ID = "e2e-outcome-test-user";

  test.beforeEach(async ({ request }) => {
    const res = await request.post(`${API_URL}/api/test/seed-outcome-member`, {
      data: { userId: FIXTURE_USER_ID },
      headers: { "Content-Type": "application/json" },
    });
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    await request.delete(`${API_URL}/api/test/seed-outcome-member/${FIXTURE_USER_ID}`);
  });

  test("7. sign-up (seeded) -> onboarding (7 UI steps) -> plan -> log progress -> mark outcome -> badge", async ({ page }) => {
    // ── Auth wiring ────────────────────────────────────────────────────────
    // Inject X-Test-User-Id so all API calls from the page are authenticated
    await page.setExtraHTTPHeaders({ "x-test-user-id": FIXTURE_USER_ID });

    // Mock only the frontend auth display; all /api/* calls are real
    await page.route("**/api/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: FIXTURE_USER_ID,
          email: `${FIXTURE_USER_ID}@outcome-e2e.test`,
          role: "member",
          displayName: "Outcome E2E Tester",
          avatarUrl: null,
        }),
      }),
    );
    await page.route("**/auth/user", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: FIXTURE_USER_ID,
          email: `${FIXTURE_USER_ID}@outcome-e2e.test`,
          role: "member",
          displayName: "Outcome E2E Tester",
        }),
      }),
    );
    // Subscription: real API with X-Test-User-Id (returns "plus" from seeded profile)
    // /plans/:userId/latest: real API with X-Test-User-Id (returns seeded plan)

    // ── Step 1: Complete onboarding wizard (7 real UI steps) ──────────────
    await page.goto(`${UI_URL}/onboarding`);

    // Step 0 — Budget: default $250 pre-filled, click Continue
    await expect(page.getByRole("heading", { name: /monthly budget/i })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 1 — Goals: select "Stress Reduction", then Continue
    await expect(page.getByRole("heading", { name: /health goals/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Stress Reduction" }).click();
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 3000 });
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 2 — Conditions: optional, click Continue
    await expect(page.getByRole("heading", { name: /conditions or concerns/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 3 — Preferences: select "Mind-Body Focus", then Continue
    await expect(page.getByRole("heading", { name: /prefer to engage/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Mind-Body Focus" }).click();
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 3000 });
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 4 — Exclusions: optional, click Continue
    await expect(page.getByRole("heading", { name: /like to avoid/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 5 — Region: fill ZIP code, then Continue
    await expect(page.getByRole("heading", { name: /located/i })).toBeVisible({ timeout: 5000 });
    await page.locator("input[inputmode='numeric'], input[placeholder*='ZIP'], input[type='text']").first().fill("90210");
    await expect(page.getByRole("button", { name: "Continue" })).toBeEnabled({ timeout: 3000 });
    await page.getByRole("button", { name: "Continue" }).click();

    // Step 6 — Review: confirm heading, then generate
    await expect(page.getByRole("heading", { name: /review/i })).toBeVisible({ timeout: 5000 });
    await page.getByRole("button", { name: "Generate My Plan" }).click();

    // Building screen -> plan page
    await page.waitForURL(`${UI_URL}/plan`, { timeout: 30000 });
    await expect(page.getByRole("heading", { name: /wellness roadmap/i })).toBeVisible({ timeout: 10000 });

    // ── Step 2: Navigate to /progress, open form, fill metrics, submit ─────
    await page.goto(`${UI_URL}/progress`);

    await expect(page.getByRole("button", { name: /log entry/i })).toBeVisible({ timeout: 8000 });
    await page.getByRole("button", { name: /log entry/i }).click();

    // Assert the form opened
    await expect(page.getByRole("heading", { name: /new wellness log/i })).toBeVisible({ timeout: 5000 });

    // Fill Wellness (first 1–10 input) and Mood (second)
    await page.locator("input[placeholder='1–10']").first().fill("8");
    await page.locator("input[placeholder='1–10']").nth(1).fill("7");
    await page.locator("textarea[placeholder*='How did you feel']").fill("Felt great after yoga session.");

    // Submit -> real POST /api/progress authenticated via X-Test-User-Id
    await page.getByRole("button", { name: /save log/i }).click();

    // Form closes after success
    await expect(page.getByRole("heading", { name: /new wellness log/i })).not.toBeVisible({ timeout: 8000 });

    // ── Step 3: Navigate to /plan and mark goal achieved ───────────────────
    await page.goto(`${UI_URL}/plan`);
    await expect(page.getByRole("heading", { name: /wellness roadmap/i })).toBeVisible({ timeout: 10000 });

    // Plus member -> "Mark goal achieved" button visible
    await expect(page.getByTestId("mark-goal-achieved-btn")).toBeVisible({ timeout: 8000 });
    await page.getByTestId("mark-goal-achieved-btn").click();

    // ── Step 4: Fill outcome modal ─────────────────────────────────────────
    await expect(page.getByTestId("outcome-modal")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/medical reminder|always follow your doctor/i)).toBeVisible();

    // Select "Stress managed" radio
    await page.getByTestId("outcome-label-stress-managed").click();
    await page.getByTestId("outcome-note-input").fill("Eight weeks of yoga made a real difference.");

    // Confirm -> real PATCH /api/plans/:planId/outcome authenticated via X-Test-User-Id
    await page.getByTestId("outcome-confirm-btn").click();

    // ── Step 5: Assert badge and cleanup ──────────────────────────────────
    await expect(page.getByTestId("goal-achieved-badge")).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/goal achieved/i)).toBeVisible();
    await expect(page.getByTestId("outcome-modal")).not.toBeVisible();
  });

  // ── 8. Badge persistence — modal closes, badge stays ─────────────────────
  test("8. Goal achieved badge persists after modal is closed", async ({ page }) => {
    await mockAuth(page, { isPlus: true });

    await page.route(`**/api/plans/${MOCK_PLAN_ID}/outcome`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          plan: {
            ...MOCK_LATEST_PLAN.plan,
            outcomeStatus: "achieved",
            outcomeLabel: "energy-improved",
            outcomeNote: null,
            outcomeAt: new Date().toISOString(),
          },
        }),
      }),
    );

    await page.goto(`${UI_URL}/plan`);
    await seedPlanSession(page);
    await page.reload();

    await page.getByTestId("mark-goal-achieved-btn").click();
    await page.getByTestId("outcome-label-energy-improved").click();
    await page.getByTestId("outcome-confirm-btn").click();

    await expect(page.getByTestId("goal-achieved-badge")).toBeVisible({ timeout: 5000 });

    // Modal should be gone
    await expect(page.getByTestId("outcome-modal")).not.toBeVisible();

    // Badge is still visible
    await expect(page.getByTestId("goal-achieved-badge")).toBeVisible();
  });
});
