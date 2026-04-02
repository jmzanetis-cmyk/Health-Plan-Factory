import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@workspace/db";
import { providers, providerModalities, profiles, modalities as modalitiesTable, providerCredentials, memberCredits, providerUnlocks, providerSubscriptions } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  ListProvidersQueryParams,
  ListProvidersResponse,
  CreateProviderBody,
  GetAdminProviderParams,
  GetAdminProviderResponse,
} from "@workspace/api-zod";
import { haversineDistanceMiles, ZIP_COORDS } from "../lib/geoUtils";

// ── Stripe (lazy — only active when STRIPE_SECRET_KEY is set) ─────────────────
const stripeKey = process.env.STRIPE_SECRET_KEY;
const stripe: Stripe | null = stripeKey
  ? new Stripe(stripeKey, { apiVersion: "2026-03-25.dahlia" })
  : null;

// ── Anthropic AI (lazy — only active when ANTHROPIC_API_KEY is set) ───────────
const anthropic = process.env.ANTHROPIC_API_KEY
  ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  : null;

// ── Simple in-memory rate limiter for unauthenticated AI insight requests ─────
const insightRateLimit = new Map<string, { count: number; resetAt: number }>();
const INSIGHT_LIMIT = 5;
const INSIGHT_WINDOW_MS = 3_600_000; // 1 hour

// Canned insight fallbacks by modality (used when AI unavailable)
const CANNED_INSIGHTS: Record<string, string> = {
  massage: "Massage therapy can meaningfully reduce muscle tension, chronic pain, and stress. Ask your therapist whether they specialize in therapeutic or medical massage to understand how they can best support your goals.",
  chiropractic: "Chiropractic care has strong evidence for back and neck pain relief through spinal adjustment and soft tissue work. Ask about their assessment process and how many visits they typically recommend before evaluating progress.",
  acupuncture: "Acupuncture has clinical evidence for pain relief, stress reduction, and sleep regulation. Ask how many sessions they recommend before you assess whether the treatment is working for you.",
  "physical-therapy": "Physical therapy is one of the most evidence-backed approaches for injury rehabilitation and chronic pain management. Ask about the home exercise program they'll design to extend your progress between sessions.",
  "registered-dietitian": "A registered dietitian provides the most clinically rigorous nutrition guidance, especially for conditions like metabolic dysfunction or digestive issues. Ask what lab data or health history they'll use to personalize your eating strategy.",
  dpc: "Direct Primary Care gives you unlimited access to a physician for a flat monthly fee — making preventive care and LMNs for HSA reimbursement much more accessible. Ask whether they can issue a Letter of Medical Necessity for wellness services already in your plan.",
  shiatsu: "Shiatsu combines Japanese pressure-point techniques with meridian theory to relieve tension and restore energy flow. Ask about their training background and which health conditions they most commonly treat.",
  "herbal-medicine": "Naturopathic physicians integrate evidence-guided botanical medicine with whole-person wellness care. Ask which herbal approaches they typically use for your primary health concern and how they track progress.",
};

const router: IRouter = Router();

