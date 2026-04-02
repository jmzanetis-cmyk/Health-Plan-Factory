import { Router, type IRouter } from "express";
import { randomUUID } from "node:crypto";
import Stripe from "stripe";
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

    const enriched = rows.map((p) => ({ ...p, credentials: credMap[p.id] ?? [] }));
    res.json(enriched);
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
 * Returns the set of provider IDs this member has already unlocked.
 * Used on page load to restore persisted unlock state.
 */
router.get("/providers/unlocked", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  try {
    const rows = await db
      .select({ providerId: providerUnlocks.providerId })
      .from(providerUnlocks)
      .where(eq(providerUnlocks.memberId, req.user!.id));
    res.json({ unlockedProviderIds: rows.map((r) => r.providerId) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * POST /api/providers/unlock
 * Two-phase unlock:
 *   Phase A (full credit): credit covers the full price → apply credit atomically +
 *     record unlock in provider_unlocks → respond { unlocked: true }.
 *   Phase B (payment needed): credit is partial or absent → create Stripe Checkout
 *     Session (if Stripe is configured) for the net amount → respond
 *     { unlocked: false, checkout_url }.  Credit is NOT consumed until payment
 *     is confirmed via the webhook or the unlock-status endpoint.
 *
 * Body: { providerId: string }
 */
router.post("/providers/unlock", async (req, res) => {
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
    // Already unlocked? Return immediately without consuming another credit.
    const [existing] = await db
      .select({ id: providerUnlocks.id })
      .from(providerUnlocks)
      .where(and(eq(providerUnlocks.memberId, profileId), eq(providerUnlocks.providerId, providerId)));
    if (existing) {
      res.json({ unlocked: true, already_unlocked: true, used_credit: false, credit_applied_cents: 0, amount_charged_cents: 0 });
      return;
    }

    // --- Server-side price determination ---
    const [providerModality] = await db
      .select({ category: modalitiesTable.category, name: providers.name })
      .from(providerModalities)
      .innerJoin(modalitiesTable, eq(providerModalities.modalityId, modalitiesTable.id))
      .innerJoin(providers, eq(providerModalities.providerId, providers.id))
      .where(eq(providerModalities.providerId, providerId))
      .limit(1);

    const category = providerModality?.category ?? "wellness";
    const providerName = providerModality?.name ?? "Provider";
    const priceCents = category === "telehealth" ? 300   // $3.00 — app-based/telehealth
      : category === "medical" ? 800                    // $8.00 — physician / DPC
      : 500;                                            // $5.00 — wellness / fitness / default

    // --- Phase A: try to cover the full price with a referral credit ---
    const creditResult = await db.transaction(async (tx) => {
      const [credit] = await tx
        .select()
        .from(memberCredits)
        .where(and(eq(memberCredits.profileId, profileId), eq(memberCredits.used, false)))
        .orderBy(memberCredits.createdAt)
        .limit(1);

      if (!credit) return null;

      // Only fully-covering credits unlock immediately — partial credit still
      // requires Stripe to collect the remainder.
      if (credit.amountCents < priceCents) return { credit, netCents: priceCents - credit.amountCents };

      // Credit covers the full price — consume it and record the unlock atomically.
      const [consumed] = await tx
        .update(memberCredits)
        .set({ used: true, usedAt: new Date() })
        .where(and(eq(memberCredits.id, credit.id), eq(memberCredits.used, false)))
        .returning();

      if (!consumed) return null; // lost race — no credit applied

      await tx.insert(providerUnlocks).values({
        id: randomUUID(),
        memberId: profileId,
        providerId,
        creditId: consumed.id,
        amountCharged: 0,
      }).onConflictDoNothing();

      return { credit: consumed, netCents: 0 };
    });

    // Credit fully covered the price → unlock immediately
    if (creditResult && creditResult.netCents === 0) {
      res.json({
        unlocked: true,
        used_credit: true,
        credit_applied_cents: creditResult.credit.amountCents,
        amount_charged_cents: 0,
        amount_charged_formatted: "$0.00",
        providerId,
        message: `Referral credit applied — unlock is free!`,
      });
      return;
    }

    // --- Phase B: payment required for the net amount ---
    const creditAppliedCents = creditResult?.credit.amountCents ?? 0;
    const netCents = creditResult?.netCents ?? priceCents;

    if (!stripe) {
      // Stripe not configured — inform client; do NOT grant access.
      res.status(402).json({
        unlocked: false,
        stripe_required: true,
        credit_applied_cents: creditAppliedCents,
        amount_charged_cents: netCents,
        amount_charged_formatted: `$${(netCents / 100).toFixed(2)}`,
        providerId,
        message: "Payment required. Configure STRIPE_SECRET_KEY to enable provider unlocks.",
      });
      return;
    }

    // Build redirect origin from the request host
    const origin = `${req.protocol}://${req.get("host")}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: netCents,
            product_data: { name: `Provider Unlock — ${providerName}` },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: "provider_unlock",
        provider_id: providerId,
        member_id: profileId,
        credit_id: creditResult?.credit.id ?? "",
        credit_applied_cents: String(creditAppliedCents),
      },
      success_url: `${origin}/providers?unlock_session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/providers`,
    });

    res.json({
      unlocked: false,
      checkout_url: session.url,
      session_id: session.id,
      used_credit: false,
      credit_applied_cents: creditAppliedCents,
      amount_charged_cents: netCents,
      amount_charged_formatted: `$${(netCents / 100).toFixed(2)}`,
      providerId,
      message: "Complete payment to unlock provider contact details.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

/**
 * GET /api/providers/unlock-status
 * Called when the member returns from the Stripe Checkout hosted page.
 * Verifies the Stripe session, records the unlock, and (idempotently) marks
 * the credit as used.  Returns { unlocked: boolean }.
 *
 * Query: ?session_id=cs_xxx
 */
router.get("/providers/unlock-status", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const profileId = req.user!.id;
  const sessionId = typeof req.query.session_id === "string" ? req.query.session_id : null;

  if (!sessionId) {
    res.status(400).json({ error: "session_id query param is required" });
    return;
  }
  if (!stripe) {
    res.status(503).json({ error: "Stripe is not configured" });
    return;
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      res.json({ unlocked: false, payment_status: session.payment_status });
      return;
    }

    const { provider_id, credit_id, credit_applied_cents } = session.metadata ?? {};

    if (!provider_id || session.metadata?.member_id !== profileId) {
      res.status(403).json({ error: "Session does not belong to this member" });
      return;
    }

    // Idempotently record the unlock
    await db.insert(providerUnlocks).values({
      id: randomUUID(),
      memberId: profileId,
      providerId: provider_id,
      creditId: credit_id || null,
      stripeSessionId: sessionId,
      amountCharged: session.amount_total ?? 0,
    }).onConflictDoNothing();

    // Idempotently mark the credit as used (if one was reserved)
    if (credit_id) {
      await db
        .update(memberCredits)
        .set({ used: true, usedAt: new Date() })
        .where(and(eq(memberCredits.id, credit_id), eq(memberCredits.used, false)));
    }

    res.json({
      unlocked: true,
      providerId: provider_id,
      credit_applied_cents: Number(credit_applied_cents ?? 0),
      amount_charged_cents: session.amount_total ?? 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
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

        // ── Provider unlock confirmed by Stripe ──────────────────────────────
        if (sessionType === "provider_unlock") {
          if (session.payment_status !== "paid") {
            res.json({ received: true });
            return;
          }
          const { provider_id, member_id, credit_id } = session.metadata!;
          if (provider_id && member_id) {
            await db.insert(providerUnlocks).values({
              id: randomUUID(),
              memberId: member_id,
              providerId: provider_id,
              creditId: credit_id || null,
              stripeSessionId: session.id,
              amountCharged: session.amount_total ?? 0,
            }).onConflictDoNothing();

            // Idempotently mark referral credit as used — only after payment confirmed
            if (credit_id) {
              await db
                .update(memberCredits)
                .set({ used: true, usedAt: new Date() })
                .where(and(eq(memberCredits.id, credit_id), eq(memberCredits.used, false)));
            }
          }
        }

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
      res.status(402).json({
        stripe_required: true,
        subscription_price_cents: SUBSCRIPTION_PRICE_CENTS,
        credit_applied_cents: creditAppliedCents,
        amount_charged_cents: netCents,
        amount_charged_formatted: `$${(netCents / 100).toFixed(2)}`,
        message: "Configure STRIPE_SECRET_KEY to enable subscription checkout.",
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
 * Returns { checkout_url } when Stripe is configured, or stripe_mode: "demo" otherwise.
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
      // Demo mode — record a demo subscription and return
      await db.insert(providerSubscriptions).values({
        id: randomUUID(),
        providerId: provider.id,
        profileId,
        amountCents: LISTING_PRICE_CENTS,
        status: "active",
        stripeSessionId: null,
        stripeSubscriptionId: null,
        stripeCustomerId: null,
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      }).onConflictDoNothing();

      res.json({
        stripe_required: false,
        stripe_mode: "demo",
        message: "Stripe not configured — listing subscription recorded in demo mode.",
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

export default router;
