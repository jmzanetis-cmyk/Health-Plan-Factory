# Health Plan Factory — App Store Connect Metadata

> Copy these fields directly into App Store Connect when submitting.
> All fields are in English (en-US) for the initial release.

---

## App Identity

| Field | Value |
|---|---|
| **App Name** | Health Plan Factory |
| **Bundle ID** | com.healthplanfactory.mobile |
| **SKU** | HPF-IOS-2026 |
| **Primary Category** | Health & Fitness |
| **Secondary Category** | Lifestyle |

---

## Version Information (1.0.0)

### Subtitle *(30 chars max)*
```
Your Personal Wellness Editor
```
*(29 chars)*

### Promotional Text *(170 chars max — shown in App Store search results, changeable without a new build)*
```
Transform your health with an AI-powered plan built around your body's data. Nutrition, sleep, movement, and mindset — all optimized for you.
```
*(140 chars)*

### Description *(4,000 chars max)*

```
Health Plan Factory is a premium editorial wellness optimization platform that reads your real health data and builds a personalized plan — then coaches you through it, week by week.

Unlike generic fitness apps, Health Plan Factory combines deep biometric insights from Apple Health with expert-curated wellness protocols and AI guidance. The result is a plan that actually fits your life.

── WHAT'S INSIDE ──

PERSONALIZED WELLNESS PLAN
Every plan is built from your actual health data — steps, sleep quality, heart rate variability, active calories, and mindfulness sessions — surfaced from Apple Health and refined by our editorial wellness engine. Your plan evolves as you do.

DAILY WELLNESS SCORE
One clear number tells you how your body is performing today: a composite score built from sleep, movement, nutrition adherence, and recovery. Track your score over time and see real progress.

AI WELLNESS COACH
Chat with your private wellness coach 24/7. Ask anything — "How can I improve my sleep this week?", "What should I eat before a morning workout?", or "Why is my energy low today?" — and get personalized, data-backed answers.

HABIT TRACKING & JOURNAL
Log your daily habits and journal your progress. The journal uses sentiment analysis to surface patterns in your mood and energy so you can understand what's working.

DISCOVER PREMIUM PROTOCOLS
Browse our editorial library of evidence-based wellness programs: intermittent fasting guides, sleep optimization protocols, stress-reduction techniques, and nutrition frameworks — all curated by certified wellness professionals.

── WHO IT'S FOR ──

Health Plan Factory is designed for people who are serious about their wellness and want more than a step counter. Whether you're recovering from burnout, optimizing your performance, or simply building sustainable healthy habits, Health Plan Factory meets you where you are.

── APPLE HEALTH INTEGRATION ──

Health Plan Factory reads your steps, sleep sessions, active energy, and mindfulness minutes directly from Apple Health — no manual entry required. Your data stays on your device; we only use what you share to power your plan.

── SUBSCRIPTION ──

Health Plan Factory Plus unlocks the full plan engine, AI coaching, and the complete Discover library.
- Monthly subscription: $9.99/month
- Free tier includes: Daily wellness score, basic habit tracking, and journal
- Subscription auto-renews monthly. Cancel anytime in App Store settings.
- Payment is charged to your Apple ID account at confirmation of purchase.

── PRIVACY ──

Your health data belongs to you. We do not sell or share your personal or health data with third parties. See our Privacy Policy for full details.
```
*(~2,250 chars)*

---

## Keywords *(100 chars max, comma-separated)*

```
wellness,health plan,AI coach,habit tracker,sleep tracker,nutrition,biometrics,wellbeing,fitness
```
*(98 chars)*

---

## App Store URLs

| Field | Value |
|---|---|
| **Support URL** | https://healthplanfactory.com/support |
| **Marketing URL** | https://healthplanfactory.com |
| **Privacy Policy URL** | https://healthplanfactory.com/privacy |

---

## Age Rating

**12+** — App includes AI wellness coaching, mental health crisis resources (988/741741), and health journal content that Apple classifies as 12+ for health & wellness apps.

*Age rating questionnaire answers:*
- Unrestricted web access: No
- Gambling: No
- Contests: No
- Medical/health content: Yes (informational wellness guidance, mental health crisis resources — no clinical claims or diagnoses)

> **Note:** PRIVACY.md §4 documents the 12+ rationale in detail. Do NOT submit at 4+; App
> Review will push back due to AI coaching + mental health crisis resource content.

---

## Version Release Notes (What's New)

```
Welcome to Health Plan Factory 1.0 — your personal wellness editor.

• Personalized wellness plans built from your Apple Health data
• Daily wellness score powered by sleep, movement & recovery
• AI Wellness Coach available 24/7
• Habit tracking & mood journal with sentiment analysis
• Premium Discover library with evidence-based wellness protocols
```

---

## App Review Notes

*(Include in the "Notes for App Review" field in App Store Connect)*

```
Test account credentials:
  Email: reviewer@healthplanfactory.com
  Password: (provide before submission)

The app requires an active internet connection to sign in and load personalized content.

RevenueCat in-app purchases are used for the Health Plan Factory Plus subscription ($9.99/month). In the review build, the RevenueCat sandbox environment is active — use a Sandbox Apple ID to test purchases.

Apple Health permissions are requested on first launch after sign-in. The app gracefully degrades if Health access is denied; the wellness score will show limited data.

There is no unauthenticated access — the app requires sign-in to function beyond the login screen.
```

---

## Screenshot Caption Suggestions

*These captions can be added as overlay text on screenshots in App Store Connect:*

1. **Home** — "Your Daily Wellness Score — at a glance"
2. **Plan** — "A plan that evolves with you — week by week"
3. **Journal** — "Track mood, habits & energy — all in one place"
4. **Coach** — "Ask your AI coach anything — 24/7 guidance"

---

## Screenshot Files

Located in `assets/screenshots/` — ready to upload to App Store Connect:
- `screenshot-01-home.png` — Home Dashboard — 1284×2778px (6.5" iPhone)
- `screenshot-02-plan.png` — Personalized Plan — 1284×2778px (6.5" iPhone)
- `screenshot-03-journal.png` — Health Journal — 1284×2778px (6.5" iPhone)
- `screenshot-04-coach.png` — AI Coach Chat — 1284×2778px (6.5" iPhone)

*Screenshots are correctly sized for 6.5" Super Retina XDR (iPhone 14 Plus, 13 Pro Max, 12 Pro Max, 11 Pro Max). These also satisfy the 6.7" display class requirement.*

---

## Pre-Submission Checklist

- [ ] Replace placeholder RevenueCat iOS API key with production key
- [ ] Add App Store Connect reviewer test account credentials
- [ ] Verify bundle ID `com.healthplanfactory.mobile` matches Apple Developer Portal
- [ ] Run `eas build --platform ios --profile production` to generate the final IPA
- [ ] Submit via `eas submit --platform ios` or upload manually via Transporter
- [ ] Confirm RevenueCat dashboard: entitlement `plus`, monthly product $9.99, default offering attached
- [ ] Upload all 4 screenshots at 1284×2778px (scale if needed)
- [ ] Confirm Privacy Policy URL is live at healthplanfactory.com/privacy
- [ ] Confirm Support URL is live at healthplanfactory.com/support
