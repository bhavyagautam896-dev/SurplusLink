import { describe, it, expect, beforeAll } from 'vitest';
import { query } from '../src/database/db.js';
import { listingRepository } from '../src/repositories/listing.repository.js';
import { claimService } from '../src/services/claim.service.js';
import { matchingService } from '../src/services/matching.service.js';

describe('Boundary-Case and Constraint Testing', () => {
  let donorId: string;
  let ngoId: string;
  let nonAcceptingNgoId: string;
  let smallNgoId: string;

  beforeAll(async () => {
    const donorRes = await query('SELECT id FROM donors LIMIT 1');
    donorId = donorRes.rows[0].id;

    // Active accepting NGO
    const ngoRes = await query('SELECT id, capacity_kg, service_radius_km FROM ngos WHERE is_accepting = TRUE LIMIT 1');
    ngoId = ngoRes.rows[0].id;

    // Non-accepting NGO (from seed, NGO 14 was set is_accepting = false)
    const nonAccRes = await query('SELECT id FROM ngos WHERE is_accepting = FALSE LIMIT 1');
    if (nonAccRes.rowCount && nonAccRes.rowCount > 0) {
      nonAcceptingNgoId = nonAccRes.rows[0].id;
    }

    // Small capacity NGO
    const smallRes = await query('SELECT id, capacity_kg FROM ngos WHERE is_accepting = TRUE ORDER BY capacity_kg ASC LIMIT 1');
    smallNgoId = smallRes.rows[0].id;
  });

  it('Boundary Case 1: NGO that is not accepting donations receives 0 eligible matches', async () => {
    if (nonAcceptingNgoId) {
      const feed = await matchingService.getNearbyEligibleListings(nonAcceptingNgoId, {});
      expect(feed.length).toBe(0);

      // Attempting to claim should throw error
      const listingRes = await query('SELECT id FROM listings WHERE status = \'OPEN\' LIMIT 1');
      if (listingRes.rowCount && listingRes.rowCount > 0) {
        await expect(
          claimService.claimListing(listingRes.rows[0].id, nonAcceptingNgoId)
        ).rejects.toThrow(/not accepting/i);
      }
    }
  });

  it('Boundary Case 2: Claim attempt at or after safe-until time must fail', async () => {
    // Create an expired listing
    const expiryTime = new Date('2026-11-16T12:00:00Z');
    const listing = await listingRepository.create({
      donor_id: donorId,
      food_type: 'Expiry Boundary Test Food',
      description: 'Test food for expiry boundaries',
      quantity_kg: 10,
      latitude: 21.1458,
      longitude: 79.0882,
      safe_until: expiryTime.toISOString(),
      pickup_instructions: null,
    });

    // Attempt claim 1 minute after expiry
    const claimTimeAfter = new Date('2026-11-16T12:01:00Z');
    await expect(
      claimService.claimListing(listing.id, ngoId, claimTimeAfter)
    ).rejects.toThrow(/expired/i);

    // Attempt claim exactly at expiry time
    await expect(
      claimService.claimListing(listing.id, ngoId, expiryTime)
    ).rejects.toThrow(/expired/i);
  });

  it('Boundary Case 3: Insufficient NGO capacity prevents claim', async () => {
    const smallNgoRes = await query('SELECT capacity_kg FROM ngos WHERE id = $1', [smallNgoId]);
    const maxCapacity = Number(smallNgoRes.rows[0].capacity_kg);

    // Create listing with quantity exceeding capacity by 10 kg
    const futureTime = new Date(Date.now() + 5 * 3600 * 1000);
    const listing = await listingRepository.create({
      donor_id: donorId,
      food_type: 'Heavy Bulk Donation',
      description: 'Bulk surplus exceeding small NGO capacity',
      quantity_kg: maxCapacity + 10,
      latitude: 21.1458,
      longitude: 79.0882,
      safe_until: futureTime.toISOString(),
      pickup_instructions: null,
    });

    await expect(
      claimService.claimListing(listing.id, smallNgoId)
    ).rejects.toThrow(/exceeds NGO capacity/i);
  });

  it('Boundary Case 4: Invalid pickup status transitions must fail', async () => {
    // Create a listing and claim it
    const futureTime = new Date(Date.now() + 5 * 3600 * 1000);
    const listing = await listingRepository.create({
      donor_id: donorId,
      food_type: 'Transition Test Meal',
      description: 'Testing illegal status jumps',
      quantity_kg: 5,
      latitude: 21.1458,
      longitude: 79.0882,
      safe_until: futureTime.toISOString(),
      pickup_instructions: null,
    });

    const claim = await claimService.claimListing(listing.id, ngoId);

    // Directly attempting to COMPLETE before PICKED_UP must fail
    await expect(
      claimService.completeClaim(claim.id, donorId)
    ).rejects.toThrow(/must be marked as PICKED_UP/i);
  });
});
