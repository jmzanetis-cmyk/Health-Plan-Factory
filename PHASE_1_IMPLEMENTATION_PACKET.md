# Health Plan Factory — Phase 1 Implementation Packet

**Strategy:** Option C — Web-paid Plus subscription, mobile as logged-in companion
**Duration:** Weeks 1–2 (May 17 → May 31, 2026)
**Audience:** Replit Agent, Claude Code, or you executing manually

---

## How to Use This Packet

Each section below is **self-contained and idempotent**. You can hand any section to Replit Agent with the instruction "execute this section exactly" and it will work.

**Order matters for some sections, not others.** Section dependencies are called out at the top of each. When in doubt, go top-to-bottom.

**Before starting:**
- Branch the repo: `git checkout -b phase-1-option-c`
- Confirm clean working tree
- Have access to: Replit deployment dashboard, Cloudflare DNS, EAS CLI, Stripe dashboard, App Store Connect

---

## Section 1: Critical Security Hardening

**Why first:** These are the changes most likely to prevent a $5K Anthropic bill or a Stripe abuse incident. Ship before anything else.

**Files touched:**
- `artifacts/api-server/package.json`
- `artifacts/api-server/src/app.ts`
- `artifacts/api-server/src/middlewares/rateLimit.ts` (new)
- `artifacts/api-server/src/routes/coach.ts`
- `artifacts/api-server/src/routes/magicLinks.ts`
- `artifacts/api-server/src/routes/demoRequests.ts`
- `artifacts/api-server/src/routes/auth.ts`
- `artifacts/api-server/src/routes/intakes.ts`
- `artifacts/api-server/src/routes/plans.ts`
- `artifacts/api-server/src/routes/health.ts`

### 1.1 Install dependencies

```bash
cd artifacts/api-server
pnpm add express-rate-limit helmet
```

### 1.2 Create rate limit middleware

**New file:** `artifacts/api-server/src/middlewares/rateLimit.ts`

```typescript
import rateLimit from "express-rate-limit";

// Tight limits for AI/email/payment endpoints — these cost real money on abuse.
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,              // 5 requests per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please wait a moment before trying again." },
  // Skip rate limiting in test environment
  skip: () => process.env.NODE_ENV === "test",
});

// Standard limits for authenticated write endpoints.
export const moderateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." },
  skip: () => process.env.NODE_ENV === "test",
});

// Generous limits for read endpoints.
export const readLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === "test",
});

// Per-user rate limiter for authenticated AI endpoints — uses user ID as key when available.
// This prevents one user from rate-limiting all users behind the same IP (corporate NAT, mobile carrier).
export const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Prefer user ID for authenticated requests, fall back to IP
    if (req.isAuthenticated && req.isAuthenticated()) {
      return `user:${req.user!.id}`;
    }
    return req.ip ?? "unknown";
  },
  message: { error: "Too many AI requests. Please wait a moment." },
  skip: () => process.env.NODE_ENV === "test",
});
```

### 1.3 Update app.ts — Add helmet, tighten CORS, wire global limits

**File:** `artifacts/api-server/src/app.ts`

**Replace the entire file with:**

```typescript
import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { authMiddleware } from "./middlewares/authMiddleware";
import { testAuthMiddleware } from "./middlewares/testAuthMiddleware";
import { readLimiter } from "./middlewares/rateLimit";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Trust the first proxy hop (Replit / Cloudflare) so req.ip reflects the real client IP.
// Required for rate limiting to work correctly behind a proxy.
app.set("trust proxy", 1);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Security headers. contentSecurityPolicy is disabled here because the API serves JSON only;
// a CSP for the web app belongs in Netlify config (see Section 4).
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// CORS — locked down to known origins. Add new origins via ALLOWED_ORIGINS env var (comma-separated).
const allowedOrigins = [
  "https://healthplanfactory.com",
  "https://www.healthplanfactory.com",
  "https://staging.healthplanfactory.com",
  // Mobile app uses native fetch — no Origin header — so CORS doesn't apply there.
  // Add localhost for dev:
  ...(process.env.NODE_ENV !== "production"
    ? ["http://localhost:5173", "http://localhost:3000", "http://localhost:8081"]
    : []),
  ...(process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
];

app.use(
  cors({
    credentials: true,
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      logger.warn({ origin }, "CORS rejected origin");
      return callback(new Error("Not allowed by CORS"));
    },
  }),
);

app.use(cookieParser());

// Raw body required for Stripe webhook signature verification — must come before express.json()
app.use(
  "/api/employer/billing/webhook",
  express.raw({ type: "application/json" })
);
app.use(
  "/api/providers/stripe-webhook",
  express.raw({ type: "application/json" })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === "test") {
  app.use(testAuthMiddleware);
}
app.use(authMiddleware);

// Global baseline rate limit — applies to all /api routes.
// Individual routes can add stricter limits on top of this.
app.use("/api", readLimiter);

// Health check — must be registered before the main router so it responds
// even if auth middleware or DB isn't fully ready.
app.get("/api/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api", router);

export default app;
```

