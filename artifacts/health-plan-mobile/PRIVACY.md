# Health Plan Factory — Privacy & Compliance Reference

> **Document purpose:** Internal reference for completing Apple App Privacy Nutrition Labels in
> App Store Connect, documenting HealthKit justifications, age rating, and compliance notes.
> Prepared for App Store submission of `com.healthplanfactory.mobile` v1.0.0.

---

## 1. App Privacy Nutrition Label

Apple requires every app to declare the data it collects, organized into three categories:
**Data Used to Track You**, **Data Linked to You**, and **Data Not Linked to You**.

### 1a. Data Used to Track You

> Data used to track the user across apps or websites owned by other companies.

**None.** Health Plan Factory does not use any data for third-party advertising, does not share
data with data brokers, and does not link user activity with third-party data for targeting
purposes. No advertising SDKs are integrated.

---

### 1b. Data Linked to You

> Data collected and linked to the user's identity.

| Apple Category | Apple Sub-type | Data Collected | Purpose |
|---|---|---|---|
| **Contact Info** | Email Address | Login email from authentication provider | Account authentication and communications |
| **Contact Info** | Name | First name and last name (optional, from profile) | Personalization and display |
| **Contact Info** | Phone Number | Optional, only if user enables SMS notifications | Notification delivery (SMS alerts) |
| **Health & Fitness** | Fitness | Daily step count, active energy burned minutes (from Apple Health / Google Fit) | Wellness score calculation, habit tracking |
| **Health & Fitness** | Sleep | Nightly sleep duration in minutes (from Apple Health / Google Fit) | Wellness score calculation |
| **Health & Fitness** | Other Health Data | Mindfulness session minutes (from Apple Health) | Wellness score calculation |
| **User Content** | Other User Content | Health journal entries (free text), mood scores, wellness reflections | Journal feature; stored server-side linked to user account |
| **User Content** | Other User Content | AI wellness coach conversation messages (user turns) | Coaching feature; messages stored as session data server-side |
| **Identifiers** | User ID | Internal platform user ID | Account operations, data association |
| **Purchases** | Purchase History | Subscription tier status (Explorer / Employer / Plus); managed via RevenueCat + Apple In-App Purchase | Subscription gating; purchase restoration |

---

### 1c. Data Not Linked to You

> Data collected that is not linked to user identity.

