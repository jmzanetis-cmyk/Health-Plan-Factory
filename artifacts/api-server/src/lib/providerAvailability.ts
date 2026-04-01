/**
 * Provider availability query — counts nearby providers per modality.
 * Telehealth providers count toward any modality regardless of distance.
 */

import { db } from "@workspace/db";
import { providers, providerModalities } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { haversineDistanceMiles, ZIP_COORDS } from "./geoUtils";

/**
 * A map of modalityId → nearby provider count.
 * Values are null when no zip code is provided at all (location unknown).
 * Values are numeric (0 or more) when a zip code is provided — even if the zip
 * is not in the coordinate lookup, the fallback exact-zip match is used.
 */
export type ProviderAvailabilityMap = Record<string, number | null>;

/**
 * Given a zip code, radius (miles), and a list of modality IDs, returns a map
 * of { modalityId → nearbyProviderCount }.
 *
 * "Nearby" means the provider is approved AND at least one of:
 *   - offersTelehealth === true (always counts, distance-exempt), OR
 *   - (if zip coords known) lat/lng within radiusMiles of the member's zip, OR
 *   - (fallback) provider's stored zipCode matches the member's zip exactly.
 *
 * Returns null for all modalities only when no zip code is provided at all.
 * When a zip is provided but not in ZIP_COORDS, falls back to exact-zip matching
 * (mirrors behavior in the providers search route).
 */
export async function queryProviderAvailability(
  zipCode: string | null | undefined,
  radiusMiles: number,
  modalityIds: string[],
): Promise<ProviderAvailabilityMap> {
  if (modalityIds.length === 0) return {};

  const userCoords = zipCode ? (ZIP_COORDS[zipCode] ?? null) : null;

  // When no zip at all is provided, we cannot determine proximity.
  // Return null for all modalities — the engine will skip the penalty.
  if (!zipCode) {
    const result: ProviderAvailabilityMap = {};
    for (const id of modalityIds) result[id] = null;
    return result;
  }

  const approvedProviders = await db
    .select({
      id: providers.id,
      lat: providers.lat,
      lng: providers.lng,
      zipCode: providers.zipCode,
      offersTelehealth: providers.offersTelehealth,
    })
    .from(providers)
    .where(eq(providers.status, "approved"));

  const nearbyProviderIds = new Set<string>(
    approvedProviders
      .filter((p) => {
        // Telehealth providers are always available regardless of distance.
        if (p.offersTelehealth) return true;

        if (userCoords && p.lat && p.lng) {
          // Preferred path: haversine distance check using coordinates.
          const dist = haversineDistanceMiles(
            userCoords.lat,
            userCoords.lng,
            parseFloat(p.lat),
            parseFloat(p.lng),
          );
          return dist <= radiusMiles;
        }

        // Fallback for zip codes not in ZIP_COORDS: exact zip match.
        // This mirrors the behavior in the providers search route.
        return p.zipCode === zipCode;
      })
      .map((p) => p.id),
  );

  const links = await db
    .select({ providerId: providerModalities.providerId, modalityId: providerModalities.modalityId })
    .from(providerModalities)
    .where(inArray(providerModalities.modalityId, modalityIds));

  const result: ProviderAvailabilityMap = {};
  for (const modalityId of modalityIds) {
    result[modalityId] = 0;
  }

  for (const link of links) {
    if (!(link.modalityId in result)) continue;
    if (nearbyProviderIds.has(link.providerId)) {
      result[link.modalityId] = (result[link.modalityId] ?? 0) + 1;
    }
  }

  return result;
}