### 1.4 Apply stricter limits to expensive endpoints

**File:** `artifacts/api-server/src/routes/coach.ts`

At the top of the file, after the `const router = Router();` line, add:

```typescript
import { aiLimiter } from "../middlewares/rateLimit";

// Apply AI rate limiter to all coach endpoints (per-user, 10/min)
router.use(aiLimiter);
```

**File:** `artifacts/api-server/src/routes/magicLinks.ts`

At the top of the file, after the router import, add:

```typescript
import { strictLimiter } from "../middlewares/rateLimit";

// Magic link requests are an email-sending endpoint — strict limit to prevent abuse
router.use(strictLimiter);
```

**File:** `artifacts/api-server/src/routes/demoRequests.ts`

At the top, after the router declaration:

```typescript
import { strictLimiter } from "../middlewares/rateLimit";

// Demo requests trigger admin emails — strict limit
router.use(strictLimiter);
```

**File:** `artifacts/api-server/src/routes/auth.ts`

After the router declaration:

```typescript
import { strictLimiter, moderateLimiter } from "../middlewares/rateLimit";

// Login/signup attempts — strict to prevent credential stuffing.
// Apply to specific routes rather than router-wide since auth has many GET endpoints.
router.use("/auth/login", strictLimiter);
router.use("/auth/signup", strictLimiter);
router.use("/auth/github", moderateLimiter);
router.use("/auth/callback", moderateLimiter);
```

**File:** `artifacts/api-server/src/routes/plans.ts`

After the router declaration:

```typescript
import { moderateLimiter } from "../middlewares/rateLimit";

// Plan generation is expensive (DB-heavy) — moderate limit per user
router.use("/plans/generate", moderateLimiter);
```

**File:** `artifacts/api-server/src/routes/intakes.ts`

After the router declaration:

```typescript
import { moderateLimiter } from "../middlewares/rateLimit";

router.use(moderateLimiter);
```

### 1.5 Add admin auth to `/api/healthz/config`

**File:** `artifacts/api-server/src/routes/health.ts`

Find the `/healthz/config` route and replace it with:

```typescript
router.get("/healthz/config", (req, res) => {
  // Require admin auth — this endpoint reveals which integrations are configured,
  // which is useful operational info but also useful to an attacker.
  if (!req.isAuthenticated() || req.user?.role !== "admin") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const stripeMode = process.env.STRIPE_SECRET_KEY
    ? process.env.STRIPE_SECRET_KEY.startsWith("sk_live_") ? "live" : "test"
    : "unconfigured";

  res.json({
    stripe: {
      configured: !!process.env.STRIPE_SECRET_KEY,
      mode: stripeMode,
      webhookConfigured: !!process.env.STRIPE_WEBHOOK_SECRET,
    },
    email: {
      configured: !!process.env.RESEND_API_KEY,
      provider: process.env.RESEND_API_KEY ? "resend" : "none",
    },
    ai: {
      anthropicConfigured: !!process.env.ANTHROPIC_API_KEY,
    },
    db: {
      configured: !!process.env.DATABASE_URL,
    },
  });
});
```

**Note:** Replace `req.user?.role !== "admin"` with whatever your actual admin check pattern is in this codebase. Check `artifacts/api-server/src/routes/admin.ts` for the existing pattern and match it exactly.

### 1.6 Verify Section 1

Run from repo root:

```bash
pnpm --filter @workspace/api-server typecheck
pnpm --filter @workspace/api-server test
```