**None currently collected.** (Crash reporting via Sentry is planned for v1.1. Once added,
Diagnostics > Crash Data and Diagnostics > Performance Data will be declared here under
"Data Not Linked to You", using Sentry's anonymous device-level crash payloads.)

---

### 1d. Data NOT Collected

The following categories are **not collected** by Health Plan Factory:

- Location (precise or coarse)
- Browsing history or search history
- Sensitive data (racial/ethnic origin, political opinions, religion, sexual orientation)
- Financial info (payment card details are handled entirely by Apple/Stripe — never seen by the app)
- Messages (SMS, email, other message apps)
- Contacts, calendars, or reminders
- Camera or microphone audio/video
- Advertising identifiers (IDFA)
- Sensitive health conditions (diagnoses, prescriptions, lab results)

---

## 2. HealthKit Data Types & Justifications

The app requests **read-only** HealthKit access. It **never writes** to Apple Health.

### Permissions Requested

| HealthKit Type | Apple Identifier | Justification |
|---|---|---|
| Step Count | `HKQuantityTypeIdentifierStepCount` | Display daily steps on the Home dashboard and input to wellness score |
| Sleep Analysis | `HKCategoryTypeIdentifierSleepAnalysis` | Display nightly sleep duration on the Home dashboard and input to wellness score |
| Active Energy Burned | `HKQuantityTypeIdentifierActiveEnergyBurned` | Calculate active minutes for movement habit tracking |
| Mindful Session | `HKCategoryTypeIdentifierMindfulSession` | Track completed mindfulness practice for the mindfulness habit goal |

### Usage Strings (in `app.config.js`)

```
NSHealthShareUsageDescription:
  "Health Plan Factory reads your steps, sleep, active energy, and mindfulness sessions
   to update your wellness score and habit tracking."

NSHealthUpdateUsageDescription:
  "Health Plan Factory does not write data to Apple Health."

NSMotionUsageDescription:
  "Health Plan Factory uses motion data to count your steps and active minutes."
```

> **Note on NSHealthUpdateUsageDescription:** Apple requires this string to be present if the
> HealthKit entitlement is declared, even when the app requests no write permissions. The string
> correctly discloses that no writes occur.

> **Note on NSMotionUsageDescription:** Required by the `react-native-health` library, which
> internally uses CMPedometer to supplement HealthKit step data on some device configurations.

### Background Health Sync

The app registers a background fetch task (`HEALTH_SYNC_BACKGROUND`) via `expo-background-fetch`
that re-reads HealthKit data every ≥15 minutes when the user has connected Apple Health. This is
**not** a background location task. No location data is accessed in background or foreground.

---

## 3. Apple Required Reasons APIs (`ios.privacyManifests`)

Per Apple's 2024 privacy manifest requirement, the following required-reason API categories are
declared in `app.config.js → ios.privacyManifests`:

| API Category | Identifier | Reason Code | Justification |
|---|---|---|---|
| User Defaults | `NSPrivacyAccessedAPICategoryUserDefaults` | `CA92.1` | App uses `NSUserDefaults` / AsyncStorage to persist user preferences and app state (notification settings, theme, onboarding completion flag) |
| File Timestamp | `NSPrivacyAccessedAPICategoryFileTimestamp` | `C617.1` | Expo's asset bundler accesses file modification timestamps during app startup to validate the bundle cache |

> **Reason code reference:** Apple's exhaustive list is at
> https://developer.apple.com/documentation/bundleresources/privacy_manifest_files/describing_use_of_required_reason_api

---

## 4. Age Rating Recommendation

**Recommended age rating: 12+**

Rationale: Apple classifies health and wellness apps that provide personalized guidance,
mental health resources, or coaching as requiring a minimum 12+ rating. This app includes:

- AI wellness coaching with personalized habit and lifestyle recommendations
- Mental health crisis resources (988 Suicide & Crisis Lifeline, 741741 Crisis Text Line)
- Health journal entries that may contain sensitive personal content
- Wellness score and coaching framed around behaviour change and emotional wellbeing

These factors are consistent with apps Apple rates 12+ for "infrequent or mild mature or
suggestive themes" under the health/wellness category.

**Arguments for 4+** (if App Review questions 12+):
- No violent, sexual, or horror content of any kind
- No social networking or public user-generated content
- No unrestricted web access
- Coaching content is educational and informational, not clinical or diagnostic
- All mental health references are safety-first crisis resources, not content promoting
  self-harm or crisis scenarios

> **Submission guidance:** Submit with a 12+ selection. If Apple Review suggests raising
> to 17+ (which would be incorrect for this content profile), respond by clarifying the
> educational and wellness-only nature of the AI coach. Do not attempt to submit at 4+;
> reviewers familiar with health apps will likely push back.

---

## 5. HIPAA / Health Disclaimer

The app is a **wellness and habit tracking tool**, not a medical device or clinical platform.

### In-app disclosures (already implemented)

**Login screen** (`app/login.tsx`):
> "By continuing, you agree that all content is for informational purposes only and not medical advice."

**Settings screen** (`app/settings.tsx`) — Medical Disclaimer card:
> "HealthPlan Factory provides general wellness information for educational purposes only.
> Content on this app is not intended to be a substitute for professional medical advice,
> diagnosis, or treatment. Always seek the advice of your physician or other qualified health
> provider with any questions you may have regarding a medical condition."
>
> "If you are experiencing a medical emergency, call 911 immediately."
>
> "If you are in mental health crisis, call or text 988 (Suicide & Crisis Lifeline) or
> text HOME to 741741 (Crisis Text Line)."

### HIPAA applicability

Health Plan Factory is **not a covered entity** under HIPAA and does not act as a Business
Associate. The app collects wellness data that the user voluntarily provides; it does not
receive, process, or transmit Protected Health Information (PHI) from healthcare providers,
insurers, or clearinghouses. No HIPAA Business Associate Agreement (BAA) is required for the
app itself.

> **If employer plans are added:** Employer group benefit plans are covered entities. If
> employer data is processed, a legal review and potential BAA with the employer will be
> required before that feature ships.

---

## 6. Data Retention & Deletion

| Data Type | Retention | Deletion |
|---|---|---|
| Account & profile | Until account deletion | Available via support request |
| Health metrics (synced from HealthKit) | 90 days server-side rolling window | Deleted on account deletion |
| Journal entries & mood logs | Until account deletion | Available via support request |
| AI coach conversation sessions | 30 days rolling window | Deleted on account deletion |
| SecureStore (auth token, health connection state) | Cleared on logout or app uninstall | Automatic |
| RevenueCat purchase records | Per RevenueCat's policy | Per RevenueCat's policy |

---

## 7. Privacy Policy & Terms of Service URLs

| Document | URL | Last Verified | Owner |
|---|---|---|---|
| Privacy Policy | https://healthplanfactory.com/privacy | — (not yet live — must publish before submission) | Content / Legal team |
| Terms of Service | https://healthplanfactory.com/terms | — (not yet live — must publish before submission) | Content / Legal team |
| Support | support@healthplanfactory.com | — | Engineering / Support team |

> **Pre-submission action required:** Verify that both URLs resolve to live, published pages
> before submitting to App Review. App Review will visit these URLs. Placeholder or 404 pages
> will result in rejection. Update the "Last Verified" column above with the date and the name
> of the person who confirmed the pages are live.

---

## 8. App Store Connect — Privacy Label Entry Checklist

When entering labels in App Store Connect → App Privacy:

- [ ] **Data Used to Track You** → Select "We do not collect data used to track users"
- [ ] **Contact Info → Email Address** → Linked to You → App Functionality
- [ ] **Contact Info → Name** → Linked to You → App Functionality
- [ ] **Contact Info → Phone Number** → Linked to You → Other Purposes (optional, only for users who enable SMS) — Note: select "Optional" and explain it is only collected if the user enables SMS notifications
- [ ] **Health & Fitness → Fitness** → Linked to You → App Functionality
- [ ] **Health & Fitness → Sleep** → Linked to You → App Functionality
- [ ] **Health & Fitness → Other Health Data** → Linked to You → App Functionality
- [ ] **User Content → Other User Content** → Linked to You → App Functionality
- [ ] **Identifiers → User ID** → Linked to You → App Functionality
- [ ] **Purchases → Purchase History** → Linked to You → App Functionality
- [ ] **Diagnostics** → Select "We do not collect diagnostics data" (until Sentry is added in v1.1)
