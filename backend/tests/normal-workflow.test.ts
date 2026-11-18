import { describe, it, expect, beforeAll } from 'vitest';
import { query } from '../src/database/db.js';
import { listingRepository } from '../src/repositories/listing.repository.js';
import { matchingService } from '../src/services/matching.service.js';
import { claimService } from '../src/services/claim.service.js';

describe('Normal-Case End-to-End Workflow Testing', () => {
  let donorId: string;
  let ngoId: string;
  let listingId: string;
  let claimId: string;

  beforeAll(async () => {
    // Pick an active donor and accepting NGO located nearby
    const donorRes = await query('SELECT id, latitude, longitude FROM donors LIMIT 1');
    donorId = donorRes.rows[0].id;

    const ngoRes = await query(
      `SELECT id, latitude, longitude, capacity_kg, service_radius_km
       FROM ngos
       WHERE is_accepting = TRUE
       ORDER BY haversine_distance(latitude, longitude, $1, $2) ASC
       LIMIT 1`,
      [donorRes.rows[0].latitude, donorRes.rows[0].longitude]
    );
    ngoId = ngoRes.rows[0].id;
  });

  it('Step 1: Donor posts surplus food at 7:00 PM with safe-until at 9:00 PM', async () => {
    const postTime = new Date('2026-11-16T19:00:00Z');
    const safeUntil = new Date('2026-11-16T21:00:00Z');

    const donorRes = await query('SELECT latitude, longitude FROM donors WHERE id = $1', [donorId]);
    const { latitude, longitude } = donorRes.rows[0];

    const listing = await listingRepository.create({
      donor_id: donorId,
      food_type: 'Fresh Wedding Feast Surpluses',
      description: 'Hot rice, paneer kofta, and tandoori naans for 60 people',
      quantity_kg: 25,
      latitude: Number(latitude),
      longitude: Number(longitude),
      safe_until: safeUntil.toISOString(),
      pickup_instructions: 'Gate 2 rear loading bay.',
    });

    expect(listing).toBeDefined();
    expect(listing.status).toBe('OPEN');
    listingId = listing.id;
  });

  it('Step 2: Eligible NGO discovers the listing in its nearby feed', async () => {
    const checkTime = new Date('2026-11-16T19:05:00Z'); // 5 minutes after posting

    const nearbyListings = await matchingService.getNearbyEligibleListings(
      ngoId,
      { sortBy: 'urgency' },
      checkTime
    );

    const match = nearbyListings.find((l) => l.id === listingId);
    expect(match).toBeDefined();
    expect(match?.food_type).toBe('Fresh Wedding Feast Surpluses');
    expect(Number(match?.distance_km)).toBeGreaterThanOrEqual(0);
    expect(Number(match?.estimated_travel_minutes)).toBeGreaterThanOrEqual(0);
    expect(Number(match?.remaining_minutes)).toBeGreaterThan(0);
  });

  it('Step 3: NGO claims the listing and it disappears from available feeds', async () => {
    const claimTime = new Date('2026-11-16T19:10:00Z');

    const claim = await claimService.claimListing(listingId, ngoId, claimTime);
    expect(claim).toBeDefined();
    expect(claim.status).toBe('CLAIMED');
    expect(claim.listing_id).toBe(listingId);
    expect(claim.ngo_id).toBe(ngoId);
    claimId = claim.id;

    // Verify listing is no longer OPEN
    const updatedListing = await listingRepository.findById(listingId);
    expect(updatedListing?.status).toBe('CLAIMED');

    // Verify feed no longer shows the claimed listing
    const feedAfterClaim = await matchingService.getNearbyEligibleListings(
      ngoId,
      { sortBy: 'urgency' },
      new Date('2026-11-16T19:12:00Z')
    );
    const match = feedAfterClaim.find((l) => l.id === listingId);
    expect(match).toBeUndefined();
  });

  it('Admin claim view includes the new claim and organization details', async () => {
    const claims = await claimService.getAllClaims();
    const claim = claims.find((item) => item.id === claimId);

    expect(claim).toBeDefined();
    expect(claim?.donor_organization_name).toBeDefined();
    expect(claim?.ngo_organization_name).toBeDefined();
  });

  it('Step 4: NGO marks food as picked up', async () => {
    const updatedClaim = await claimService.markPickup(claimId, ngoId);
    expect(updatedClaim.status).toBe('PICKED_UP');
    expect(updatedClaim.picked_up_at).toBeDefined();

    const listing = await listingRepository.findById(listingId);
    expect(listing?.status).toBe('PICKED_UP');
  });

  it('Step 5: Food donor confirms completion of the rescue handoff', async () => {
    const completedClaim = await claimService.completeClaim(claimId, donorId);
    expect(completedClaim.status).toBe('COMPLETED');
    expect(completedClaim.completed_at).toBeDefined();

    const listing = await listingRepository.findById(listingId);
    expect(listing?.status).toBe('COMPLETED');
  });
});