Manual smoke test:

```bash
# Should return 200
curl http://localhost:3000/api/healthz

# Should return 404 (admin-only now)
curl http://localhost:3000/api/healthz/config

# Should rate-limit after 5 requests in a minute
for i in {1..10}; do curl -X POST http://localhost:3000/api/magicLinks; done
```

---

## Section 2: API Subdomain Setup

**Why:** Mobile app currently falls back to `healthplanfactory.com` (Netlify frontend) for API calls. They'll all 404. Must fix before TestFlight.

**Dependencies:** None. Run in parallel with Section 1.

### 2.1 Configure Cloudflare DNS

In Cloudflare dashboard for `healthplanfactory.com`:

1. DNS → Add record
2. Type: `CNAME`
3. Name: `api`
4. Target: your Replit deployment URL (e.g. `your-deployment.replit.app`)
5. Proxy status: **DNS only** (gray cloud) initially. Switch to Proxied (orange cloud) only after verifying SSL works end-to-end.
6. TTL: Auto

**Wait 2–5 minutes for propagation. Verify with:**

```bash
dig api.healthplanfactory.com
# Should return your Replit deployment hostname
```

### 2.2 Configure Replit Custom Domain

In Replit dashboard → your deployment → Settings → Custom Domains:

1. Add domain: `api.healthplanfactory.com`
2. Replit will provide a TXT record for ownership verification — add it to Cloudflare DNS
3. Wait for verification (usually <5 min)
4. Replit auto-provisions a Let's Encrypt SSL certificate

**Verify with:**

```bash
curl -I https://api.healthplanfactory.com/api/healthz
# Should return 200 with valid SSL
```

### 2.3 Update Mobile App API Base

```bash
# From repo root
cd artifacts/health-plan-mobile

# Update EAS secret
npx eas-cli secret:create --scope project --name EXPO_PUBLIC_API_URL --value https://api.healthplanfactory.com --force

# Verify
npx eas-cli secret:list
```

### 2.4 Update Server CORS Allowlist

Already done in Section 1.3 — `api.healthplanfactory.com` doesn't need to be in CORS allowlist because it's the API itself, not an origin. The web app origin (`healthplanfactory.com`) is already in the list.

### 2.5 Rebuild Mobile

```bash
cd artifacts/health-plan-mobile
npx eas-cli build --platform ios --profile production --non-interactive
```

While the build runs, proceed to Section 3.

---

## Section 3: Marketing-Code Alignment (Option C)

**Why:** Landing page still markets pay-per-reveal ($3–8 unlocks). Code returns 410 Gone on that endpoint. New users will be confused or angry. Must align.

**Dependencies:** None. Run in parallel.

**Files touched:**
- `artifacts/health-plan-factory/src/pages/Landing.tsx`
- `artifacts/health-plan-factory/src/pages/Pricing.tsx`
- `artifacts/health-plan-factory/src/pages/HowItWorks.tsx`
- `artifacts/health-plan-factory/src/pages/FAQ.tsx`
- `artifacts/health-plan-factory/src/locales/en.json`
- `artifacts/health-plan-factory/src/locales/es.json`
- `artifacts/health-plan-mobile/locales/en.json`
- `docs/business-plan.md`

### 3.1 Find all instances of pay-per-reveal copy

Run from repo root:

```bash
# Find every reference to the old reveal/unlock pricing
grep -rn -E "\\\$3[–\\-]\\\$?8|unlock fees|pay.{0,3}per.{0,3}reveal|per reveal" \
  artifacts/health-plan-factory/src/ \
  artifacts/health-plan-mobile/ \
  docs/ \
  2>/dev/null | grep -v node_modules > /tmp/reveal_audit.txt

cat /tmp/reveal_audit.txt
```

This will print every file and line that needs updating. The list below is what I found in this audit; if grep finds more, update those too using the same pattern.

### 3.2 Landing.tsx — FAQ Section

**File:** `artifacts/health-plan-factory/src/pages/Landing.tsx`

**Find this string (around line 47):**

> Building your initial plan is completely free. You pay unlock fees ($3–$8) only when you want to view a specific provider's contact information. A Plus membership ($9.99/month) unlocks unlimited reveals, journaling, routine building, and the AI accountability coach.

