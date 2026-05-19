# Health Plan Factory — Launch QA Checklist

Generated 2026-05-19. Cover all 10 user journeys end-to-end before App Store submission.
Run against staging first; repeat critical paths against production before go-live.

---

## How to Use

- Column **Web** = test on healthplanfactory.com (desktop + mobile Safari)
- Column **Mobile** = test on iOS device via TestFlight (not Simulator — use a real device for HealthKit)
- Mark each cell: ✅ Pass | ❌ Fail (note what broke) | ⏭ Skipped (note why)
- Run the full checklist once per release candidate

---

## Journey 1 — New member onboarding → plan generation

| # | Step | Web | Mobile | Notes |
|---|------|-----|--------|-------|
| 1.1 | Land on `/` — hero loads, no console errors | | | |
| 1.2 | Click "Get Started" → `/onboarding` loads without auth gate | | | |
| 1.3 | Complete all 5 onboarding steps (name, goals, conditions, budget, zip) | | | |
| 1.4 | Submit → redirected to `/plan` | | | |
| 1.5 | Plan loads within 10 seconds — at least 5 modalities rendered | | | |
| 1.6 | Each modality card shows: name, evidence badge, cost estimate, rationale | | | |
| 1.7 | Evidence badges are one of: Strong / Moderate / Emerging | | | |
| 1.8 | Provider count badge ("X providers near you") renders above the fold | | | |
| 1.9 | "Unlock your HSA →" link visible and navigates to `/hsa-unlock` | | | |
| 1.10 | Plan renders correctly on 375px-wide viewport (iPhone SE) | | | |

---

## Journey 2 — Sign-up and account creation

| # | Step | Web | Mobile | Notes |
|---|------|-----|--------|-------|
| 2.1 | Click "Sign In" from plan page → auth modal or redirect appears | | | |
| 2.2 | Magic link: enter email → confirmation message shown | | | |
| 2.3 | Click link in email → redirected back to app, session established | | | |
| 2.4 | GitHub OAuth: redirects to GitHub, back to app, session established | | | |
| 2.5 | After sign-in: plan is still visible (session persists onboarding data) | | | |
| 2.6 | `/dashboard` loads with user's name displayed | | | |
| 2.7 | Profile record created in DB (`profiles` table has new row) | | | |

---

## Journey 3 — Plus subscription upgrade (web)

| # | Step | Web | Mobile | Notes |
|---|------|-----|--------|-------|
| 3.1 | Free member sees upgrade CTA on `/dashboard` and `/plan` | | | |
| 3.2 | Click upgrade → Stripe Checkout opens (monthly option shown) | | | |
| 3.3 | Complete checkout with Stripe test card `4242 4242 4242 4242` | | | |
| 3.4 | Redirected back to app after payment | | | |
| 3.5 | `profiles.subscription_status` updated to `active` in DB | | | |
| 3.6 | Plus features unlocked: provider contact details visible | | | |
| 3.7 | Plus features unlocked: AI coach accessible | | | |
| 3.8 | Plus features unlocked: journal/session log accessible | | | |
| 3.9 | Stripe webhook `checkout.session.completed` processed (check server logs) | | | |
| 3.10 | Annual upgrade path: switch to yearly plan in Stripe portal | | | |

---

## Journey 4 — Mobile app paywall and in-app purchase (iOS)

| # | Step | Mobile | Notes |
|---|------|--------|-------|
| 4.1 | Install TestFlight build; open app | | |
| 4.2 | Log in with same credentials as web account | | |
| 4.3 | Free member: Plus features show paywall (not silently disabled) | | |
| 4.4 | Tap paywall CTA → native iOS purchase sheet appears | | |
| 4.5 | Purchase with sandbox account → subscription activates | | |
| 4.6 | Post-purchase: Plus features accessible in mobile app | | |
| 4.7 | Deep link from email magic link → app opens to correct screen | | |
| 4.8 | HealthKit permission prompt shown on first launch (if enabled) | | |

---

## Journey 5 — Provider discovery and booking request

| # | Step | Web | Mobile | Notes |
|---|------|-----|--------|-------|
| 5.1 | Navigate to `/providers` — provider cards load | | | |
| 5.2 | Filter by modality — results update correctly | | | |
| 5.3 | Free member: contact details blurred / hidden behind upgrade CTA | | | |
| 5.4 | Plus member: phone, website, address visible on provider card | | | |
| 5.5 | "Request booking" — modal opens, message field works | | | |
| 5.6 | Submit booking request → `booking_requests` row inserted in DB | | | |
| 5.7 | Provider receives email notification of booking request | | | |
| 5.8 | Member receives confirmation email of booking request | | | |
| 5.9 | Favorite a provider → heart icon fills; persists on refresh | | | |
| 5.10 | Provider profile page (`/providers/:id`) loads with full bio | | | |

