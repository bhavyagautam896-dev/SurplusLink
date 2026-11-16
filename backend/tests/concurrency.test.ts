import { describe, it, expect, beforeAll } from 'vitest';
import { pool, query } from '../src/database/db.js';
import { claimService } from '../src/services/claim.service.js';

describe('Atomic Claim Concurrency Test (50 Simultaneous NGO Claims)', () => {
  let testListingId: string;
  const testNgoIds: string[] = [];

  beforeAll(async () => {
    // 1. Fetch or create a donor
    const donorRes = await query('SELECT id, latitude, longitude FROM donors LIMIT 1');
    const donor = donorRes.rows[0];

    // 2. Fetch 15+ NGOs from seeded database, or repeat NGO IDs to reach 50 concurrent workers
    const ngosRes = await query('SELECT id FROM ngos WHERE is_accepting = TRUE');
    const baseNgos = ngosRes.rows.map((r: any) => r.id);

    for (let i = 0; i < 50; i++) {
      testNgoIds.push(baseNgos[i % baseNgos.length]);
    }

    // 3. Create a fresh test listing with safe_until 5 hours in the future
    const safeUntil = new Date(Date.now() + 5 * 3600 * 1000);
    const listingRes = await query(
      `INSERT INTO listings (donor_id, food_type, description, quantity_kg, latitude, longitude, safe_until, status)
       VALUES ($1, 'Concurrency Test Fresh Biryani', '50 kg hot surplus biryani', 20, $2, $3, $4, 'OPEN')
       RETURNING id`,
      [donor.id, donor.latitude, donor.longitude, safeUntil.toISOString()]
    );
    testListingId = listingRes.rows[0].id;
  });

  it('guarantees exactly 1 successful claim and 49 failed claims among 50 concurrent attempts with 0 duplicate claims', async () => {
    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    // Fire 50 concurrent claims simultaneously via Promise.all
    const claimPromises = testNgoIds.map(async (ngoId) => {
      try {
        await claimService.claimListing(testListingId, ngoId);
        successCount++;
      } catch (err: any) {
        failureCount++;
        errors.push(err.message);
      }
    });

    await Promise.all(claimPromises);

    console.log('\n--- CONCURRENCY TEST RESULTS ---');
    console.log(`Total claim attempts:   ${testNgoIds.length}`);
    console.log(`Successful claims:      ${successCount}`);
    console.log(`Failed claims:          ${failureCount}`);

    // Verify exactly 1 success and 49 failures
    expect(testNgoIds.length).toBe(50);
    expect(successCount).toBe(1);
    expect(failureCount).toBe(49);

    // Verify database integrity: exactly 1 active claim in PostgreSQL
    const activeClaimsRes = await query(
      `SELECT COUNT(*)::INTEGER AS count FROM claims WHERE listing_id = $1 AND status = 'CLAIMED'`,
      [testListingId]
    );
    const activeCount = parseInt(activeClaimsRes.rows[0].count, 10);
    console.log(`Database active claims: ${activeCount}`);
    console.log('--------------------------------\n');

    expect(activeCount).toBe(1);

    // Verify listing status is CLAIMED
    const listingRes = await query('SELECT status FROM listings WHERE id = $1', [testListingId]);
    expect(listingRes.rows[0].status).toBe('CLAIMED');
  });
});
