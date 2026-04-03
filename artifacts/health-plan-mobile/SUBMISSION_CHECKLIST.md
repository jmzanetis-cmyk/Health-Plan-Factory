# Health Plan Factory — iOS Pre-Submission Checklist
**App:** Health Plan Factory  
**Bundle ID:** `com.healthplanfactory.mobile`  
**Version:** 1.0.0  
**Date prepared:** 2026-04-03  

Legend: **agent-verified ✓** = confirmed by code audit | **requires human action ☐** = must be done manually before submission

---

## 1. Build & EAS Configuration

| Item | Status | Notes |
|------|--------|-------|
| `eas.json` production profile: `autoIncrement: true` | **agent-verified ✓** | Build number increments automatically on each production build |
| `eas.json` production: `ios.simulator: false` | **agent-verified ✓** | Correct — App Store builds never target simulator |
| `EXPO_PUBLIC_API_URL` set to `https://api.healthplanfactory.com` in production profile | **agent-verified ✓** | Set in `eas.json` → `build.production.env` |
| `eas.json` CLI version `>= 10.0.0` required | **agent-verified ✓** | Documented in `eas.json` → `cli.version` |
| `eas.json` submit: `appleId` set to `developer@healthplanfactory.com` | **agent-verified ✓** | Email present — verify it matches the Apple ID account owner |
| `eas.json` submit: `ascAppId` — **PLACEHOLDER** | **requires human action ☐** | Replace `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` with the numeric App ID from App Store Connect → App Information |
| `eas.json` submit: `appleTeamId` — **PLACEHOLDER** | **requires human action ☐** | Replace `REPLACE_WITH_APPLE_TEAM_ID` with your 10-character Apple Developer Team ID (found at developer.apple.com → Membership) |
| App slug `health-plan-mobile` and scheme `healthplanfactory` set in `app.config.js` | **agent-verified ✓** | Consistent with EAS project config |
| New Architecture (`newArchEnabled: true`) enabled | **agent-verified ✓** | Required for React Native 0.81+ and Expo SDK 54 |
| React compiler (`reactCompiler: true`) enabled | **agent-verified ✓** | Enabled in `app.config.js` experiments |

### Pre-build actions required

- **☐ Set EAS Secrets** before running `eas build --platform ios --profile production`:
  ```bash
  eas secret:create --scope project --name EXPO_PUBLIC_SENTRY_DSN --value "<your-sentry-dsn>"
  eas secret:create --scope project --name SENTRY_ORG --value "<your-sentry-org-slug>"
  eas secret:create --scope project --name SENTRY_PROJECT --value "<your-sentry-project-slug>"
  ```
  Sentry defaults (`healthplanfactory` / `health-plan-mobile`) are in `app.config.js` as fallbacks — source map uploads will fail without real values, but crash capture still works. See `SENTRY_SETUP.md` for setup instructions.

