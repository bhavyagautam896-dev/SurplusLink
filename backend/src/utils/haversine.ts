import { config } from '../config/env.js';

export const EARTH_RADIUS_KM = 6371.0088;

/**
 * Calculates Haversine distance between two coordinates in kilometers.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRadians = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const radLat1 = toRadians(lat1);
  const radLat2 = toRadians(lat2);

  let a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radLat1) * Math.cos(radLat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  // Clamp a to [0, 1] to avoid domain error for identical or floating-point edge cases
  a = Math.max(0, Math.min(1, a));

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = EARTH_RADIUS_KM * c;

  return Math.round(distance * 1000) / 1000; // Round to 3 decimal places
}

/**
 * Calculates estimated travel time in minutes based on distance, detour factor, and average speed.
 */
export function calculateTravelTimeMinutes(
  distanceKm: number,
  speedKmh = config.averageSpeedKmh,
  detourFactor = config.roadDetourFactor
): number {
  if (distanceKm <= 0 || speedKmh <= 0) return 0;
  const effectiveDistance = distanceKm * detourFactor;
  const hours = effectiveDistance / speedKmh;
  return Math.round(hours * 60 * 100) / 100;
}

/**
 * Checks whether an NGO can reach the donor pickup location before the food safe-until time.
 * @param listingSafeUntil Expiry timestamp
 * @param estimatedTravelMinutes Travel time in minutes
 * @param now Reference timestamp (backend clock)
 */
export function isPickupWindowFeasible(
  listingSafeUntil: Date,
  estimatedTravelMinutes: number,
  now: Date = new Date()
): boolean {
  const arrivalTime = new Date(now.getTime() + estimatedTravelMinutes * 60 * 1000);
  return arrivalTime.getTime() <= listingSafeUntil.getTime();
}

/**
 * Calculates bounding box in degrees latitude/longitude for a given radius.
 * Useful for preliminary SQL filtering.
 */
export function getBoundingBox(
  lat: number,
  lon: number,
  radiusKm: number
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const latDelta = radiusKm / 111.32; // ~111.32 km per degree latitude
  const lonDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));

  return {
    minLat: lat - latDelta,
    maxLat: lat + latDelta,
    minLon: lon - Math.abs(lonDelta),
    maxLon: lon + Math.abs(lonDelta),
  };
}
