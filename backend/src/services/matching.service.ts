import { ngoRepository } from '../repositories/ngo.repository.js';
import { listingRepository } from '../repositories/listing.repository.js';
import { AppError } from '../middleware/error.middleware.js';
import { EligibleListing } from '../types/index.js';
import { NearbyListingsQuery } from '../validators/listing.validator.js';

export class MatchingService {
  /**
   * Discovers eligible surplus food listings for an NGO.
   * Enforces:
   * 1. NGO is active and accepting.
   * 2. Listing is OPEN.
   * 3. Listing has not expired.
   * 4. Listing quantity <= NGO capacity.
   * 5. Distance <= NGO service radius (or requested sub-radius).
   * 6. Estimated travel time fits within safe pickup window.
   */
  async getNearbyEligibleListings(
    ngoId: string,
    queryFilters: NearbyListingsQuery,
    now: Date = new Date()
  ): Promise<EligibleListing[]> {
    const ngo = await ngoRepository.findById(ngoId);
    if (!ngo) {
      throw new AppError('NGO profile not found', 404);
    }

    if (!ngo.is_accepting) {
      // Return empty list or error if NGO is not currently accepting
      return [];
    }

    // Effective search radius cannot exceed NGO's maximum configured service radius
    const effectiveRadius = queryFilters.radiusKm
      ? Math.min(queryFilters.radiusKm, Number(ngo.service_radius_km))
      : Number(ngo.service_radius_km);

    const listings = await listingRepository.findNearbyEligible(
      Number(ngo.latitude),
      Number(ngo.longitude),
      Number(ngo.capacity_kg),
      effectiveRadius,
      now,
      {
        foodType: queryFilters.foodType,
        minQuantity: queryFilters.minQuantity,
        maxQuantity: queryFilters.maxQuantity,
        sortBy: queryFilters.sortBy,
        sortOrder: queryFilters.sortOrder,
      }
    );

    return listings;
  }
}

export const matchingService = new MatchingService();