---

## Journey 6 — Session logging and progress tracking

| # | Step | Web | Mobile | Notes |
|---|------|-----|--------|-------|
| 6.1 | Navigate to `/progress` — page loads for Plus member | | | |
| 6.2 | Log a session: select modality, rate mood/pain/energy (1-5), add note | | | |
| 6.3 | Log saved → appears in session history immediately | | | |
| 6.4 | Wellness score updates after log is saved (or shows "calculating") | | | |
| 6.5 | Journal entries visible in chronological order | | | |
| 6.6 | After 14 logs: insights section renders (not "unlock at 14 entries") | | | |
| 6.7 | Free member sees upgrade prompt when accessing `/progress` | | | |

---

## Journey 7 — AI accountability coach

| # | Step | Web | Mobile | Notes |
|---|------|-----|--------|-------|
| 7.1 | Navigate to `/coach` — chat interface loads | | | |
| 7.2 | Send a message → response arrives within 15 seconds | | | |
| 7.3 | Coach references user's plan (knows their goals/conditions) | | | |
| 7.4 | Conversation history persists across page refreshes | | | |
| 7.5 | Free member: coach locked behind paywall (not silently broken) | | | |
| 7.6 | Long message (>500 chars) — no truncation or UI overflow | | | |

---

## Journey 8 — Referral program

| # | Step | Web | Mobile | Notes |
|---|------|-----|--------|-------|
| 8.1 | Navigate to `/referral` — referral code visible | | | |
| 8.2 | Share link copies to clipboard | | | |
| 8.3 | New user signs up via referral link → referred member record created | | | |
| 8.4 | Referring member receives credit notification (toast on dashboard) | | | |
| 8.5 | Credit balance displayed correctly on dashboard | | | |
| 8.6 | Referral credit applied at Plus upgrade checkout | | | |

---

## Journey 9 — HSA/FSA unlock (LMN workflow)

| # | Step | Web | Notes |
|---|------|-----|-------|
| 9.1 | Navigate to `/hsa-unlock` — page loads | | |
| 9.2 | Stepper: complete "What is an LMN" step | | |
| 9.3 | "Your HSA Opportunity" — budget estimate renders | | |
| 9.4 | "Get Your Draft" — LMN draft generated by AI | | |
| 9.5 | Draft email copy works (clipboard or mailto) | | |
| 9.6 | LMN request record stored in `lmn_requests` table | | |
| 9.7 | Confirmation email sent to member | | |

---

## Journey 10 — App Store reviewer demo account

| # | Step | Web | Mobile | Notes |
|---|------|-----|--------|-------|
| 10.1 | Log in with demo credentials (email in reviewer notes) | | | |
| 10.2 | Dashboard shows pre-seeded wellness score and session history | | | |
| 10.3 | Plan page shows 5 seeded plan items | | | |
| 10.4 | Provider directory shows 5 seeded providers | | | |
| 10.5 | Coach chat shows pre-seeded conversation | | | |
| 10.6 | All Plus features accessible (account is pre-set to Plus) | | | |
| 10.7 | No empty states, loading spinners, or "no data" messages | | | |
| 10.8 | App does not crash on any screen during a 5-minute walkthrough | | | |

---

## Pre-Submission Blockers

These must be ✅ before App Store submission:

| Item | Status | Owner |
|------|--------|-------|
| Journey 10 (reviewer demo) passes completely | ⬜ | Jordan |
| Sentry DSN set in EAS — crashes reported in dashboard | ⬜ | Jordan |
| `EXPO_PUBLIC_API_URL` points to live API (not Replit dev) | ⬜ | Blocked on Replit |
| App Store privacy labels submitted in App Store Connect | ⬜ | Jordan |
| App Store metadata submitted (name, subtitle, description, keywords) | ⬜ | Jordan |
| 10 screenshots (6.7" + 6.5") uploaded | ⬜ | Jordan |
| Legal review of Privacy.tsx + Terms.tsx | ⬜ | Jordan |
| Annual Stripe price ID ($99/yr) created in dashboard | ⬜ | Blocked on Replit |
| `magic_links` → deep-link flow tested on real iOS device | ⬜ | Jordan |
| All Journey 3 (Stripe) steps pass with test card | ⬜ | Jordan |