**Replace with:**

> Building your initial plan is completely free. You can browse all matched providers and modalities, and a Plus membership ($9.99/month or $99/year) unlocks provider contact details, the AI accountability coach, journaling, routine building, progress tracking, and unlimited plan revisions. No per-reveal fees, no surprises — one subscription covers everything.

**Find this string (around line 82):**

> The full factory experience — unlimited reveals, coaching, and tracking.

**Replace with:**

> The full factory experience — provider details, AI coaching, journaling, and progress tracking.

**Find this string (around line 85):**

> Unlimited provider reveals

**Replace with:**

> Full provider contact details

**Find this string (around line 1069):**

> Provider unlocks: $5 wellness · $8 physician · $3 app-based · Plus members pay $0 per reveal

**Replace with:**

> Plus members get full provider access — contact details, booking, and direct messaging — for one flat monthly or annual fee.

### 3.3 Pricing.tsx — Restructure

**File:** `artifacts/health-plan-factory/src/pages/Pricing.tsx`

I haven't read this file end-to-end. Open it and ensure the pricing structure is:

**Free tier:**
- 7-step health intake
- Personalized wellness plan
- Modality recommendations with evidence grades
- Provider list view (no contact details)
- Basic HSA/FSA eligibility flags

**Plus — $9.99/month or $99/year (17% savings):**
- Everything in Free, plus:
- Full provider contact details and booking
- AI accountability coach
- Daily journaling
- Routine builder
- Progress tracking with insights
- HSA/FSA spending log with LMN workflow
- Direct provider messaging
- Unlimited plan revisions

**Employer — $6–8 per seat/month:**
- All Plus features for every employee
- Admin dashboard with K-anonymized aggregate insights
- Wellness ROI reporting
- Branded PDF exports
- Custom onboarding support

**Remove all references to:**
- Per-reveal pricing ($3, $5, $8)
- "Pay only for what you use"
- "Unlock fees"

### 3.4 HowItWorks.tsx — Step 4

**File:** `artifacts/health-plan-factory/src/pages/HowItWorks.tsx`

Read the file. Find step 3 or 4 (whichever describes provider access) and ensure it reads something like:

> **Step 4 — Connect with Providers.** When you're ready, upgrade to Plus to see full provider contact details, request bookings directly, and message providers about your specific needs. Your plan, your providers, your timeline.

### 3.5 FAQ.tsx — Question on Pricing

**File:** `artifacts/health-plan-factory/src/pages/FAQ.tsx`

Search for any FAQ that mentions "unlock fee," "$3," "$5," "$8," or "pay per reveal." Replace with:

> **Q: How much does Health Plan Factory cost?**
>
> A: Generating your personalized wellness plan is free. To unlock provider contact details, the AI coach, journaling, and progress tracking, Plus is $9.99/month or $99/year. Employers can offer Plus to their team for $6–8 per employee per month. There are no per-use fees, no hidden charges.

### 3.6 Locale Files — EN and ES

**File:** `artifacts/health-plan-factory/src/locales/en.json`

Run:

```bash
cd artifacts/health-plan-factory/src/locales
grep -n -E "reveal|unlock fee|\\\$3|\\\$5|\\\$8" en.json
```

For each match, update the value. The keys to look for are typically in namespaces: `landing`, `pricing`, `howItWorks`, `faq`, `coach`, `plan`.

**File:** `artifacts/health-plan-factory/src/locales/es.json`

Same process. Translation of new copy:

> Free Spanish: *Generar tu plan personalizado es gratis. Para desbloquear los detalles de contacto del proveedor, el coach de IA, el diario y el seguimiento del progreso, Plus cuesta $9.99/mes o $99/año.*

(Have a native speaker review before deploying.)

**File:** `artifacts/health-plan-mobile/locales/en.json`

Same audit. Mobile locale likely uses subset of web keys.

### 3.7 Business Plan

**File:** `docs/business-plan.md`

Find the executive summary (around line 30) which describes pay-per-reveal. Replace the pricing paragraph with:

