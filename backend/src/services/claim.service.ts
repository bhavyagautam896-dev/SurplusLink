import { pool } from '../database/db.js';
import { ngoRepository } from '../repositories/ngo.repository.js';
import { listingRepository } from '../repositories/listing.repository.js';
import { claimRepository } from '../repositories/claim.repository.js';
import { calculateHaversineDistance, calculateTravelTimeMinutes, isPickupWindowFeasible } from '../utils/haversine.js';
import { AppError } from '../middleware/error.middleware.js';
import { Claim } from '../types/index.js';

export class ClaimService {
  /**
   * Concurrency-safe atomic claim operation.
   * Uses PostgreSQL transactions, row-level status check, and partial unique constraint.
   */
  async claimListing(
    listingId: string,
    ngoId: string,
    now: Date = new Date()
  ): Promise<Claim> {
    // 1. Fetch NGO details from trusted database
    const ngo = await ngoRepository.findById(ngoId);
    if (!ngo) {
      throw new AppError('NGO profile not found', 404);
    }

    if (!ngo.is_accepting) {
      throw new AppError('NGO is currently marked as not accepting donations', 400);
    }

    // 2. Fetch Listing details to verify business constraints before transaction
    const listing = await listingRepository.findById(listingId);
    if (!listing) {
      throw new AppError('Listing not found', 404);
    }

    if (listing.status !== 'OPEN') {
      throw new AppError(
        `Listing is already ${listing.status.toLowerCase()} and cannot be claimed`,
        409
      );
    }

    const safeUntilDate = new Date(listing.safe_until);
    if (safeUntilDate.getTime() <= now.getTime()) {
      throw new AppError('Listing has expired and can no longer be claimed', 400);
    }

    // Check NGO capacity
    if (Number(listing.quantity_kg) > Number(ngo.capacity_kg)) {
      throw new AppError(
        `Listing quantity (${listing.quantity_kg} kg) exceeds NGO capacity (${ngo.capacity_kg} kg)`,
        400
      );
    }

    // Calculate trusted distance & travel time
    const distanceKm = calculateHaversineDistance(
      Number(ngo.latitude),
      Number(ngo.longitude),
      Number(listing.latitude),
      Number(listing.longitude)
    );

    if (distanceKm > Number(ngo.service_radius_km)) {
      throw new AppError(
        `Listing distance (${distanceKm} km) exceeds NGO service radius (${ngo.service_radius_km} km)`,
        400
      );
    }

    const travelMinutes = calculateTravelTimeMinutes(distanceKm);
    if (!isPickupWindowFeasible(safeUntilDate, travelMinutes, now)) {
      throw new AppError(
        `Estimated travel time (${travelMinutes} min) exceeds safe pickup window`,
        400
      );
    }

    // 3. Execute Concurrency-Safe Transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Atomic conditional update on listing
      const updateRes = await client.query(
        `UPDATE listings
         SET status = 'CLAIMED',
             updated_at = NOW()
         WHERE id = $1
           AND status = 'OPEN'
           AND safe_until > $2
         RETURNING *`,
        [listingId, now.toISOString()]
      );

      // If no row was updated, another transaction claimed or modified it first, or it expired
      if (updateRes.rowCount === 0) {
        await client.query('ROLLBACK');
        throw new AppError(
          'Listing was just claimed by another organization or expired',
          409
        );
      }

      // Insert claim record atomically
      const claimRes = await client.query(
        `INSERT INTO claims (listing_id, ngo_id, claimed_at, distance_km, estimated_travel_minutes, status)
         VALUES ($1, $2, $3, $4, $5, 'CLAIMED')
         RETURNING *`,
        [listingId, ngoId, now.toISOString(), distanceKm, travelMinutes]
      );

      await client.query('COMMIT');
      return claimRes.rows[0];
    } catch (err: any) {
      await client.query('ROLLBACK');
      // If partial unique index idx_unique_active_claim_per_listing caught a collision:
      if (err.code === '23505') {
        throw new AppError('This listing has already been claimed', 409);
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * NGO marks listing as picked up.
   */
  async markPickup(claimId: string, ngoId: string): Promise<Claim> {
    const claim = await claimRepository.findById(claimId);
    if (!claim) {
      throw new AppError('Claim not found', 404);
    }

    if (claim.ngo_id !== ngoId) {
      throw new AppError('Unauthorized: You can only update your own claims', 403);
    }

    if (claim.status !== 'CLAIMED') {
      throw new AppError(
        `Cannot mark pickup: Claim is currently ${claim.status}. Expected CLAIMED.`,
        400
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updatedClaim = await claimRepository.updateStatus(claimId, 'PICKED_UP', client);
      await client.query(
        `UPDATE listings SET status = 'PICKED_UP', updated_at = NOW() WHERE id = $1`,
        [claim.listing_id]
      );

      await client.query('COMMIT');
      return updatedClaim!;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Donor confirms handoff and completes the rescue lifecycle.
   */
  async completeClaim(claimId: string, donorId: string): Promise<Claim> {
    const claim = await claimRepository.findById(claimId);
    if (!claim) {
      throw new AppError('Claim not found', 404);
    }

    // Verify that the listing belongs to this donor
    const listing = await listingRepository.findById(claim.listing_id);
    if (!listing || listing.donor_id !== donorId) {
      throw new AppError('Unauthorized: Only the food donor can confirm completion', 403);
    }

    if (claim.status !== 'PICKED_UP') {
      throw new AppError(
        `Cannot complete pickup: Claim is currently ${claim.status}. It must be marked as PICKED_UP by the NGO first.`,
        400
      );
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const updatedClaim = await claimRepository.updateStatus(claimId, 'COMPLETED', client);
      await client.query(
        `UPDATE listings SET status = 'COMPLETED', updated_at = NOW() WHERE id = $1`,
        [claim.listing_id]
      );

      await client.query('COMMIT');
      return updatedClaim!;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async getClaimsByNgo(ngoId: string): Promise<Claim[]> {
    return claimRepository.findByNgoId(ngoId);
  }

  async getClaimsByDonor(donorId: string): Promise<Claim[]> {
    return claimRepository.findByDonorId(donorId);
  }
}

export const claimService = new ClaimService();
