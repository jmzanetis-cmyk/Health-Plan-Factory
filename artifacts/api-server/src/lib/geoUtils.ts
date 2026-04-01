/**
 * Shared geographic utilities — used by both the providers route and the plan engine.
 */

export function haversineDistanceMiles(
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

export const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  "78701": { lat: 30.2672, lng: -97.7431 },
  "78704": { lat: 30.2531, lng: -97.7621 },
  "60601": { lat: 41.8827, lng: -87.6233 },
  "90001": { lat: 33.9731, lng: -118.2479 },
  "10001": { lat: 40.7484, lng: -74.0044 },
  "80202": { lat: 39.7537, lng: -104.9942 },
  "98101": { lat: 47.6062, lng: -122.3321 },
};
