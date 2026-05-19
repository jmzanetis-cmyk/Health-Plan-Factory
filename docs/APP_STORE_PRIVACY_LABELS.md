# Health Plan Factory — App Store Privacy Nutrition Labels

Generated 2026-05-19. Based on schema audit (`lib/db/src/schema/`), Privacy.tsx,
API routes, and mobile app analytics setup.

Apple requires these to be submitted via App Store Connect → App Privacy.
Reference: https://developer.apple.com/app-store/app-privacy-details/

---

## Analytics & Tracking Summary

**Third-party tracking:** NONE. HPF does not use ad networks, cross-app tracking,
or fingerprinting. The only third-party data processor is Sentry (crash reporting),
which is configured with `enabled: !__DEV__ && !!process.env.EXPO_PUBLIC_SENTRY_DSN`.

**Third-party SDKs in mobile app:** Sentry (crash/error reporting) only.
No PostHog, Mixpanel, Amplitude, Firebase, or ad SDKs detected.

---

## Data Inventory

| Data Type | What We Collect | Apple Category | Linked to User | Used for Tracking | Purpose |
|---|---|---|---|---|---|
| Name | `users.first_name`, `users.last_name`, `profiles.display_name` | **Contact Info** | Yes | No | App Functionality |
| Email address | `users.email`, `profiles.email` | **Contact Info** | Yes | No | App Functionality, Account management |
| Phone number | `profiles.phone` (optional) | **Contact Info** | Yes | No | App Functionality (SMS notifications, optional) |
| Health goals | `member_intakes.goals` (jsonb) | **Health & Fitness** | Yes | No | App Functionality (plan generation) |
| Health conditions | `member_intakes.conditions` (jsonb) | **Health & Fitness** | Yes | No | App Functionality (plan generation) |
| Session logs & journals | `plan_progress_logs` (mood, pain, energy, notes) | **Health & Fitness** | Yes | No | App Functionality (progress tracking, insights) |
| Wellness score | `insights_cache.wellness_score` | **Health & Fitness** | Yes | No | App Functionality (insights) |
| Purchase history | Stripe subscription data (`profiles.subscription_status`) | **Purchases** | Yes | No | App Functionality (subscription state) |
| Payment info | Processed by Stripe (HPF never stores raw card data) | **Financial Info** | Yes | No | App Functionality — **NOT stored by HPF** |
| Location (zip code) | `member_intakes.zip_code`, `member_intakes.radius` | **Location** | Yes | No | App Functionality (provider matching) |
| User-generated content | `plan_progress_logs.note`, coach messages in `coach_sessions.messages` | **User Content** | Yes | No | App Functionality |
| Identifiers | Auth provider user ID (`profiles.id`), `profiles.referral_code` | **Identifiers** | Yes | No | App Functionality |
| Usage data | Session dates, coach interaction timestamps | **Usage Data** | Yes | No | App Functionality (insights) |
| Diagnostics | Sentry crash reports (device model, OS version, stack trace) | **Diagnostics** | No* | No | Analytics (crash reporting) |
| Budget | `member_intakes.budget` | **Financial Info** | Yes | No | App Functionality (plan generation) |
| Wellness preferences | `member_intakes.preferences`, `member_intakes.exclusions` | **Health & Fitness** | Yes | No | App Functionality |
| Provider favorites | `favorites` table (provider_id + profile_id) | **Usage Data** | Yes | No | App Functionality |
| Booking requests | `booking_requests` (member_id, provider_id, message) | **User Content** | Yes | No | App Functionality |
| Language preference | `profiles.language` | **Other Data** | Yes | No | App Functionality (localization) |
| Referral relationships | `referrals` (referrer_id, referred_member_id, code) | **Identifiers** | Yes | No | App Functionality |

*Sentry crash reports are linked to a Sentry-generated device ID, not the user's profile ID. Configure Sentry to strip PII before submission.

---

## Apple Privacy Category Mapping

### Data Used to Track You
**None.** HPF does not track users across apps or websites owned by other companies.
Select "No" for all tracking questions in App Store Connect.

### Data Linked to You

| Apple Category | Data Types Collected |
|---|---|
| **Contact Info** | Name, email address, phone number |
| **Health & Fitness** | Health goals, conditions, preferences, session logs, mood/pain/energy ratings, wellness score, budget |
| **Financial Info** | Wellness budget (for planning only — no financial account data), subscription status |
| **Location** | Zip code and search radius (coarse — no GPS coordinates collected) |
| **User Content** | Journal entries, coach conversation messages, booking messages |
| **Identifiers** | User ID, referral code |
| **Purchases** | Subscription purchase history |
| **Usage Data** | Session timestamps, feature usage patterns |

### Data Not Linked to You

| Apple Category | Data Types Collected |
|---|---|
| **Diagnostics** | Crash logs and error reports via Sentry (device model, OS, stack trace — no PII if configured correctly) |

### Categories With No Data Collected

- Browsing History
- Search History
- Sensitive Info (beyond health conditions, which is in Health & Fitness)
- Contacts
- Other Data (except language preference — minor)

---

## Gaps Found vs. Privacy.tsx

The following data is collected but **not clearly disclosed in Privacy.tsx**:

| Data | Gap |
|---|---|
| `profiles.phone` | Privacy.tsx doesn't mention phone number collection |
| `profiles.language` | Not mentioned (minor — not sensitive) |
| `profiles.communication_prefs` | Not mentioned — users should know they can opt out of email/SMS |
| `referrals` table | Referral relationships (who referred whom) not mentioned |
| `booking_requests.message` | User message content sent to providers not mentioned |
| Sentry diagnostics | Should be explicitly mentioned with opt-out path if possible |

**Recommendation:** Before submission, add a "Data we collect" section to Privacy.tsx covering phone (optional), referral data, booking messages, and Sentry crash reporting. These are pre-submission gaps that could trigger Apple rejection under guideline 5.1.1.

---

## App Store Connect Entry Instructions

1. Go to App Store Connect → Your App → App Privacy
2. Click "Get Started" under "Data Types"
3. For each category above marked "Data Linked to You": select the category, mark as "Collected", linked to identity = Yes, tracking = No, purpose = App Functionality
4. For Diagnostics: select, mark collected, linked = No, tracking = No, purpose = Analytics
5. For all other categories: mark "Not Collected"
6. Review and submit — this section can be updated after submission without a new app version