router.get("/providers", async (req, res) => {
  try {
    const query = ListProvidersQueryParams.safeParse(req.query);
    if (!query.success) {
      res.status(400).json({ error: "Invalid query params", details: query.error.flatten() });
      return;
    }

    const { modalityId, zipCode, radius, telehealth } = query.data;

    let rows = await db.select().from(providers).where(eq(providers.status, "approved"));

    if (telehealth) {
      rows = rows.filter((p) => p.offersTelehealth);
    }

    if (zipCode && radius) {
      // Use Haversine if we have lat/lng for the user's zip
      const userCoords = ZIP_COORDS[zipCode];
      if (userCoords) {
        rows = rows.filter((p) => {
          // Telehealth providers are always included when radius filtering (no physical location needed)
          if (p.offersTelehealth) return true;
          if (!p.lat || !p.lng) return false;
          const dist = haversineDistanceMiles(
            userCoords.lat,
            userCoords.lng,
            parseFloat(p.lat),
            parseFloat(p.lng),
          );
          return dist <= Number(radius);
        });
      } else {
        // Unknown zip: fall back to exact zip match
        rows = rows.filter((p) => !p.zipCode || p.zipCode === zipCode);
      }
    } else if (zipCode) {
      rows = rows.filter((p) => !p.zipCode || p.zipCode === zipCode);
    }

    if (modalityId) {
      const providerIds = rows.map((p) => p.id);
      if (providerIds.length > 0) {
        const links = await db
          .select()
          .from(providerModalities)
          .where(
            and(
              eq(providerModalities.modalityId, modalityId),
              inArray(providerModalities.providerId, providerIds),
            ),
          );
        const matchingIds = new Set(links.map((l) => l.providerId));
        rows = rows.filter((p) => matchingIds.has(p.id));
      }
    }

    const limit = query.data.limit ?? 20;
    const offset = query.data.offset ?? 0;
    rows = rows.slice(Number(offset), Number(offset) + Number(limit));

    const providerIds = rows.map((p) => p.id);
    let credMap: Record<string, string[]> = {};
    if (providerIds.length > 0) {
      const creds = await db
        .select({ providerId: providerCredentials.providerId, name: providerCredentials.credentialName })
        .from(providerCredentials)
        .where(inArray(providerCredentials.providerId, providerIds));
      for (const c of creds) {
        if (!credMap[c.providerId]) credMap[c.providerId] = [];
        credMap[c.providerId].push(c.name);
      }
    }

    // Gate real provider records behind Plus or employer subscription
    const isPlus = req.isAuthenticated() && (
      req.user!.subscriptionStatus === "plus" ||
      req.user!.subscriptionStatus === "employer"
    );

    if (!isPlus) {
      // Explorer (free) members: return count only, no real provider records
      res.json({ locked: true, count: rows.length, providers: [] });
      return;
    }

    const enriched = rows.map((p) => ({
      ...p,
      credentials: credMap[p.id] ?? [],
      contactGated: false,
    }));
    res.json({ locked: false, count: enriched.length, providers: enriched });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/members/subscription
 * Returns the current member's subscription status.
 * Used by the frontend to gate UI behind Plus / employer status.
 */
router.get("/members/subscription", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.json({ subscriptionStatus: "free", isPlus: false });
    return;
  }
  try {
    const [profile] = await db
      .select({ subscriptionStatus: profiles.subscriptionStatus })
      .from(profiles)
      .where(eq(profiles.id, req.user!.id))
      .limit(1);
    const status = profile?.subscriptionStatus ?? "free";
    res.json({
      subscriptionStatus: status,
      isPlus: status === "plus" || status === "employer",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// Get the authenticated user's own provider profile (any status)
router.get("/providers/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const rows = await db
      .select()
      .from(providers)
      .where(eq(providers.profileId, req.user!.id))
      .limit(1);

    if (rows.length === 0) {
      res.json({ provider: null });
      return;
    }

    const provider = rows[0];
    const modalityLinks = await db
      .select()
      .from(providerModalities)
      .where(eq(providerModalities.providerId, provider.id));

    let modalityObjects: Array<{ id: string; name: string }> = [];
    if (modalityLinks.length > 0) {
      const ids = modalityLinks.map((m) => m.modalityId);
      const mRows = await db
        .select({ id: modalitiesTable.id, name: modalitiesTable.name })
        .from(modalitiesTable)
        .where(inArray(modalitiesTable.id, ids));
      modalityObjects = mRows;
    }

    res.json({
      provider: {
        ...provider,
        modalityIds: modalityLinks.map((m) => m.modalityId),
        modalities: modalityObjects,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.post("/providers", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    // Prevent duplicate provider applications per account
    const existing = await db
      .select({ id: providers.id })
      .from(providers)
      .where(eq(providers.profileId, req.user!.id))
      .limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "A provider application already exists for this account" });
      return;
    }

    const body = CreateProviderBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const { modalityIds, ...providerData } = body.data as typeof body.data & {
      modalityIds?: string[];
    };

    const now = new Date();
    const providerId = crypto.randomUUID();

    // Extract extended fields not in the Zod schema
    const rawBody = req.body as {
      credentials?: string;
      licenseNumber?: string;
      licenseState?: string;
      serviceRadiusMiles?: number;
      offersInPerson?: boolean;
      credentialDocPath?: string;
      availabilityNotes?: string;
      modalityPricingRanges?: Array<{ modalityId: string; costMin?: number; costMax?: number }>;
    };

    const [created] = await db
      .insert(providers)
      .values({
        id: providerId,
        profileId: req.user!.id,
        name: providerData.name,
        bio: providerData.bio ?? null,
        city: providerData.city ?? null,
        state: providerData.state ?? null,
        zipCode: providerData.zipCode ?? null,
        lat: null,
        lng: null,
        phone: providerData.phone ?? null,
        website: providerData.website ?? null,
        avatarUrl: null,
        status: "pending",
        verificationStatus: "submitted",
        acceptsInsurance: providerData.acceptsInsurance ?? false,
        offersTelehealth: providerData.offersTelehealth ?? false,
        offersInPerson: rawBody.offersInPerson ?? true,
        serviceRadiusMiles: rawBody.serviceRadiusMiles ? Number(rawBody.serviceRadiusMiles) : null,
        costPerSession: providerData.costPerSession ?? null,
        credentialDocPath: rawBody.credentialDocPath ?? null,
        availabilityNotes: rawBody.availabilityNotes ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (Array.isArray(modalityIds) && modalityIds.length > 0) {
      const pricingMap = new Map(
        (rawBody.modalityPricingRanges ?? []).map((r) => [r.modalityId, r]),
      );
      await db.insert(providerModalities).values(
        modalityIds.map((mId, idx) => {
          const pr = pricingMap.get(mId);
          return {
            providerId,
            modalityId: mId,
            isPrimary: idx === 0,
            costMin: pr?.costMin ?? null,
            costMax: pr?.costMax ?? null,
          };
        }),
      );
    }

    // Persist credentials if provided
    if (rawBody.credentials) {
      await db.insert(providerCredentials).values({
        id: crypto.randomUUID(),
        providerId,
        credentialName: rawBody.credentials,
        licenseNumber: rawBody.licenseNumber ?? null,
        issuingBody: rawBody.licenseState ? `${rawBody.licenseState} State Board` : null,
        createdAt: now,
      });
    }

    // Note: role is NOT upgraded to "provider" here.
    // The profile role is set to "provider" by admin approval in PATCH /admin/providers/:id.
    // Until approved, the user retains their current role (e.g. "member").

    res.status(201).json(GetAdminProviderResponse.parse(created));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// Self-service: provider updates their own profile (non-admin, auth required)
router.patch("/providers/me", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const rows = await db.select().from(providers).where(eq(providers.profileId, req.user!.id)).limit(1);
    if (rows.length === 0) {
      res.status(404).json({ error: "No provider profile found for this account" });
      return;
    }
    const provider = rows[0];
    const allowed = ["name", "bio", "city", "state", "zipCode", "phone", "website", "acceptsInsurance", "offersTelehealth", "costPerSession", "availabilityNotes"] as const;
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    for (const field of allowed) {
      if (field in req.body) updates[field] = req.body[field] ?? null;
    }

    const [updated] = await db.update(providers).set(updates).where(eq(providers.id, provider.id)).returning();

    // Handle modality update if provided
    if (Array.isArray(req.body.modalityIds)) {
      await db.delete(providerModalities).where(eq(providerModalities.providerId, provider.id));
      if (req.body.modalityIds.length > 0) {
        await db.insert(providerModalities).values(
          (req.body.modalityIds as string[]).map((mId, idx) => ({
            providerId: provider.id,
            modalityId: mId,
            isPrimary: idx === 0,
          })),
        );
      }
    }

    res.json({ provider: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// Admin-only: get provider by id
router.get("/admin/providers/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  if (req.user!.role !== "admin") {
    res.status(403).json({ error: "Admin access required" });
    return;
  }
  try {
    const params = GetAdminProviderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
      return;
    }
    const [row] = await db.select().from(providers).where(eq(providers.id, params.data.id));
    if (!row) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }
    res.json(GetAdminProviderResponse.parse(row));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/providers/unlocked
 * DEPRECATED — per-provider unlocks are no longer used.
 * Provider access is now gated by subscription_status (plus or employer).
 * Returns an empty list for backward compatibility.
 */
router.get("/providers/unlocked", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  res.json({ unlockedProviderIds: [] });
});

/**
 * POST /api/providers/unlock
 * DEPRECATED — per-provider unlocks have been removed.
 * Provider contact info is now gated by subscription_status (plus or employer).
 * Returns 410 Gone so clients know to redirect to the Plus checkout.
 */
router.post("/providers/unlock", async (req, res) => {
  res.status(410).json({
    error: "Per-provider unlocks are no longer available. Upgrade to Plus to access all provider contact details.",
    upgrade_required: true,
  });
});

/**
 * GET /api/providers/unlock-status
 * DEPRECATED — per-provider unlock status is no longer relevant.
 * Provider access is now determined by subscription_status.
 * Returns 410 Gone.
 */
router.get("/providers/unlock-status", async (req, res) => {
  res.status(410).json({
    error: "Per-provider unlock status is no longer available. Provider access is determined by your Plus subscription.",
    upgrade_required: true,
  });
});

/**
 * POST /api/providers/stripe-webhook
 * Stripe webhook for provider unlock checkout.session.completed events.
 * Register this URL in your Stripe dashboard with event: checkout.session.completed
 * and set STRIPE_WEBHOOK_SECRET.
 */
router.post(
  "/providers/stripe-webhook",
  async (req, res) => {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!stripe || !webhookSecret) {
      res.json({ received: true, note: "Stripe not configured — webhook ignored" });
      return;
    }

    const sig = req.headers["stripe-signature"] as string | undefined;
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig ?? "", webhookSecret);
    } catch (err) {
      res.status(400).json({ error: "Webhook signature verification failed" });
      return;
    }

    try {
      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const sessionType = session.metadata?.type;

        // ── Member subscription confirmed by Stripe ──────────────────────────
        if (sessionType === "member_subscription") {
          if (session.payment_status !== "paid") {
            res.json({ received: true });
            return;
          }
          const { member_id, credit_id } = session.metadata!;

          // Idempotently mark referral credit as used — only after subscription payment confirmed
          if (member_id && credit_id) {
            await db
              .update(memberCredits)
              .set({ used: true, usedAt: new Date() })
              .where(and(eq(memberCredits.id, credit_id), eq(memberCredits.used, false)));
          }

          // Activate Plus subscription on the member's profile
          if (member_id) {
            await db
              .update(profiles)
              .set({ subscriptionStatus: "plus", updatedAt: new Date() })
              .where(eq(profiles.id, member_id));
          }
        }

        // ── Provider listing subscription confirmed by Stripe ─────────────────
        if (sessionType === "provider_listing") {
          const { provider_id, profile_id } = session.metadata!;
          if (provider_id && profile_id) {
            await db.insert(providerSubscriptions).values({
              id: randomUUID(),
              providerId: provider_id,
              profileId: profile_id,
              stripeSessionId: session.id,
              stripeSubscriptionId: typeof session.subscription === "string" ? session.subscription : null,
              stripeCustomerId: typeof session.customer === "string" ? session.customer : null,
              amountCents: session.amount_total ?? 2900,
              status: "active",
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            }).onConflictDoNothing();
          }
        }
      }
      res.json({ received: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Webhook handler error";
      console.error("[provider-webhook]", message);
      res.status(500).json({ error: message });
    }
  }
);

/**
 * POST /api/subscriptions/checkout
 * Creates a Stripe Checkout Session for a member's Plus subscription.
 * Applies any available referral credits as a discount before charging Stripe.
 * Returns { checkout_url } when Stripe is configured, or
 * { credit_applied_cents, amount_charged_cents, stripe_required: true } when not.
 */
router.post("/subscriptions/checkout", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const profileId = req.user!.id;

  try {
    const SUBSCRIPTION_PRICE_CENTS = 999; // $9.99/mo

    // Check for available credits to discount the subscription
    const [credit] = await db
      .select()
      .from(memberCredits)
      .where(and(eq(memberCredits.profileId, profileId), eq(memberCredits.used, false)))
      .orderBy(memberCredits.createdAt)
      .limit(1);

    const creditAppliedCents = credit ? Math.min(credit.amountCents, SUBSCRIPTION_PRICE_CENTS) : 0;
    const netCents = Math.max(0, SUBSCRIPTION_PRICE_CENTS - creditAppliedCents);

    if (!stripe) {
      // STRIPE_SECRET_KEY not configured — block subscription checkout.
      // This path is unreachable in production where STRIPE_SECRET_KEY is set.
      res.status(402).json({
        stripe_required: true,
        subscription_price_cents: SUBSCRIPTION_PRICE_CENTS,
        credit_applied_cents: creditAppliedCents,
        amount_charged_cents: netCents,
        amount_charged_formatted: `$${(netCents / 100).toFixed(2)}`,
        message: "STRIPE_SECRET_KEY must be configured to enable subscription checkout.",
      });
      return;
    }

    const origin = `${req.protocol}://${req.get("host")}`;

    const discounts: Stripe.Checkout.SessionCreateParams["discounts"] = [];
    if (creditAppliedCents > 0) {
      // Create a one-time coupon for the credit amount
      const coupon = await stripe.coupons.create({
        amount_off: creditAppliedCents,
        currency: "usd",
        duration: "once",
        name: "Referral Credit",
      });
      discounts.push({ coupon: coupon.id });
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: SUBSCRIPTION_PRICE_CENTS,
            recurring: { interval: "month" },
            product_data: { name: "Health Plan Factory Plus" },
          },
          quantity: 1,
        },
      ],
      discounts,
      metadata: {
        type: "member_subscription",
        member_id: profileId,
        credit_id: credit?.id ?? "",
        credit_applied_cents: String(creditAppliedCents),
      },
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/dashboard`,
    });

    // Credit is NOT consumed here — it is marked as used only after Stripe
    // confirms payment via the checkout.session.completed webhook or the
    // unlock-status endpoint.  This prevents permanently burning credits on
    // abandoned or failed checkout sessions.

    res.json({
      checkout_url: session.url,
      session_id: session.id,
      credit_applied_cents: creditAppliedCents,
      amount_charged_cents: netCents,
      amount_charged_formatted: `$${(netCents / 100).toFixed(2)}`,
      subscription_price_cents: SUBSCRIPTION_PRICE_CENTS,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/providers/listing-checkout
 * Creates a Stripe Checkout Session for a provider's monthly listing subscription.
 * The provider record must already exist (created in step 3 of the signup wizard).
 * Returns { checkout_url } on success. Returns 402 + stripe_required if STRIPE_SECRET_KEY is absent (unreachable in production).
 */
router.post("/providers/listing-checkout", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const profileId = req.user!.id;
  const { providerId } = req.body as { providerId?: string };

  if (!providerId) {
    res.status(400).json({ error: "providerId is required" });
    return;
  }

  try {
    // Verify the provider belongs to this user
    const [provider] = await db
      .select({ id: providers.id, name: providers.name, status: providers.status })
      .from(providers)
      .where(and(eq(providers.id, providerId), eq(providers.profileId, profileId)))
      .limit(1);

    if (!provider) {
      res.status(404).json({ error: "Provider profile not found" });
      return;
    }

    const LISTING_PRICE_CENTS = 2900; // $29/mo

    if (!stripe) {
      // STRIPE_SECRET_KEY not configured — block listing checkout.
      // This path is unreachable in production where STRIPE_SECRET_KEY is set.
      res.status(402).json({
        stripe_required: true,
        message: "STRIPE_SECRET_KEY must be configured to enable listing subscriptions.",
      });
      return;
    }

    const origin = `${req.protocol}://${req.get("host")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: LISTING_PRICE_CENTS,
            recurring: { interval: "month" },
            product_data: {
              name: "Health Plan Factory — Provider Listing",
              description: `Monthly listing fee for ${provider.name}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "provider_listing",
        provider_id: providerId,
        profile_id: profileId,
      },
      success_url: `${origin}/provider/dashboard?listing=success`,
      cancel_url: `${origin}/provider/signup?listing=canceled`,
    });

    res.json({
      checkout_url: session.url,
      session_id: session.id,
      amount_cents: LISTING_PRICE_CENTS,
      amount_formatted: `$${(LISTING_PRICE_CENTS / 100).toFixed(2)}/mo`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// GET /providers/counts — returns provider count per modality for a zip code
// Used by plan reveal page to show "X providers near you" trust badges
router.get("/providers/counts", async (req, res) => {
  try {
    const { zipCode, radius = "25" } = req.query as { zipCode?: string; radius?: string };

    let allProviders = await db
      .select()
      .from(providers)
      .where(eq(providers.status, "approved"));

    let filtered = allProviders;

    if (zipCode) {
      const userCoords = ZIP_COORDS[zipCode];
      if (userCoords) {
        filtered = allProviders.filter((p) => {
          if (p.offersTelehealth) return true;
          if (!p.lat || !p.lng) return false;
          const dist = haversineDistanceMiles(
            userCoords.lat,
            userCoords.lng,
            parseFloat(p.lat),
            parseFloat(p.lng),
          );
          return dist <= Number(radius);
        });
      } else {
        filtered = allProviders.filter((p) => p.offersTelehealth || !p.zipCode || p.zipCode === zipCode);
      }
    }

    // Count providers per modality
    const providerIds = filtered.map((p) => p.id);
    if (providerIds.length === 0) {
      res.json({ counts: {}, totalNearby: 0, zip: zipCode ?? null, isNational: !zipCode });
      return;
    }

    const links = await db
      .select({ modalityId: providerModalities.modalityId })
      .from(providerModalities)
      .where(inArray(providerModalities.providerId, providerIds));

    const counts: Record<string, number> = {};
    for (const link of links) {
      counts[link.modalityId] = (counts[link.modalityId] ?? 0) + 1;
    }

    res.json({ counts, totalNearby: filtered.length, zip: zipCode ?? null, isNational: !zipCode });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

// ── GET /api/npi ──────────────────────────────────────────────────────────────
// Thin proxy to the CMS NPI Registry API — bypasses browser CORS restrictions.
// Query params (all optional for location):
//   zip (5-digit), state (2-letter), city (string), taxonomy (NPI taxonomy code),
//   taxonomyDesc (keyword), limit (optional, max 200)
// If no location params are supplied the search is nationwide.
router.get("/npi", async (req, res) => {
  const zip = String(req.query.zip || "").replace(/\D/g, "").slice(0, 5);
  const state = String(req.query.state || "").toUpperCase().slice(0, 2);
  const city = String(req.query.city || "").trim().slice(0, 80);
  const taxonomy = String(req.query.taxonomy || "");
  const taxonomyDesc = String(req.query.taxonomyDesc || "");
  const limit = Math.min(Number(req.query.limit) || 50, 200);

  if (!taxonomy && !taxonomyDesc) {
    res.status(400).json({ error: "Taxonomy code or description required" });
    return;
  }

  try {
    const params = new URLSearchParams({
      version: "2.1",
      enumeration_type: "NPI-1",
      limit: String(limit),
      skip: "0",
    });
    if (zip.length === 5) params.set("postal_code", zip);
    if (state.length === 2) params.set("state", state);
    if (city) params.set("city", city);
    if (taxonomyDesc) params.set("taxonomy_description", taxonomyDesc);

    const npiRes = await fetch(
      `https://npiregistry.cms.hhs.gov/api/?${params.toString()}`,
      { signal: AbortSignal.timeout(10_000) },
    );
    if (!npiRes.ok) {
      res.status(502).json({ error: `NPI Registry returned ${npiRes.status}` });
      return;
    }
    const data = await npiRes.json();
    res.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upstream error";
    res.status(502).json({ error: msg });
  }
});

// ── POST /api/providers/insight ───────────────────────────────────────────────
// Returns a 2-sentence AI wellness insight for a given NPI provider + modality.
// Rate-limited to 5 req/hr for unauthenticated users (in-memory, resets on restart).
router.post("/providers/insight", async (req, res) => {
  if (!req.isAuthenticated()) {
    const ip = String(req.ip || req.socket.remoteAddress || "unknown");
    const now = Date.now();
    const entry = insightRateLimit.get(ip);
    if (entry && now < entry.resetAt) {
      if (entry.count >= INSIGHT_LIMIT) {
        res.status(429).json({
          error: "Rate limit exceeded. Sign in for unlimited AI insights.",
        });
        return;
      }
      entry.count++;
    } else {
      insightRateLimit.set(ip, { count: 1, resetAt: now + INSIGHT_WINDOW_MS });
    }
  }

  const { providerName, specialty, city, state, modalityId } =
    req.body as {
      providerName?: string;
      specialty?: string;
      city?: string;
      state?: string;
      modalityId?: string;
    };

  const fallback =
    CANNED_INSIGHTS[modalityId || ""] ||
    `${specialty || "This provider"} can be a valuable part of a whole-person wellness plan. Ask about their experience with your specific health goals at the first visit.`;

  if (!anthropic) {
    res.json({ insight: fallback });
    return;
  }

  try {
    const location = [city, state].filter(Boolean).join(", ") || "your area";
    const prompt = `You are a wellness advisor for HealthPlanFactory. Write exactly 2 concise sentences for a member who is considering seeing ${providerName || "a provider"} (${specialty || modalityId || "wellness care"}) in ${location}. Cover: (1) the primary evidence-based health benefit of this modality, and (2) one specific, smart question to ask at the first visit. Be warm but precise. No bullet points, no intros.`;

    const msg = await anthropic.messages.create({
      model: "claude-3-haiku-20240307",
      max_tokens: 200,
      messages: [{ role: "user", content: prompt }],
    });

    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    res.json({ insight: text || fallback });
  } catch (err) {
    console.error("[providers/insight] AI call failed:", err);
    res.json({ insight: fallback });
  }
});

export default router;