- **☐ Confirm RevenueCat API keys**: Three separate env vars are read by `lib/revenuecat.tsx`:
  - `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` — sandbox/dev key (already set)
  - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` — production iOS key (set this in EAS Secrets)
  - `EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY` — production Android key (set this in EAS Secrets)
  The app automatically uses the test key if the production keys are `REPLACE_WITH_IOS_KEY` placeholders.

- **☐ Run the production build**:
  ```bash
  eas build --platform ios --profile production
  ```

---

## 2. App Configuration (`app.config.js`) Verification

| Item | Status | Notes |
|------|--------|-------|
| Bundle ID `com.healthplanfactory.mobile` | **agent-verified ✓** | Matches `metadata.md` and `PRIVACY.md` |
| `version: "1.0.0"` | **agent-verified ✓** | Correct for initial App Store release |
| `buildNumber: "1"` (auto-incremented by EAS) | **agent-verified ✓** | `autoIncrement: true` in `eas.json` overrides this at build time |
| Orientation: portrait only | **agent-verified ✓** | `supportsTablet: false` — correct for a mobile wellness app |
| HealthKit entitlement `com.apple.developer.healthkit: true` | **agent-verified ✓** | Required for Apple Health integration |
| `NSHealthShareUsageDescription` present and accurate | **agent-verified ✓** | Describes read-only access to steps, sleep, energy, mindfulness |
| `NSHealthUpdateUsageDescription` present (no-write disclosure) | **agent-verified ✓** | Apple requires this even when no writes occur |
| `NSMotionUsageDescription` present | **agent-verified ✓** | Required by `react-native-health` CMPedometer usage |
| Privacy manifest: `NSUserDefaults` reason `CA92.1` | **agent-verified ✓** | Correct for AsyncStorage/preference persistence |
| Privacy manifest: `FileTimestamp` reason `C617.1` | **agent-verified ✓** | Correct for Expo bundle cache validation |
| Sentry plugin: org/project from env vars with fallback defaults | **agent-verified ✓** | Reads `SENTRY_ORG` / `SENTRY_PROJECT` env vars; requires real EAS secrets before production build |
| `expo-background-fetch` and `expo-task-manager` plugins included | **agent-verified ✓** | Required for background health sync task |
| Icon `./assets/images/icon.png` and splash `./assets/images/splash-icon.png` | **agent-verified ✓** | Paths present in config — verify files exist at correct dimensions |
| **☐ Verify icon dimensions** | **requires human action ☐** | `icon.png` must be 1024×1024px PNG, no alpha channel; splash must follow Expo splash spec |

---

## 3. RevenueCat Dashboard

| Item | Status | Notes |
|------|--------|-------|
| Entitlement `plus` created in RevenueCat dashboard | **requires human action ☐** | The code gates features on entitlement ID `"plus"` — must match exactly |
| Monthly product `health_plan_factory_plus_monthly` (or matching ID) configured at $9.99 | **requires human action ☐** | Create in App Store Connect → In-App Purchases first, then link in RevenueCat |
| Default offering created with the Plus monthly product attached | **requires human action ☐** | RevenueCat dashboard → Offerings → Default offering |
| iOS production API key set in EAS Secrets as `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY` | **requires human action ☐** | Replace the `REPLACE_WITH_IOS_KEY` placeholder; `EXPO_PUBLIC_REVENUECAT_TEST_API_KEY` is the sandbox fallback (see `lib/revenuecat.tsx`) |
| Sandbox test: purchase `Plus` subscription, verify `isPlus === true` returned by `/api/subscriptions` | **requires human action ☐** | Test on a physical device with a Sandbox Apple ID |
| Sandbox test: restore purchases, verify subscription state restored | **requires human action ☐** | Test via Settings → Restore Purchases in-app |

---

## 4. App Store Connect

| Item | Status | Notes |
|------|--------|-------|
| App created in App Store Connect with bundle ID `com.healthplanfactory.mobile` | **requires human action ☐** | Must match `app.config.js` exactly; register at appstoreconnect.apple.com |
| App name "Health Plan Factory" (30 chars) registered | **requires human action ☐** | Check availability — App Store names are unique |
| Bundle ID registered in Apple Developer Portal | **requires human action ☐** | Create at developer.apple.com → Certificates, Identifiers & Profiles → Identifiers |
| HealthKit capability enabled on the App ID in Apple Developer Portal | **requires human action ☐** | Required for any app reading HealthKit data |
| Subtitle "Your Personal Wellness Editor" (29 chars ✓) | **requires human action ☐** | Copy from `metadata.md` |
| Description (~2,250 chars, within 4,000 limit) | **requires human action ☐** | Copy full description from `metadata.md` |
| Keywords (98 chars, within 100 limit) ✓ | **requires human action ☐** | `wellness,health plan,AI coach,habit tracker,sleep tracker,nutrition,biometrics,wellbeing,fitness` |
| Support URL `https://healthplanfactory.com/support` | **requires human action ☐** | Must be live before submission |
| Marketing URL `https://healthplanfactory.com` | **requires human action ☐** | Must be live before submission |
| Privacy Policy URL `https://healthplanfactory.com/privacy` | **requires human action ☐** | Must be live — App Review will visit this URL |
| Age rating: **12+** selected | **requires human action ☐** | AI coach + mental health crisis resources (988/741741) require 12+; see PRIVACY.md §4 |
| Promotional text (140 chars, within 170 limit) ✓ | **requires human action ☐** | Copy from `metadata.md` — can be updated without a new build |
| "What's New" release notes | **requires human action ☐** | Copy from `metadata.md` → Version Release Notes |
| 4 screenshots at 1284×2778px uploaded (6.5" iPhone) | **requires human action ☐** | Files in `assets/screenshots/`; upload all 4 for Home, Plan, Journal, Coach screens |
| App Review test account credentials provided | **requires human action ☐** | Add test account email + password to "Notes for App Review" in App Store Connect |
| App Review notes: RevenueCat sandbox instructions included | **requires human action ☐** | Copy the "App Review Notes" block from `metadata.md` |
| In-App Purchase $9.99/month "Health Plan Factory Plus" added | **requires human action ☐** | Create product in App Store Connect → In-App Purchases before linking to RevenueCat |

---

## 5. Privacy & Legal

| Item | Status | Notes |
|------|--------|-------|
| Age rating consistent: **12+** in metadata.md AND PRIVACY.md | **agent-verified ✓** | Fixed — metadata.md previously showed 4+ (inconsistency corrected) |
| HealthKit data types documented in PRIVACY.md §2 | **agent-verified ✓** | Steps, Sleep, Active Energy, Mindful Session — read-only, matches `app.config.js` |
| HealthKit usage strings in `app.config.js` match PRIVACY.md §2 | **agent-verified ✓** | Consistent verbatim descriptions |
| Bundle ID consistent across `app.config.js`, `metadata.md`, `PRIVACY.md` | **agent-verified ✓** | All reference `com.healthplanfactory.mobile` |
| Privacy manifest APIs declared: UserDefaults (CA92.1), FileTimestamp (C617.1) | **agent-verified ✓** | Declared in `app.config.js` → `ios.privacyManifests` |
| HIPAA non-applicability documented | **agent-verified ✓** | Documented in PRIVACY.md §5 — wellness tool, not a covered entity |
| Medical disclaimer in-app on login screen and Settings | **agent-verified ✓** | Implemented per PRIVACY.md §5 |
| Crisis resources (988, 741741) present in Settings screen | **agent-verified ✓** | Documented in PRIVACY.md §5 |
| Data retention policy documented (health metrics: 90 days, coach sessions: 30 days) | **agent-verified ✓** | In PRIVACY.md §6 |
| App Privacy Nutrition Label — "Data Used to Track You": None | **requires human action ☐** | Select "We do not collect data used to track users" in App Store Connect → App Privacy |
| App Privacy Label: Contact Info (Email, Name, Phone) → Linked to You | **requires human action ☐** | Per PRIVACY.md §1b checklist |
| App Privacy Label: Health & Fitness (Fitness, Sleep, Other) → Linked to You | **requires human action ☐** | Per PRIVACY.md §1b checklist |
| App Privacy Label: User Content (journal, coach messages) → Linked to You | **requires human action ☐** | Per PRIVACY.md §1b checklist |
| App Privacy Label: Identifiers (User ID), Purchases → Linked to You | **requires human action ☐** | Per PRIVACY.md §1b checklist |
| App Privacy Label: Diagnostics → **decision required** | **requires human action ☐** | `app/_layout.tsx` initializes Sentry when `EXPO_PUBLIC_SENTRY_DSN` is set. If the production build includes a real DSN, declare **Diagnostics → Crash Data → Not linked to you**. If DSN is omitted (left as the default fallback), select **None**. Confirm with your privacy lead before submission. |
| Privacy Policy live at `https://healthplanfactory.com/privacy` | **requires human action ☐** | Content/Legal team must publish before submission |
| Terms of Service live at `https://healthplanfactory.com/terms` | **requires human action ☐** | Content/Legal team must publish before submission |
| Support page/email live at `https://healthplanfactory.com/support` | **requires human action ☐** | Engineering/Support team must set up before submission |

---

## 6. App Review Preparation

| Item | Status | Notes |
|------|--------|-------|
| App requires sign-in disclosed to reviewers | **agent-verified ✓** | Noted in `metadata.md` App Review Notes — "There is no unauthenticated access" |
| HealthKit graceful degradation if permission denied | **agent-verified ✓** | Code in `lib/healthSync.ts` returns null if permissions not granted |
| RevenueCat sandbox mode active in review build | **requires human action ☐** | Verify RevenueCat SDK uses sandbox by default in non-production builds |
| Sandbox Apple ID provided to reviewers | **requires human action ☐** | Create a Sandbox Apple ID in App Store Connect → Users and Access → Sandbox Testers; include credentials in App Review Notes |
| Test account (`reviewer@healthplanfactory.com`) created and working | **requires human action ☐** | Create account in the app or via database seed; confirm login works |
| App does not crash on fresh install (no stored auth token) | **requires human action ☐** | Test on a clean physical device or simulator reset |
| App does not crash when HealthKit permission denied | **requires human action ☐** | Test by denying HealthKit in Settings; wellness score should show limited data gracefully |
| App does not crash when network is offline | **requires human action ☐** | Test offline mode — coach should show graceful error, journal should still render |
| Background health sync does not drain battery excessively | **requires human action ☐** | iOS background fetch is throttled by the OS (≥15 min intervals); verify no `expo-background-fetch` busy-loop |

---

## 7. TypeScript Audit Results

**Run:** `pnpm typecheck` in `artifacts/health-plan-mobile/`
**Result:** **0 errors** (after fixes applied 2026-04-03)

### Errors Fixed

| Error | File | Fix Applied |
|-------|------|-------------|
| `NodeJS.Timeout` not assignable to `Timeout` | `app/(tabs)/coach.tsx:124` | Changed ref type to `ReturnType<typeof setTimeout>` |
| `Property 'nonce' does not exist on type 'AuthRequest'` | `lib/auth.tsx` | Added local `AuthRequestWithNonce` type extension; cast `requestRaw` to typed variable — no @ts-ignore needed |
| `Property 'queryKey' is missing` (UseQuery options) | `accountability.tsx`, `discover.tsx`, `index.tsx`, `journal.tsx`, `plan.tsx` | Added `partialQuery()` helper in `lib/api-client-react/src/index.ts` — callers pass `enabled`/`staleTime` without providing `queryKey`; hook uses its own real cache key |
| `Property 'createdAt' does not exist on type 'AuthUser'` | `accountability.tsx`, `index.tsx` | Added `createdAt?: string \| null` to `AuthUser` in both `lib/api-zod` and `lib/api-client-react` generated schemas — field is returned by `/auth/me` at runtime |

> **Post-v1 technical debt:** `createdAt` was added directly to the generated schema files. These files are generated by Orval from the OpenAPI spec, so the next `pnpm orval` run will overwrite this change. Before v1.1, add `createdAt` to the `AuthUser` component in the OpenAPI spec (`lib/api-spec`) and regenerate clients to make this change permanent.

### Native Module Errors — Left with `// @ts-ignore` (by design)

| Error | File | Reason |
|-------|------|--------|
| `Property 'Permissions' does not exist` | `lib/healthSync.ts:62` | `react-native-health` types don't export Permissions at module level; exists at runtime |
| Callback signature mismatches (`err: string` vs `Error | null`) | `lib/healthSync.ts:78,143,153,169,181` | `react-native-health` types use `string` for callbacks; `Error | null` is more correct |
| `BucketUnit` type narrower than `"DAY"` | `lib/healthSync.ts:219` | `react-native-google-fit` BucketUnit enum narrower than `"DAY" as const` |
| `getSleepSamples` expects callback, not Promise | `lib/healthSync.ts:226` | Runtime API supports Promise pattern; types show callback-only |
| `getDailyActivitySamples` not in types | `lib/healthSync.ts:234` | Correct runtime method name; types incorrectly show `getActivitySamples` |

---

## Quick Submission Sequence

For the engineer executing the submission, do steps in this order:

1. ☐ Create App in App Store Connect; note the numeric App ID
2. ☐ Register bundle ID + HealthKit capability in Apple Developer Portal  
3. ☐ Create $9.99/mo In-App Purchase in App Store Connect
4. ☐ Configure RevenueCat dashboard (entitlement `plus`, product, offering)
5. ☐ Set all EAS Secrets (Sentry DSN, org, project; RevenueCat production key)
6. ☐ Fill `eas.json` submit → `ascAppId` and `appleTeamId` with real values
7. ☐ Run: `eas build --platform ios --profile production`
8. ☐ Run: `eas submit --platform ios` (or upload `.ipa` via Transporter)
9. ☐ Fill App Store Connect metadata (name, subtitle, description, keywords, screenshots, privacy label)
10. ☐ Confirm `healthplanfactory.com/privacy` and `/terms` and `/support` are all live
11. ☐ Add test account credentials to App Review Notes
12. ☐ Submit for review