> **The product** is free to start. Members complete a short intake (budget, goals, conditions, preferences) and receive a prioritized, costed wellness plan built by a rule-based AI engine with clinical evidence backing. They can browse matched providers for free. A Plus subscription ($9.99/month or $99/year) unlocks provider contact details, the AI accountability coach, daily journaling, routine and progress tracking, HSA/FSA spending logs with LMN workflows, and direct provider messaging — everything they need to execute their plan.

Find Section 4 (Business Model & Pricing) and rewrite it with the three-tier structure from Section 3.3 above. Add a note:

> **Note on pay-per-reveal:** Earlier product iterations included a $3–8 per-provider unlock fee. This was simplified to a single Plus subscription in Q2 2026 to reduce decision friction, improve conversion, and provide more predictable recurring revenue. Per-reveal pricing remains a potential future feature for international markets and price-sensitive segments but is not part of the current product.

### 3.8 Annual Subscription Stripe Setup

In Stripe Dashboard:

1. Products → Add product
2. Name: "Health Plan Factory Plus — Annual"
3. Pricing: $99.00 / year, recurring
4. Save → copy the new Price ID (`price_xxx`)

Update environment variables (Replit, Netlify, EAS):

```
STRIPE_PRICE_PLUS_MONTHLY=price_xxx_existing
STRIPE_PRICE_PLUS_ANNUAL=price_xxx_new
```

Then update `artifacts/api-server/src/routes/providers.ts` checkout session creation to accept a `billingPeriod: "monthly" | "annual"` parameter and use the appropriate price ID. (This is a separate small ticket — flagged in Section 8.)

---

## Section 4: Apple-Compliant Mobile Paywall

**Why:** Option C requires the mobile app to gate Plus features without violating Apple's anti-steering rules.

**Dependencies:** Section 3 (so paywall copy matches landing).

**Files touched:**
- `artifacts/health-plan-mobile/components/PlusPaywall.tsx` (new)
- `artifacts/health-plan-mobile/lib/subscription.ts` (new or update)
- `artifacts/health-plan-mobile/app/(tabs)/coach.tsx`
- `artifacts/health-plan-mobile/app/(tabs)/journal.tsx`
- `artifacts/health-plan-mobile/app/(tabs)/accountability.tsx`
- `artifacts/health-plan-mobile/app/(tabs)/discover.tsx` (provider contact reveals)

### 4.1 Create PlusPaywall component

**New file:** `artifacts/health-plan-mobile/components/PlusPaywall.tsx`

```typescript
import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";

interface Props {
  feature: "coach" | "journal" | "accountability" | "provider_details" | "messaging";
}

const FEATURE_DESCRIPTIONS: Record<Props["feature"], string> = {
  coach: "Get personalized accountability and answers from your AI wellness coach.",
  journal: "Track how you feel and what works with daily journaling.",
  accountability: "Build habits with streak tracking and progress insights.",
  provider_details: "See full contact details and book sessions directly.",
  messaging: "Message your providers directly through the app.",
};

/**
 * Plus paywall for mobile features.
 *
 * APPLE COMPLIANCE NOTES:
 * - We do NOT show pricing in-app (Apple's anti-steering rules around external payment)
 * - We do NOT include a "Subscribe on web" button or URL
 * - We DO allow users to log in with an existing Plus subscription
 * - We MAY include a single "Manage account" link per the post-Epic ruling (commented out below)
 *
 * The conversion happens on web. Users who download the mobile app and hit this paywall
 * either already have Plus (sign in) or will go to web through other channels (email, ads, SEO).
 */
export function PlusPaywall({ feature }: Props) {
  const router = useRouter();
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Plus Feature</Text>
        <Text style={styles.description}>{FEATURE_DESCRIPTIONS[feature]}</Text>
        <Text style={styles.subtext}>
          Sign in to your Plus account to continue.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.push("/login")}
        >
          <Text style={styles.buttonText}>Sign In</Text>
        </Pressable>

        {/* Per Apple's anti-steering ruling (Epic v. Apple, Jan 2024), apps may include
            a single link to their website for account management. Uncomment if needed.
            Do NOT use this link to direct users to subscribe. */}
        {/*
        <Pressable onPress={() => Linking.openURL("https://healthplanfactory.com/account")}>
          <Text style={styles.link}>Manage account on the web</Text>
        </Pressable>
        */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#FAF8F3", // warm white from brand tokens
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#1A2E4A", // navy
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  title: {
    fontFamily: "CormorantGaramond_700Bold",
    fontSize: 28,
    color: "#1A2E4A",
    marginBottom: 12,
  },
  description: {
    fontFamily: "Outfit_400Regular",
    fontSize: 16,
    color: "#2C3E50",
    lineHeight: 24,
    marginBottom: 16,
  },
  subtext: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: "#7A8B99",
    marginBottom: 24,
  },
  button: {
    backgroundColor: "#1A2E4A",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  buttonText: {
    fontFamily: "Outfit_600SemiBold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  link: {
    fontFamily: "Outfit_400Regular",
    fontSize: 14,
    color: "#1A2E4A",
    textAlign: "center",
    marginTop: 16,
    textDecorationLine: "underline",
  },
});
```

