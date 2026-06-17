// Phase 2 recruitment sourcing: pull nearby health businesses from Google
// Places API (New) Nearby Search and write them as wall-hidden prospects.
// Admin-only. Never member-callable.
//
// Column mapping note (spec → Drizzle):
//   address         → bio           (no address column; formatted address stored here)
//   source_ref      → sourceRef
//   lifecycle_state → lifecycleState
//   google_rating   → googleRating  (recruitment signal only — never feeds member quality)
//   google_review_count → googleReviewCount

import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";
import { providers } from "@workspace/db";
import { inArray } from "drizzle-orm";

// ── Category → Google Places Table A type ────────────────────────────────────
// Nearby Search only. Every value is a valid Table A includedType.
// acupuncture is intentionally absent — no Table A type, needs haversine
// post-filter; deferred to a separate spec.
const CATEGORY_MAP: Record<string, string[]> = {
  chiropractor:  ["chiropractor"],
  massage:       ["massage"],
  physiotherapy: ["physiotherapist"],
  spa:           ["spa"],
  wellness:      ["wellness_center"],
  yoga:          ["yoga_studio"],
};

export const ALLOWED_CATEGORIES = Object.keys(CATEGORY_MAP);

export function resolveCategory(category: string): string[] | null {
  return CATEGORY_MAP[String(category ?? "").toLowerCase().trim()] ?? null;
}

// ── Places API (New) Nearby Search ───────────────────────────────────────────
// Billing: nationalPhoneNumber + websiteUri → Enterprise SKU.
// rating + userRatingCount are free at that tier. One request per call.
// Nearby Search New has no pagination; maxResultCount hard-capped at 20.
const PLACES_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.nationalPhoneNumber",
  "places.websiteUri",
  "places.location",
  "places.rating",
  "places.userRatingCount",
].join(",");

interface RawPlace {
  id: string;
  displayName?: { text: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  location?: { latitude: number; longitude: number };
  rating?: number;
  userRatingCount?: number;
}

export async function fetchNearbyPlaces(
  includedTypes: string[],
  center: { lat: number; lng: number },
  radiusMeters: number,
): Promise<RawPlace[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? "";
  const res = await fetch(
    "https://places.googleapis.com/v1/places:searchNearby",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
      },
      body: JSON.stringify({
        includedTypes,
        maxResultCount: 20,
        locationRestriction: {
          circle: {
            center: { latitude: center.lat, longitude: center.lng },
            radius: radiusMeters,
          },
        },
      }),
    },
  );

  if (!res.ok) {
    throw new Error(`Places API ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { places?: RawPlace[] };
  return data.places ?? [];
}

// ── Skip-known dedupe + insert ────────────────────────────────────────────────
// Reads existing source_refs, inserts ONLY new Place IDs.
// Never updates existing rows — a re-run cannot regress a provider that has
// already progressed past 'prospect'. No onConflictDoUpdate by design.
export async function upsertProspects(
  raw: RawPlace[],
): Promise<{ inserted: number; skipped: number }> {
  const placeIds = raw.map((p) => p.id).filter(Boolean);
  if (placeIds.length === 0) return { inserted: 0, skipped: 0 };

  const existing = await db
    .select({ sourceRef: providers.sourceRef })
    .from(providers)
    .where(inArray(providers.sourceRef, placeIds));
  const known = new Set(existing.map((r) => r.sourceRef));

  const fresh = raw.filter((p) => !known.has(p.id));
  if (fresh.length === 0) return { inserted: 0, skipped: raw.length };

  const now = new Date();
  await db.insert(providers).values(
    fresh.map((p) => ({
      id: randomUUID(),
      // ── wall-hidden prospect state (matches live wall providerVisibility.ts) ──
      status: "pending" as const,
      verificationStatus: "draft",
      isDemo: false,
      listingConsent: false,
      isActive: true,
      lifecycleState: "prospect",
      // ── sourcing provenance ───────────────────────────────────────────────────
      source: "google_places",
      sourceRef: p.id,
      sourcedAt: now,
      // ── lead data ─────────────────────────────────────────────────────────────
      name: p.displayName?.text ?? "(unnamed)",
      sourceAddress: p.formattedAddress ?? null,
      phone: p.nationalPhoneNumber ?? null,
      website: p.websiteUri ?? null,
      lat: p.location?.latitude != null ? String(p.location.latitude) : null,
      lng: p.location?.longitude != null ? String(p.location.longitude) : null,
      // ── recruitment-prioritization only — NEVER feeds member quality scoring ──
      googleRating: p.rating ?? null,
      googleReviewCount: p.userRatingCount ?? null,
      createdAt: now,
      updatedAt: now,
    })),
  );

  return { inserted: fresh.length, skipped: raw.length - fresh.length };
}
