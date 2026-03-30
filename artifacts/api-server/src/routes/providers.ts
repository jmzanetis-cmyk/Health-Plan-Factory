import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { providers, providerModalities } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import {
  ListProvidersQueryParams,
  ListProvidersResponse,
  CreateProviderBody,
  GetAdminProviderParams,
  GetAdminProviderResponse,
  UpdateAdminProviderBody,
  UpdateAdminProviderParams,
  UpdateAdminProviderResponse,
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

    res.json(ListProvidersResponse.parse(rows));
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
    const modalityRows = await db
      .select()
      .from(providerModalities)
      .where(eq(providerModalities.providerId, provider.id));

    res.json({ provider: { ...provider, modalityIds: modalityRows.map((m) => m.modalityId) } });
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
        acceptsInsurance: providerData.acceptsInsurance ?? false,
        offersTelehealth: providerData.offersTelehealth ?? false,
        costPerSession: providerData.costPerSession ?? null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (Array.isArray(modalityIds) && modalityIds.length > 0) {
      await db.insert(providerModalities).values(
        modalityIds.map((mId, idx) => ({
          providerId,
          modalityId: mId,
          isPrimary: idx === 0,
        })),
      );
    }

    res.status(201).json(GetAdminProviderResponse.parse(created));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

router.get("/admin/providers/:id", async (req, res) => {
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

router.patch("/admin/providers/:id", async (req, res) => {
  try {
    const params = UpdateAdminProviderParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Invalid params", details: params.error.flatten() });
      return;
    }
    const body = UpdateAdminProviderBody.safeParse(req.body);
    if (!body.success) {
      res.status(400).json({ error: "Validation error", details: body.error.flatten() });
      return;
    }

    const [updated] = await db
      .update(providers)
      .set({ status: body.data.status, updatedAt: new Date() })
      .where(eq(providers.id, params.data.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Provider not found" });
      return;
    }
    res.json(UpdateAdminProviderResponse.parse(updated));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    res.status(500).json({ error: message });
  }
});

export default router;
