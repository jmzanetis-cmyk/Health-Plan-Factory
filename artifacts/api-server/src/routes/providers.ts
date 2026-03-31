import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { providers, providerModalities, profiles, modalities as modalitiesTable, providerCredentials, memberCredits } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  ListProvidersQueryParams,
  ListProvidersResponse,
  CreateProviderBody,
  GetAdminProviderParams,
  GetAdminProviderResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// Haversine distance in miles between two lat/lng points
function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Static lat/lng lookup for US zip codes (demo coverage)
const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  "78701": { lat: 30.2672, lng: -97.7431 },
  "78704": { lat: 30.2531, lng: -97.7621 },
  "60601": { lat: 41.8827, lng: -87.6233 },
  "90001": { lat: 33.9731, lng: -118.2479 },
  "10001": { lat: 40.7484, lng: -74.0044 },
  "80202": { lat: 39.7537, lng: -104.9942 },
  "98101": { lat: 47.6062, lng: -122.3321 },
};

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

    // Update the profile role to "provider" so ProtectedRoute lets them in
    await db
      .update(profiles)
      .set({ role: "provider", updatedAt: new Date() })
      .where(eq(profiles.id, req.user!.id));

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
    const allowed = ["name", "bio", "city", "state", "zipCode", "phone", "website", "acceptsInsurance", "offersTelehealth", "costPerSession"] as const;
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
 * POST /api/providers/unlock
 * Applies a member credit to "unlock" (record intent to contact) a provider.
 * If the member has unused referral credits, uses one ($2) and returns used_credit: true.
 * Otherwise returns used_credit: false and the price to charge at checkout.
 *
 * Body: { providerId: string, modalityCategory?: string }
 */
router.post("/providers/unlock", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const profileId = req.user!.id;
  const { providerId, modalityCategory } = req.body as {
    providerId?: string;
    modalityCategory?: string;
  };

  if (!providerId) {
    res.status(400).json({ error: "providerId is required" });
    return;
  }

  try {
    // Determine price tier ($1 telehealth, $3 medical, $2 default)
    const priceCents = modalityCategory === "telehealth" ? 100
      : modalityCategory === "medical" ? 300
      : 200;

    // Check for unused credits
    const credits = await db
      .select()
      .from(memberCredits)
      .where(and(eq(memberCredits.profileId, profileId), eq(memberCredits.used, false)))
      .orderBy(memberCredits.createdAt);

    if (credits.length > 0) {
      // Apply the first unused credit
      const credit = credits[0];
      await db
        .update(memberCredits)
        .set({ used: true, usedAt: new Date() })
        .where(eq(memberCredits.id, credit.id));

      res.json({
        used_credit: true,
        credit_applied_cents: credit.amountCents,
        amount_charged_cents: Math.max(0, priceCents - credit.amountCents),
        amount_charged_formatted: `$${(Math.max(0, priceCents - credit.amountCents) / 100).toFixed(2)}`,
        providerId,
        message: `1 referral credit applied — $${(credit.amountCents / 100).toFixed(2)} discount`,
      });
    }

    // No credits — return checkout required info
    res.json({
      used_credit: false,
      credit_applied_cents: 0,
      amount_charged_cents: priceCents,
      amount_charged_formatted: `$${(priceCents / 100).toFixed(2)}`,
      providerId,
      message: "No credits available — payment required at checkout",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