### 4.2 Subscription state hook

**Check first whether this already exists:** `artifacts/health-plan-mobile/lib/revenuecat.ts` may already handle this. If `useSubscription()` returns an `isPlus` boolean, use it. If not, create:

**New file:** `artifacts/health-plan-mobile/lib/subscription.ts`

```typescript
import { useSubscription as useRevenueCatSub } from "./revenuecat";
import { useAuth } from "./auth";

/**
 * Returns whether the current user has Plus access.
 *
 * Plus access can come from:
 * 1. A web-purchased Stripe subscription (subscriptionStatus on profile)
 * 2. An employer-provided seat (subscriptionStatus === "employer")
 * 3. A RevenueCat in-app subscription (future — currently unused per Option C)
 *
 * For Option C, we rely entirely on (1) and (2). RevenueCat is plumbed but inactive.
 */
export function usePlusAccess(): { isPlus: boolean; loading: boolean } {
  const { user, isLoading: authLoading } = useAuth();
  const { customerInfo, isLoading: rcLoading } = useRevenueCatSub();

  const fromProfile =
    user?.subscriptionStatus === "plus" || user?.subscriptionStatus === "employer";

  // RevenueCat check kept for future use — currently always false in Option C
  const fromRevenueCat = !!customerInfo?.entitlements.active["plus"];

  return {
    isPlus: fromProfile || fromRevenueCat,
    loading: authLoading || rcLoading,
  };
}
```

### 4.3 Gate the Plus-only tabs

**File:** `artifacts/health-plan-mobile/app/(tabs)/coach.tsx`

At the top of the component, after auth checks:

```typescript
import { PlusPaywall } from "@/components/PlusPaywall";
import { usePlusAccess } from "@/lib/subscription";

export default function CoachScreen() {
  const { isPlus, loading } = usePlusAccess();

  if (loading) return <LoadingScreen />; // your existing loading component
  if (!isPlus) return <PlusPaywall feature="coach" />;

  // ... existing coach UI
}
```

Repeat the same pattern for `journal.tsx` and `accountability.tsx`, changing the `feature` prop accordingly.

### 4.4 Gate provider contact details on Discover tab

**File:** `artifacts/health-plan-mobile/app/(tabs)/discover.tsx`

Don't paywall the whole screen — let free users see the provider list (name, modality, distance, rating). Gate only:
- Phone number
- Email
- Booking button
- Address details

Wrap those specific UI elements in:

```typescript
const { isPlus } = usePlusAccess();

// In JSX where contact details would render:
{isPlus ? (
  <ContactDetails provider={provider} />
) : (
  <Pressable onPress={() => /* navigate to login or show inline paywall */}>
    <Text style={styles.lockedHint}>Sign in with Plus to see contact details</Text>
  </Pressable>
)}
```

### 4.5 What this does NOT do

- ❌ Show pricing on mobile (Apple violation)
- ❌ Link to web subscribe page (Apple violation)
- ❌ Initiate Stripe Checkout from mobile (Apple violation)

If a user demands to know how to get Plus, they have to go to your website. That's by design. Marketing/email/SEO drives them there.

---

## Section 5: Verify Web App Production Status

**Why:** Audit found 403 on `healthplanfactory.com`. Could be Cloudflare WAF blocking my IP, could be a real problem.

**Dependencies:** None.

### 5.1 Investigate

From your browser (not from Replit/this packet):

