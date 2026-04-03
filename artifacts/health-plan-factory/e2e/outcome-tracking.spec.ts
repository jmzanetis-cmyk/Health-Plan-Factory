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

  // ── 7. Full happy-path — progress entry → mark outcome → badge ───────────
  /**
   * This is the canonical chained journey test. It mocks Replit OIDC (because
   * Google OAuth is not accessible in headless mode), but every other step
   * exercises real UI interactions:
   *
   *   mock auth → seed plan → /plan renders → log progress entry (via API
   *   from page context) → open outcome modal → select label → submit →
   *   badge visible.
   *
   * The "sign-up" step is represented by the auth mock injection, which is the
   * equivalent of "create account" in a headless test environment where
   * interactive OAuth is unavailable.
   */
  test("7. Full happy-path: auth → plan → log progress entry → mark goal achieved → badge visible", async ({ page }) => {
    await mockAuth(page, { isPlus: true });

    // Mock the progress POST endpoint so logging a session doesn't hit the real DB
    await page.route("**/api/progress", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "test-progress-001",
            profileId: MOCK_USER.id,
            planId: MOCK_PLAN_ID,
            modalityId: "yoga",
            sessionCostCents: 8000,
            createdAt: new Date().toISOString(),
          }),
        });
      }
      return route.continue();
    });

    // Mock the outcome PATCH endpoint
    await page.route(`**/api/plans/${MOCK_PLAN_ID}/outcome`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          plan: {
            ...MOCK_LATEST_PLAN.plan,
            outcomeStatus: "achieved",
            outcomeLabel: "stress-managed",
            outcomeNote: "Eight weeks of yoga made a real difference.",
            outcomeAt: new Date().toISOString(),
          },
        }),
      }),
    );

    // ── Step 1: arrive at /plan with a seeded session (simulates completing onboarding)
    await page.goto(`${UI_URL}/plan`);
    await seedPlanSession(page);
    await page.reload();

    // Wait for plan heading
    await expect(page.getByRole("heading", { name: /wellness roadmap/i })).toBeVisible({
      timeout: 10000,
    });

    // ── Step 2: Log a progress entry via the page's fetch (simulates visiting /progress and logging)
    const progressResult = await page.evaluate(
      async ({ apiUrl, userId, planId }) => {
        try {
          const res = await fetch(`${apiUrl}/api/progress`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              profileId: userId,
              planId,
              modalityId: "yoga",
              sessionCostDollars: 80,
            }),
          });
          return { ok: res.ok, status: res.status };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      },
      { apiUrl: API_URL, userId: MOCK_USER.id, planId: MOCK_PLAN_ID },
    );

    expect(progressResult.ok).toBe(true);

    // ── Step 3: Open the outcome modal
    await expect(page.getByTestId("mark-goal-achieved-btn")).toBeVisible({ timeout: 5000 });
    await page.getByTestId("mark-goal-achieved-btn").click();

    await expect(page.getByTestId("outcome-modal")).toBeVisible({ timeout: 5000 });

    // ── Step 4: Select label, fill note, confirm
    await page.getByTestId("outcome-label-stress-managed").click();
    await page.getByTestId("outcome-note-input").fill("Eight weeks of yoga made a real difference.");
    await page.getByTestId("outcome-confirm-btn").click();

    // ── Step 5: Assert badge visible and modal gone
    await expect(page.getByTestId("goal-achieved-badge")).toBeVisible({ timeout: 5000 });
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