1. Visit `https://healthplanfactory.com` — does it load?
2. Visit `https://healthplanfactory.com` in an incognito window — does it load?
3. From a different network (mobile data) — does it load?

### 5.2 If site loads for you but external requests get 403

Likely Cloudflare WAF rules blocking automated traffic. To allow legitimate bots (Apple reviewer, Google, Stripe):

1. Cloudflare → Security → WAF → Custom rules
2. Allow rule for: `cf.client.bot` (skip challenge)
3. Allow rule for User-Agent contains: `AppleBot`, `Stripe`, `Googlebot`, `Bingbot`
4. Review "Under Attack Mode" — should be OFF unless you're being actively attacked

### 5.3 If site doesn't load at all

Different problem. Check:
- Netlify build status (is the latest deploy live?)
- DNS for `healthplanfactory.com` and `www.healthplanfactory.com` both point to Netlify
- SSL cert is valid (Netlify auto-renews; sometimes fails)

### 5.4 Add CSP via Netlify

**File:** `netlify.toml`

After the existing `[build]` block, add:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Strict-Transport-Security = "max-age=31536000; includeSubDomains; preload"
    X-Frame-Options = "SAMEORIGIN"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(self), microphone=(), camera=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://maps.googleapis.com https://*.posthog.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: https: blob:; connect-src 'self' https://api.healthplanfactory.com https://*.supabase.co https://api.stripe.com https://*.posthog.com https://maps.googleapis.com; frame-src https://js.stripe.com https://hooks.stripe.com; object-src 'none'; base-uri 'self'; form-action 'self';"
```

**Note:** Test CSP carefully. If anything breaks (a third-party script you forgot), CSP will block it silently. Use Chrome DevTools Console to find CSP violations after deploying.

---

## Section 6: Stripe Webhook Idempotency Audit

**Why:** Signature verification is in place (good), but I didn't verify idempotency handling. Replayed webhooks could double-grant Plus subscriptions.

**Dependencies:** None.

### 6.1 Audit current handlers

```bash
cd /path/to/repo
sed -n '480,560p' artifacts/api-server/src/routes/providers.ts
sed -n '980,1050p' artifacts/api-server/src/routes/employers.ts
```

Look for these patterns:

- ✅ Good: `event.id` is checked against a `processed_webhooks` table or similar
- ❌ Bad: Handler does work (e.g., `set({ subscriptionStatus: "plus" })`) on every call without idempotency check

### 6.2 Add idempotency if missing

If missing, add a migration:

**New file:** `lib/db/migrations/0014_webhook_idempotency.sql`

```sql
CREATE TABLE IF NOT EXISTS processed_webhooks (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  payload JSONB
);

CREATE INDEX IF NOT EXISTS idx_processed_webhooks_processed_at ON processed_webhooks(processed_at);
```

Then at the start of every webhook handler, after signature verification:

```typescript
// Idempotency check — exit early if we've already processed this event
const existing = await db
  .select()
  .from(processedWebhooks)
  .where(eq(processedWebhooks.eventId, event.id))
  .limit(1);

if (existing.length > 0) {
  logger.info({ eventId: event.id, eventType: event.type }, "Webhook already processed, skipping");
  return res.json({ received: true, duplicate: true });
}

// Record the event before processing
await db.insert(processedWebhooks).values({
  eventId: event.id,
  eventType: event.type,
  payload: event as any,
});

// ... existing handler logic
```

Add the corresponding Drizzle schema in `lib/db/src/schema/` matching your existing patterns.

---

## Section 7: TestFlight Submission

**Dependencies:** Sections 1, 2, 4 complete.

### 7.1 Build production IPA

```bash
cd artifacts/health-plan-mobile
npx eas-cli build --platform ios --profile production --non-interactive
# Wait ~15-30 min for build to complete
```

### 7.2 Submit to TestFlight

```bash
npx eas-cli submit --platform ios --latest
```

You'll be prompted for:
- Apple ID: `jm.zanetis@gmail.com`
- App-specific password (generate at appleid.apple.com → Sign-In and Security → App-Specific Passwords)
- ASC App ID: `6770102215` (already in eas.json)
- Apple Team ID: `VNCVGPP9LS` (already in eas.json)

### 7.3 Wait for Apple processing

30–60 minutes. Then in App Store Connect:

1. TestFlight tab → your build appears
2. Add export compliance: confirm "No" to uses encryption (`ITSAppUsesNonExemptEncryption: false` handles this)
3. Internal testers: add your own Apple ID + 2-3 trusted folks
4. They install TestFlight on their phones, get invite email, install your app

### 7.4 Smoke test on real device

Walk through every screen:
- [ ] Login works
- [ ] Intake completes without errors
- [ ] Plan generation works
- [ ] Discover tab loads providers
- [ ] Coach paywall shows for free users
- [ ] Coach works for Plus users
- [ ] HealthKit permission dialog appears with clear copy
- [ ] No CORS errors in dev console (Safari → Develop → iPhone)
- [ ] All API calls hit `api.healthplanfactory.com` (verify with Charles Proxy or Replit logs)

---

## Section 8: Followup Tickets (Phase 1.5)

These are smaller items uncovered during the audit. Tackle after Phase 1 critical work.

1. **Annual subscription billing period parameter** — `providers.ts` checkout session creation needs `billingPeriod: "monthly" | "annual"` query/body param to switch price IDs.

2. **Account management deep link** — When (if) you uncomment the "Manage account on web" link in the paywall, build `/account` page on web with: subscription status, cancel flow, payment method update.

3. **Funnel events stub** — Even before PostHog integration in Phase 3, add a stub `track()` function and call it at: `landing_viewed`, `intake_started`, `intake_completed`, `plan_viewed`, `signup_completed`, `plus_upgrade_completed`. Stub just logs to console; PostHog wiring comes later.

4. **HSA/FSA-eligible Annual marketing** — $99 is HSA-eligible if positioned correctly. Add LMN workflow note to pricing page.

5. **Provider 410 endpoint deletion** — After full migration verified, remove the deprecated `/providers/unlock-status` route entirely.

6. **`/api/healthz/deep`** — A version of healthz that actually pings DB, Stripe, Anthropic, Resend. Admin-auth gated. Useful for ops dashboards.

---

## Phase 1 Exit Checklist

Run through this before declaring Phase 1 complete:

**Security:**
- [ ] `express-rate-limit` installed and applied to coach, magic links, demo requests, auth, intakes, plans
- [ ] `helmet` installed and configured
- [ ] CORS locked to explicit allowlist
- [ ] `/api/healthz/config` requires admin auth
- [ ] Stripe webhook idempotency verified or added
- [ ] All tests pass: `pnpm -r test`
- [ ] All typechecks pass: `pnpm -r typecheck`

**Infrastructure:**
- [ ] `api.healthplanfactory.com` resolves and returns 200 on `/api/healthz`
- [ ] Mobile EAS secret `EXPO_PUBLIC_API_URL` set to new subdomain
- [ ] Web app returns 200 (no 403)
- [ ] CSP and security headers in `netlify.toml`

**Monetization (Option C):**
- [ ] Zero references to "$3–8 reveal" or "unlock fees" in landing, pricing, FAQ, howItWorks, locales (EN+ES)
- [ ] Pricing page shows: Free / Plus $9.99mo or $99yr / Employer $6–8 seat/mo
- [ ] Business plan executive summary updated
- [ ] Stripe annual subscription price ID created and env var set
- [ ] Mobile paywall shows for coach, journal, accountability, provider details
- [ ] Mobile paywall does NOT show pricing or external payment links

**Mobile:**
- [ ] Production EAS build succeeded after Option C changes
- [ ] Submitted to TestFlight
- [ ] At least one internal tester installed and reached the dashboard
- [ ] HealthKit permission dialog shows correct copy
- [ ] All API calls reach `api.healthplanfactory.com`

When all boxes are checked, you're ready for Phase 2 (App Store reviewability, weeks 3–4).

---

## What I Need From You After Phase 1

Before I generate the Phase 2 packet, tell me:

1. **Which optional items in Section 8 do you want to defer vs do now?**
2. **Any items in Section 1–7 that hit unexpected friction?** (so the Phase 2 packet accounts for them)
3. **Are you OK with the $99 annual price point**, or do you want to test $89 / $109 / something else?
4. **Lawyer:** do you already have one for telehealth/wellness? If not, I'll include vetted referral patterns in Phase 2.

Ship it.
